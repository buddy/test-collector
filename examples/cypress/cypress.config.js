const { defineConfig } = require('cypress')
const BuddyCypressReporter = require('./node_modules/@buddy-works/test-collector/dist/reporters/cypress/index.js')

module.exports = defineConfig({
  e2e: {
    supportFile: false,
    reporter: './node_modules/@buddy-works/test-collector/dist/reporters/cypress/index.js',
    video: false,
    screenshotOnRunFailure: false,
    setupNodeEvents(on) {
      on('after:run', BuddyCypressReporter.closeSession)
    },
  },
})
