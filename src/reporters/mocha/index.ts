import BuddyMochaReporter from '@/reporters/mocha/reporter'
import { getSafeReporter } from '@/utils/safe-reporter'

const Reporter = getSafeReporter(BuddyMochaReporter)

export default Reporter

// Ensure CommonJS compatibility for Mocha
// eslint-disable-next-line unicorn/prefer-module
module.exports = Reporter
