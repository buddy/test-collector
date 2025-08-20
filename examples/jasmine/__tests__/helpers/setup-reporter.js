const buddyTestCollector = require('@buddy-works/unit-tests/jasmine').default

// Register the reporter with jasmine
jasmine.getEnv().addReporter(buddyTestCollector)
