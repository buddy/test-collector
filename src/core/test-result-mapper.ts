import { TestResult } from '@jest/reporters'
import { AssertionResult } from '@jest/test-result'
import { BUDDY_UNIT_TEST_STATUS, IBuddyUnitTestApiTestCase } from '@/core/types'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class TestResultMapper {
  static displayName = 'TestResultMapper'
  static toXml(obj: Record<string, string>): string {
    let xml = '<data>'
    for (const [key, value] of Object.entries(obj)) {
      if (value) {
        xml += `<${key}><![CDATA[${value}]]></${key}>`
      } else {
        xml += `<${key}></${key}>`
      }
    }
    xml += '</data>'
    return xml
  }

  static mapJestResult(assertionResult: AssertionResult, testResult: TestResult): IBuddyUnitTestApiTestCase {
    let status

    const isSkipped =
      assertionResult.status === 'skipped' ||
      assertionResult.status === 'pending' ||
      assertionResult.status === 'todo' ||
      assertionResult.status === 'disabled' ||
      assertionResult.status === 'focused' ||
      // @ts-expect-error assume exists
      assertionResult.status === 'skip' ||
      // @ts-expect-error assume exists
      assertionResult.pending === true ||
      // @ts-expect-error assume exists
      assertionResult.todo === true ||
      // @ts-expect-error assume exists
      assertionResult.skip === true ||
      (assertionResult.invocations === 0 && assertionResult.status !== 'failed')

    if (assertionResult.status === 'passed') {
      status = BUDDY_UNIT_TEST_STATUS.PASSED
    } else if (assertionResult.status === 'failed') {
      status = BUDDY_UNIT_TEST_STATUS.FAILED
    } else if (isSkipped) {
      status = BUDDY_UNIT_TEST_STATUS.SKIPPED
    } else {
      status = BUDDY_UNIT_TEST_STATUS.ERROR
    }

    const dataObj = {
      errorMessage: assertionResult.failureMessages.length > 0 ? assertionResult.failureMessages.join('\n') : '',
      errorStackTrace: assertionResult.failureMessages.length > 0 ? assertionResult.failureMessages.join('\n') : '',
      messages: assertionResult.ancestorTitles.join(' > ') || '',
    }

    const fileName = testResult.testFilePath.split('/').pop()
    const fileNameWithoutExt = fileName?.replace(/\.[^/.]+$/, '')

    if (!fileNameWithoutExt) {
      throw new Error('File name without extension could not be determined from test file path')
    }

    return {
      name: assertionResult.title,
      classname: fileNameWithoutExt,
      suiteName: fileNameWithoutExt,
      status: status,
      time: assertionResult.duration ? assertionResult.duration / 1000 : 0,
      data: this.toXml(dataObj),
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

  //   static mapMochaResult(test) {
  //     const status =
  //       test.state === 'passed' ? 'PASSED' : test.state === 'failed' ? 'FAILED' : test.pending ? 'SKIPPED' : 'ERROR'

  //     // Create data object similar to BuddyWorks.Nunit.TestLogger
  //     const dataObj = {
  //       errorMessage: test.err ? test.err.message : '',
  //       errorStackTrace: test.err ? test.err.stack : '',
  //       messages: test.fullTitle?.() || '',
  //     }

  //     const suiteName = test.parent?.title || test.file || 'Unknown Suite'

  //     return {
  //       name: test.title,
  //       classname: suiteName,
  //       suite_name: suiteName, // Fixed: Only send suite name
  //       status: status,
  //       time: test.duration ? test.duration / 1000 : 0,
  //       data: this.toXml(dataObj),
  //     }
  //   }

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

  //   static mapPlaywrightResult(test, result) {
  //     const status =
  //       result.status === 'passed'
  //         ? 'PASSED'
  //         : result.status === 'failed'
  //           ? 'FAILED'
  //           : result.status === 'skipped'
  //             ? 'SKIPPED'
  //             : result.status === 'timedOut'
  //               ? 'FAILED'
  //               : 'ERROR'

  //     // Create data object similar to BuddyWorks.Nunit.TestLogger
  //     const dataObj = {
  //       errorMessage: result.error ? result.error.message : '',
  //       errorStackTrace: result.error ? result.error.stack : '',
  //       messages: test.location?.file || '',
  //     }

  //     const suiteName = test.parent?.title || test.location?.file?.split('/').pop() || 'Playwright Suite'

  //     return {
  //       name: test.title,
  //       classname: suiteName,
  //       suite_name: suiteName, // Fixed: Only send suite name
  //       status: status,
  //       time: result.duration ? result.duration / 1000 : 0,
  //       data: this.toXml(dataObj),
  //     }
  //   }

  //   static mapVitestResult(taskId, taskResult, task = null) {
  //     const status =
  //       taskResult.state === 'pass'
  //         ? 'PASSED'
  //         : taskResult.state === 'fail'
  //           ? 'FAILED'
  //           : taskResult.state === 'skip'
  //             ? 'SKIPPED'
  //             : 'ERROR'

  //     // Create data object similar to BuddyWorks.Nunit.TestLogger
  //     const dataObj = {
  //       errorMessage: taskResult.errors?.length > 0 ? taskResult.errors.map((e) => e.message).join('\n') : '',
  //       errorStackTrace: taskResult.errors?.length > 0 ? taskResult.errors.map((e) => e.stack).join('\n') : '',
  //       messages: taskResult.name || taskId || '',
  //     }

  //     // Extract test and suite names - prioritize actual task object if available
  //     let testName = 'Unknown Test'
  //     let suiteName = 'Unknown Suite'

  //     if (task) {
  //       // Use actual task object to get proper names
  //       testName = task.name || task.title || taskId || 'Unknown Test'

  //       // Try to get suite name from parent or file
  //       if (task.suite?.name) {
  //         suiteName = task.suite.name
  //       } else if (task.file) {
  //         // Extract filename from path - handle both string and object cases
  //         let filePath = ''
  //         if (typeof task.file === 'string') {
  //           filePath = task.file
  //         } else if (task.file?.filepath) {
  //           filePath = task.file.filepath
  //         } else if (task.file?.name) {
  //           filePath = task.file.name
  //         }

  //         if (filePath) {
  //           const fileName = filePath.split('/').pop()
  //           suiteName = fileName.replace(/\.(test|spec)\.(js|ts|jsx|tsx)$/, '')
  //         } else {
  //           suiteName = 'Vitest Suite'
  //         }
  //       } else {
  //         suiteName = 'Vitest Suite'
  //       }
  //     } else {
  //       // Fallback: Extract test and suite names from taskResult only
  //       if (taskResult.name) {
  //         testName = taskResult.name
  //       } else if (taskId) {
  //         testName = taskId
  //       }

  //       // Extract suite name from various sources
  //       if (taskResult.suite?.name) {
  //         // Direct suite name from taskResult
  //         suiteName = taskResult.suite.name
  //       } else if (taskResult.file) {
  //         // Extract suite name from file path
  //         const fileName = taskResult.file.split('/').pop()
  //         suiteName = fileName.replace(/\.(test|spec)\.(js|ts|jsx|tsx)$/, '')
  //       } else if (taskResult.location?.file) {
  //         // Extract from location.file
  //         const fileName = taskResult.location.file.split('/').pop()
  //         suiteName = fileName.replace(/\.(test|spec)\.(js|ts|jsx|tsx)$/, '')
  //       } else if (taskResult.filepath) {
  //         // Extract from filepath
  //         const fileName = taskResult.filepath.split('/').pop()
  //         suiteName = fileName.replace(/\.(test|spec)\.(js|ts|jsx|tsx)$/, '')
  //       } else {
  //         // Default fallback
  //         suiteName = 'Vitest Suite'
  //       }
  //     }

  //     return {
  //       name: testName,
  //       classname: suiteName,
  //       suite_name: suiteName,
  //       status: status,
  //       time: taskResult.duration ? taskResult.duration / 1000 : 0,
  //       data: this.toXml(dataObj),
  //     }
  //   }
}
