import { environmentError } from '@/utils/environment'
import logger from '@/utils/logger'

const reporterInstances = new Set<string>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NoopReporter<R extends object | (new (...arguments_: any[]) => object)>(Reporter: R) {
  if (typeof Reporter === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    return class {} as R
  }

  return {} as R
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSafeReporter<R extends object | (new (...arguments_: any[]) => object)>(
  Reporter: R,
  uniqueInstanceName?: string,
): R {
  if (environmentError) {
    logger.error('Environment configuration error - collector disabled', environmentError)
    logger.warn('Tests will continue to run, but results will not be collected')

    return NoopReporter(Reporter)
  }

  // Only enforce singleton if uniqueInstanceName is provided
  if (uniqueInstanceName) {
    if (reporterInstances.has(uniqueInstanceName)) {
      logger.debug(`Returning no-op ${uniqueInstanceName} reporter (prevented duplicate registration)`)
      return NoopReporter(Reporter)
    } else {
      reporterInstances.add(uniqueInstanceName)
    }
  }

  return Reporter
}
