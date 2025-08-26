import type { Config, Reporter, Test, TestResult } from '@jest/reporters'
import sessionManager from '@/core/session-manager'
import TestResultMapper from '@/core/test-result-mapper'
import logger from '@/utils/logger'

/**
 * @see {@link https://jestjs.io/docs/configuration#custom-reporters}
 */
export default class BuddyJestReporter implements Pick<Reporter, 'onRunStart' | 'onTestResult' | 'onRunComplete'> {
  static displayName = 'BuddyJestReporter'

  globalConfig: Config.GlobalConfig

  constructor(globalConfig: Config.GlobalConfig) {
    this.globalConfig = globalConfig
  }

  async onRunStart() {
    logger.debug('Jest test run started')

    try {
      await sessionManager.getOrCreateSession('jest')
      logger.debug('Session created at Jest test run start')
    } catch (error) {
      logger.error('Error creating session at Jest test run start', error)
      sessionManager.markFrameworkError()
    }
  }

  async onTestResult(_test: Test, testResult: TestResult) {
    const summary = {
      testFilePath: testResult.testFilePath,
      numPassingTests: testResult.numPassingTests,
      numFailingTests: testResult.numFailingTests,
      numPendingTests: testResult.numPendingTests,
      runtime: testResult.perfStats.runtime,
    }
    logger.debug('Jest onTestResult called:', summary)

    try {
      for (const assertionResult of testResult.testResults) {
        const mappedResult = TestResultMapper.mapJestResult(assertionResult, testResult)
        await sessionManager.submitTestCase(mappedResult)
      }
    } catch (error) {
      logger.error('Error processing Jest test result', error)
      sessionManager.markFrameworkError()
    }
  }

  async onRunComplete() {
    logger.debug('Jest test run completed')

    try {
      await sessionManager.closeSession()
      logger.debug('Session closed after Jest test completion')
    } catch (error) {
      logger.error('Error closing session after Jest test completion', error)
      sessionManager.markFrameworkError()
    }
  }
}
