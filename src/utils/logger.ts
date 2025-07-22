import env from '@/utils/environment'

export class Logger {
  #prefix: string
  #debugEnabled: boolean

  constructor(prefix = 'JS-Test-Collector') {
    this.#prefix = prefix
    this.#debugEnabled = env.BUDDY_LOGGER_DEBUG
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
    if (this.#debugEnabled) {
      console.log(`[${this.#prefix}] DEBUG: ${message}`, data ? this.#safeStringify(data) : '')
    }
  }

  info(message: string, data?: unknown) {
    console.log(`[${this.#prefix}] INFO: ${message}`, data ? this.#safeStringify(data) : '')
  }

  warn(message: string, data?: unknown) {
    console.warn(`[${this.#prefix}] WARN: ${message}`, data ? this.#safeStringify(data) : '')
  }

  error(message: string, error: unknown) {
    console.error(
      `[${this.#prefix}] ERROR: ${message}`,
      error ? (error instanceof Error ? error.stack : this.#safeStringify(error)) : '',
    )
  }
}
