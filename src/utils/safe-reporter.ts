import { environmentError } from '@/utils/environment'
import logger from '@/utils/logger'

const reporterInstances = new Map<string, object>()

// Creates a no-op reporter instance that ignores all method calls
function makeNoopReporterInstance() {
  return new Proxy(
    {},
    {
      get() {
        return () => {
          /* no-op */
        }
      },
    },
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSafeReporter<R extends object | (new (...arguments_: any[]) => object)>(
  Reporter: R,
  reporterName: string,
): R {
  if (environmentError) {
    logger.error('Environment configuration error - collector disabled', environmentError)
    logger.warn('Tests will continue to run, but results will not be collected')

    if (typeof Reporter === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      return new Proxy(class {}, {
        construct() {
          return makeNoopReporterInstance()
        },
      }) as R
    }

    return makeNoopReporterInstance() as R
  }

  if (typeof Reporter !== 'function') {
    return Reporter
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Proxy(Reporter as new (...arguments_: any[]) => object, {
    construct(target, arguments_) {
      if (reporterInstances.has(reporterName)) {
        logger.debug(`Returning no-op ${reporterName} reporter (prevented duplicate registration)`)
        return makeNoopReporterInstance()
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const instance = new target(...arguments_)
      reporterInstances.set(reporterName, instance)
      logger.debug(`Created singleton instance for ${reporterName} reporter`)
      return instance
    },
  }) as R
}
