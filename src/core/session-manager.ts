import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import BuddyUnitTestApiClient from '@/core/api-client'
import BuddyUnitTestCollectorConfig from '@/core/config'
import { ITestCase, TEST_STATUS } from '@/types'
import env, { setEnv } from '@/utils/env'
import { Logger } from '@/utils/logger'

class BuddyUnitTestSessionManager {
  static displayName = 'BuddyUnitTestSessionManager'

  sessionId: string | null
  createSession: Promise<string> | null
  initialized: boolean
  hasFrameworkErrors: boolean
  hasErrorTests: boolean
  hasFailedTests: boolean
  logger: Logger

  #config: BuddyUnitTestCollectorConfig | null
  get config() {
    if (!this.#config) {
      throw new Error(`${BuddyUnitTestSessionManager.displayName} not initialized`)
    }
    return this.#config
  }

  #apiClient: BuddyUnitTestApiClient | null
  get apiClient() {
    if (!this.#apiClient) {
      throw new Error(`API client not initialized in ${BuddyUnitTestSessionManager.displayName}`)
    }
    return this.#apiClient
  }

  async #getCreateSessionPromise() {
    if (this.sessionId) return this.sessionId

    try {
      if (this.config.sessionId) {
        this.sessionId = await this.apiClient.reopenSession(this.config.sessionId)
      } else {
        this.sessionId = await this.apiClient.createSession()
      }

      setEnv('BUDDY_SESSION_ID', this.sessionId)
      if (env.BUDDY_SESSION_ID === this.sessionId) {
        this.logger.debug(`Session ID stored in environment variable BUDDY_SESSION_ID: ${env.BUDDY_SESSION_ID}`)
      } else {
        this.logger.debug('BUDDY_SESSION_ID environment variable could not be updated to match current session ID')
      }

      this.#writeSessionToFile(this.sessionId)
    } catch (error) {
      this.logger.error('Failed to create/reopen session', error)
      throw error
    }

    return this.sessionId
  }

  #getSessionFilePath() {
    return path.join(os.tmpdir(), 'buddy-session-id.txt')
  }

  #writeSessionToFile(sessionId: string) {
    try {
      fs.writeFileSync(this.#getSessionFilePath(), sessionId, 'utf8')
      this.logger.debug(`Session ID written to file: ${sessionId}`)
    } catch (error) {
      this.logger.error('Failed to write session ID to file', error)
    }
  }

  #readSessionFromFile() {
    try {
      const filePath = this.#getSessionFilePath()
      if (fs.existsSync(filePath)) {
        const sessionId = fs.readFileSync(filePath, 'utf8').trim()
        this.logger.debug(`Session ID read from file: ${sessionId}`)
        return sessionId
      }
    } catch (error) {
      this.logger.error('Failed to read session ID from file', error)
    }
    return null
  }

  clearSessionFile() {
    try {
      const filePath = this.#getSessionFilePath()
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        this.logger.debug('Session file cleared')
      }
    } catch (error) {
      this.logger.error('Failed to clear session file', error)
    }
  }

  constructor() {
    const loggerName = BuddyUnitTestSessionManager.displayName
    this.logger = new Logger(loggerName)
    this.sessionId = null
    this.#config = null
    this.#apiClient = null
    this.createSession = null
    this.initialized = false
    this.hasFrameworkErrors = false
    this.hasErrorTests = false
    this.hasFailedTests = false
  }

  initialize(context = 'generic') {
    if (this.initialized) return

    try {
      this.#config = new BuddyUnitTestCollectorConfig(context)
      this.#apiClient = new BuddyUnitTestApiClient(this.#config)
      this.initialized = true
      const loggerNameWithContext = `${BuddyUnitTestSessionManager.displayName}_${context}`
      this.logger = new Logger(loggerNameWithContext)
      this.logger.debug(`${BuddyUnitTestSessionManager.displayName} initialized`)
    } catch (error) {
      this.logger.error(`Failed to initialize ${BuddyUnitTestSessionManager.displayName}`, error)
      throw error
    }
  }

  async getOrCreateSession() {
    if (!this.initialized) this.initialize()
    if (this.sessionId) return this.sessionId

    if (this.createSession) {
      this.logger.debug('Session creation already in progress, waiting...')
    } else {
      this.createSession = this.#getCreateSessionPromise()
    }

    try {
      await this.createSession
      return this.sessionId
    } finally {
      this.createSession = null
    }
  }

  async submitTestCase(testCase: ITestCase) {
    if (!this.initialized) this.initialize()

    try {
      const sessionId = await this.getOrCreateSession()

      if (testCase.status === TEST_STATUS.ERROR) {
        this.hasErrorTests = true
        this.logger.debug(`Tracked ${TEST_STATUS.ERROR} test result`)
      } else if (testCase.status === TEST_STATUS.FAILED) {
        this.hasFailedTests = true
        this.logger.debug(`Tracked ${TEST_STATUS.FAILED} test result`)
      }

      if (!sessionId) {
        throw new Error('Session ID is not available, cannot submit test case')
      }

      await this.apiClient.submitTestCase(sessionId, testCase)
    } catch (error) {
      this.logger.error('Failed to submit test case', error)
      this.hasFrameworkErrors = true
    }
  }

  async closeSession() {
    if (!this.initialized) this.initialize()

    if (!this.sessionId && env.BUDDY_SESSION_ID) {
      this.sessionId = env.BUDDY_SESSION_ID
      this.logger.debug(`Retrieved session ID from BUDDY_SESSION_ID environment variable: ${this.sessionId}`)
    }

    if (!this.sessionId) {
      this.sessionId = this.#readSessionFromFile()
      if (this.sessionId) {
        this.logger.debug(`Retrieved session ID from file: ${this.sessionId}`)
      }
    }

    if (this.sessionId) {
      try {
        let sessionStatus = TEST_STATUS.SUCCESS

        if (this.hasFrameworkErrors || this.hasErrorTests) {
          sessionStatus = TEST_STATUS.ERROR
        } else if (this.hasFailedTests) {
          sessionStatus = TEST_STATUS.FAILED
        }

        this.logger.debug(`Closing session with status: ${sessionStatus}`, {
          frameworkErrors: this.hasFrameworkErrors,
          errorTests: this.hasErrorTests,
          failedTests: this.hasFailedTests,
        })

        await this.apiClient.closeSession(this.sessionId, sessionStatus)
        this.logger.info(`Session ${this.sessionId} closed successfully with status: ${sessionStatus}`)
      } catch (error) {
        this.logger.error('Failed to close session', error)
      } finally {
        this.sessionId = null
        this.createSession = null
        this.hasFrameworkErrors = false
        this.hasErrorTests = false
        this.hasFailedTests = false
        delete process.env.BUDDY_SESSION_ID
        this.logger.debug('Session ID and tracking flags cleared')
        this.clearSessionFile()
      }
    } else {
      this.logger.debug('No active session to close')
    }
  }

  markFrameworkError() {
    this.hasFrameworkErrors = true
  }
}

export default new BuddyUnitTestSessionManager()
