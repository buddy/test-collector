import sessionManager from '@/core/session-manager'
import TestResultMapper from '@/core/test-result-mapper'
import { Logger } from '@/utils/logger'

/**
 * @see {@link https://jasmine.github.io/tutorials/custom_reporter}
 */
export default class BuddyJasmineReporter implements jasmine.CustomReporter {
  static displayName = 'BuddyJasmineReporter'
  #logger: Logger
  constructor() {
    this.#logger = new Logger(BuddyJasmineReporter.displayName)
  }

  jasmineStarted(suiteInfo: jasmine.JasmineStartedInfo) {
    this.#logger.debug('Jasmine test run started', suiteInfo)
  }

  suiteStarted(result: jasmine.SuiteResult) {
    this.#logger.debug(`Suite started: ${result.description}`)
  }

  async specDone(result: jasmine.SpecResult) {
    try {
      const mappedResult = TestResultMapper.mapJasmineResult(result)
      await sessionManager.submitTestCase(mappedResult)
    } catch (error) {
      this.#logger.error('Error processing Jasmine spec result', error)
      sessionManager.markFrameworkError()
    }
  }

  suiteDone(result: jasmine.SuiteResult) {
    this.#logger.debug(`Suite done: ${result.description}`)
  }

  async jasmineDone(suiteInfo: jasmine.JasmineDoneInfo) {
    this.#logger.debug('Jasmine test run completed', suiteInfo)

    try {
      await sessionManager.closeSession()
      this.#logger.debug('Session closed after Jasmine test completion')
    } catch (error) {
      this.#logger.error('Error closing session after Jasmine test completion', error)
      sessionManager.markFrameworkError()
    }
  }
}
