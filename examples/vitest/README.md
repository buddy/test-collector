# Vitest Test Examples

This directory contains Vitest test examples that demonstrate all possible test statuses for the Buddy Works test collector.

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Run tests:**

   ```bash
   npm test
   ```

## Test Files

- `__tests__/all-statuses-1.test.js` - Tests covering passed, failed, skipped, and todo statuses
- `__tests__/all-statuses-2.test.js` - Tests covering passed, failed, and skipped statuses with disabled describe block
- `__tests__/focused-example.test.js` - Demonstrates focused tests using `test.only`

## Test Statuses Covered

- **Passed** - Tests that run successfully
- **Failed** - Tests that throw errors or fail assertions
- **Skipped** - Tests marked with `test.skip()` or inside `describe.skip()`
- **Todo** - Tests marked with `test.todo()` (placeholder tests)
- **Focused** - Tests marked with `test.only()` (other tests become skipped)

## Configuration

The Vitest configuration is in `vitest.config.js` and includes the Buddy Works test collector reporter:

```javascript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    reporters: ['default', '@buddy-works/test-collector/vitest'],
  },
})
```
