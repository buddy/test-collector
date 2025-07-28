const { prefixedDescribe } = require('../../prefix')

prefixedDescribe('Status Tests - Part 1', () => {
  it('should pass', () => {
    expect(2 + 2).to.equal(4)
  })

  it('should fail', () => {
    expect(2 + 2).to.equal(5)
  })

  it.skip('should be skipped with it.skip', () => {
    expect(true).to.equal(false)
  })

  it('should be pending without implementation')
})
