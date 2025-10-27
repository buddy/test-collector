import type { TestResult as JestTestResult } from '@jest/reporters'
import type { AssertionResult as JestAssertionResult } from '@jest/test-result'
import type { TestCase as PlaywrightTestCase, TestResult as PlaywrightTestResult } from '@playwright/test/reporter'
import type { Test as MochaTest } from 'mocha'
import type { TestCase as VitestTestCase, TestResult as VitestTestResult } from 'vitest/node'
import { type IBuddyUTPreparsedTestCase, UT_TESTCASE_STATUS } from '@/core/types'
import logger from '@/utils/logger'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class TestResultMapper {
  static displayName = 'TestResultMapper'

  static #makeTestCase(
    testcase: Omit<IBuddyUTPreparsedTestCase, 'data'>,
    data: Omit<IBuddyUTPreparsedTestCase['data'], keyof typeof testcase>,
  ): IBuddyUTPreparsedTestCase {
    return {
      ...testcase,
      data: {
        ...testcase,
        ...data,
        failure: testcase.status === UT_TESTCASE_STATUS.PASSED ? undefined : data.failure,
      },
    }
  }

  static #getStatusFromTestResult<T extends string>(
    testResult: T | undefined | null,
    statusMap: Partial<Record<NonNullable<T>, IBuddyUTPreparsedTestCase['status']>>,
  ): IBuddyUTPreparsedTestCase['status'] {
    return (
      statusMap[testResult] ??
      (() => {
        logger.debug(`Unknown test result status: ${testResult}. Defaulting to ERROR.`)
        return 'ERROR' as IBuddyUTPreparsedTestCase['status']
      })()
    )
  }

  static mapJestResult(
    assertionResult: JestAssertionResult,
    testResult: JestTestResult,
    relativeFilePath?: string,
  ): IBuddyUTPreparsedTestCase {
    const status = this.#getStatusFromTestResult(assertionResult.status, {
      passed: UT_TESTCASE_STATUS.PASSED,
      failed: UT_TESTCASE_STATUS.FAILED,
      skipped: UT_TESTCASE_STATUS.SKIPPED,
      pending: UT_TESTCASE_STATUS.SKIPPED,
      todo: UT_TESTCASE_STATUS.SKIPPED,
      disabled: UT_TESTCASE_STATUS.SKIPPED,
      focused: UT_TESTCASE_STATUS.SKIPPED,
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

  static mapJasmineResult(result: jasmine.SpecResult, relativeFilePath?: string): IBuddyUTPreparsedTestCase {
    const status = this.#getStatusFromTestResult(result.status, {
      passed: UT_TESTCASE_STATUS.PASSED,
      failed: UT_TESTCASE_STATUS.FAILED,
      pending: UT_TESTCASE_STATUS.SKIPPED,
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

  static mapMochaResult(test: MochaTest, relativeFilePath?: string): IBuddyUTPreparsedTestCase {
    const status = this.#getStatusFromTestResult(test.state, {
      passed: UT_TESTCASE_STATUS.PASSED,
      failed: UT_TESTCASE_STATUS.FAILED,
      pending: UT_TESTCASE_STATUS.SKIPPED,
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
  ): IBuddyUTPreparsedTestCase {
    const status = this.#getStatusFromTestResult(result.status, {
      passed: UT_TESTCASE_STATUS.PASSED,
      failed: UT_TESTCASE_STATUS.FAILED,
      skipped: UT_TESTCASE_STATUS.SKIPPED,
      timedOut: UT_TESTCASE_STATUS.FAILED,
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
    test: VitestTestCase,
    result: VitestTestResult,
    relativeFilePath?: string,
  ): IBuddyUTPreparsedTestCase {
    const status = this.#getStatusFromTestResult(result.state, {
      passed: UT_TESTCASE_STATUS.PASSED,
      pending: UT_TESTCASE_STATUS.SKIPPED,
      failed: UT_TESTCASE_STATUS.FAILED,
      skipped: UT_TESTCASE_STATUS.SKIPPED,
    })

    const testGroupName = relativeFilePath || 'Unknown Test Group'
    const testName = test.fullName
    const duration = test.diagnostic()?.duration

    return TestResultMapper.#makeTestCase(
      {
        name: testName,
        classname: testGroupName,
        test_group_name: testGroupName,
        status,
        time: duration ? duration / 1000 : 0,
      },
      {
        failure: {
          message:
            (result.errors?.length ?? 0) > 0 ? (result.errors?.map((error) => error.message).join('\n') ?? '') : '',
          stackTrace: (result.errors?.length ?? 0) > 0 ? result.errors?.map((error) => error.stack).join('\n') : '',
        },
      },
    )
  }
}
