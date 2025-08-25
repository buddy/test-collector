import { createSafeReporter } from '@/utils/safe-reporter'
import BuddyPlaywrightReporter from './reporter'

export default createSafeReporter(BuddyPlaywrightReporter)
