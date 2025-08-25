import { createSafeReporterObject } from '@/utils/safe-reporter'
import BuddyJasmineReporter from './reporter'

export default createSafeReporterObject(BuddyJasmineReporter, 'BuddyJasmineReporter')
