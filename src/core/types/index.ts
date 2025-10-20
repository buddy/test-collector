import { CI_PROVIDER } from '@/utils/environment'

export enum BUDDY_UNIT_TEST_STATUS {
  PASSED = 'PASSED',
  SKIPPED = 'SKIPPED',
  ERROR = 'ERROR',
  FAILED = 'FAILED',
}

export interface IBuddySessionRequestPayload {
  ci_provider: CI_PROVIDER
  ref_type?: string
  ref_name?: string
  from_revision?: string
  to_revision?: string
  execution_id?: string
  action_execution_id?: string
  ci_run_url?: string
}

export interface IBuddyUnitTestApiTestCase {
  url?: string
  htmlUrl?: string
  id?: string
  name: string
  test_group_name: string
  classname: string
  status: BUDDY_UNIT_TEST_STATUS
  time: number
  data: Omit<IBuddyUnitTestApiTestCase, 'data'> & {
    failure?: {
      message: string
      stackTrace?: string
    }
  }
}
