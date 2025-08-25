import { Logger } from '@/utils/logger'

/**
 * Wraps a reporter class to catch all errors and log them without throwing.
 * This ensures that reporter errors never prevent tests from running.
 */
export function createSafeReporter<T extends new (...arguments_: never[]) => object>(ReporterClass: T): T {
  const logger = new Logger(`Safe${ReporterClass.name || 'Reporter'}`)

  return new Proxy(ReporterClass, {
    construct(Target, arguments_: never[]) {
      try {
        const instance = new Target(...arguments_)

        return new Proxy(instance, {
          get(target, property, receiver) {
            const value: unknown = Reflect.get(target, property, receiver)

            if (typeof value === 'function') {
              return new Proxy(value, {
                apply(function_, thisArgument, argumentsList) {
                  try {
                    const result: unknown = Reflect.apply(function_, thisArgument, argumentsList)

                    if (result instanceof Promise) {
                      return result.catch((error: unknown) => {
                        logger.error(`Error in ${String(property)}:`, error)
                        return
                      })
                    }

                    return result
                  } catch (error) {
                    logger.error(`Error in ${String(property)}:`, error)
                    return
                  }
                },
              })
            }

            return value
          },
        })
      } catch (error) {
        logger.error('Failed to initialize reporter:', error)
        return new Proxy(
          {},
          {
            get() {
              return () => void {}
            },
          },
        )
      }
    },
  })
}

/**
 * Wraps a reporter object to catch all errors and log them without throwing.
 * This is for reporters that are plain objects, not classes (like Jasmine).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createSafeReporterObject<T extends Record<PropertyKey, (...arguments_: any[]) => void | Promise<void>>>(
  reporter: T,
  name = 'Reporter',
): T {
  const logger = new Logger(`Safe${name}`)

  return new Proxy(reporter, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver)

      if (typeof value === 'function') {
        return new Proxy(value, {
          apply(function_, thisArgument, argumentsList) {
            try {
              const result: unknown = Reflect.apply(function_, thisArgument, argumentsList)

              if (result instanceof Promise) {
                return result.catch((error: unknown) => {
                  logger.error(`Error in ${String(property)}:`, error)
                  return
                })
              }

              return result
            } catch (error) {
              logger.error(`Error in ${String(property)}:`, error)
              return
            }
          },
        })
      }

      return value
    },
  })
}
