console.log('Setting up Buddy test collector reporter...')

const buddyTestCollector = require('@buddy-works/test-collector/jasmine').default

console.log('Buddy test collector loaded:', typeof buddyTestCollector)

// Register the reporter with jasmine
jasmine.getEnv().addReporter(buddyTestCollector)

console.log('Buddy test collector registered with Jasmine')
