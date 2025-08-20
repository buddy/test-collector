require('dotenv').config({ path: '../../.env' })

/** @type {import('jest').Config} */
const config = {
  reporters: ['default', '@buddy-works/unit-tests/jest'],
}

module.exports = config
