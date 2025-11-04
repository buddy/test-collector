import {
  AddSessionRequestCi_provider,
  AddSessionRequestRef_type,
  ApiPaths,
  PathsWorkspacesWorkspace_domainProjectsProject_nameUnitTestsSuitesSuite_idSessionsSession_idCasesGetParametersQueryStatus,
  components,
  paths,
} from '@/api/types/rest'

export const CI_PROVIDER = AddSessionRequestCi_provider
export type CI_PROVIDER = AddSessionRequestCi_provider

export const SESSION_REF_TYPE = AddSessionRequestRef_type
export type SESSION_REF_TYPE = AddSessionRequestRef_type

export const UT_TESTCASE_STATUS =
  PathsWorkspacesWorkspace_domainProjectsProject_nameUnitTestsSuitesSuite_idSessionsSession_idCasesGetParametersQueryStatus
export type UT_TESTCASE_STATUS =
  PathsWorkspacesWorkspace_domainProjectsProject_nameUnitTestsSuitesSuite_idSessionsSession_idCasesGetParametersQueryStatus

// Note: API type definition says `id: number`, but API actually returns string IDs
export type IBuddyUTSession = Omit<Required<components['schemas']['TestSessionView']>, 'id'> & {
  id: string
}

export type IBuddyUTSessionsPayload = NonNullable<
  paths[ApiPaths.addSessionByToken]['post']['requestBody']
>['content']['application/json']

export type IBuddyUTSessionsSuccessResponse = Required<
  Omit<paths[ApiPaths.addSessionByToken]['post']['responses']['201']['content']['application/json'], 'id'> & {
    id: string
  }
>

export type IBuddyUTTestCase = Required<components['schemas']['AddTestCaseRequest']>

export type IBuddyUTTestCasesBatchPayload = NonNullable<
  paths[ApiPaths.addCasesByToken]['post']['requestBody']
>['content']['application/json']

export type IBuddyUTTestCasesBatchSuccessResponse = Required<
  paths[ApiPaths.addCasesByToken]['post']['responses']['201']['content']['application/json']
>

export interface IBuddyUTPreparsedTestCase extends Omit<IBuddyUTTestCase, 'data'> {
  data: Omit<IBuddyUTPreparsedTestCase, 'data'> & {
    failure?: {
      message: string
      stackTrace?: string
    }
  }
}
