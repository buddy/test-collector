import { MochaOptions, Runner, Test, reporters } from 'mocha'
import { relative } from 'pathe'
import sessionManager from '@/core/session-manager'
import TestResultMapper from '@/core/test-result-mapper'
import { IBuddyUnitTestApiTestCase } from '@/core/types'
import logger from '@/utils/logger'

const { EVENT_RUN_BEGIN, EVENT_RUN_END, EVENT_TEST_FAIL, EVENT_TEST_PASS, EVENT_TEST_PENDING } = Runner.constants

/**
 * @see {@link https://mochajs.org/api/tutorial-custom-reporter}
 */
export default class BuddyMochaReporter implements Pick<reporters.Base, 'runner'> {
  static displayName = 'BuddyMochaReporter'

  options: MochaOptions
  pendingSubmissions: Set<symbol>
  runner: Runner

  constructor(runner: Runner, options: MochaOptions) {
    this.runner = runner
    this.options = options

    this.pendingSubmissions = new Set()

    this.runner.on(EVENT_RUN_BEGIN, () => {
      void this.onStart()
    })
    this.runner.on(EVENT_RUN_END, () => {
      void this.onEnd()
    })

    this.runner.on(EVENT_TEST_PENDING, this.onTestPending.bind(this))
    this.runner.on(EVENT_TEST_PASS, this.onTestPass.bind(this))
    this.runner.on(EVENT_TEST_FAIL, this.onTestFail.bind(this))
  }

  async onStart() {
    logger.debug('Mocha test run started')

    try {
      await sessionManager.getOrCreateSession('mocha')
      logger.debug('Session created at Mocha test run start')
    } catch (error) {
      logger.error('Error creating session at Mocha test run start', error)
      sessionManager.markFrameworkError()
    }
  }

  onTestPass(test: Test) {
    const submissionPromise = this.submitTestWithTracking(test, () => {
      test.state = 'passed'
      const relativeFilePath = this.getRelativeFilePath(test)
      return TestResultMapper.mapMochaResult(test, relativeFilePath)
    })

    submissionPromise.catch((error: unknown) => {
      logger.error('Error processing Mocha test pass result', error)
    })
  }

  onTestFail(test: Test, error: Error) {
    const submissionPromise = this.submitTestWithTracking(test, () => {
      test.state = 'failed'
      test.err = error
      const relativeFilePath = this.getRelativeFilePath(test)
      return TestResultMapper.mapMochaResult(test, relativeFilePath)
    })

    submissionPromise.catch((error: unknown) => {
      logger.error('Error processing Mocha test fail result', error)
    })
  }

  onTestPending(test: Test) {
    const submissionPromise = this.submitTestWithTracking(test, () => {
      test.state = 'pending'
      test.pending = true
      const relativeFilePath = this.getRelativeFilePath(test)
      return TestResultMapper.mapMochaResult(test, relativeFilePath)
    })

    submissionPromise.catch((error: unknown) => {
      logger.error('Error processing Mocha test pending result', error)
    })
  }

  async submitTestWithTracking(_test: Test, resultMapperFunction: () => IBuddyUnitTestApiTestCase) {
    const submissionId = Symbol()
    this.pendingSubmissions.add(submissionId)

    try {
      const testResult = resultMapperFunction()
      await sessionManager.submitTestCase(testResult)
      logger.debug(`Successfully submitted: ${testResult.name}`)
    } catch (error) {
      logger.error('Error processing Mocha test result', error)
      sessionManager.markFrameworkError()
    } finally {
      this.pendingSubmissions.delete(submissionId)
    }
  }

  protected getRelativeFilePath(test: Test): string | undefined {
    // First try test.file (standard Mocha)
    if (test.file) {
      return relative(process.cwd(), test.file)
    }

    // For Cypress or when test.file is not available, try to get from parent suite
    let suite = test.parent
    while (suite) {
      const suiteFile = suite.file
      if (suiteFile && typeof suiteFile === 'string') {
        return relative(process.cwd(), suiteFile)
      }
      suite = suite.parent
    }

    return undefined
  }

  async onEnd() {
    logger.debug('Mocha test run completed')

    if (this.pendingSubmissions.size > 0) {
      logger.debug(`Waiting for ${String(this.pendingSubmissions.size)} pending test submissions to complete`)

      const maxWaitTime = 10_000
      const startTime = Date.now()

      while (this.pendingSubmissions.size > 0 && Date.now() - startTime < maxWaitTime) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      if (this.pendingSubmissions.size > 0) {
        logger.warn(`Timed out waiting for ${String(this.pendingSubmissions.size)} test submissions`)
        sessionManager.markFrameworkError()
      } else {
        logger.debug('All test submissions completed')
      }
    }

    try {
      await sessionManager.closeSession()
      logger.debug('Session closed after Mocha test completion')
    } catch (error) {
      logger.error('Error closing session after Mocha test completion', error)
      sessionManager.markFrameworkError()
    }
  }
}
