const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    supportFile: false,
    reporter: './node_modules/@buddy-works/test-collector/dist/reporters/cypress/index.js',
    video: false,
    screenshotOnRunFailure: false,
  },
})
