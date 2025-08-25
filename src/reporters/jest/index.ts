import { createSafeReporter } from '@/utils/safe-reporter'
import BuddyJestReporter from './reporter'

export default createSafeReporter(BuddyJestReporter)
