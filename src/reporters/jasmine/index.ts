import BuddyJasmineReporter from '@/reporters/jasmine/reporter'
import { getSafeReporter } from '@/utils/safe-reporter'

const SafeReporter = getSafeReporter(BuddyJasmineReporter)

export default SafeReporter

// eslint-disable-next-line unicorn/prefer-module
module.exports = SafeReporter
