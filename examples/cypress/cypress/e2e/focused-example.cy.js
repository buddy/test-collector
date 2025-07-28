const { prefixedDescribe } = require('../../prefix')

prefixedDescribe('Focused Examples', () => {
  it.only('should run only this test when using it.only', () => {
    expect(true).to.equal(true)
  })

  it('should be skipped when it.only is used elsewhere', () => {
    expect(false).to.equal(true)
  })
})
