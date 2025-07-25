# Mocha Test Collector Example

This example demonstrates how to use `@buddy-works/test-collector` with Mocha.

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

The test collector reporter is configured in `.mocharc.js`:

```javascript
module.exports = {
  reporter: '@buddy-works/test-collector/mocha',
  // other options...
}
```

## Test Examples

This example includes:

- Basic passing and failing tests
- Skipped tests using `it.skip()`
- Pending tests (tests without implementation)
- Skipped test suites using `describe.skip()`
