const { describe, it, expect } = require('@jest/globals')

describe('Jest Status Tests - Part 1', () => {
  it('should pass', () => {
    expect(2 + 2).toBe(4)
  })

  it('should fail', () => {
    expect(2 + 2).toBe(5)
  })

  it.skip('should be skipped with it.skip', () => {
    expect(true).toBe(false)
  })

  it('should be pending without implementation')

  it.todo('should be todo with it.todo')
})
