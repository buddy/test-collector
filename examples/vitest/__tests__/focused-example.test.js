import { expect, test } from 'vitest'
import { prefixedDescribe } from '../prefix.js'

// When Vitest encounters .only tests, it runs ONLY those tests
// All other tests become skipped automatically

prefixedDescribe('Focused Test Example', () => {
  test.only('should be focused with test.only', () => {
    expect(1 + 1).toBe(2)
  })

  test('should be auto-skipped when focused test exists', () => {
    expect(2 + 2).toBe(4)
  })
})
