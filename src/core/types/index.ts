export enum BUDDY_UNIT_TEST_STATUS {
  PASSED = 'PASSED',
  SKIPPED = 'SKIPPED',
  ERROR = 'ERROR',
  FAILED = 'FAILED',
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
  data?: string
}
