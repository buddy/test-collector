import sessionManager from '@/core/session-manager'
import BuddyMochaReporter from '@/reporters/mocha/reporter'
import logger from '@/utils/logger'

/**
 * Cypress-specific reporter that extends Mocha reporter but handles session creation differently.
 * Cypress runs each spec file in isolation, so we need to ensure session reuse across files.
 * @see {@link https://docs.cypress.io/app/tooling/reporters#Custom-reporters}
 */
export default class BuddyCypressReporter extends BuddyMochaReporter {
  static displayName = 'BuddyCypressReporter'

  static async closeSession() {
    await sessionManager.closeSession()
  }

  async onStart() {
    logger.debug('Cypress spec file started')

    try {
      // Check if session already exists (from previous spec files or environment)
      const existingSessionId = sessionManager.sessionId || process.env.BUDDY_SESSION_ID

      if (existingSessionId) {
        logger.debug(`Reusing existing session: ${existingSessionId}`)
        // Set the session ID if not already set in session manager
        if (!sessionManager.sessionId) {
          sessionManager.sessionId = existingSessionId
        }
      } else {
        // Only create new session if none exists
        logger.debug('Creating new session for Cypress')
        await sessionManager.getOrCreateSession('cypress')
      }

      logger.debug('Session ready for Cypress spec file')
    } catch (error) {
      logger.debug('Error preparing session for Cypress spec file', error)
    }
  }

  async onEnd() {
    logger.debug('Cypress spec file completed')

    if (this.pendingSubmissions.size > 0) {
      logger.debug(`Waiting for ${String(this.pendingSubmissions.size)} pending test submissions to complete`)
      const maxWaitTime = 10_000
      const startTime = Date.now()

      while (this.pendingSubmissions.size > 0 && Date.now() - startTime < maxWaitTime) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      if (this.pendingSubmissions.size > 0) {
        logger.warn(`Timed out waiting for ${String(this.pendingSubmissions.size)} test submissions`)
      } else {
        logger.debug('All test submissions completed')
      }
    }

    // Keep session open - it will be closed by the after:run hook in setupNodeEvents
    // or by the process exit handlers as fallback
    logger.debug('Cypress spec file completed, keeping session open for other spec files')
  }
}
