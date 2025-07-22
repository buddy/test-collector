import { MochaOptions, Runner, Test, reporters } from 'mocha'
import sessionManager from '@/core/session-manager'
import TestResultMapper from '@/core/test-result-mapper'
import { IBuddyUnitTestApiTestCase } from '@/core/types'
import { Logger } from '@/utils/logger'

const { EVENT_RUN_BEGIN, EVENT_RUN_END, EVENT_TEST_FAIL, EVENT_TEST_PASS, EVENT_TEST_PENDING } = Mocha.Runner.constants

/**
 * @see {@link https://mochajs.org/api/tutorial-custom-reporter}
 */
export default class BuddyMochaReporter implements Pick<reporters.Base, 'runner'> {
  static displayName = 'BuddyMochaReporter'

  #logger: Logger

  options: MochaOptions
  pendingSubmissions: Set<symbol>
  runner: Runner

  constructor(runner: Runner, options: MochaOptions) {
    this.runner = runner
    this.options = options

    this.#logger = new Logger(BuddyMochaReporter.displayName)
    this.pendingSubmissions = new Set()

    this.runner.on(EVENT_RUN_BEGIN, () => this.onStart.bind(this))
    this.runner.on(EVENT_RUN_END, () => this.onEnd.bind(this))

    this.runner.on(EVENT_TEST_PENDING, () => this.onTestPending.bind(this))
    this.runner.on(EVENT_TEST_PASS, () => this.onTestPass.bind(this))
    this.runner.on(EVENT_TEST_FAIL, () => this.onTestFail.bind(this))
  }

  onStart() {
    this.#logger.debug('Mocha test run started')
  }

  onTestPass(test: Test) {
    const submissionPromise = this.submitTestWithTracking(test, () => {
      test.state = 'passed'
      return TestResultMapper.mapMochaResult(test)
    })

    submissionPromise.catch((error: unknown) => {
      this.#logger.error('Error processing Mocha test pass result', error)
    })
  }

  onTestFail(test: Test, error: Error) {
    const submissionPromise = this.submitTestWithTracking(test, () => {
      test.state = 'failed'
      test.err = error
      return TestResultMapper.mapMochaResult(test)
    })

    submissionPromise.catch((error: unknown) => {
      this.#logger.error('Error processing Mocha test fail result', error)
    })
  }

  onTestPending(test: Test) {
    const submissionPromise = this.submitTestWithTracking(test, () => {
      test.state = 'pending'
      test.pending = true
      return TestResultMapper.mapMochaResult(test)
    })

    submissionPromise.catch((error: unknown) => {
      this.#logger.error('Error processing Mocha test pending result', error)
    })
  }

  async submitTestWithTracking(_test: Test, resultMapperFunction: () => IBuddyUnitTestApiTestCase) {
    const submissionId = Symbol()
    this.pendingSubmissions.add(submissionId)

    try {
      const testResult = resultMapperFunction()
      await sessionManager.submitTestCase(testResult)
      this.#logger.debug(`Successfully submitted: ${testResult.name}`)
    } catch (error) {
      this.#logger.error('Error processing Mocha test result', error)
      sessionManager.markFrameworkError()
    } finally {
      this.pendingSubmissions.delete(submissionId)
    }
  }

  async onEnd() {
    this.#logger.debug('Mocha test run completed')

    if (this.pendingSubmissions.size > 0) {
      this.#logger.debug(`Waiting for ${String(this.pendingSubmissions.size)} pending test submissions to complete`)

      const maxWaitTime = 10_000
      const startTime = Date.now()

      while (this.pendingSubmissions.size > 0 && Date.now() - startTime < maxWaitTime) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      if (this.pendingSubmissions.size > 0) {
        this.#logger.warn(`Timed out waiting for ${String(this.pendingSubmissions.size)} test submissions`)
        sessionManager.markFrameworkError()
      } else {
        this.#logger.debug('All test submissions completed')
      }
    }

    try {
      await sessionManager.closeSession()
      this.#logger.debug('Session closed after Mocha test completion')
    } catch (error) {
      this.#logger.error('Error closing session after Mocha test completion', error)
      sessionManager.markFrameworkError()
    }
  }
}
