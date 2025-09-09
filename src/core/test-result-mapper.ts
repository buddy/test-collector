import type { TestResult as JestTestResult } from '@jest/reporters'
import { AssertionResult as JestAssertionResult } from '@jest/test-result'
import type { TestCase as PlaywrightTestCase, TestResult as PlaywrightTestResult } from '@playwright/test/reporter'
import { Test as MochaTest } from 'mocha'
import { RunnerTask as VitestRunnerTask, RunnerTaskResult as VitestRunnerTaskResult } from 'vitest'
import { BUDDY_UNIT_TEST_STATUS, IBuddyUnitTestApiTestCase } from '@/core/types'
import logger from '@/utils/logger'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class TestResultMapper {
  static displayName = 'TestResultMapper'

  static #toXml(object: Record<string, string | undefined>): string {
    let xml = '<data>'
    for (const [key, value] of Object.entries(object)) {
      xml += value ? `<${key}><![CDATA[${value}]]></${key}>` : `<${key}></${key}>`
    }
    xml += '</data>'
    return xml
  }

  static #stripAnsiCodes(text: string): string {
    // Remove ANSI escape codes for colors, formatting, etc.
    // eslint-disable-next-line no-control-regex, unicorn/prefer-string-replace-all
    return text.replace(/\u001B\[[0-9;]*[mGKHF]/g, '')
  }

  static #getStatusFromTestResult<T extends string>(
    testResult: T | undefined | null,
    statusMap: Partial<Record<NonNullable<T>, BUDDY_UNIT_TEST_STATUS>>,
  ): BUDDY_UNIT_TEST_STATUS {
    return (
      statusMap[testResult] ??
      (() => {
        logger.debug(
          `Unknown test result status: ${String(testResult)}. Defaulting to ${BUDDY_UNIT_TEST_STATUS.ERROR}.`,
        )
        return BUDDY_UNIT_TEST_STATUS.ERROR
      })()
    )
  }

  static mapJestResult(assertionResult: JestAssertionResult, testResult: JestTestResult): IBuddyUnitTestApiTestCase {
    const status = this.#getStatusFromTestResult(assertionResult.status, {
      passed: BUDDY_UNIT_TEST_STATUS.PASSED,
      failed: BUDDY_UNIT_TEST_STATUS.FAILED,
      skipped: BUDDY_UNIT_TEST_STATUS.SKIPPED,
      pending: BUDDY_UNIT_TEST_STATUS.SKIPPED,
      todo: BUDDY_UNIT_TEST_STATUS.SKIPPED,
      disabled: BUDDY_UNIT_TEST_STATUS.SKIPPED,
      focused: BUDDY_UNIT_TEST_STATUS.SKIPPED,
    })

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

    // Use the outermost describe block name or fallback to filename
    const testGroupName =
      assertionResult.ancestorTitles.length > 0 ? assertionResult.ancestorTitles[0] : fileNameWithoutExtension

    return {
      name: assertionResult.title,
      classname: testGroupName,
      test_group_name: testGroupName,
      status,
      time: assertionResult.duration ? assertionResult.duration / 1000 : 0,
      data: this.#toXml(dataObject),
    } satisfies IBuddyUnitTestApiTestCase
  }

  static mapJasmineResult(result: jasmine.SpecResult): IBuddyUnitTestApiTestCase {
    const status = this.#getStatusFromTestResult(result.status, {
      passed: BUDDY_UNIT_TEST_STATUS.PASSED,
      failed: BUDDY_UNIT_TEST_STATUS.FAILED,
      pending: BUDDY_UNIT_TEST_STATUS.SKIPPED,
    })

    const dataObject = {
      errorMessage: result.failedExpectations.map((exp) => exp.message).join('\n') || '',
      errorStackTrace: result.failedExpectations.map((exp) => exp.stack).join('\n') || '',
      messages: result.fullName || '',
    }

    // Extract suite name from fullName by removing the test description at the end
    // fullName format: "[jasmine 5.9.0] Status Tests - Part 1 should pass"
    // We want: "[jasmine 5.9.0] Status Tests - Part 1"
    let testGroupName = result.fullName
    if (result.description && testGroupName.endsWith(result.description)) {
      // Remove the test description from the end, including the space before it
      testGroupName = testGroupName.slice(0, -result.description.length).trim()
    }

    return {
      name: result.description,
      classname: testGroupName,
      test_group_name: testGroupName,
      status: status,
      time: (result.duration ?? 0) / 1000 || 0,
      data: this.#toXml(dataObject),
    }
  }

  static mapMochaResult(test: MochaTest): IBuddyUnitTestApiTestCase {
    const status = this.#getStatusFromTestResult(test.state, {
      passed: BUDDY_UNIT_TEST_STATUS.PASSED,
      failed: BUDDY_UNIT_TEST_STATUS.FAILED,
      pending: BUDDY_UNIT_TEST_STATUS.SKIPPED,
    })

    const dataObject = {
      errorMessage: test.err ? test.err.message : '',
      errorStackTrace: test.err ? test.err.stack : '',
      messages: test.fullTitle() || '',
    }

    const testGroupName = test.parent?.title ?? test.file ?? 'Unknown Test Group'

    return {
      name: test.title,
      classname: testGroupName,
      test_group_name: testGroupName,
      status: status,
      time: test.duration ? test.duration / 1000 : 0,
      data: this.#toXml(dataObject),
    }
  }

  static mapPlaywrightResult(test: PlaywrightTestCase, result: PlaywrightTestResult): IBuddyUnitTestApiTestCase {
    const status = this.#getStatusFromTestResult(result.status, {
      passed: BUDDY_UNIT_TEST_STATUS.PASSED,
      failed: BUDDY_UNIT_TEST_STATUS.FAILED,
      skipped: BUDDY_UNIT_TEST_STATUS.SKIPPED,
      timedOut: BUDDY_UNIT_TEST_STATUS.FAILED,
    })

    const dataObject = {
      errorMessage: result.error ? this.#stripAnsiCodes(result.error.message || '') : '',
      errorStackTrace: result.error ? this.#stripAnsiCodes(result.error.stack || '') : '',
      messages: test.location.file || '',
    }

    const testGroupName = (test.parent.title || test.location.file.split('/').pop()) ?? 'Playwright Test Group'

    return {
      name: test.title,
      classname: testGroupName,
      test_group_name: testGroupName,
      status: status,
      time: result.duration ? result.duration / 1000 : 0,
      data: this.#toXml(dataObject),
    }
  }

  static mapVitestResult(
    taskId: VitestRunnerTask['id'],
    taskResult: VitestRunnerTaskResult,
    task?: VitestRunnerTask,
    relativeFilePath?: string,
  ): IBuddyUnitTestApiTestCase {
    const status = this.#getStatusFromTestResult(taskResult.state, {
      pass: BUDDY_UNIT_TEST_STATUS.PASSED,
      fail: BUDDY_UNIT_TEST_STATUS.FAILED,
      skip: BUDDY_UNIT_TEST_STATUS.SKIPPED,
    })

    // Use relative file path as test group name if available
    const testGroupName = relativeFilePath || 'Unknown Test Group'

    // Build the full test name with hierarchy
    let testName = 'Unknown Test'
    if (task) {
      const nameParts: string[] = []

      // Add suite hierarchy if available
      if (task.suite?.name) {
        nameParts.push(task.suite.name)
      }

      // Add test name
      if (task.name) {
        nameParts.push(task.name)
      } else if (taskId) {
        nameParts.push(taskId)
      }

      testName = nameParts.join(' > ')
    } else if (taskId) {
      testName = taskId
    }

    const dataObject = {
      errorMessage:
        (taskResult.errors?.length ?? 0) > 0 ? taskResult.errors?.map((error) => error.message).join('\n') : '',
      errorStackTrace:
        (taskResult.errors?.length ?? 0) > 0 ? taskResult.errors?.map((error) => error.stack).join('\n') : '',
      messages: task?.suite?.name || '',
    }

    return {
      name: testName,
      classname: testGroupName,
      test_group_name: testGroupName,
      status,
      time: taskResult.duration ? taskResult.duration / 1000 : 0,
      data: this.#toXml(dataObject),
    }
  }
}
