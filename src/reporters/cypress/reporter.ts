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

  async onEnd() {
    this.logger.debug('Cypress spec file completed')

    // Wait for pending submissions to complete
    if (this.pendingSubmissions.size > 0) {
      this.logger.debug(`Waiting for ${String(this.pendingSubmissions.size)} pending test submissions to complete`)
      const maxWaitTime = 10_000
      const startTime = Date.now()

      while (this.pendingSubmissions.size > 0 && Date.now() - startTime < maxWaitTime) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      if (this.pendingSubmissions.size > 0) {
        this.logger.warn(`Timed out waiting for ${String(this.pendingSubmissions.size)} test submissions`)
        sessionManager.markFrameworkError()
      } else {
        this.logger.debug('All test submissions completed')
      }
    }

    // DO NOT close the session here for Cypress - let it stay open for subsequent spec files
    // The session will be closed by Cypress when the entire test run is finished
    this.logger.debug('Cypress spec file completed, keeping session open for other spec files')
  }
}
