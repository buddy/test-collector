# @buddy-works/unit-tests

Universal test results collector that sends real-time test results from popular JavaScript testing frameworks directly to your Buddy Works unit testing dashboard. Zero configuration required - just install, add to your test config, and go.

**Supported frameworks:** Jest, Jasmine, Mocha, Cypress, Playwright, Vitest

## Installation

```bash
npm install --save-dev @buddy-works/unit-tests
```

## Setup

### 1. Get your token

In your Buddy Works workspace, go to the **Unit Tests** section and create a new folder. You'll receive a `BUDDY_UT_TOKEN` - set this as an environment variable in your CI/CD pipeline.

### 2. Add to your test configuration

Choose your testing framework and add the reporter:

**Jest** (`jest.config.js`):

```javascript
module.exports = {
  reporters: ['default', '@buddy-works/unit-tests/jest'],
}
```

Or run from CLI:

```bash
jest --reporters=default --reporters=@buddy-works/unit-tests/jest
```

**Jasmine** - Add to helpers (`__tests__/helpers/setup-reporter.js`):

```javascript
const buddyTestCollector = require('@buddy-works/unit-tests/jasmine').default

jasmine.getEnv().addReporter(buddyTestCollector)
```

Then reference it in `jasmine.json`:

```json
{
  "helpers": ["helpers/setup-reporter.js"]
}
```

> **Note:** Jasmine doesn't support specifying reporters via CLI. The reporter must be configured through a helper file as shown above.

**Mocha** (`.mocharc.js`):

```javascript
module.exports = {
  reporter: '@buddy-works/unit-tests/mocha',
}
```

Or run from CLI:

```bash
mocha --reporter=@buddy-works/unit-tests/mocha
```

**Vitest** (`vitest.config.js`):

```javascript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    reporters: ['default', '@buddy-works/unit-tests/vitest'],
  },
})
```

Or run from CLI:

```bash
vitest --reporter=default --reporter=@buddy-works/unit-tests/vitest
```

**Playwright** (`playwright.config.js`):

```javascript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  reporter: [['@buddy-works/unit-tests/playwright']],
})
```

Or run from CLI:

```bash
npx playwright test --reporter=@buddy-works/unit-tests/playwright
```

**Cypress** (`cypress.config.js`):

```javascript
const { defineConfig } = require('cypress')
const BuddyCypressReporter = require('@buddy-works/unit-tests/cypress')

module.exports = defineConfig({
  e2e: {
    reporter: '@buddy-works/unit-tests/dist/reporters/cypress/index.js',
    setupNodeEvents(on) {
      on('after:run', BuddyCypressReporter.closeSession)
    },
  },
})
```

Or run from CLI (still requires the `after:run` hook in config):

```bash
cypress run --reporter @buddy-works/unit-tests/dist/reporters/cypress/index.js
```

> **Note for Cypress:**
>
> - You must install `mocha` as a dev dependency: `npm install --save-dev mocha`
> - The `after:run` event handler must be configured in the config file even when using CLI
> - The reporter path must use the dist path format due to Cypress's module resolution

That's it! Your tests will now automatically send results to Buddy Works.

> **Note:** These examples show configuration file setups. Some frameworks may support alternative configuration methods (command line options, package.json, etc.). Refer to your testing framework's official documentation for all available configuration options.

## How It Works

The collector automatically detects your CI/CD environment and gathers all necessary metadata from your pipeline. It creates test sessions, tracks individual test results in real-time, and handles session cleanup automatically.

**Supported CI/CD platforms:**

- **Buddy Works** - Full native support with automatic environment detection
- **GitHub Actions** - Complete support with workflow integration
- **Other platforms** - Can be configured manually with environment variables

**Designed for CI/CD:** While it can run locally, it's optimized for CI/CD pipelines where environment variables are automatically available.

## Key Features

- **Zero configuration** - Only requires `BUDDY_UT_TOKEN`
- **Real-time reporting** - Test results sent as they complete
- **Automatic session management** - Handles test session lifecycle
- **Universal support** - Works with all major JavaScript testing frameworks
- **Multi-platform CI/CD support** - Native support for Buddy Works and GitHub Actions
- **Smart environment detection** - Automatically detects CI environment and configures accordingly

## Development Testing

To run the example tests for development and testing purposes:

1. **Install dependencies:**

   ```bash
   npm i
   ```

2. **Prepare the package for testing:**

   ```bash
   npm run prepare:tests
   ```

3. **Follow individual test instructions:**
   Each test framework has its own directory under `examples/` with specific setup instructions. Check the README file in each individual test directory for framework-specific instructions.

   Available test frameworks:
   - `examples/jest/` - Jest testing framework
   - `examples/jasmine/` - Jasmine testing framework
   - `examples/mocha/` - Mocha testing framework
   - `examples/cypress/` - Cypress testing framework
   - `examples/playwright/` - Playwright testing framework
   - `examples/vitest/` - Vitest testing framework
