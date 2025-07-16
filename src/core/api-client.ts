import axios, { AxiosInstance, CreateAxiosDefaults } from 'axios'
import BuddyUnitTestCollectorConfig from '@/core/config'
import { ITestCase, TEST_STATUS } from '@/types'
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
      timeout: 10000,
    }

    this.#axiosInstance = axios.create(axiosOptions)
    this.#logger.debug('Axios instance created with options:', axiosOptions)

    this.#axiosInstance.interceptors.request.use(
      (AxiosRequest) => {
        this.#logger.debug('=== API REQUEST SUCCESS ===')
        this.#logger.debug('AxiosRequest', AxiosRequest)
        this.#logger.debug('=== END REQUEST SUCCESS ===')
        return AxiosRequest
      },
      (AxiosRequestError) => {
        this.#logger.debug('=== API REQUEST REJECTED ===')
        this.#logger.error('AxiosRequestError', AxiosRequestError)
        this.#logger.debug('=== END REQUEST REJECTED ===')
        return Promise.reject(AxiosRequestError as Error)
      },
    )

    this.#axiosInstance.interceptors.response.use(
      (AxiosResponse) => {
        this.#logger.debug('=== API RESPONSE SUCCESS ===')
        this.#logger.debug('AxiosResponse', AxiosResponse)
        this.#logger.debug('=== END RESPONSE SUCCESS ===')
        return AxiosResponse
      },
      (AxiosResponseError) => {
        this.#logger.debug('=== API RESPONSE REJECTED ===')
        this.#logger.error('AxiosResponseError', AxiosResponseError)
        this.#logger.debug('=== END RESPONSE REJECTED ===')
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

  async submitTestCase(sessionId: string, testCase: ITestCase) {
    try {
      this.#logger.debug(`Submitting test case: ${testCase.name}`)

      const url = `/unit-tests/sessions/${sessionId}/cases`
      await this.#axiosInstance.put(url, testCase)

      this.#logger.debug(`Successfully submitted test case: ${testCase.name}`)
    } catch (error) {
      this.#logger.error(`Failed to submit test case: ${testCase.name}`, error)
    }
  }

  async submitTestCases(sessionId: string, testCases: ITestCase[]) {
    const promises = testCases.map((testCase) => this.submitTestCase(sessionId, testCase))
    await Promise.allSettled(promises)
  }

  async closeSession(sessionId: string, status = TEST_STATUS.SUCCESS) {
    try {
      this.#logger.debug(`Closing test session: ${sessionId} with status: ${status}`)

      const url = `/unit-tests/sessions/${sessionId}/close`
      await this.#axiosInstance.post(url, { status })

      this.#logger.info(`Successfully closed session: ${sessionId} with status: ${status}`)
    } catch (error) {
      this.#logger.error(`Failed to close session: ${sessionId}`, error)
    }
  }
}
