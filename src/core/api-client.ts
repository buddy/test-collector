import axios, { AxiosError, AxiosInstance, CreateAxiosDefaults } from 'axios'
import { Agent as HttpAgent } from 'node:http'
import { Agent as HttpsAgent } from 'node:https'
import BuddyUnitTestCollectorConfig from '@/core/config'
import { BUDDY_UNIT_TEST_STATUS, IBuddyUnitTestApiTestCase } from '@/core/types'
import { setEnvironmentVariable } from '@/utils/environment'
import logger from '@/utils/logger'

export default class BuddyUnitTestApiClient {
  static displayName = 'BuddyUnitTestApiClient'

  #config: BuddyUnitTestCollectorConfig
  #axiosInstance: AxiosInstance

  constructor(config: BuddyUnitTestCollectorConfig) {
    this.#config = config

    // Create optimized HTTP agents for connection pooling
    const isHttps = config.apiBaseUrl.startsWith('https')
    const httpAgent = new HttpAgent({
      keepAlive: true,
      keepAliveMsecs: 30_000, // 30 seconds
      maxSockets: 50, // Increased from default 5
      maxFreeSockets: 20, // Keep connections open
      timeout: 30_000, // Socket timeout
    })
    const httpsAgent = new HttpsAgent({
      keepAlive: true,
      keepAliveMsecs: 30_000,
      maxSockets: 50,
      maxFreeSockets: 20,
      timeout: 30_000,
    })

    const axiosOptions: CreateAxiosDefaults = {
      baseURL: config.apiBaseUrl,
      headers: config.headers,
      timeout: 30_000, // 30 second timeout
      httpAgent: isHttps ? undefined : httpAgent,
      httpsAgent: isHttps ? httpsAgent : undefined,
      transitional: {
        clarifyTimeoutError: true, // This will throw ETIMEDOUT instead of ECONNABORTED for timeouts
      },
      // Optimize for performance
      maxRedirects: 3,
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
    }

    logger.debug(`API Client configured with timeout: 30000ms, maxSockets: 50`)

    this.#axiosInstance = axios.create(axiosOptions)
    logger.debug(`Axios instance created for ${config.apiBaseUrl} with optimized connection pooling`)

    this.#axiosInstance.interceptors.request.use(
      (AxiosRequest) => {
        const resolvedUrl = this.#axiosInstance.getUri(AxiosRequest)
        logger.debug(`API request: ${AxiosRequest.method?.toUpperCase() || 'UNKNOWN'} ${resolvedUrl}`)
        if (AxiosRequest.data) {
          logger.debug('Request payload:', AxiosRequest.data)
        }
        AxiosRequest.headers['x-start-time'] = Date.now().toString()

        return AxiosRequest
      },
      (AxiosRequestError) => {
        logger.error('API request failed:', AxiosRequestError)
        return Promise.reject(AxiosRequestError as Error)
      },
    )

    this.#axiosInstance.interceptors.response.use(
      (AxiosResponse) => {
        const start = Number.parseInt(AxiosResponse.config.headers['x-start-time'] as string, 10)
        const duration = String(Date.now() - start)

        const resolvedUrl = this.#axiosInstance.getUri(AxiosResponse.config)
        logger.debug(
          `API response: ${String(AxiosResponse.status)} ${AxiosResponse.config.method?.toUpperCase() || 'UNKNOWN'} ${resolvedUrl} took ${duration}ms`,
        )
        logger.debug('API response payload:', AxiosResponse.data)
        return AxiosResponse
      },
      (AxiosResponseError: AxiosError) => {
        const status = String(AxiosResponseError.response?.status ?? 'unknown')
        const method = String(AxiosResponseError.config?.method?.toUpperCase() || 'unknown')
        const resolvedUrl = AxiosResponseError.config
          ? this.#axiosInstance.getUri(AxiosResponseError.config)
          : 'unknown'

        // Check if it's a timeout error (ETIMEDOUT with clarifyTimeoutError enabled)
        if (AxiosResponseError.code === 'ETIMEDOUT') {
          logger.error(`API TIMEOUT: ${method} ${resolvedUrl} - ${AxiosResponseError.message}`, AxiosResponseError)
          logger.debug('Timeout details:', {
            code: AxiosResponseError.code,
            timeout: AxiosResponseError.config?.timeout,
            data: AxiosResponseError.config?.data as unknown,
            timestamp: new Date().toISOString(),
          })
        } else if (AxiosResponseError.code === 'ECONNABORTED') {
          // Connection aborted but NOT a timeout (other reasons like network issues, user cancellation)
          logger.error(
            `API CONNECTION ABORTED: ${method} ${resolvedUrl} - ${AxiosResponseError.message}`,
            AxiosResponseError,
          )
        } else {
          logger.error(`API error: ${status} ${method} ${resolvedUrl}`, AxiosResponseError)
        }

        // Only log response payload for client/server errors (4xx/5xx)
        const statusCode = AxiosResponseError.response?.status
        if (statusCode && statusCode >= 400 && AxiosResponseError.response?.data) {
          logger.error('Response payload:', AxiosResponseError.response.data)
        }

        return Promise.reject(AxiosResponseError as Error)
      },
    )
  }

  async createSession() {
    try {
      logger.debug('Creating new test session')

      const url = '/unit-tests/sessions'
      const response = await this.#axiosInstance.post<{ id: string }>(url, this.#config.sessionPayload)

      const sessionId = response.data.id
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

      const url = `/unit-tests/sessions/${sessionId}/reopen`
      const response = await this.#axiosInstance.post<{ id: string }>(url)

      const newSessionId = response.data.id
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

      setEnvironmentVariable('BUDDY_API_FAILURE', true)
      return false
    }
  }

  async submitTestCases(sessionId: string, testCases: IBuddyUnitTestApiTestCase[]) {
    // Optimized batch configuration for high-throughput parallel processing
    const MAX_CONCURRENT_REQUESTS = Math.min(25, testCases.length) // Adaptive batching
    const BATCH_DELAY_MS = 10 // Minimal delay to prevent overwhelming
    const RETRY_DELAY_MS = 100 // Quick retry for failed requests

    if (testCases.length === 0) return

    logger.debug(
      `Submitting ${String(testCases.length)} test cases with max ${String(MAX_CONCURRENT_REQUESTS)} concurrent requests (optimized)`,
    )

    const startTime = Date.now()
    let totalSuccessful = 0
    let totalFailed = 0

    // Process test cases in optimized batches
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

      // Collect failed requests for retry
      const failedTestCases: IBuddyUnitTestApiTestCase[] = []
      for (const [index, result] of results.entries()) {
        if (result.status === 'fulfilled' && result.value) {
          totalSuccessful++
        } else {
          totalFailed++
          failedTestCases.push(batch[index])
        }
      }

      // Retry failed requests once with smaller batches
      if (failedTestCases.length > 0) {
        logger.debug(`Retrying ${String(failedTestCases.length)} failed requests from batch ${String(batchNumber)}`)
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))

        const retryPromises = failedTestCases.map((testCase) => this.submitTestCase(sessionId, testCase))
        const retryResults = await Promise.allSettled(retryPromises)

        for (const result of retryResults) {
          if (result.status === 'fulfilled' && result.value) {
            totalSuccessful++
            totalFailed--
          }
        }
      }

      // Minimal delay between batches
      if (index + MAX_CONCURRENT_REQUESTS < testCases.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))
      }
    }

    const duration = Date.now() - startTime
    const throughput = Math.round((testCases.length / duration) * 1000)

    logger.debug(
      `Completed submitting all ${String(testCases.length)} test cases in ${String(duration)}ms (${String(throughput)} req/s). Success: ${String(totalSuccessful)}, Failed: ${String(totalFailed)}`,
    )
  }

  async closeSession(sessionId: string, status = BUDDY_UNIT_TEST_STATUS.PASSED) {
    try {
      logger.debug(`Closing test session: ${sessionId} with status: ${status}`)

      const url = `/unit-tests/sessions/${sessionId}/close`
      const response = await this.#axiosInstance.post(url, { status })

      logger.info(`Successfully closed session: ${sessionId} with status: ${status}`)
      logger.debug(`Close session response:`, response.statusText)
    } catch (error) {
      logger.error(`Failed to close session: ${sessionId}`, error)
      setEnvironmentVariable('BUDDY_API_FAILURE', true)
      throw error
    }
  }
}
