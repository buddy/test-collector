const { describe, xdescribe } = require('@jest/globals')

const prefix = `[jest ${require('./package.json').devDependencies.jest}]`

module.exports = {
  prefixedDescribe: (name, fn) => {
    return describe(`${prefix} ${name}`, fn)
  },
  prefixedXDescribe: (name, fn) => {
    return xdescribe(`${prefix} ${name}`, fn)
  },
}
