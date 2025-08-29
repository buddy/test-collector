const { prefixedDescribe } = require('../prefix')

prefixedDescribe('Status Tests - Part 2', () => {
  it('another passing test', () => {
    expect(true).toBeTruthy()
  })

  it('another failing test', () => {
    expect(false).toBeTruthy()
  })

  xit('another skipped test', () => {
    expect(1).toBe(2)
  })
})
