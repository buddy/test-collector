import { expect, test } from 'vitest'
import { prefixedDescribe } from '../prefix.js'

prefixedDescribe('Status Tests - Part 1', () => {
  test('should pass', () => {
    expect(2 + 2).toBe(4)
  })

  test('should fail', () => {
    expect(2 + 2).toBe(5)
  })

  test.skip('should be skipped with test.skip', () => {
    expect(true).toBe(false)
  })

  test.todo('should be todo with test.todo')
})
