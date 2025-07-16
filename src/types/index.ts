export enum TEST_STATUS {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  FAILED = 'FAILED',
}

export interface ITestCase {
  name: string
  status: TEST_STATUS
}
