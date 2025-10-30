import { PACKAGE_NAME, PACKAGE_VERSION } from '@/core/const'
import environment from '@/utils/environment'

const LOG_LEVELS = {
  debug: 5,
  info: 4,
  warn: 3,
  error: 2,
  silent: 0,
} as const

class DevelopmentLogger {
  #enabledCategories: Set<string>
  #logger: Logger

  constructor(logger: Logger) {
    this.#logger = logger
    const environmentVariable = environment.BUDDY_DEV_LOGGER
    this.#enabledCategories = environmentVariable
      ? new Set(environmentVariable.split(',').map((s) => s.trim()))
      : new Set()
  }

  a(message: string, data?: unknown) {
    if (this.#enabledCategories.has('a')) {
      console.log(`[${this.#logger.prefix}] DEV-A: ${message}`, data ? this.#logger.safeStringify(data) : '')
    }
  }

  b(message: string, data?: unknown) {
    if (this.#enabledCategories.has('b')) {
      console.log(`[${this.#logger.prefix}] DEV-B: ${message}`, data ? this.#logger.safeStringify(data) : '')
    }
  }
}

class Logger {
  #prefix: string
  level: number
  dev: DevelopmentLogger

  constructor() {
    this.#prefix = `${PACKAGE_NAME}@${PACKAGE_VERSION}`
    const levelName = environment.BUDDY_LOGGER_LEVEL
    this.level = (LOG_LEVELS as Record<string, number>)[levelName ?? ''] ?? LOG_LEVELS.warn
    this.dev = new DevelopmentLogger(this)
  }

  get prefix(): string {
    return this.#prefix
  }

  safeStringify(object: unknown): string {
    if (object === null || object === undefined) return ''

    const cache = new Set()
    return JSON.stringify(
      object,
      (_key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (cache.has(value)) {
            return '[Circular]'
          }
          cache.add(value)
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return value
      },
      2,
    )
  }

  debug(message: string, data?: unknown) {
    if (this.level >= LOG_LEVELS.debug) {
      console.debug(`[${this.#prefix}] DEBUG: ${message}`, data ? this.safeStringify(data) : '')
    }
  }

  info(message: string, data?: unknown) {
    if (this.level >= LOG_LEVELS.info) {
      console.log(`[${this.#prefix}] INFO: ${message}`, data ? this.safeStringify(data) : '')
    }
  }

  warn(message: string, data?: unknown) {
    if (this.level >= LOG_LEVELS.warn) {
      console.warn(`[${this.#prefix}] WARN: ${message}`, data ? this.safeStringify(data) : '')
    }
  }

  error(message: string, error: unknown) {
    if (this.level >= LOG_LEVELS.error) {
      const errorMessage = error instanceof Error ? error.message : this.safeStringify(error)
      console.error(`[${this.#prefix}] ERROR: ${message}${errorMessage ? ` - ${errorMessage}` : ''}`)
    }
  }
}

export default new Logger()
