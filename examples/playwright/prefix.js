const { test } = require('@playwright/test')

// Read actual version from package-lock.json
let version = 'unknown'
try {
  const lockFile = require('./package-lock.json')
  version = lockFile.packages['node_modules/@playwright/test']?.version || 'unknown'
} catch (e) {
  // Fallback to package.json if package-lock.json is not available
  version = require('./package.json').devDependencies['@playwright/test']
}

const prefix = `[playwright ${version}]`

module.exports = {
  prefixedDescribe: (name, fn) => {
    return test.describe(`${prefix} ${name}`, fn)
  },
  prefixedDescribeSkip: (name, fn) => {
    return test.describe.skip(`${prefix} ${name}`, fn)
  },
}
