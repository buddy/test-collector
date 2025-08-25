import { createSafeReporter } from '@/utils/safe-reporter'
import BuddyMochaReporter from './reporter'

const SafeBuddyMochaReporter = createSafeReporter(BuddyMochaReporter)

export default SafeBuddyMochaReporter

// Ensure CommonJS compatibility for Mocha
// eslint-disable-next-line unicorn/prefer-module
module.exports = SafeBuddyMochaReporter
