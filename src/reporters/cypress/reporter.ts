import { MochaOptions, Runner } from 'mocha'
import BuddyMochaReporter from '@/reporters/mocha/reporter'
import { Logger } from '@/utils/logger'

/**
 * @see {@link https://docs.cypress.io/app/tooling/reporters#Custom-reporters}
 */
export default class BuddyCypressReporter extends BuddyMochaReporter {
  static displayName = 'BuddyCypressReporter'

  constructor(runner: Runner, options: MochaOptions) {
    super(runner, options)
    this.logger = new Logger(BuddyCypressReporter.displayName)
  }
}
