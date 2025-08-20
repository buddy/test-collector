# Jasmine Test Collector Example

This example demonstrates how to use `@buddy-works/unit-tests` with Jasmine.

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

The test collector reporter is configured in `jasmine.json`:

```json
"reporters": [
  {
    "name": "@buddy-works/unit-tests/jasmine"
  }
]
```

## Test Examples

This example includes:

- Basic passing and failing tests
- Skipped tests using `xit()`
- Pending tests (tests without implementation)
- Focused tests using `fit()`
- Skipped test suites using `xdescribe()`
