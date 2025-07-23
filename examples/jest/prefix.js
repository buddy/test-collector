const { describe } = require('@jest/globals')

const prefix = `[jest ${require('./package.json').devDependencies.jest}]`

module.exports = {
  describe: (name, fn) => {
    return describe(`${prefix} ${name}`, fn)
  },
}
