// Read actual version from package-lock.json
let version = 'unknown'
try {
  const lockFile = require('./package-lock.json')
  version = lockFile.packages['node_modules/cypress']?.version || 'unknown'
} catch (e) {
  // Fallback to package.json if package-lock.json is not available
  version = require('./package.json').devDependencies.cypress
}

const prefix = `[cypress ${version}]`

module.exports = {
  prefixedDescribe: (name, fn) => {
    return describe(`${prefix} ${name}`, fn)
  },
  prefixedDescribeSkip: (name, fn) => {
    return describe.skip(`${prefix} ${name}`, fn)
  },
}
