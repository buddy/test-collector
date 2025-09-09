/** @type {import('jest').Config} */
const config = {
  reporters: ['default', '@buddy-works/unit-tests/jest'],
  maxWorkers: 4,
  testTimeout: 10000,
  cache: true,
  workerIdleMemoryLimit: '512MB',
  testPathIgnorePatterns: ['.*/long.test.js$'],
}

module.exports = config
