const { it, expect } = require('@jest/globals')
const { prefixedDescribe } = require('../prefix')

// When Jest encounters .only tests, it runs ONLY those tests
// All other tests become skipped automatically

prefixedDescribe('Focused Test Example', () => {
  it.only('should be focused with it.only', () => {
    expect(1 + 1).toBe(2)
  })

  it('should be auto-skipped when focused test exists', () => {
    expect(2 + 2).toBe(4)
  })
})
