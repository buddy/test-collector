const { prefixedDescribe } = require('../prefix')
const assert = require('assert')

prefixedDescribe('Status Tests - Part 2', () => {
  it('another passing test', () => {
    assert.ok(true)
  })

  it('another failing test', () => {
    assert.ok(false)
  })

  it.skip('another skipped test', () => {
    assert.strictEqual(1, 2)
  })
})
