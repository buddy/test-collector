import type { Reporter, TestCase, TestError, TestResult } from '@playwright/test/reporter'
import sessionManager from '@/core/session-manager'
import TestResultMapper from '@/core/test-result-mapper'
import { Logger } from '@/utils/logger'

/**
 * @see {@link https://playwright.dev/docs/api/class-reporter}
 */
export default class BuddyPlaywrightReporter implements Reporter {
  static displayName = 'BuddyPlaywrightReporter'
  #logger: Logger
  options: Record<string, string | undefined>

  constructor(options = {}) {
    this.options = options
    this.#logger = new Logger(BuddyPlaywrightReporter.displayName)
  }

  onBegin() {
    this.#logger.debug('Playwright test run started')

    void (async () => {
      try {
        await sessionManager.getOrCreateSession('playwright')
        this.#logger.debug('Session created at Playwright test run start')
      } catch (error) {
        this.#logger.error('Error creating session at Playwright test run start', error)
        sessionManager.markFrameworkError()
      }
    })()
  }

  onTestEnd(test: TestCase, result: TestResult) {
    void (async () => {
      try {
        const mappedResult = TestResultMapper.mapPlaywrightResult(test, result)
        await sessionManager.submitTestCase(mappedResult)
      } catch (error) {
        this.#logger.error('Error processing Playwright test result', error)
        sessionManager.markFrameworkError()
      }
    })()
  }

  async onEnd(): Promise<void> {
    this.#logger.debug('Playwright test run completed')

    // Add small delay to ensure all pending operations complete
    await new Promise((resolve) => setTimeout(resolve, 100))

    try {
      this.#logger.debug('Attempting to close session after Playwright test completion')
      await sessionManager.closeSession()
      this.#logger.debug('Session closed successfully after Playwright test completion')
    } catch (error) {
      this.#logger.error('Error closing session after Playwright test completion', error)
      sessionManager.markFrameworkError()
      // Re-throw to ensure Playwright knows about the failure
      throw error
    }
  }

  onError(error: TestError) {
    this.#logger.error('Playwright error', error)
    sessionManager.markFrameworkError()
  }
}
