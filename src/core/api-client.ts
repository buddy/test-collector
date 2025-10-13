import axios, { AxiosError, AxiosInstance, CreateAxiosDefaults } from 'axios'
import BuddyUnitTestCollectorConfig from '@/core/config'
import { BUDDY_UNIT_TEST_STATUS, IBuddyUnitTestApiTestCase } from '@/core/types'
import logger from '@/utils/logger'

export default class BuddyUnitTestApiClient {
  static displayName = 'BuddyUnitTestApiClient'

  #config: BuddyUnitTestCollectorConfig
  #axiosInstance: AxiosInstance

  constructor(config: BuddyUnitTestCollectorConfig) {
    this.#config = config
    const axiosOptions: CreateAxiosDefaults = {
      baseURL: config.apiBaseUrl,
      headers: config.headers,
      timeout: 10_000,
      transitional: {
        clarifyTimeoutError: true, // This will throw ETIMEDOUT instead of ECONNABORTED for timeouts
      },
    }

    logger.debug(`API Client configured with timeout: 10000ms`)
    this.#axiosInstance = axios.create(axiosOptions)
    logger.debug(`Axios instance created for ${config.apiBaseUrl}`)
  }

  async createSession() {
    logger.debug('Creating new test session')

    const url = '/unit-tests/sessions'
    const response = await this.#axiosInstance.post<{ id: string; html_url: string }>(url, this.#config.sessionPayload)

    const sessionUrl = response.data.html_url
    const sessionId = response.data.id
    logger.debug(`Created session with ID: ${sessionId}`)
    logger.info(`Tests session created in Buddy: ${sessionUrl}`)

    return sessionId
  }

  async reopenSession(sessionId: string) {
    logger.debug(`Reopening test session: ${sessionId}`)

    const url = `/unit-tests/sessions/${sessionId}/reopen`
    const response = await this.#axiosInstance.post<{ id: string }>(url)

    const newSessionId = response.data.id
    logger.debug(`Reopened session with ID: ${newSessionId}`)

    return newSessionId
  }

  async submitTestCase(sessionId: string, testCase: IBuddyUnitTestApiTestCase, retryCount = 0): Promise<boolean> {
    const MAX_RETRIES = 2
    const RETRY_DELAY_MS = 1000 // 1 second delay before retry
    const startTime = Date.now()

    try {
      logger.debug(`Submitting test case: ${testCase.name}${retryCount > 0 ? ` (retry ${String(retryCount)})` : ''}`)

      const url = `/unit-tests/sessions/${sessionId}/cases`
      await this.#axiosInstance.put(url, testCase)

      const duration = Date.now() - startTime
      logger.debug(`Successfully submitted test case: ${testCase.name} (took ${String(duration)}ms)`)
      return true
    } catch (error) {
      const duration = Date.now() - startTime
      const axiosError = error as AxiosError

      if (axiosError.code === 'ETIMEDOUT') {
        logger.error(`TIMEOUT submitting test case: ${testCase.name} after ${String(duration)}ms`, error)

        // Retry logic for timeouts
        if (retryCount < MAX_RETRIES) {
          logger.debug(
            `Retrying timed out test case: ${testCase.name} (attempt ${String(retryCount + 1)}/${String(MAX_RETRIES)})`,
          )
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
          return this.submitTestCase(sessionId, testCase, retryCount + 1)
        } else {
          logger.error(`Max retries exceeded for test case: ${testCase.name}`, error)
          logger.debug('Test case that failed after retries:', {
            name: testCase.name,
            classname: testCase.classname,
            status: testCase.status,
            sessionId,
            errorCode: axiosError.code,
            errorMessage: axiosError.message,
            retriesAttempted: retryCount,
          })
        }
      } else if (axiosError.code === 'ECONNABORTED') {
        logger.error(`CONNECTION ABORTED submitting test case: ${testCase.name} after ${String(duration)}ms`, error)
        logger.debug('Test case connection aborted:', {
          name: testCase.name,
          classname: testCase.classname,
          status: testCase.status,
          sessionId,
          errorCode: axiosError.code,
          errorMessage: axiosError.message,
        })
      } else {
        logger.error(`Failed to submit test case: ${testCase.name} after ${String(duration)}ms`, error)
      }

      return false
    }
  }

  async closeSession(sessionId: string) {
    logger.debug(`Closing test session: ${sessionId}`)

    const url = `/unit-tests/sessions/${sessionId}/close`
    const response = await this.#axiosInstance.post<{ status: BUDDY_UNIT_TEST_STATUS }>(url)

    logger.info(`Tests Session #${sessionId} completed with status: ${response.data.status}`)
    logger.debug(`Close session response:`, response.statusText)
  }
}
