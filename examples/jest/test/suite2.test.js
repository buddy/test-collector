const {describe, it, expect} = require('@jest/globals')

describe('suite2', () => {
  it('pass6', async () => {
    await new Promise(resolve => setTimeout(resolve, 2000))
    expect(2 * 2).toBe(4)
  })

  it('fail7', async () => {
    await new Promise(resolve => setTimeout(resolve, 2000))
    expect(2 * 2).toBe(5)
  })

  it('pass8', async () => {
    await new Promise(resolve => setTimeout(resolve, 2000))
    expect([].length).toBe(0)
  })

  it('pass9', async () => {
    await new Promise(resolve => setTimeout(resolve, 2000))
    expect({a:1}).toHaveProperty('a')
  })

  it.skip('skip10', async () => {
    await new Promise(resolve => setTimeout(resolve, 2000))
    expect('a').toBe('b')
  })
})
