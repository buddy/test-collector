require('dotenv').config({ path: '../../.env' })

module.exports = {
  spec: '__tests__/**/*.test.js',
  reporter: '@buddy-works/unit-tests/mocha',
  timeout: 5000,
  bail: false,
  'forbid-only': false,
  'forbid-pending': false,
}
