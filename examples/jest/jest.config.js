require('dotenv').config({ path: '../../.env' })

/** @type {import('jest').Config} */
const config = {
  reporters: ['default', '@buddy-works/test-collector/jest'],
}

module.exports = config
