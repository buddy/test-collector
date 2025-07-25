const { test } = require('@playwright/test')

const prefix = `[playwright ${require('./package.json').devDependencies['@playwright/test']}]`

module.exports = {
  prefixedDescribe: (name, fn) => {
    return test.describe(`${prefix} ${name}`, fn)
  },
}
