const { test, expect } = require('@playwright/test')
const { prefixedDescribe } = require('../prefix')

console.log('=== DRAIN QUEUE TEST START ===')
console.log('Generating 750 tests that complete instantly')
console.log('maxBatchSize: 100, batchIntervalMs: 3000ms')
console.log('Tests complete in < 1 second')
console.log('All 750 tests should be in queue when reporter ends')
console.log('===================================')
console.log('EXPECTED: drain() should flush ALL 750 tests (8 batches)')
console.log('If drain() has bug: Only 200 tests submitted, 550 TESTS LOST!')
console.log('============================================')

prefixedDescribe('DRAIN QUEUE TEST - 750 Instant Tests', () => {
  // Generate 750 tests = 7.5x maxBatchSize (100)
  // These will execute nearly instantly in Playwright
  for (let i = 1; i <= 750; i++) {
    test(`test ${i} - instant pass`, async ({ page }) => {
      expect(true).toBe(true)
    })
  }

  // Final marker test
  test('test 751 - final marker', async ({ page }) => {
    const timestamp = new Date().toISOString()
    expect(true).toBe(true)
    console.log(`\n=== ALL 751 TESTS COMPLETED at ${timestamp} ===`)
    console.log('Spec ended. Now drain() should process the queue.')
    console.log('Check API logs:')
    console.log('  - WITH BUG: ~200 tests received (550 TESTS LOST)')
    console.log('  - WITHOUT BUG: ALL 751 tests received (drain loops until empty)')
  })
})
