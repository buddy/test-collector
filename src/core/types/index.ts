import { components, paths } from '@/api/types/rest'

export type IBuddyUTSession = Required<components['schemas']['TestSessionView']>

export type IBuddyUTSessionsPayload = NonNullable<
  paths['/unit-tests/sessions']['post']['requestBody']
>['content']['application/json']

export type IBuddyUTSessionsSuccessResponse =
  paths['/unit-tests/sessions']['post']['responses']['201']['content']['application/json']

export type IBuddyUTTestCase = Required<components['schemas']['AddTestCaseRequest']>

export type IBuddyUTTestCasesBatchPayload = NonNullable<
  paths['/unit-tests/sessions/{sessionId}/cases/batch']['post']['requestBody']
>['content']['application/json']

export type IBuddyUTTestCasesBatchSuccessResponse =
  paths['/unit-tests/sessions/{sessionId}/cases/batch']['post']['responses']['201']['content']['application/json']

export interface IBuddyUTPreparsedTestCase extends Omit<IBuddyUTTestCase, 'data'> {
  data: Omit<IBuddyUTPreparsedTestCase, 'data'> & {
    failure?: {
      message: string
      stackTrace?: string
    }
  }
}
