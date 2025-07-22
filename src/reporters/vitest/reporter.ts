import type { RunnerTask, RunnerTaskResult, RunnerTaskResultPack, RunnerTestFile } from 'vitest'
import type { Vitest } from 'vitest/node'
import type { Reporter } from 'vitest/reporters'
import sessionManager from '@/core/session-manager'
import TestResultMapper from '@/core/test-result-mapper'
import { Logger } from '@/utils/logger'

/**
 * @see {@link https://vitest.dev/advanced/reporters}
 */
export default class BuddyVitestReporter implements Reporter {
  static displayName = 'BuddyVitestReporter'

  #logger: Logger

  tasks: Map<string, RunnerTask>
  processedTests: Set<unknown>
  context: Vitest | undefined

  constructor() {
    this.#logger = new Logger(BuddyVitestReporter.displayName)
    this.setupProcessExitHandlers()
    this.tasks = new Map()
    this.context = undefined
    this.processedTests = new Set()
  }

  setupProcessExitHandlers() {
    process.on('beforeExit', () => {
      this.#logger.debug('Process about to exit, closing session')
      try {
        void (async () => {
          await sessionManager.closeSession()
        })()
        this.#logger.debug('Session closed successfully')
      } catch (error) {
        this.#logger.error('Error closing session on beforeExit', error)
        sessionManager.markFrameworkError()
      }
    })

    process.on('SIGINT', () => {
      this.#logger.debug('Received SIGINT, closing session')
      try {
        void (async () => {
          await sessionManager.closeSession()
        })()
        this.#logger.debug('Session closed successfully on SIGINT')
      } catch (error) {
        this.#logger.error('Error closing session on SIGINT', error)
        sessionManager.markFrameworkError()
      }
      process.exit(0)
    })

    process.on('SIGTERM', () => {
      this.#logger.debug('Received SIGTERM, closing session')
      try {
        void (async () => {
          await sessionManager.closeSession()
        })()
        this.#logger.debug('Session closed successfully on SIGTERM')
      } catch (error) {
        this.#logger.error('Error closing session on SIGTERM', error)
        sessionManager.markFrameworkError()
      }
      process.exit(0)
    })
  }

  onInit(context: Vitest) {
    this.#logger.debug('Vitest reporter initialized')
    this.context = context

    this.#logger.debug('Context properties:', Object.keys(context))

    this.#logger.debug('Context state properties:', Object.keys(context.state))
    this.loadTasksFromContext()

    this.#logger.debug(`Total tasks stored: ${String(this.tasks.size)}`)
  }

  loadTasksFromContext() {
    if (!this.context?.state) return

    try {
      const files = this.context.state.getFiles()
      this.#logger.debug(`Found ${String(files.length)} files`)
      for (const file of files) {
        this.traverseTasks(file)
      }
    } catch (error) {
      this.#logger.error('Error loading tasks from context', error)
    }
  }

  traverseTasks(task: RunnerTestFile | RunnerTask) {
    if (task.id) {
      this.tasks.set(task.id, task)
      this.#logger.debug(`Stored task: ${task.id} -> ${task.name}`)
    }

    if (isTestFile(task)) {
      for (const subTask of task.tasks) {
        this.traverseTasks(subTask)
      }
    }

    function isTestFile(task: RunnerTestFile | RunnerTask): task is RunnerTestFile {
      return Array.isArray((task as RunnerTestFile).tasks)
    }
  }

  async onTaskUpdate(packs: RunnerTaskResultPack[]) {
    try {
      if (this.tasks.size === 0) {
        this.#logger.debug('Attempting to load tasks from context in onTaskUpdate')
        this.loadTasksFromContext()
      }

      for (const pack of packs) {
        if (pack[1]) {
          const [id, taskResult] = pack
          await this.processTaskUpdate(id, taskResult)
        }
      }
    } catch (error) {
      this.#logger.error('Error processing task update', error)
    }
  }

  async processTaskUpdate(taskId: RunnerTask['id'], taskResult: RunnerTaskResult) {
    if (!this.shouldProcessTask(taskId, taskResult)) return

    const task = this.getTaskById(taskId)

    if (task && task.type === 'suite') {
      this.#logger.debug(`Skipping suite-level task: ${taskId} (${task.name})`)
      return
    }

    this.#logger.debug(`Processing TaskId: ${taskId}`)
    this.logTaskDetails(task, taskResult)
    const testResult = TestResultMapper.mapVitestResult(taskId, taskResult, task)
    this.#logger.debug(`Mapped test result:`, testResult)

    try {
      await sessionManager.submitTestCase(testResult)
      this.#logger.debug(`Successfully submitted: ${testResult.name}`)
      this.processedTests.add(taskId)
    } catch {
      this.#logger.debug(`Failed to submit (expected if no config): ${testResult.name}`)
      // Don't re-throw to avoid breaking the test runner
    }
  }

  shouldProcessTask(taskId: RunnerTask['id'], taskResult: RunnerTaskResult) {
    if (taskResult.state === 'pass' || taskResult.state === 'fail' || taskResult.state === 'skip') {
      return true
    }

    const task = this.getTaskById(taskId)
    if (task && task.mode === 'skip') {
      return true
    }

    return false
  }

  getTaskById(taskId: RunnerTask['id']): RunnerTask | undefined {
    let task = this.tasks.get(taskId)

    if (!task && this.context?.state.idMap.has(taskId)) {
      task = this.context.state.idMap.get(taskId)
      this.#logger.debug(`Found task ${taskId} in context.state.idMap`)
    }

    return task
  }

  logTaskDetails(task: RunnerTask | undefined, taskResult: RunnerTaskResult) {
    if (task) {
      this.#logger.debug(`Task object found:`, task)
    } else {
      this.#logger.debug(`Task object: NOT FOUND`)
    }

    this.#logger.debug(`TaskResult:`, taskResult)
  }

  async onFinished() {
    this.#logger.debug('Test run completed, processing any remaining skipped tests')

    for (const [taskId, task] of this.tasks) {
      if (task.mode === 'skip' && task.type === 'test' && !this.processedTests.has(taskId)) {
        this.#logger.debug(`Processing skipped test: ${taskId} (${task.name})`)

        const taskResult: RunnerTaskResult = {
          state: 'skip',
          duration: 0,
          errors: [],
        }

        await this.processSkippedTest(taskId, taskResult, task)
      }
    }

    this.tasks.clear()
    this.processedTests.clear()
    this.#logger.debug('Test run finished, cleaned up memory')
  }

  async processSkippedTest(taskId: RunnerTask['id'], taskResult: RunnerTaskResult, task?: RunnerTask) {
    this.#logger.debug(`Processing skipped TaskId: ${taskId}`)

    this.logTaskDetails(task, taskResult)

    const testResult = TestResultMapper.mapVitestResult(taskId, taskResult, task)

    this.#logger.debug(`Mapped test result:`, testResult)

    try {
      await sessionManager.submitTestCase(testResult)
      this.#logger.debug(`Successfully submitted skipped test: ${testResult.name}`)
      this.processedTests.add(taskId)
    } catch {
      this.#logger.debug(`Failed to submit skipped test (expected if no config): ${testResult.name}`)
    }
  }
}
