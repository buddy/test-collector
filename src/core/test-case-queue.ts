import { IBuddyUnitTestApiTestCase } from '@/core/types'
import logger from '@/utils/logger'

export interface TestCaseQueueOptions {
  batchIntervalMs?: number // Batch flush cadence in milliseconds
  maxBatchSize?: number // Maximum items per batch (default 100)
  retryCount?: number // Retry attempts (default 2)
  retryDelayMs?: number // Fixed backoff delay (default 500ms)
  onBatchSubmit: (batch: IBuddyUnitTestApiTestCase[]) => Promise<void> // Callback to submit batch
}

export class TestCaseQueue {
  private readonly batchIntervalMs: number
  private readonly maxBatchSize: number
  private readonly retryCount: number
  private readonly retryDelayMs: number
  private readonly onBatchSubmit: (batch: IBuddyUnitTestApiTestCase[]) => Promise<void>

  private queue: IBuddyUnitTestApiTestCase[] = []
  private running = false
  private batchTimer: ReturnType<typeof setInterval> | undefined = undefined
  private batching = false // Lock to prevent overlapping flushes
  private inFlight = 0 // Count of in-flight batch submissions

  constructor(options: TestCaseQueueOptions) {
    this.batchIntervalMs = options.batchIntervalMs ?? 3000
    this.maxBatchSize = options.maxBatchSize ?? 100
    this.retryCount = options.retryCount ?? 2
    this.retryDelayMs = options.retryDelayMs ?? 500
    this.onBatchSubmit = options.onBatchSubmit
  }

  /** Enqueue a new test case. */
  submitTestCase(testCase: IBuddyUnitTestApiTestCase) {
    this.queue.push(testCase)
    logger.debug(`Test case queued: ${testCase.name} (queue size: ${String(this.queue.length)})`)
  }

  /** Start processing (idempotent). */
  start() {
    if (this.running) return
    this.running = true
    this.startBatchLoop()
    logger.debug('TestCaseQueue started')
  }

  /** Stop processing. Does not clear enqueued items. */
  stop() {
    this.running = false
    if (this.batchTimer) {
      clearInterval(this.batchTimer)
      this.batchTimer = undefined
    }
    logger.debug('TestCaseQueue stopped')
  }

  /** Flush immediately. */
  async flushNow(): Promise<void> {
    await this.flushBatch()
  }

  /** Drain everything (awaits in-flight tasks and flushes remaining queue). */
  async drain(): Promise<void> {
    logger.debug('Draining TestCaseQueue...')
    await this.flushBatch() // Kick one pass

    // Wait for any in-flight batches to complete
    while (this.inFlight > 0 || this.batching) {
      await sleep(50)
    }

    // Final flush if anything was added during drain
    if (this.queue.length > 0) {
      await this.flushBatch()
    }

    logger.debug('TestCaseQueue drained')
  }

  /** Get current queue size. */
  getQueueSize(): number {
    return this.queue.length
  }

  // ---------------- INTERNALS ----------------

  private startBatchLoop() {
    if (this.batchTimer) return
    this.batchTimer = setInterval(() => {
      void this.flushBatch()
    }, this.batchIntervalMs)
  }

  private async flushBatch() {
    if (this.batching) return
    if (this.queue.length === 0) return

    this.batching = true

    // Drain up to maxBatchSize
    const batch: IBuddyUnitTestApiTestCase[] = []
    while (batch.length < this.maxBatchSize && this.queue.length > 0) {
      const item = this.queue.shift()
      if (item) batch.push(item)
    }

    if (batch.length === 0) {
      this.batching = false
      return
    }

    logger.debug(`Flushing batch of ${String(batch.length)} test cases`)
    this.inFlight++

    try {
      await this.sendBatchWithRetry(batch)
      logger.debug(`Successfully submitted batch of ${String(batch.length)} test cases`)
    } catch (error) {
      logger.error(`Batch request failed after retries (${String(batch.length)} test cases)`, error)
      // Push back preserving order
      this.queue.unshift(...batch)
      logger.debug(`Re-queued ${String(batch.length)} test cases after failure`)
    } finally {
      this.inFlight--
      this.batching = false
    }
  }

  private async sendBatchWithRetry(batch: IBuddyUnitTestApiTestCase[]): Promise<void> {
    await retry(
      async () => {
        await this.onBatchSubmit(batch)
      },
      this.retryCount,
      this.retryDelayMs,
    )
  }
}

// --------------- helpers ----------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function retry<T>(function_: () => Promise<T>, attempts: number, delayMs: number): Promise<T> {
  let lastError: unknown
  for (let index = 0; index <= attempts; index++) {
    try {
      return await function_()
    } catch (error) {
      lastError = error
      if (index < attempts) {
        logger.debug(`Retry ${String(index + 1)}/${String(attempts)} after ${String(delayMs)}ms delay`)
        await sleep(delayMs)
      }
    }
  }
  throw lastError
}
