import { PACKAGE_NAME, PACKAGE_VERSION } from '@/core/const'
import environment from '@/utils/environment'

class Logger {
  #prefix: string
  #level?: string

  constructor() {
    this.#prefix = `${PACKAGE_NAME}@${PACKAGE_VERSION}`
    this.#level = environment.BUDDY_LOGGER_LEVEL || 'info'
  }

  #safeStringify(object: unknown): string {
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
    if (this.#level === 'debug') {
      console.log(`[${this.#prefix}] DEBUG: ${message}`, data ? this.#safeStringify(data) : '')
    }
  }

  info(message: string, data?: unknown) {
    if (this.#level && ['info', 'debug'].includes(this.#level)) {
      console.log(`[${this.#prefix}] INFO: ${message}`, data ? this.#safeStringify(data) : '')
    }
  }

  warn(message: string, data?: unknown) {
    if (this.#level && ['info', 'debug'].includes(this.#level)) {
      console.warn(`[${this.#prefix}] WARN: ${message}`, data ? this.#safeStringify(data) : '')
    }
  }

  error(message: string, error: unknown) {
    const errorMessage = error instanceof Error ? error.message : this.#safeStringify(error)
    console.error(`[${this.#prefix}] ERROR: ${message}${errorMessage ? ` - ${errorMessage}` : ''}`)
  }
}

export default new Logger()
