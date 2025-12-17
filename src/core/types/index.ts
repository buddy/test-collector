import { components, operations } from '@/api/types/rest'

export type CI_PROVIDER = NonNullable<components['schemas']['AddSessionRequest']['ci_provider']>
export const CI_PROVIDER = {
  BUDDY: 'BUDDY',
  GITHUB_ACTION: 'GITHUB_ACTION',
  CIRCLE_CI: 'CIRCLE_CI',
  NONE: 'NONE',
} as const satisfies Record<CI_PROVIDER, CI_PROVIDER>

export type SESSION_REF_TYPE = components['schemas']['AddSessionRequest']['ref_type']

export type UT_TESTCASE_STATUS = NonNullable<components['schemas']['AddTestCaseRequest']['status']>
export const UT_TESTCASE_STATUS = {
  PASSED: 'PASSED',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
  ERROR: 'ERROR',
} as const satisfies Record<UT_TESTCASE_STATUS, UT_TESTCASE_STATUS>

// Note: API type definition says `id: number`, but API actually returns string IDs
export type IBuddyUTSession = Omit<Required<components['schemas']['TestSessionView']>, 'id'> & {
  id: string
}

export type IBuddyUTSessionsPayload = NonNullable<
  operations['addSessionByToken']['requestBody']
>['content']['application/json']

export type IBuddyUTSessionsSuccessResponse = Required<
  Omit<operations['addSessionByToken']['responses']['201']['content']['application/json'], 'id'> & {
    id: string
  }
>

export type IBuddyUTTestCase = Required<components['schemas']['AddTestCaseRequest']>

export type IBuddyUTTestCasesBatchPayload = NonNullable<
  operations['addCasesByToken']['requestBody']
>['content']['application/json']

export type IBuddyUTTestCasesBatchSuccessResponse = Required<
  operations['addCasesByToken']['responses']['201']['content']['application/json']
>

export interface IBuddyUTPreparsedTestCase extends Omit<IBuddyUTTestCase, 'data'> {
  data: Omit<IBuddyUTPreparsedTestCase, 'data'> & {
    failure?: {
      message: string
      stackTrace?: string
    }
  }
}
