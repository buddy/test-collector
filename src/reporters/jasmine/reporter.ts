import { relative } from 'pathe'
import sessionManager from '@/core/session-manager'
import TestResultMapper from '@/core/test-result-mapper'
import logger from '@/utils/logger'

/**
 * @see {@link https://jasmine.github.io/tutorials/custom_reporter}
 */
class BuddyJasmineReporter implements jasmine.CustomReporter {
  async jasmineStarted() {
    logger.debug('Jasmine test run started')

    try {
      await sessionManager.getOrCreateSession('jasmine')
      logger.debug('Session created at Jasmine test run start')
    } catch (error) {
      logger.debug('Error creating session at Jasmine test run start', error)
    }
  }

  suiteStarted(result: jasmine.SuiteResult) {
    logger.debug(`Suite started: ${result.description}`)
  }

  async specDone(result: jasmine.SpecResult) {
    try {
      const filename = result.filename
      const relativeFilePath = filename ? relative(process.cwd(), filename) : undefined
      const mappedResult = TestResultMapper.mapJasmineResult(result, relativeFilePath)

      await sessionManager.submitTestCase(mappedResult)
    } catch (error) {
      logger.debug('Error processing Jasmine spec result', error)
    }
  }

  suiteDone(result: jasmine.SuiteResult) {
    logger.debug(`Suite done: ${result.description}`)
  }

  async jasmineDone() {
    logger.debug('Jasmine test run completed')

    try {
      await sessionManager.closeSession()
      logger.debug('Session closed after Jasmine test completion')
    } catch (error) {
      logger.debug('Error closing session after Jasmine test completion', error)
    }
  }
}

export default BuddyJasmineReporter

// eslint-disable-next-line unicorn/prefer-module
module.exports = BuddyJasmineReporter
