const buddyTestCollector = require('@buddy-works/test-collector/jasmine').default

// Register the reporter with jasmine
jasmine.getEnv().addReporter(buddyTestCollector())
