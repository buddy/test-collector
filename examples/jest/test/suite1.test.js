const {describe, it, expect} = require('@jest/globals')

describe('suite1', () => {
  it('pass1', async () => {
    await new Promise(resolve => setTimeout(resolve, 2000))
    expect(1 + 1).toBe(2)
  })

  it('fail2', async () => {
    await new Promise(resolve => setTimeout(resolve, 2000))
    expect(1 + 1).toBe(3)
  })

  it('pass3', async () => {
    await new Promise(resolve => setTimeout(resolve, 2000))
    expect('a'.repeat(2)).toBe('aa')
  })

  it('pass4', async () => {
    await new Promise(resolve => setTimeout(resolve, 2000))
    expect([1,2].length).toBe(2)
  })

  it.skip('skip5', async () => {
    await new Promise(resolve => setTimeout(resolve, 2000))
    expect(true).toBe(false)
  })
})
