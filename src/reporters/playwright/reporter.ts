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

  async onEnd() {
    this.#logger.debug('Playwright test run completed')
    try {
      await sessionManager.closeSession()
      this.#logger.debug('Session closed after Playwright test completion')
    } catch (error) {
      this.#logger.error('Error closing session after Playwright test completion', error)
      sessionManager.markFrameworkError()
    }
  }

  onError(error: TestError) {
    this.#logger.error('Playwright error', error)
    sessionManager.markFrameworkError()
  }
}
