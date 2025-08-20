# Playwright Test Collector Example

This example demonstrates how to use `@buddy-works/unit-tests` with Playwright Test.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run tests:

   ```bash
   npm test
   ```

## Configuration

The test collector reporter is configured in `playwright.config.js`:

```javascript
reporter: [['html'], ['@buddy-works/unit-tests/playwright']]
```

## Test Examples

This example includes:

- Basic passing and failing tests
- Skipped tests using `test.skip()`
- Todo/fixme tests using `test.fixme()`
- Focused tests using `test.only()`
- Skipped test suites using `test.describe.skip()`
