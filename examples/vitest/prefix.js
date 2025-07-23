const { describe } = require('vitest')

const prefix = `[vitest ${require('./package.json').devDependencies.vitest}]`

module.exports = {
  describe: (name, fn) => {
    return describe(`${prefix} ${name}`, fn)
  },
}
