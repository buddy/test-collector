const { expect } = require('@playwright/test')
const { prefixedTest } = require('../prefix')

const test = prefixedTest

test.describe('Status Tests - Part 1', () => {
  test('should pass', async ({ page }) => {
    expect(2 + 2).toBe(4)
  })

  test('should fail', async ({ page }) => {
    expect(2 + 2).toBe(5)
  })

  test.skip('should be skipped with test.skip', async ({ page }) => {
    expect(true).toBe(false)
  })

  test.fixme('should be todo with test.fixme', async ({ page }) => {
    expect(true).toBe(false)
  })
})
