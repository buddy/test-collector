import BuddyCypressReporter from '@/reporters/cypress/reporter'
import { getSafeReporter } from '@/utils/safe-reporter'

const Reporter = getSafeReporter(BuddyCypressReporter)

export default Reporter

// Ensure CommonJS compatibility for Cypress
// eslint-disable-next-line unicorn/prefer-module
module.exports = Reporter
