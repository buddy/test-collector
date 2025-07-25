const { prefixedDescribe } = require('../prefix')
const assert = require('assert')

prefixedDescribe('Status Tests - Part 1', () => {
  it('should pass', () => {
    assert.strictEqual(2 + 2, 4)
  })

  it('should fail', () => {
    assert.strictEqual(2 + 2, 5)
  })

  it.skip('should be skipped with it.skip', () => {
    assert.strictEqual(true, false)
  })

  it('should be pending without implementation')
})
