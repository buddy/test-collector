const { prefixedDescribe } = require('../../prefix')

prefixedDescribe('EXTREME Queue Stress Test - 300 Fast Tests', () => {
  console.log('=== EXTREME QUEUE STRESS TEST START ===')
  console.log('Generating 300 tests that will complete in <1 second')
  console.log('maxBatchSize: 100, batchIntervalMs: 3000ms')
  console.log('Tests will complete BEFORE the 3-second batch interval')
  console.log('Expected: 300 tests queued, spec ends, then queue processes')
  console.log('This will show if flushQueue() handles multiple batches')
  console.log('=============================================')

  // Generate 300 tests that complete instantly
  // This is 3x the maxBatchSize (100)
  // The tests will complete in < 1 second, before the 3-second batch timer fires
  // So all 300 tests should be in the queue when onEnd() is called
  for (let i = 1; i <= 300; i++) {
    it(`test ${i} - instant pass`, () => {
      expect(true).to.be.true
    })
  }

  // Final marker test
  it('test 301 - final marker', () => {
    const timestamp = new Date().toISOString()
    expect(true).to.be.true
    console.log(`\n=== ALL 301 TESTS COMPLETED at ${timestamp} ===`)
    console.log('Spec ended. Now the queue should be flushed.')
    console.log('Check API logs: Do you see all 301 tests?')
    console.log('With flushQueue(): Expect ~100 tests (ONE batch)')
    console.log('With drainQueue(): Expect ALL 301 tests (multiple batches)')
  })
})
