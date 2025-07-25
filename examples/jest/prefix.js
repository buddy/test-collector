const { describe, xdescribe } = require('@jest/globals')

// Read actual version from package-lock.json
let version = 'unknown'
try {
  const lockFile = require('./package-lock.json')
  version = lockFile.packages['node_modules/jest']?.version || 'unknown'
} catch (e) {
  // Fallback to package.json if package-lock.json is not available
  version = require('./package.json').devDependencies.jest
}

const prefix = `[jest ${version}]`

module.exports = {
  prefixedDescribe: (name, fn) => {
    return describe(`${prefix} ${name}`, fn)
  },
  prefixedXDescribe: (name, fn) => {
    return xdescribe(`${prefix} ${name}`, fn)
  },
}
