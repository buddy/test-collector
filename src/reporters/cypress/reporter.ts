import { MochaOptions, Runner } from 'mocha'
import sessionManager from '@/core/session-manager'
import BuddyMochaReporter from '@/reporters/mocha/reporter'
import { Logger } from '@/utils/logger'

/**
 * Cypress-specific reporter that extends Mocha reporter but handles session creation differently.
 * Cypress runs each spec file in isolation, so we need to ensure session reuse across files.
 * @see {@link https://docs.cypress.io/app/tooling/reporters#Custom-reporters}
 */
export default class BuddyCypressReporter extends BuddyMochaReporter {
  static displayName = 'BuddyCypressReporter'

  constructor(runner: Runner, options: MochaOptions) {
    super(runner, options)
    this.logger = new Logger(BuddyCypressReporter.displayName)
  }

  async onStart() {
    this.logger.debug('Cypress test run started')

    try {
      // For Cypress, we want to reuse existing sessions across spec files
      // Check if session already exists before creating a new one
      if (sessionManager.sessionId) {
        this.logger.debug('Reusing existing session for Cypress spec file')
        return
      }

      await sessionManager.getOrCreateSession('cypress')
      this.logger.debug('Session created/retrieved for Cypress test run')
    } catch (error) {
      this.logger.error('Error creating session at Cypress test run start', error)
      sessionManager.markFrameworkError()
    }
  }
}
