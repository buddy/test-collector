import BuddyJestReporter from '@/reporters/jest/reporter'
import { getSafeReporter } from '@/utils/safe-reporter'

export default getSafeReporter(BuddyJestReporter, 'jest')
