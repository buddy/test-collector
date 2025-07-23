const { describe, it, expect } = require('@jest/globals')

describe('Jest Status Tests - Part 2', () => {
  // STATUS: passed (another example)
  it('should pass again', () => {
    expect('hello').toBe('hello')
  })

  // STATUS: failed (another example)
  it('should fail again', () => {
    expect(true).toBe(false)
  })

  // STATUS: skipped (using xit alias)
  xit('should be skipped with xit', () => {
    expect(1).toBe(2)
  })
})

// STATUS: disabled (entire describe block disabled with xdescribe)
xdescribe('Disabled Test Suite', () => {
  it('should be disabled', () => {
    expect(true).toBe(true)
  })

  it('should also be disabled', () => {
    expect(false).toBe(false)
  })
})
