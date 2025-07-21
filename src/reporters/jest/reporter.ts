import { Config, Reporter, Test, TestResult } from '@jest/reporters'
import sessionManager from '@/core/session-manager'
import TestResultMapper from '@/core/test-result-mapper'
import { IBuddyUnitTestCollectorConfig } from '@/core/types'
import { Logger } from '@/utils/logger'

export default class BuddyJestReporter implements Pick<Reporter, 'onRunStart' | 'onTestResult' | 'onRunComplete'> {
  static displayName = 'BuddyJestReporter'

  #logger: Logger
  globalConfig: Config.GlobalConfig
  options: IBuddyUnitTestCollectorConfig

  constructor(globalConfig: Config.GlobalConfig, options: IBuddyUnitTestCollectorConfig) {
    this.globalConfig = globalConfig
    this.options = options
    this.#logger = new Logger(BuddyJestReporter.displayName)
  }

  async onRunStart() {
    this.#logger.debug('Jest test run started')

    try {
      if (!sessionManager.createSession) throw new Error('Session manager not initialized before Jest run start')
      await sessionManager.createSession
      this.#logger.debug('Session created at Jest test run start')
    } catch (error) {
      this.#logger.error('Error creating session at Jest test run start', error)
      sessionManager.markFrameworkError()
    }
  }

  async onTestResult(_test: Test, testResult: TestResult) {
    this.#logger.debug('Jest onTestResult called:', testResult)

    try {
      for (const assertionResult of testResult.testResults) {
        const mappedResult = TestResultMapper.mapJestResult(assertionResult, testResult)
        this.#logger.debug('Mapped test result:', mappedResult)
        await sessionManager.submitTestCase(mappedResult)
      }
    } catch (error) {
      this.#logger.error('Error processing Jest test result', error)
      sessionManager.markFrameworkError()
    }
  }

  async onRunComplete() {
    this.#logger.debug('Jest test run completed')

    try {
      await sessionManager.closeSession()
      this.#logger.debug('Session closed after Jest test completion')
    } catch (error) {
      this.#logger.error('Error closing session after Jest test completion', error)
      sessionManager.markFrameworkError()
    }
  }
}
