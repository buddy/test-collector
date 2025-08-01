import axios, { AxiosError, AxiosInstance, CreateAxiosDefaults } from 'axios'
import BuddyUnitTestCollectorConfig from '@/core/config'
import { BUDDY_UNIT_TEST_STATUS, IBuddyUnitTestApiTestCase } from '@/core/types'
import { Logger } from '@/utils/logger'

export default class BuddyUnitTestApiClient {
  static displayName = 'BuddyUnitTestApiClient'

  #config: BuddyUnitTestCollectorConfig
  #logger: Logger
  #axiosInstance: AxiosInstance

  constructor(config: BuddyUnitTestCollectorConfig) {
    this.#config = config
    const loggerNameWithContext = `${BuddyUnitTestApiClient.displayName}_${this.#config.context}`
    this.#logger = new Logger(loggerNameWithContext)

    const axiosOptions: CreateAxiosDefaults = {
      baseURL: config.apiBaseUrl,
      headers: config.headers,
      timeout: 10_000,
    }

    this.#axiosInstance = axios.create(axiosOptions)
    this.#logger.debug(`Axios instance created for ${config.apiBaseUrl}`)

    this.#axiosInstance.interceptors.request.use(
      (AxiosRequest) => {
        const resolvedUrl = this.#axiosInstance.getUri(AxiosRequest)
        this.#logger.debug(`API REQUEST: ${AxiosRequest.method?.toUpperCase() || 'UNKNOWN'} ${resolvedUrl}`)
        if (AxiosRequest.data) {
          this.#logger.debug('Request payload:', AxiosRequest.data)
        }
        return AxiosRequest
      },
      (AxiosRequestError) => {
        this.#logger.error('API request failed', AxiosRequestError)
        return Promise.reject(AxiosRequestError as Error)
      },
    )

    this.#axiosInstance.interceptors.response.use(
      (AxiosResponse) => {
        const resolvedUrl = this.#axiosInstance.getUri(AxiosResponse.config)
        this.#logger.debug(
          `API RESPONSE: ${String(AxiosResponse.status)} ${AxiosResponse.config.method?.toUpperCase() || 'UNKNOWN'} ${resolvedUrl}`,
        )
        return AxiosResponse
      },
      (AxiosResponseError: AxiosError) => {
        const status = String(AxiosResponseError.response?.status ?? 'unknown')
        const method = String(AxiosResponseError.config?.method?.toUpperCase() || 'unknown')
        const resolvedUrl = AxiosResponseError.config
          ? this.#axiosInstance.getUri(AxiosResponseError.config)
          : 'unknown'
        this.#logger.error(`API ERROR: ${status} ${method} ${resolvedUrl}`, AxiosResponseError)

        // Only log payloads for client/server errors (4xx/5xx)
        const statusCode = AxiosResponseError.response?.status
        if (statusCode && statusCode >= 400) {
          if (AxiosResponseError.config?.data) {
            this.#logger.error(`API ERROR REQUEST PAYLOAD:`, AxiosResponseError.config.data)
          }
          if (AxiosResponseError.response?.data) {
            this.#logger.error(`API ERROR RESPONSE PAYLOAD:`, AxiosResponseError.response.data)
          }
        }

        return Promise.reject(AxiosResponseError as Error)
      },
    )
  }

  async createSession() {
    try {
      this.#logger.debug('Creating new test session')

      const url = '/unit-tests/sessions'
      const response = await this.#axiosInstance.post<{ id: string }>(url, this.#config.sessionPayload)

      const sessionId = response.data.id
      this.#logger.info(`Created Buddy visual tests session with ID: ${sessionId}`)

      return sessionId
    } catch (error) {
      this.#logger.error('Failed to create session', error)
      throw error
    }
  }

  async reopenSession(sessionId: string) {
    try {
      this.#logger.debug(`Reopening test session: ${sessionId}`)

      const url = `/unit-tests/sessions/${sessionId}/reopen`
      const response = await this.#axiosInstance.post<{ id: string }>(url)

      const newSessionId = response.data.id
      this.#logger.info(`Reopened session with ID: ${newSessionId}`)

      return newSessionId
    } catch (error) {
      this.#logger.error(`Failed to reopen session: ${sessionId}`, error)
      throw error
    }
  }

  async submitTestCase(sessionId: string, testCase: IBuddyUnitTestApiTestCase) {
    try {
      this.#logger.debug(`Submitting test case: ${testCase.name}`)

      const url = `/unit-tests/sessions/${sessionId}/cases`
      await this.#axiosInstance.put(url, testCase)

      this.#logger.debug(`Successfully submitted test case: ${testCase.name}`)
    } catch (error) {
      this.#logger.error(`Failed to submit test case: ${testCase.name}`, error)
    }
  }

  async submitTestCases(sessionId: string, testCases: IBuddyUnitTestApiTestCase[]) {
    const promises = testCases.map((testCase) => this.submitTestCase(sessionId, testCase))
    await Promise.allSettled(promises)
  }

  async closeSession(sessionId: string, status = BUDDY_UNIT_TEST_STATUS.PASSED) {
    try {
      this.#logger.debug(`Closing test session: ${sessionId} with status: ${status}`)

      const url = `/unit-tests/sessions/${sessionId}/close`
      const response = await this.#axiosInstance.post(url, { status })

      this.#logger.info(`Successfully closed session: ${sessionId} with status: ${status}`)
      this.#logger.debug(`Close session response:`, response.statusText)
    } catch (error) {
      this.#logger.error(`Failed to close session: ${sessionId}`, error)
      throw error // Re-throw to ensure session manager knows about the failure
    }
  }
}
