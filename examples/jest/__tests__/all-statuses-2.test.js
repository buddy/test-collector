const { it, expect } = require('@jest/globals')
const { describe } = require('../prefix')

describe('Status Tests - Part 2', () => {
  it('should pass', () => {
    expect('hello').toBe('hello')
  })

  it('should fail', () => {
    expect(true).toBe(false)
  })

  xit('should be skipped with xit', () => {
    expect(1).toBe(2)
  })
})

xdescribe('[Jest] Disabled Test Suite', () => {
  it('should be disabled', () => {
    expect(true).toBe(true)
  })

  it('should also be disabled', () => {
    expect(false).toBe(false)
  })
})
