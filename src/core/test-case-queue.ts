import { IBuddyUTPreparsedTestCase } from '@/core/types'
import logger from '@/utils/logger'

export interface TestCaseQueueOptions {
  batchIntervalMs?: number // Batch flush cadence in milliseconds
  maxBatchSize?: number // Maximum items per batch (default 100)
  retryCount?: number // Retry attempts (default 2)
  retryDelayMs?: number // Fixed backoff delay (default 500ms)
  onBatchSubmit: (batch: IBuddyUTPreparsedTestCase[]) => Promise<void> // Callback to submit batch
}

export class TestCaseQueue {
  private readonly batchIntervalMs: number
  private readonly maxBatchSize: number
  private readonly retryCount: number
  private readonly retryDelayMs: number
  private readonly onBatchSubmit: (batch: IBuddyUTPreparsedTestCase[]) => Promise<void>

  private queue: IBuddyUTPreparsedTestCase[] = []
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
  submitTestCase(testCase: IBuddyUTPreparsedTestCase) {
    this.queue.push(testCase)
    logger.debug(`Test case queued: ${testCase.name} (queue size: ${this.queue.length})`)
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
    logger.debug(`Draining TestCaseQueue... (initial queue size: ${this.queue.length})`)

    // Stop the automatic batch timer to prevent interference
    this.stop()

    let iterations = 0
    // Loop until queue is completely empty
    // This handles cases where queue size exceeds maxBatchSize (e.g., 750 tests with maxBatchSize: 100)
    while (this.queue.length > 0 || this.inFlight > 0 || this.batching) {
      iterations++
      logger.debug(
        `Drain loop iteration ${iterations}: queue=${this.queue.length}, inFlight=${this.inFlight}, batching=${this.batching}`,
      )

      // Flush a batch if queue has items and we're not already batching
      if (this.queue.length > 0 && !this.batching) {
        await this.flushBatch()
      }

      // Wait for any in-flight batches to complete before checking again
      if (this.inFlight > 0 || this.batching) {
        await sleep(50)
      }
    }

    logger.debug(`TestCaseQueue drained after ${iterations} iterations`)
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
    const batch: IBuddyUTPreparsedTestCase[] = []
    while (batch.length < this.maxBatchSize && this.queue.length > 0) {
      const item = this.queue.shift()
      if (item) batch.push(item)
    }

    if (batch.length === 0) {
      this.batching = false
      return
    }

    logger.debug(`Flushing batch of ${batch.length} test cases`)
    this.inFlight++

    try {
      await this.sendBatchWithRetry(batch)
      logger.debug(`Successfully flushed batch of ${batch.length} test cases`)
    } catch (error) {
      logger.error(`Batch request failed after retries (${batch.length} test cases)`, error)

      // Only re-queue on transient errors (5xx, timeouts, network errors)
      // Don't re-queue on client errors (4xx) as they won't be fixed by retrying
      const isClientError = error instanceof Error && /HTTP 4\d\d/.test(error.message)

      if (isClientError) {
        logger.error(`Dropping ${batch.length} test cases due to client error (won't retry 4xx errors)`, error)
      } else {
        // Push back preserving order for transient errors only
        this.queue.unshift(...batch)
        logger.debug(`Re-queued ${batch.length} test cases after transient failure`)
      }
    } finally {
      this.inFlight--
      this.batching = false
    }
  }

  private async sendBatchWithRetry(batch: IBuddyUTPreparsedTestCase[]): Promise<void> {
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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function retry<T>(function_: () => Promise<T>, attempts: number, delayMs: number): Promise<T> {
  let lastError: unknown
  for (let index = 0; index <= attempts; index++) {
    try {
      return await function_()
    } catch (error) {
      lastError = error
      if (index < attempts) {
        logger.debug(`Retry ${index + 1}/${attempts} after ${delayMs}ms delay`)
        await sleep(delayMs)
      }
    }
  }
  throw lastError
}
