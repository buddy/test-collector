import { components, paths } from '@/api/types/rest'

type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

export type IBuddyUTSession = Prettify<Required<components['schemas']['TestSessionView']>>

export type IBuddyUTSessionsPayload = Prettify<
  NonNullable<paths['/unit-tests/sessions']['post']['requestBody']>['content']['application/json']
>

export type IBuddyUTSessionsSuccessResponse = Prettify<
  paths['/unit-tests/sessions']['post']['responses']['201']['content']['application/json']
>

export type IBuddyUTTestCase = Prettify<Required<components['schemas']['AddTestCaseRequest']>>

export type IBuddyUTTestCasesBatchPayload = Prettify<
  NonNullable<
    paths['/unit-tests/sessions/{sessionId}/cases/batch']['post']['requestBody']
  >['content']['application/json']
>

export type IBuddyUTTestCasesBatchSuccessResponse = Prettify<
  paths['/unit-tests/sessions/{sessionId}/cases/batch']['post']['responses']['201']['content']['application/json']
>

export interface IBuddyUTPreparsedTestCase extends Omit<IBuddyUTTestCase, 'data'> {
  data: Omit<IBuddyUTPreparsedTestCase, 'data'> & {
    failure?: {
      message: string
      stackTrace?: string
    }
  }
}
