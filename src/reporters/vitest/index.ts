import { createSafeReporter } from '@/utils/safe-reporter'
import BuddyVitestReporter from './reporter'

export default createSafeReporter(BuddyVitestReporter)
