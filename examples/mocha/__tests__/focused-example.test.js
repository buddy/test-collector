const { prefixedDescribe, prefixedDescribeSkip } = require('../prefix')
const assert = require('assert')

prefixedDescribe('Focused Tests', () => {
  it('focused test example', () => {
    assert.strictEqual(1 + 1, 2)
  })

  it('another test in the same describe block', () => {
    assert.strictEqual(2 + 2, 4)
  })
})

prefixedDescribeSkip('Skipped describe block', () => {
  it('this test is in a skipped describe block', () => {
    assert.strictEqual(true, false)
  })

  it('this test is also in a skipped describe block', () => {
    assert.strictEqual(false, true)
  })
})
