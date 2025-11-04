import BuddyVitestReporter from '@/reporters/vitest/reporter'
import { getSafeReporter } from '@/utils/safe-reporter'

export default getSafeReporter(BuddyVitestReporter, 'vitest')
