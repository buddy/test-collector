import { expect, test } from 'vitest'
import { prefixedDescribe } from '../prefix.js'

prefixedDescribe('Status Tests - Part 2', () => {
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

prefixedDescribe.skip('Disabled Test Suite', () => {
  test('should be disabled', () => {
    expect(true).toBe(true)
  })

  test('should also be disabled', () => {
    expect(false).toBe(false)
  })
})
