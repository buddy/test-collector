const { prefixedDescribe } = require('../../prefix')

prefixedDescribe('Queue Stress Test - 150 Fast Tests', () => {
  console.log('=== QUEUE STRESS TEST START ===')
  console.log('Generating 150 tests that will complete instantly')
  console.log('maxBatchSize: 100, batchIntervalMs: 3000ms')
  console.log('This should trigger a race condition where spec ends before queue drains')
  console.log('=====================================')

  // Generate 150 tests that complete instantly
  // This exceeds maxBatchSize (100) and will require multiple batches
  // The spec will complete quickly, but the queue may still be processing
  for (let i = 1; i <= 150; i++) {
    it(`test ${i} - should pass instantly`, () => {
      // Instant assertion - no delays
      expect(true).to.be.true
    })
  }

  // Add one final test to mark the end
  it('test 151 - final test marker', () => {
    const timestamp = new Date().toISOString()
    expect(true).to.be.true
    console.log(`\n=== ALL 151 TESTS COMPLETED at ${timestamp} ===`)
    console.log('Check your API logs to see if all 151 tests were received')
    console.log('If < 151 tests received, the queue was cut off')
  })
})
