/** @type {import('jest').Config} */
const config = {
  reporters: ['default', '@buddy-works/unit-tests/jest'],
  // Parallel execution settings
  maxWorkers: '50%', // Use 50% of available CPU cores
  // Or use a specific number like: maxWorkers: 4,

  // Test execution optimization
  testTimeout: 10000, // 10 second timeout per test

  // Cache for faster subsequent runs
  cache: true,

  // Run tests in band can be disabled (default is parallel)
  // runInBand: false, // Ensure parallel execution (this is default)
}

module.exports = config
