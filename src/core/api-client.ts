import { IncomingHttpHeaders } from 'node:http'
import BuddyUnitTestCollectorConfig from '@/core/config'
import { BUDDY_UNIT_TEST_STATUS, IBuddyUnitTestApiTestCase } from '@/core/types'
import { setEnvironmentVariable } from '@/utils/environment'
import logger from '@/utils/logger'

interface FetchConfig {
  baseURL: string
  headers: IncomingHttpHeaders
  timeout: number
}

class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}

export default class BuddyUnitTestApiClient {
  static displayName = 'BuddyUnitTestApiClient'

  #config: BuddyUnitTestCollectorConfig
  #fetchConfig: FetchConfig

  constructor(config: BuddyUnitTestCollectorConfig) {
    this.#config = config
    this.#fetchConfig = {
      baseURL: config.apiBaseUrl,
      headers: config.headers,
      timeout: 10_000,
    }

    logger.debug(`API Client configured with timeout: 10000ms`)
    logger.debug(`Fetch client created for ${config.apiBaseUrl}`)
  }

  async #fetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
    // Remove leading slash from path to avoid double slashes when baseURL ends with /
    const cleanPath = path.startsWith('/') ? path.slice(1) : path
    const url = `${this.#fetchConfig.baseURL}${cleanPath}`
    const startTime = Date.now()

    try {
      // Log request
      const method = options.method?.toUpperCase() || 'GET'
      logger.debug(`API request: ${method} ${url}`)
      if (options.body) {
        logger.debug('Request payload:', JSON.parse(options.body as string))
      }

      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, this.#fetchConfig.timeout)

      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...this.#fetchConfig.headers,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        const duration = Date.now() - startTime
        logger.debug(`API response: ${String(response.status)} ${method} ${url} took ${String(duration)}ms`)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          if (response.status >= 400) {
            logger.error('Response payload:', errorData)
          }
          throw new Error(`HTTP ${String(response.status)}: ${response.statusText}`)
        }

        const data = await response.json()
        logger.debug('API response payload:', data)
        return data as T
      } catch (error) {
        clearTimeout(timeoutId)

        // Check if it's an abort error (timeout)
        if (error instanceof Error && error.name === 'AbortError') {
          const duration = Date.now() - startTime
          const timeoutError = new TimeoutError(`Request timeout after ${String(duration)}ms`)
          logger.error(`API TIMEOUT: ${method} ${url} - ${timeoutError.message}`, timeoutError)
          logger.debug('Timeout details:', {
            timeout: this.#fetchConfig.timeout,
            data: options.body,
            timestamp: new Date().toISOString(),
          })
          throw timeoutError
        }

        throw error
      }
    } catch (error) {
      const duration = Date.now() - startTime

      if (!(error instanceof TimeoutError)) {
        const method = options.method?.toUpperCase() || 'GET'
        logger.error(`API error: ${method} ${url} after ${String(duration)}ms`, error)
      }

      throw error
    }
  }

  async createSession() {
    try {
      logger.debug('Creating new test session')

      const response = await this.#fetch<{ id: string }>('/unit-tests/sessions', {
        method: 'POST',
        body: JSON.stringify(this.#config.sessionPayload),
      })

      const sessionId = response.id
      logger.info(`Created Buddy unit tests session with ID: ${sessionId}`)

      return sessionId
    } catch (error) {
      logger.error('Failed to create session', error)
      setEnvironmentVariable('BUDDY_API_FAILURE', true)
      throw error
    }
  }

  async reopenSession(sessionId: string) {
    try {
      logger.debug(`Reopening test session: ${sessionId}`)

      const response = await this.#fetch<{ id: string }>(`/unit-tests/sessions/${sessionId}/reopen`, {
        method: 'POST',
      })

      const newSessionId = response.id
      logger.info(`Reopened session with ID: ${newSessionId}`)

      return newSessionId
    } catch (error) {
      logger.error(`Failed to reopen session: ${sessionId}`, error)
      setEnvironmentVariable('BUDDY_API_FAILURE', true)
      throw error
    }
  }

  async submitTestCase(sessionId: string, testCase: IBuddyUnitTestApiTestCase, retryCount = 0): Promise<boolean> {
    const MAX_RETRIES = 2
    const RETRY_DELAY_MS = 1000 // 1 second delay before retry
    const startTime = Date.now()

    try {
      logger.debug(`Submitting test case: ${testCase.name}${retryCount > 0 ? ` (retry ${String(retryCount)})` : ''}`)

      await this.#fetch(`/unit-tests/sessions/${sessionId}/cases`, {
        method: 'PUT',
        body: JSON.stringify(testCase),
      })

      const duration = Date.now() - startTime
      logger.debug(`Successfully submitted test case: ${testCase.name} (took ${String(duration)}ms)`)
      return true
    } catch (error) {
      const duration = Date.now() - startTime

      if (error instanceof TimeoutError) {
        logger.error(`TIMEOUT submitting test case: ${testCase.name} after ${String(duration)}ms`, error)

        // Retry logic for timeouts
        if (retryCount < MAX_RETRIES) {
          logger.info(
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
            errorMessage: error.message,
            retriesAttempted: retryCount,
          })
        }
      } else {
        logger.error(`Failed to submit test case: ${testCase.name} after ${String(duration)}ms`, error)
      }

      setEnvironmentVariable('BUDDY_API_FAILURE', true)
      return false
    }
  }

  async submitTestCases(sessionId: string, testCases: IBuddyUnitTestApiTestCase[]) {
    // Batch configuration - limit concurrent requests to prevent API overload
    const MAX_CONCURRENT_REQUESTS = 5 // Max number of concurrent API calls
    const BATCH_DELAY_MS = 50 // Small delay between batches to prevent bursts

    if (testCases.length === 0) return

    logger.debug(
      `Submitting ${String(testCases.length)} test cases with max ${String(MAX_CONCURRENT_REQUESTS)} concurrent requests`,
    )

    // Process test cases in controlled batches
    for (let index = 0; index < testCases.length; index += MAX_CONCURRENT_REQUESTS) {
      const batch = testCases.slice(index, index + MAX_CONCURRENT_REQUESTS)
      const batchNumber = Math.floor(index / MAX_CONCURRENT_REQUESTS) + 1
      const totalBatches = Math.ceil(testCases.length / MAX_CONCURRENT_REQUESTS)

      if (testCases.length > MAX_CONCURRENT_REQUESTS) {
        logger.debug(
          `Processing batch ${String(batchNumber)}/${String(totalBatches)} (${String(batch.length)} test cases)`,
        )
      }

      // Submit batch with all requests in parallel
      const promises = batch.map((testCase) => this.submitTestCase(sessionId, testCase))
      const results = await Promise.allSettled(promises)

      // Log batch completion stats
      const fulfilled = results.filter((r) => r.status === 'fulfilled').length
      const rejected = results.filter((r) => r.status === 'rejected').length
      if (rejected > 0) {
        logger.debug(
          `Batch ${String(batchNumber)} completed: ${String(fulfilled)} succeeded, ${String(rejected)} failed/timed out`,
        )
      }

      // Add delay between batches to avoid overwhelming the API
      if (index + MAX_CONCURRENT_REQUESTS < testCases.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))
      }
    }

    logger.debug(`Completed submitting all ${String(testCases.length)} test cases`)
  }

  async closeSession(sessionId: string, status = BUDDY_UNIT_TEST_STATUS.PASSED) {
    try {
      logger.debug(`Closing test session: ${sessionId} with status: ${status}`)

      await this.#fetch(`/unit-tests/sessions/${sessionId}/close`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      })

      logger.info(`Successfully closed session: ${sessionId} with status: ${status}`)
      logger.debug(`Close session response: OK`)
    } catch (error) {
      logger.error(`Failed to close session: ${sessionId}`, error)
      setEnvironmentVariable('BUDDY_API_FAILURE', true)
      throw error
    }
  }
}
