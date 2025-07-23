const { describe, it, expect } = require('@jest/globals')

describe('Jest Status Tests - Part 1', () => {
  // STATUS: passed
  it('should pass', () => {
    expect(2 + 2).toBe(4)
  })

  // STATUS: failed
  it('should fail', () => {
    expect(2 + 2).toBe(5)
  })

  // STATUS: skipped (using it.skip)
  it.skip('should be skipped with it.skip', () => {
    expect(true).toBe(false)
  })

  // STATUS: pending (using it without implementation)
  it('should be pending without implementation')

  // STATUS: todo (using it.todo)
  it.todo('should be todo with it.todo')
})
