import { relative } from 'pathe'
import type { RunnerTask, RunnerTaskResult, RunnerTaskResultPack, RunnerTestFile } from 'vitest'
import type { Vitest } from 'vitest/node'
import type { Reporter } from 'vitest/reporters'
import sessionManager from '@/core/session-manager'
import TestResultMapper from '@/core/test-result-mapper'
import logger from '@/utils/logger'

/**
 * @see {@link https://vitest.dev/advanced/reporters}
 */
export default class BuddyVitestReporter implements Reporter {
  static displayName = 'BuddyVitestReporter'

  tasks: Map<string, RunnerTask>
  processedTests: Set<unknown>
  context: Vitest | undefined

  constructor() {
    this.tasks = new Map()
    this.context = undefined
    this.processedTests = new Set()
  }

  onInit(context: Vitest) {
    logger.debug('Vitest reporter initialized')
    this.context = context
    this.loadTasksFromContext()

    void (async () => {
      try {
        await sessionManager.getOrCreateSession()
        logger.debug('Session created at Vitest reporter initialization')
      } catch (error) {
        logger.error('Error creating session at Vitest reporter initialization', error)
        sessionManager.markFrameworkError()
      }
    })()
  }

  loadTasksFromContext() {
    if (!this.context?.state) return

    try {
      const files = this.context.state.getFiles()
      for (const file of files) {
        this.traverseTasks(file)
      }
    } catch (error) {
      logger.error('Error loading tasks from context', error)
    }
  }

  traverseTasks(task: RunnerTestFile | RunnerTask) {
    if (task.id) {
      this.tasks.set(task.id, task)
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
        this.loadTasksFromContext()
      }

      for (const pack of packs) {
        if (pack[1]) {
          const [id, taskResult] = pack
          await this.processTaskUpdate(id, taskResult)
        }
      }
    } catch (error) {
      logger.error('Error processing task update', error)
    }
  }

  async processTaskUpdate(taskId: RunnerTask['id'], taskResult: RunnerTaskResult) {
    if (!this.shouldProcessTask(taskId, taskResult)) return

    const task = this.getTaskById(taskId)

    if (task && task.type === 'suite') {
      return
    }

    // Compute relative file path if we have context and task
    let relativeFilePath: string | undefined
    if (this.context && task) {
      const projectRoot = this.context.config.root
      let filePath = ''
      filePath = typeof task.file === 'string' ? task.file : task.file.filepath || task.file.name || ''

      if (filePath) {
        relativeFilePath = relative(projectRoot, filePath)
      }
    }

    const testResult = TestResultMapper.mapVitestResult(taskId, taskResult, task, relativeFilePath)

    try {
      await sessionManager.submitTestCase(testResult)
      this.processedTests.add(taskId)
    } catch {
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
    }

    return task
  }

  async onFinished() {
    logger.debug('Vitest test run completed')

    // Get final state from context for more reliable task collection
    await this.processMissingTests()

    const processedCount = this.processedTests.size
    logger.debug(`Processed ${String(processedCount)} tests total`)

    this.tasks.clear()
    this.processedTests.clear()

    try {
      if (sessionManager.initialized) {
        await sessionManager.closeSession()
        logger.debug('Session closed after Vitest test completion')
      }
    } catch (error) {
      logger.error('Error closing session after Vitest test completion', error)
      sessionManager.markFrameworkError()
    }
  }

  async processMissingTests() {
    // First, process from existing tasks map
    for (const [taskId, task] of this.tasks) {
      if (this.shouldProcessMissedTest(task, taskId)) {
        await this.processSkippedTest(taskId, this.createSkippedResult(), task)
      }
    }

    // Then, get complete state from Vitest context for any we might have missed
    if (this.context?.state) {
      const allFiles = this.context.state.getFiles()
      for (const file of allFiles) {
        await this.processFileForMissedTests(file)
      }
    }
  }

  shouldProcessMissedTest(task: RunnerTask, taskId: string): boolean {
    return task.type === 'test' && !this.processedTests.has(taskId) && (task.mode === 'skip' || task.mode === 'todo')
  }

  createSkippedResult(): RunnerTaskResult {
    return {
      state: 'skip',
      duration: 0,
      errors: [],
    }
  }

  async processFileForMissedTests(file: RunnerTestFile) {
    for (const task of file.tasks) {
      await this.processTaskForMissedTests(task)
    }
  }

  async processTaskForMissedTests(task: RunnerTask) {
    if (task.type === 'test' && !this.processedTests.has(task.id)) {
      // Check if this test should have been processed but wasn't
      const shouldProcess = task.mode === 'skip' || task.mode === 'todo' || task.result?.state === 'skip'
      if (shouldProcess) {
        const resultState = task.result?.state ?? 'unknown'
        logger.debug(`Found missed test: ${task.name} (mode: ${task.mode}, result state: ${String(resultState)})`)
        await this.processSkippedTest(task.id, this.createSkippedResult(), task)
      }
    }

    // Recursively process nested tasks (suites)
    if ('tasks' in task && Array.isArray(task.tasks)) {
      for (const subTask of task.tasks) {
        await this.processTaskForMissedTests(subTask)
      }
    }
  }

  async processSkippedTest(taskId: RunnerTask['id'], taskResult: RunnerTaskResult, task?: RunnerTask) {
    // Compute relative file path if we have context and task
    let relativeFilePath: string | undefined
    if (this.context && task) {
      const projectRoot = this.context.config.root
      let filePath = ''
      filePath = typeof task.file === 'string' ? task.file : task.file.filepath || task.file.name || ''

      if (filePath) {
        relativeFilePath = relative(projectRoot, filePath)
      }
    }

    const testResult = TestResultMapper.mapVitestResult(taskId, taskResult, task, relativeFilePath)

    try {
      await sessionManager.submitTestCase(testResult)
      this.processedTests.add(taskId)
    } catch {
      // Don't re-throw to avoid breaking the test runner
    }
  }
}
