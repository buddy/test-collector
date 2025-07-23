const { describe, it, expect } = require('@jest/globals')

describe('Jest Status Tests - Part 2', () => {
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

xdescribe('Disabled Test Suite', () => {
  it('should be disabled', () => {
    expect(true).toBe(true)
  })

  it('should also be disabled', () => {
    expect(false).toBe(false)
  })
})
