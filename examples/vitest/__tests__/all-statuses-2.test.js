const { expect, test } = require('vitest')
const { describe } = require('../prefix')

describe('[Vitest] Status Tests - Part 2', () => {
  test('should pass', () => {
    expect('hello').toBe('hello')
  })

  test('should fail', () => {
    expect(true).toBe(false)
  })

  test.skip('should be skipped with test.skip', () => {
    expect(1).toBe(2)
  })
})

describe.skip('[Vitest] Disabled Test Suite', () => {
  test('should be disabled', () => {
    expect(true).toBe(true)
  })

  test('should also be disabled', () => {
    expect(false).toBe(false)
  })
})
