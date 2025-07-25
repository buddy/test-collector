const { expect } = require('@playwright/test')
const { prefixedTest } = require('../prefix')

const test = prefixedTest

test.describe('Status Tests - Part 2', () => {
  test('another passing test', async ({ page }) => {
    expect(true).toBeTruthy()
  })

  test('another failing test', async ({ page }) => {
    expect(false).toBeTruthy()
  })

  test.skip('another skipped test', async ({ page }) => {
    expect(1).toBe(2)
  })
})
