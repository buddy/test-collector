import BuddyCypressReporter from '@/reporters/cypress/reporter'
import { getSafeReporter } from '@/utils/safe-reporter'

// NOTE: uniqueInstanceName is not provided because Cypress legitimately creates
// multiple reporter instances (one per spec file). Singleton enforcement would
// cause all specs after the first to be ignored.
const Reporter = getSafeReporter(BuddyCypressReporter)

export default Reporter

// Ensure CommonJS compatibility for Cypress
// eslint-disable-next-line unicorn/prefer-module
module.exports = Reporter
