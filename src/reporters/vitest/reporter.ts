import type { Test } from '@vitest/runner'
import type { Reporter, TestCase, Vitest } from 'vitest/node'
import sessionManager from '@/core/session-manager'
import TestResultMapper from '@/core/test-result-mapper'
import { DeepPartial } from '@/core/types/utilities'
import logger from '@/utils/logger'

/**
 * @see {@link https://vitest.dev/advanced/reporters}
 */
export default class BuddyVitestReporter implements Reporter {
  static displayName = 'BuddyVitestReporter'

  context: Vitest | undefined

  constructor() {
    this.context = undefined
  }

  onInit(context: Vitest) {
    logger.debug('Vitest reporter initialized')
    this.context = context

    void (async () => {
      try {
        await sessionManager.getOrCreateSession()
        logger.debug('Session created at Vitest reporter initialization')
      } catch (error) {
        logger.error('Error creating session at Vitest reporter initialization', error)
        sessionManager.markFrameworkError()
      }
    })()
  }

  onTestCaseResult(test: TestCase): void {
    void (async () => {
      try {
        const result = test.result()

        if (result.state !== 'passed' && result.state !== 'failed' && result.state !== 'skipped') {
          return
        }

        const relativeFilePath = (test as unknown as DeepPartial<{ task: Test }>)?.task?.file?.name
        const testResult = TestResultMapper.mapVitestResult(test, result, relativeFilePath)

        await sessionManager.submitTestCase(testResult)
      } catch (error) {
        logger.error('Error processing test case result', error)
      }
    })()
  }

  onTestRunEnd(): void {
    logger.debug('Vitest test run completed')

    void (async () => {
      try {
        await sessionManager.apiClient.drainQueue()
        logger.debug('Queue drained successfully')
      } catch (error) {
        logger.error('Error draining queue at test run end', error)
        sessionManager.markFrameworkError()
      }

      try {
        if (sessionManager.initialized) {
          await sessionManager.closeSession()
          logger.debug('Session closed after Vitest test completion')
        }
      } catch (error) {
        logger.error('Error closing session after Vitest test completion', error)
        sessionManager.markFrameworkError()
      }
    })()
  }
}
