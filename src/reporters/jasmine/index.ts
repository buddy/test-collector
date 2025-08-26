import BuddyJasmineReporter from '@/reporters/jasmine/reporter'
import { getSafeReporter } from '@/utils/safe-reporter'

export default getSafeReporter(BuddyJasmineReporter)
