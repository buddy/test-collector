const { prefixedDescribe } = require('../prefix')

prefixedDescribe('Status Tests - Part 1', () => {
  it('should pass', () => {
    expect(2 + 2).toBe(4)
  })

  it('should fail', () => {
    expect(2 + 2).toBe(5)
  })

  xit('should be skipped with xit', () => {
    expect(true).toBe(false)
  })

  it('should be pending without implementation')
})
