const { prefixedDescribe, prefixedXDescribe } = require('../prefix')

prefixedDescribe('Focused Tests', () => {
  it('focused test example', () => {
    expect(1 + 1).toBe(2)
  })

  it('another test in the same describe block', () => {
    expect(2 + 2).toBe(4)
  })
})

prefixedXDescribe('Skipped describe block', () => {
  it('this test is in a skipped describe block', () => {
    expect(true).toBe(false)
  })

  it('this test is also in a skipped describe block', () => {
    expect(false).toBe(true)
  })
})
