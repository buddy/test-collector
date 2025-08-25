import { createSafeReporter } from '@/utils/safe-reporter'
import BuddyCypressReporter from './reporter'

const SafeBuddyCypressReporter = createSafeReporter(BuddyCypressReporter)

export default SafeBuddyCypressReporter

// Ensure CommonJS compatibility for Cypress
// eslint-disable-next-line unicorn/prefer-module
module.exports = SafeBuddyCypressReporter
