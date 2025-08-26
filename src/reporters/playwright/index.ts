import BuddyPlaywrightReporter from '@/reporters/playwright/reporter'
import { getSafeReporter } from '@/utils/safe-reporter'

export default getSafeReporter(BuddyPlaywrightReporter)
