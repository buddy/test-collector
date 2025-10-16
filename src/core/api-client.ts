import { IncomingHttpHeaders } from 'node:http'
import BuddyUnitTestCollectorConfig from '@/core/config'
import { TestCaseQueue } from '@/core/test-case-queue'
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
  #queue: TestCaseQueue | undefined = undefined
  #sessionId: string | undefined = undefined

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

      // Initialize and start the queue for this session
      this.#initializeQueue(sessionId)

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

      // Initialize and start the queue for this session
      this.#initializeQueue(newSessionId)

      return newSessionId
    } catch (error) {
      logger.error(`Failed to reopen session: ${sessionId}`, error)
      setEnvironmentVariable('BUDDY_API_FAILURE', true)
      throw error
    }
  }

  async submitTestCaseBatch(sessionId: string, testCases: IBuddyUnitTestApiTestCase[]): Promise<void> {
    const startTime = Date.now()

    try {
      logger.debug(`Submitting batch of ${String(testCases.length)} test cases`)

      await this.#fetch(`/unit-tests/sessions/${sessionId}/cases/batch`, {
        method: 'POST',
        body: JSON.stringify({ cases: testCases }),
      })

      const duration = Date.now() - startTime
      logger.debug(
        `Successfully submitted batch of ${String(testCases.length)} test cases (took ${String(duration)}ms)`,
      )
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error(
        `Failed to submit batch of ${String(testCases.length)} test cases after ${String(duration)}ms`,
        error,
      )
      setEnvironmentVariable('BUDDY_API_FAILURE', true)
      throw error
    }
  }

  async closeSession(sessionId: string, status = BUDDY_UNIT_TEST_STATUS.PASSED) {
    try {
      logger.debug(`Closing test session: ${sessionId} with status: ${status}`)

      // Drain the queue before closing the session
      await this.drainQueue()

      await this.#fetch(`/unit-tests/sessions/${sessionId}/close`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      })

      logger.info(`Successfully closed session: ${sessionId} with status: ${status}`)
      logger.debug(`Close session response: OK`)

      // Clean up the queue after session is closed
      this.#cleanupQueue()
    } catch (error) {
      logger.error(`Failed to close session: ${sessionId}`, error)
      setEnvironmentVariable('BUDDY_API_FAILURE', true)
      throw error
    }
  }

  // Queue management methods

  #initializeQueue(sessionId: string) {
    // Clean up existing queue if any
    this.#cleanupQueue()

    this.#sessionId = sessionId
    this.#queue = new TestCaseQueue({
      batchIntervalMs: 3000, // Flush every 3 seconds
      maxBatchSize: 100, // Max 100 test cases per batch
      retryCount: 2,
      retryDelayMs: 500,
      onBatchSubmit: async (batch) => {
        if (!this.#sessionId) {
          throw new Error('Session ID not available for batch submission')
        }
        await this.submitTestCaseBatch(this.#sessionId, batch)
      },
    })

    this.#queue.start()
    logger.debug('TestCaseQueue initialized and started')
  }

  #cleanupQueue() {
    if (this.#queue) {
      this.#queue.stop()
      this.#queue = undefined
      this.#sessionId = undefined
      logger.debug('TestCaseQueue cleaned up')
    }
  }

  submitTestCase(testCase: IBuddyUnitTestApiTestCase) {
    if (!this.#queue) {
      const error = new Error('Queue not initialized. Create a session first.')
      logger.error('Queue not initialized - test case submission skipped', error)
      throw error
    }
    this.#queue.submitTestCase(testCase)
  }

  async drainQueue() {
    if (this.#queue) {
      logger.debug('Draining queue before closing session')
      await this.#queue.drain()
      logger.debug('Queue drained successfully')
    }
  }

  async flushQueue() {
    if (this.#queue) {
      await this.#queue.flushNow()
    }
  }

  getQueueSize(): number {
    return this.#queue?.getQueueSize() ?? 0
  }
}
