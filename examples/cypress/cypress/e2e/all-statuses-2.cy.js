const { prefixedDescribe, prefixedDescribeSkip } = require('../../prefix')

prefixedDescribe('Status Tests - Part 2', () => {
  it('another passing test', () => {
    expect([1, 2, 3]).to.deep.equal([1, 2, 3])
  })

  it('another failing test', () => {
    expect('hello').to.equal('world')
  })

  it('error test', () => {
    throw new Error('This is an intentional error')
  })
})

prefixedDescribeSkip('Skipped Suite', () => {
  it('should be skipped', () => {
    expect(true).to.equal(false)
  })
})
