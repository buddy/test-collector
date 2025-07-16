export class Logger {
  prefix: string
  debugEnabled: boolean

  constructor(prefix = 'JS-Test-Collector') {
    this.prefix = prefix
    this.debugEnabled = process.env.BUDDY_LOGGER_DEBUG === '1'
  }

  // Safe JSON stringify that handles circular references
  #safeStringify(obj: unknown): string {
    if (obj === null || obj === undefined) return ''

    const cache = new Set()
    return JSON.stringify(
      obj,
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

  debug(message: string, data: unknown = null) {
    if (this.debugEnabled) {
      console.log(`[${this.prefix}] DEBUG: ${message}`, data ? this.#safeStringify(data) : '')
    }
  }

  info(message: string, data: unknown = null) {
    console.log(`[${this.prefix}] INFO: ${message}`, data ? this.#safeStringify(data) : '')
  }

  warn(message: string, data: unknown = null) {
    console.warn(`[${this.prefix}] WARN: ${message}`, data ? this.#safeStringify(data) : '')
  }

  error(message: string, error: unknown = null) {
    console.error(
      `[${this.prefix}] ERROR: ${message}`,
      error ? (error instanceof Error ? error.stack : this.#safeStringify(error)) : '',
    )
  }
}
