import axios, { AxiosError, AxiosInstance, CreateAxiosDefaults } from 'axios'
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

    const axiosOptions: CreateAxiosDefaults = {
      baseURL: config.apiBaseUrl,
      headers: config.headers,
      timeout: 10_000,
    }

    this.#axiosInstance = axios.create(axiosOptions)
    logger.debug(`Axios instance created for ${config.apiBaseUrl}`)

    this.#axiosInstance.interceptors.request.use(
      (AxiosRequest) => {
        const resolvedUrl = this.#axiosInstance.getUri(AxiosRequest)
        logger.debug(`API request: ${AxiosRequest.method?.toUpperCase() || 'UNKNOWN'} ${resolvedUrl}`)
        if (AxiosRequest.data) {
          logger.debug('Request payload:', AxiosRequest.data)
        }
        return AxiosRequest
      },
      (AxiosRequestError) => {
        logger.error('API request failed:', AxiosRequestError)
        return Promise.reject(AxiosRequestError as Error)
      },
    )

    this.#axiosInstance.interceptors.response.use(
      (AxiosResponse) => {
        const resolvedUrl = this.#axiosInstance.getUri(AxiosResponse.config)
        logger.debug(
          `API response: ${String(AxiosResponse.status)} ${AxiosResponse.config.method?.toUpperCase() || 'UNKNOWN'} ${resolvedUrl}`,
        )
        return AxiosResponse
      },
      (AxiosResponseError: AxiosError) => {
        const status = String(AxiosResponseError.response?.status ?? 'unknown')
        const method = String(AxiosResponseError.config?.method?.toUpperCase() || 'unknown')
        const resolvedUrl = AxiosResponseError.config
          ? this.#axiosInstance.getUri(AxiosResponseError.config)
          : 'unknown'
        logger.error(`API error: ${status} ${method} ${resolvedUrl}`, AxiosResponseError)

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

  async submitTestCase(sessionId: string, testCase: IBuddyUnitTestApiTestCase) {
    try {
      logger.debug(`Submitting test case: ${testCase.name}`)

      const url = `/unit-tests/sessions/${sessionId}/cases`
      await this.#axiosInstance.put(url, testCase)

      logger.debug(`Successfully submitted test case: ${testCase.name}`)
    } catch (error) {
      logger.error(`Failed to submit test case: ${testCase.name}`, error)
      setEnvironmentVariable('BUDDY_API_FAILURE', true)
    }
  }

  async submitTestCases(sessionId: string, testCases: IBuddyUnitTestApiTestCase[]) {
    const promises = testCases.map((testCase) => this.submitTestCase(sessionId, testCase))
    await Promise.allSettled(promises)
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
