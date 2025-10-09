import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import BuddyUnitTestApiClient from '@/core/api-client'
import BuddyUnitTestCollectorConfig from '@/core/config'
import { BUDDY_UNIT_TEST_STATUS, IBuddyUnitTestApiTestCase } from '@/core/types'
import environment, { setEnvironmentVariable } from '@/utils/environment'
import logger from '@/utils/logger'

class BuddyUnitTestSessionManager {
  static displayName = 'BuddyUnitTestSessionManager'

  #context = 'generic'

  sessionId: string | undefined
  createSession: Promise<string | undefined> | undefined
  initialized: boolean
  hasFrameworkErrors: boolean
  hasErrorTests: boolean
  hasFailedTests: boolean

  // Batching mechanism for improved performance
  #testCaseQueue: IBuddyUnitTestApiTestCase[] = []
  #batchTimer: NodeJS.Timeout | undefined
  #batchSize = 25 // Optimal batch size for parallel processing
  #batchDelayMs = 100 // Wait time before processing batch

  #config: BuddyUnitTestCollectorConfig | undefined
  get config() {
    if (!this.#config) {
      throw new Error(`${BuddyUnitTestSessionManager.displayName} not initialized`)
    }
    return this.#config
  }

  #apiClient: BuddyUnitTestApiClient | undefined
  get apiClient() {
    if (!this.#apiClient) {
      throw new Error(`API client not initialized in ${BuddyUnitTestSessionManager.displayName}`)
    }
    return this.#apiClient
  }

  constructor() {
    this.sessionId = undefined
    this.#config = undefined
    this.#apiClient = undefined
    this.createSession = undefined
    this.initialized = false
    this.hasFrameworkErrors = false
    this.hasErrorTests = false
    this.hasFailedTests = false
  }

  async #getCreateSessionPromise() {
    if (this.sessionId) return this.sessionId

    try {
      this.sessionId = await (this.config.sessionId
        ? this.apiClient.reopenSession(this.config.sessionId)
        : this.apiClient.createSession())

      setEnvironmentVariable('BUDDY_SESSION_ID', this.sessionId)
      if (environment.BUDDY_SESSION_ID === this.sessionId) {
        logger.debug(`Session ID stored in environment variable BUDDY_SESSION_ID: ${environment.BUDDY_SESSION_ID}`)
      } else {
        logger.debug('BUDDY_SESSION_ID environment variable could not be updated to match current session ID')
      }

      this.#writeSessionToFile(this.sessionId)
    } catch (error) {
      logger.error('Failed to create/reopen session', error)
      setEnvironmentVariable('BUDDY_API_FAILURE', true)
      // Don't throw - let the error be handled by the caller
    }

    return this.sessionId
  }

  #getSessionFilePath() {
    return path.join(os.tmpdir(), 'buddy-session-id.txt')
  }

  #writeSessionToFile(sessionId: string) {
    try {
      fs.writeFileSync(this.#getSessionFilePath(), sessionId, 'utf8')
      logger.debug(`Session ID written to file: ${sessionId}`)
    } catch (error) {
      logger.error('Failed to write session ID to file', error)
    }
  }

  #readSessionFromFile() {
    try {
      const filePath = this.#getSessionFilePath()
      if (fs.existsSync(filePath)) {
        const sessionId = fs.readFileSync(filePath, 'utf8').trim()
        logger.debug(`Session ID read from file: ${sessionId}`)
        return sessionId
      }
    } catch (error) {
      logger.error('Failed to read session ID from file', error)
    }
    return
  }

  #clearSessionFile() {
    try {
      const filePath = this.#getSessionFilePath()
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        logger.debug('Session file cleared')
      }
    } catch (error) {
      logger.error('Failed to clear session file', error)
    }
  }

  #initialize() {
    if (this.initialized) return

    try {
      this.#config = new BuddyUnitTestCollectorConfig(this.#context)
      this.#apiClient = new BuddyUnitTestApiClient(this.#config)
      this.initialized = true
      logger.debug(`${BuddyUnitTestSessionManager.displayName} initialized`)

      // Automatically set up exit handlers when session manager is initialized
      this.setupProcessExitHandlers()
    } catch (error) {
      logger.error(`Failed to initialize ${BuddyUnitTestSessionManager.displayName}`, error)
      throw error
    }
  }

  async getOrCreateSession(context?: string) {
    if (!this.initialized) {
      if (context) this.#context = context
      this.#initialize()
    }

    if (this.sessionId) return this.sessionId

    if (this.createSession) {
      logger.debug('Session creation already in progress, waiting...')
    } else {
      this.createSession = this.#getCreateSessionPromise()
    }

    try {
      await this.createSession
      return this.sessionId
    } catch (error) {
      logger.error('Session creation failed, continuing without session', error)
      // Don't re-throw - let tests continue without session
      return
    } finally {
      this.createSession = undefined
    }
  }

  async submitTestCase(testCase: IBuddyUnitTestApiTestCase) {
    if (!this.initialized) throw new Error(`${BuddyUnitTestSessionManager.displayName} not initialized`)

    // Track test status for session closure
    if (testCase.status === BUDDY_UNIT_TEST_STATUS.ERROR) {
      this.hasErrorTests = true
      logger.debug(`Tracked ${BUDDY_UNIT_TEST_STATUS.ERROR} test result`)
    } else if (testCase.status === BUDDY_UNIT_TEST_STATUS.FAILED) {
      this.hasFailedTests = true
      logger.debug(`Tracked ${BUDDY_UNIT_TEST_STATUS.FAILED} test result`)
    }

    // Add to batch queue for optimized processing
    this.#testCaseQueue.push(testCase)

    // Process immediately if batch is full
    if (this.#testCaseQueue.length >= this.#batchSize) {
      await this.#processBatch()
      return
    }

    // Schedule batch processing if not already scheduled
    if (!this.#batchTimer) {
      this.#batchTimer = setTimeout(
        () =>
          void (async () => {
            await this.#processBatch()
          })(),
        this.#batchDelayMs,
      )
    }
  }

  async #processBatch() {
    if (this.#testCaseQueue.length === 0) return

    // Clear timer and get current batch
    if (this.#batchTimer) {
      clearTimeout(this.#batchTimer)
      this.#batchTimer = undefined
    }

    const batch = this.#testCaseQueue.splice(0)

    try {
      const sessionId = await this.getOrCreateSession()

      if (!sessionId) {
        throw new Error('Session ID is not available, cannot submit test cases batch')
      }

      logger.debug(`Processing batch of ${String(batch.length)} test cases`)
      await this.apiClient.submitTestCases(sessionId, batch)
    } catch (error) {
      logger.error(`Failed to submit batch of ${String(batch.length)} test cases`, error)
      setEnvironmentVariable('BUDDY_API_FAILURE', true)
      this.hasFrameworkErrors = true
    }
  }

  async #flushPendingTestCases() {
    // Ensure all pending test cases are processed before closing session
    if (this.#testCaseQueue.length > 0 || this.#batchTimer) {
      logger.debug(`Flushing ${String(this.#testCaseQueue.length)} pending test cases`)
      await this.#processBatch()
    }
  }

  async closeSession() {
    if (!this.initialized) {
      this.#initialize()
    }

    // Return early if config is not available (environment error case)
    if (!this.#config) {
      return
    }

    // Flush any pending test cases before closing
    await this.#flushPendingTestCases()

    if (!this.sessionId && environment.BUDDY_SESSION_ID) {
      this.sessionId = environment.BUDDY_SESSION_ID
      logger.debug(`Retrieved session ID from BUDDY_SESSION_ID environment variable: ${this.sessionId}`)
    }

    if (!this.sessionId) {
      this.sessionId = this.#readSessionFromFile()
      if (this.sessionId) {
        logger.debug(`Retrieved session ID from file: ${this.sessionId}`)
      }
    }

    if (this.sessionId) {
      const startTime = Date.now()
      const sessionId = this.sessionId

      try {
        let sessionStatus = BUDDY_UNIT_TEST_STATUS.PASSED

        if (this.hasFrameworkErrors || this.hasErrorTests) {
          sessionStatus = BUDDY_UNIT_TEST_STATUS.ERROR
        } else if (this.hasFailedTests) {
          sessionStatus = BUDDY_UNIT_TEST_STATUS.FAILED
        }

        // Log memory usage before closing
        const mem = process.memoryUsage()
        logger.debug(`Memory usage at session close:`)
        logger.debug(`  Heap Used: ${String(Math.round(mem.heapUsed / 1024 / 1024))}MB`)
        logger.debug(`  Heap Total: ${String(Math.round(mem.heapTotal / 1024 / 1024))}MB`)
        logger.debug(`  RSS: ${String(Math.round(mem.rss / 1024 / 1024))}MB`)

        // Warn if memory usage is high
        const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024)
        if (heapUsedMB > 500) {
          logger.warn(`High memory usage detected: ${String(heapUsedMB)}MB heap used`)
        }

        logger.debug(`Closing session ${sessionId}`)

        await this.apiClient.closeSession(sessionId, sessionStatus)

        const duration = Date.now() - startTime
        logger.info(
          `Session ${sessionId} closed successfully with status: ${sessionStatus} (took ${String(duration)}ms)`,
        )
      } catch (error) {
        const duration = Date.now() - startTime
        logger.error(`Failed to close session ${sessionId} after ${String(duration)}ms`, error)
        setEnvironmentVariable('BUDDY_API_FAILURE', true)

        // Still cleanup even if close failed - prevents zombie sessions
        logger.warn(`Cleaning up session ${sessionId} state despite close failure`)
      } finally {
        this.sessionId = undefined
        this.createSession = undefined
        this.hasFrameworkErrors = false
        this.hasErrorTests = false
        this.hasFailedTests = false

        // Clear batch timer and queue
        if (this.#batchTimer) {
          clearTimeout(this.#batchTimer)
          this.#batchTimer = undefined
        }
        this.#testCaseQueue = []

        delete process.env.BUDDY_SESSION_ID
        logger.debug('Session ID and tracking flags cleared')
        this.#clearSessionFile()
      }
    } else {
      logger.debug('No active session to close')
    }
  }

  markFrameworkError() {
    this.hasFrameworkErrors = true
  }

  #exitHandlersRegistered = false

  async #handleExit(signal: string, shouldExit = false) {
    logger.debug(`Received ${signal}, closing session`)

    let exitCode = 0
    try {
      await this.closeSession()
      logger.debug(`Session closed successfully on ${signal}`)
    } catch (error) {
      logger.error(`Error closing session on ${signal}`, error)
      setEnvironmentVariable('BUDDY_API_FAILURE', true)
      exitCode = 1 // Exit with error code if session close failed
    }

    if (shouldExit) {
      // ESLint allows process.exit() in process event handlers
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit(exitCode)
    }
  }

  setupProcessExitHandlers() {
    if (this.#exitHandlersRegistered) {
      return // Already registered
    }

    this.#exitHandlersRegistered = true
    logger.debug('Setting up process exit handlers for session cleanup')

    // beforeExit is emitted when Node.js empties its event loop and has no additional work to schedule
    process.on('beforeExit', () => {
      void this.#handleExit('beforeExit')
    })

    // SIGINT (Ctrl+C) - User initiated interrupt
    process.on('SIGINT', () => {
      void this.#handleExit('SIGINT', true)
    })

    // SIGTERM - Termination request (e.g., from process manager)
    process.on('SIGTERM', () => {
      void this.#handleExit('SIGTERM', true)
    })

    // SIGHUP - Hang up detected on controlling terminal
    process.on('SIGHUP', () => {
      void this.#handleExit('SIGHUP', true)
    })

    // SIGQUIT - Quit from keyboard
    process.on('SIGQUIT', () => {
      void this.#handleExit('SIGQUIT', true)
    })

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception, closing session before exit', error)
      void this.#handleExit('uncaughtException', true)
    })

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled promise rejection, closing session before exit', reason)
      void this.#handleExit('unhandledRejection', true)
    })
  }
}

export default new BuddyUnitTestSessionManager()
