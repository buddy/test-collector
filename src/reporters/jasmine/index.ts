import BuddyJasmineReporter from '@/reporters/jasmine/reporter'

// Jasmine expects reporters to be registered during setup
// This creates and registers the reporter instance
const reporter = new BuddyJasmineReporter()

// If jasmine is available, register the reporter
if (typeof jasmine === 'undefined') {
  // Try to register when jasmine becomes available
  setTimeout(() => {
    if (typeof jasmine !== 'undefined') {
      jasmine.getEnv().addReporter(reporter)
    }
  }, 100)
} else {
  jasmine.getEnv().addReporter(reporter)
}

export * from './reporter'
