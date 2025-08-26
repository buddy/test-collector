import { environmentError } from '@/utils/environment'
import { Logger } from '@/utils/logger'

export function getSafeReporter<R extends object | (new (...arguments_: unknown[]) => object)>(Reporter: R): R {
  if (environmentError) {
    const logger = new Logger()
    logger.error('Environment configuration error - collector disabled', environmentError)
    logger.warn('Tests will continue to run, but results will not be collected')

    if (typeof Reporter === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      return class {} as R
    }

    return {} as R
  }

  return Reporter
}
