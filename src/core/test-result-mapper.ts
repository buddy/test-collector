import type { TestResult as JestTestResult } from '@jest/reporters'
import { AssertionResult as JestAssertionResult } from '@jest/test-result'
import type { TestCase as PlaywrightTestCase, TestResult as PlaywrightTestResult } from '@playwright/test/reporter'
import { Test as MochaTest } from 'mocha'
import { RunnerTask as VitestRunnerTask, RunnerTaskResult as VitestRunnerTaskResult } from 'vitest'
import { BUDDY_UNIT_TEST_STATUS, IBuddyUnitTestApiTestCase } from '@/core/types'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class, unicorn/no-static-only-class
export default class TestResultMapper {
  static displayName = 'TestResultMapper'
  static toXml(object: Record<string, string | undefined>): string {
    let xml = '<data>'
    for (const [key, value] of Object.entries(object)) {
      xml += value ? `<${key}><![CDATA[${value}]]></${key}>` : `<${key}></${key}>`
    }
    xml += '</data>'
    return xml
  }

  static mapJestResult(assertionResult: JestAssertionResult, testResult: JestTestResult): IBuddyUnitTestApiTestCase {
    const isSkipped =
      ['skipped', 'pending', 'todo', 'disabled', 'focused', 'skip'].includes(assertionResult.status) ||
      (assertionResult.invocations === 0 && assertionResult.status !== 'failed')

    function getJestStatus(assertionResult: JestAssertionResult): BUDDY_UNIT_TEST_STATUS {
      switch (assertionResult.status) {
        case 'passed': {
          return BUDDY_UNIT_TEST_STATUS.PASSED
        }
        case 'failed': {
          return BUDDY_UNIT_TEST_STATUS.FAILED
        }
        default: {
          if (isSkipped) {
            return BUDDY_UNIT_TEST_STATUS.SKIPPED
          }
          return BUDDY_UNIT_TEST_STATUS.ERROR
        }
      }
    }

    const status = getJestStatus(assertionResult)

    const dataObject = {
      errorMessage: assertionResult.failureMessages.length > 0 ? assertionResult.failureMessages.join('\n') : '',
      errorStackTrace: assertionResult.failureMessages.length > 0 ? assertionResult.failureMessages.join('\n') : '',
      messages: assertionResult.ancestorTitles.join(' > ') || '',
    }

    const fileName = testResult.testFilePath.split('/').pop()
    const fileNameWithoutExtension = fileName?.replace(/\.[^/.]+$/, '')

    if (!fileNameWithoutExtension) {
      throw new Error('File name without extension could not be determined from test file path')
    }

    return {
      name: assertionResult.title,
      classname: fileNameWithoutExtension,
      suiteName: fileNameWithoutExtension,
      status,
      time: assertionResult.duration ? assertionResult.duration / 1000 : 0,
      data: this.toXml(dataObject),
    } satisfies IBuddyUnitTestApiTestCase
  }

  //   static mapJasmineResult(result) {
  //     const status =
  //       result.status === 'passed'
  //         ? 'PASSED'
  //         : result.status === 'failed'
  //           ? 'FAILED'
  //           : result.status === 'pending'
  //             ? 'SKIPPED'
  //             : 'ERROR'

  //     // Create data object similar to BuddyWorks.Nunit.TestLogger
  //     const dataObj = {
  //       errorMessage: result.failedExpectations?.map((exp) => exp.message).join('\n') || '',
  //       errorStackTrace: result.failedExpectations?.map((exp) => exp.stack).join('\n') || '',
  //       messages: result.fullName || '',
  //     }

  //     const suiteName = result.fullName.split(' ')[0]

  //     return {
  //       name: result.description,
  //       classname: suiteName,
  //       suite_name: suiteName, // Fixed: Only send suite name
  //       status: status,
  //       time: (result.endTime - result.startTime) / 1000 || 0,
  //       data: this.toXml(dataObj),
  //     }
  //   }

  static mapMochaResult(test: MochaTest): IBuddyUnitTestApiTestCase {
    function getMochaStatus(test: MochaTest) {
      switch (test.state) {
        case 'passed': {
          return BUDDY_UNIT_TEST_STATUS.PASSED
        }
        case 'failed': {
          return BUDDY_UNIT_TEST_STATUS.FAILED
        }
        default: {
          if (test.pending) {
            return BUDDY_UNIT_TEST_STATUS.SKIPPED
          }
          return BUDDY_UNIT_TEST_STATUS.ERROR
        }
      }
    }

    const status = getMochaStatus(test)

    // Create data object similar to BuddyWorks.Nunit.TestLogger
    const dataObject = {
      errorMessage: test.err ? test.err.message : '',
      errorStackTrace: test.err ? test.err.stack : '',
      messages: test.fullTitle() || '',
    }

    const suiteName = test.parent?.title ?? test.file ?? 'Unknown Suite'

    return {
      name: test.title,
      classname: suiteName,
      suiteName,
      status: status,
      time: test.duration ? test.duration / 1000 : 0,
      data: this.toXml(dataObject),
    }
  }

  //   static mapCypressResult(test) {
  //     const status =
  //       test.state === 'passed'
  //         ? 'PASSED'
  //         : test.state === 'failed'
  //           ? 'FAILED'
  //           : test.state === 'skipped'
  //             ? 'SKIPPED'
  //             : test.pending
  //               ? 'SKIPPED'
  //               : 'ERROR'

  //     // Create data object similar to BuddyWorks.Nunit.TestLogger
  //     const dataObj = {
  //       errorMessage: test.err ? test.err.message : '',
  //       errorStackTrace: test.err ? test.err.stack : '',
  //       messages: test.body || '',
  //     }

  //     const suiteName = test.parent?.title || 'Cypress Suite'

  //     return {
  //       name: test.title,
  //       classname: suiteName,
  //       suite_name: suiteName, // Fixed: Only send suite name
  //       status: status,
  //       time: test.duration ? test.duration / 1000 : 0,
  //       data: this.toXml(dataObj),
  //     }
  //   }

  static mapPlaywrightResult(test: PlaywrightTestCase, result: PlaywrightTestResult): IBuddyUnitTestApiTestCase {
    function getPlaywrightStatus(result: PlaywrightTestResult) {
      switch (result.status) {
        case 'passed': {
          return BUDDY_UNIT_TEST_STATUS.PASSED
        }
        case 'failed': {
          return BUDDY_UNIT_TEST_STATUS.FAILED
        }
        case 'skipped': {
          return BUDDY_UNIT_TEST_STATUS.SKIPPED
        }
        case 'timedOut': {
          return BUDDY_UNIT_TEST_STATUS.FAILED
        }
        default: {
          return BUDDY_UNIT_TEST_STATUS.ERROR
        }
      }
    }

    const status = getPlaywrightStatus(result)

    const dataObject = {
      errorMessage: result.error ? result.error.message : '',
      errorStackTrace: result.error ? result.error.stack : '',
      messages: test.location.file || '',
    }

    const suiteName = (test.parent.title || test.location.file.split('/').pop()) ?? 'Playwright Suite'

    return {
      name: test.title,
      classname: suiteName,
      suiteName,
      status: status,
      time: result.duration ? result.duration / 1000 : 0,
      data: this.toXml(dataObject),
    }
  }

  static mapVitestResult(
    taskId: VitestRunnerTask['id'],
    taskResult: VitestRunnerTaskResult,
    task?: VitestRunnerTask,
  ): IBuddyUnitTestApiTestCase {
    function getVitestStatus(taskResult: VitestRunnerTaskResult) {
      switch (taskResult.state) {
        case 'pass': {
          return BUDDY_UNIT_TEST_STATUS.PASSED
        }
        case 'fail': {
          return BUDDY_UNIT_TEST_STATUS.FAILED
        }
        case 'skip': {
          return BUDDY_UNIT_TEST_STATUS.SKIPPED
        }
        default: {
          return BUDDY_UNIT_TEST_STATUS.ERROR
        }
      }
    }

    const status = getVitestStatus(taskResult)

    const dataObject = {
      errorMessage:
        (taskResult.errors?.length ?? 0) > 0 ? taskResult.errors?.map((error) => error.message).join('\n') : '',
      errorStackTrace:
        (taskResult.errors?.length ?? 0) > 0 ? taskResult.errors?.map((error) => error.stack).join('\n') : '',
      messages: taskId || '',
    }

    let testName = 'Unknown Test'
    let suiteName = 'Unknown Suite'

    if (task) {
      testName = task.name || taskId || 'Unknown Test'

      if (task.suite?.name) {
        suiteName = task.suite.name
      } else {
        let filePath = ''
        if (typeof task.file === 'string') {
          filePath = task.file
        } else if (task.file.filepath) {
          filePath = task.file.filepath
        } else if (task.file.name) {
          filePath = task.file.name
        }

        if (filePath) {
          const fileName = filePath.split('/').pop()
          if (!fileName) {
            throw new Error('File name could not be determined from task file path')
          }
          suiteName = fileName.replace(/\.(test|spec)\.(js|ts|jsx|tsx)$/, '')
        } else {
          suiteName = 'Vitest Suite'
        }
      }
    } else {
      if (taskId) {
        testName = taskId
      }

      suiteName = 'Vitest Suite'
    }

    return {
      name: testName,
      classname: suiteName,
      suiteName,
      status,
      time: taskResult.duration ? taskResult.duration / 1000 : 0,
      data: this.toXml(dataObject),
    }
  }
}
