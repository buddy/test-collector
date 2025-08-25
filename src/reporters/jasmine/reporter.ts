import sessionManager from '@/core/session-manager'
import TestResultMapper from '@/core/test-result-mapper'
import { Logger } from '@/utils/logger'

const logger = new Logger('BuddyJasmineReporter')

/**
 * @see {@link https://jasmine.github.io/tutorials/custom_reporter}
 */
const BuddyJasmineReporter = {
  async jasmineStarted() {
    logger.debug('Jasmine test run started')

    try {
      await sessionManager.getOrCreateSession('jasmine')
      logger.debug('Session created at Jasmine test run start')
    } catch (error) {
      logger.error('Error creating session at Jasmine test run start', error)
      sessionManager.markFrameworkError()
    }
  },

  suiteStarted(result: jasmine.SuiteResult) {
    logger.debug(`Suite started: ${result.description}`)
  },

  async specDone(result: jasmine.SpecResult) {
    try {
      const mappedResult = TestResultMapper.mapJasmineResult(result)

      await sessionManager.submitTestCase(mappedResult)
    } catch (error) {
      logger.error('Error processing Jasmine spec result', error)
      sessionManager.markFrameworkError()
    }
  },

  suiteDone(result: jasmine.SuiteResult) {
    logger.debug(`Suite done: ${result.description}`)
  },

  async jasmineDone() {
    logger.debug('Jasmine test run completed')

    try {
      await sessionManager.closeSession()
      logger.debug('Session closed after Jasmine test completion')
    } catch (error) {
      logger.error('Error closing session after Jasmine test completion', error)
      sessionManager.markFrameworkError()
    }
  },
} satisfies jasmine.CustomReporter

export default BuddyJasmineReporter

// eslint-disable-next-line unicorn/prefer-module
module.exports = BuddyJasmineReporter
