import type { Reporter, TestCase, TestError, TestResult } from '@playwright/test/reporter'
import { relative } from 'pathe'
import sessionManager from '@/core/session-manager'
import TestResultMapper from '@/core/test-result-mapper'
import logger from '@/utils/logger'

/**
 * @see {@link https://playwright.dev/docs/api/class-reporter}
 */
export default class BuddyPlaywrightReporter implements Reporter {
  static displayName = 'BuddyPlaywrightReporter'
  options: Record<string, string | undefined>

  constructor(options = {}) {
    this.options = options
  }

  onBegin() {
    logger.debug('Playwright test run started')

    void (async () => {
      try {
        await sessionManager.getOrCreateSession()
        logger.debug('Session created at Playwright test run start')
      } catch (error) {
        logger.error('Error creating session at Playwright test run start', error)
        sessionManager.markFrameworkError()
      }
    })()
  }

  onTestEnd(test: TestCase, result: TestResult) {
    void (async () => {
      try {
        const relativeFilePath = relative(process.cwd(), test.location.file)
        const mappedResult = TestResultMapper.mapPlaywrightResult(test, result, relativeFilePath)
        await sessionManager.submitTestCase(mappedResult)
      } catch (error) {
        logger.error('Error processing Playwright test result', error)
        sessionManager.markFrameworkError()
      }
    })()
  }

  async onEnd(): Promise<void> {
    logger.debug('Playwright test run completed')

    // Add small delay to ensure all pending operations complete
    await new Promise((resolve) => setTimeout(resolve, 100))

    try {
      logger.debug('Attempting to close session after Playwright test completion')
      await sessionManager.closeSession()
      logger.debug('Session closed successfully after Playwright test completion')
    } catch (error) {
      logger.error('Error closing session after Playwright test completion', error)
      sessionManager.markFrameworkError()
      // Re-throw to ensure Playwright knows about the failure
      throw error
    }
  }

  onError(error: TestError) {
    logger.error('Playwright error', error)
    sessionManager.markFrameworkError()
  }
}
