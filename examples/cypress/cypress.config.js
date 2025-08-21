const { defineConfig } = require('cypress')
const BuddyCypressReporter = require('@buddy-works/unit-tests/cypress')

module.exports = defineConfig({
  e2e: {
    reporter: '@buddy-works/unit-tests/dist/reporters/cypress/index.js',
    setupNodeEvents(on) {
      on('after:run', BuddyCypressReporter.closeSession)
    },
    video: false,
    supportFile: false,
    screenshotOnRunFailure: false,
  },
})
