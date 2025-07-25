const { expect } = require('@playwright/test')
const { prefixedTest } = require('../prefix')

const test = prefixedTest

test.describe('Focused Tests', () => {
  test('focused test example', async ({ page }) => {
    expect(1 + 1).toBe(2)
  })

  test('another test in the same describe block', async ({ page }) => {
    expect(2 + 2).toBe(4)
  })
})

test.describe.skip('Skipped describe block', () => {
  test('this test is in a skipped describe block', async ({ page }) => {
    expect(true).toBe(false)
  })

  test('this test is also in a skipped describe block', async ({ page }) => {
    expect(false).toBe(true)
  })
})
