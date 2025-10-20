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

  static #makeTestCase(
    testcase: Omit<IBuddyUnitTestApiTestCase, 'data'>,
    data: Omit<IBuddyUnitTestApiTestCase['data'], keyof typeof testcase>,
  ): IBuddyUnitTestApiTestCase {
    return {
      ...testcase,
      data: {
        ...testcase,
        ...data,
        failure: testcase.status === BUDDY_UNIT_TEST_STATUS.PASSED ? undefined : data.failure,
      },
    }
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

  static mapJestResult(
    assertionResult: JestAssertionResult,
    testResult: JestTestResult,
    relativeFilePath?: string,
  ): IBuddyUnitTestApiTestCase {
    const status = this.#getStatusFromTestResult(assertionResult.status, {
      passed: BUDDY_UNIT_TEST_STATUS.PASSED,
      failed: BUDDY_UNIT_TEST_STATUS.FAILED,
      skipped: BUDDY_UNIT_TEST_STATUS.SKIPPED,
      pending: BUDDY_UNIT_TEST_STATUS.SKIPPED,
      todo: BUDDY_UNIT_TEST_STATUS.SKIPPED,
      disabled: BUDDY_UNIT_TEST_STATUS.SKIPPED,
      focused: BUDDY_UNIT_TEST_STATUS.SKIPPED,
    })

    // Use relative file path as test group name if available, otherwise use full path
    const testGroupName = relativeFilePath || testResult.testFilePath

    // Build full test name with hierarchy
    const nameParts: string[] = []
    if (assertionResult.ancestorTitles.length > 0) {
      nameParts.push(...assertionResult.ancestorTitles)
    }
    nameParts.push(assertionResult.title)
    const testName = nameParts.join(' > ')

    return TestResultMapper.#makeTestCase(
      {
        name: testName,
        classname: testGroupName,
        test_group_name: testGroupName,
        status,
        time: assertionResult.duration ? assertionResult.duration / 1000 : 0,
      },
      {
        failure: {
          message:
            assertionResult.failureDetails.length > 0
              ? (assertionResult.failureDetails as { matcherResult?: { message: string } }[])
                  .map((d) => d.matcherResult?.message ?? '')
                  .join('\n')
              : '',
          stackTrace: assertionResult.failureMessages.length > 0 ? assertionResult.failureMessages.join('\n') : '',
        },
      },
    )
  }

  static mapJasmineResult(result: jasmine.SpecResult, relativeFilePath?: string): IBuddyUnitTestApiTestCase {
    const status = this.#getStatusFromTestResult(result.status, {
      passed: BUDDY_UNIT_TEST_STATUS.PASSED,
      failed: BUDDY_UNIT_TEST_STATUS.FAILED,
      pending: BUDDY_UNIT_TEST_STATUS.SKIPPED,
    })

    // Use relative file path as test group name if available
    const testGroupName = relativeFilePath || result.filename || 'Unknown Test Group'

    // Use fullName as the complete test name (includes hierarchy)
    const testName = result.fullName || result.description

    return TestResultMapper.#makeTestCase(
      {
        name: testName,
        classname: testGroupName,
        test_group_name: testGroupName,
        status: status,
        time: (result.duration ?? 0) / 1000 || 0,
      },
      {
        failure: {
          message: result.failedExpectations.map((exp) => exp.message).join('\n') || '',
          stackTrace: result.failedExpectations.map((exp) => exp.stack).join('\n') || '',
        },
      },
    )
  }

  static mapMochaResult(test: MochaTest, relativeFilePath?: string): IBuddyUnitTestApiTestCase {
    const status = this.#getStatusFromTestResult(test.state, {
      passed: BUDDY_UNIT_TEST_STATUS.PASSED,
      failed: BUDDY_UNIT_TEST_STATUS.FAILED,
      pending: BUDDY_UNIT_TEST_STATUS.SKIPPED,
    })

    // Use relative file path as test group name if available
    const testGroupName = relativeFilePath || test.file || 'Unknown Test Group'

    // Build full test name with hierarchy
    const testName = test.fullTitle() || test.title

    return TestResultMapper.#makeTestCase(
      {
        name: testName,
        classname: testGroupName,
        test_group_name: testGroupName,
        status: status,
        time: test.duration ? test.duration / 1000 : 0,
      },
      {
        failure: {
          stackTrace: test.err ? test.err.stack : '',
          message: test.err ? test.err.message : '',
        },
      },
    )
  }

  static mapPlaywrightResult(
    test: PlaywrightTestCase,
    result: PlaywrightTestResult,
    relativeFilePath?: string,
  ): IBuddyUnitTestApiTestCase {
    const status = this.#getStatusFromTestResult(result.status, {
      passed: BUDDY_UNIT_TEST_STATUS.PASSED,
      failed: BUDDY_UNIT_TEST_STATUS.FAILED,
      skipped: BUDDY_UNIT_TEST_STATUS.SKIPPED,
      timedOut: BUDDY_UNIT_TEST_STATUS.FAILED,
    })

    // Use relative file path as test group name if available
    const testGroupName = relativeFilePath || test.location.file

    // Build test name with hierarchy - Playwright includes parent titles
    // Filter out the file path from parent titles if it matches the test group name
    const titles: string[] = []
    let parent: typeof test.parent | undefined = test.parent
    while (parent) {
      if (
        parent.title && // Skip the title if it's the same as the file path (test group name)
        parent.title !== testGroupName &&
        parent.title !== test.location.file
      ) {
        titles.unshift(parent.title)
      }
      parent = parent.parent
    }

    // Build the test name from parent titles and test title
    const nameParts: string[] = []
    if (titles.length > 0) {
      nameParts.push(...titles)
    }
    nameParts.push(test.title)
    const testName = nameParts.join(' > ')

    return TestResultMapper.#makeTestCase(
      {
        name: testName,
        classname: testGroupName,
        test_group_name: testGroupName,
        status: status,
        time: result.duration ? result.duration / 1000 : 0,
      },
      {
        failure: {
          message: result.error ? result.error.message || '' : '',
          stackTrace: result.error ? result.error.stack || '' : '',
        },
      },
    )
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

    return TestResultMapper.#makeTestCase(
      {
        name: testName,
        classname: testGroupName,
        test_group_name: testGroupName,
        status,
        time: taskResult.duration ? taskResult.duration / 1000 : 0,
      },
      {
        failure: {
          message:
            (taskResult.errors?.length ?? 0) > 0
              ? (taskResult.errors?.map((error) => error.message).join('\n') ?? '')
              : '',
          stackTrace:
            (taskResult.errors?.length ?? 0) > 0 ? taskResult.errors?.map((error) => error.stack).join('\n') : '',
        },
      },
    )
  }
}
