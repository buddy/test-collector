# test-collector

## Development Testing

To run the example tests for development and testing purposes:

1. **Install dependencies:**

   ```bash
   npm i
   ```

2. **Prepare the package for testing:**

   ```bash
   ./prepare-package-for-tests.sh
   ```

3. **Follow individual test instructions:**
   Each test framework has its own directory under `examples/` with specific setup instructions. Check the README file in each individual test directory for framework-specific instructions.

   Available test frameworks:
   - `examples/jest/` - Jest testing framework
   - `examples/mocha/` - Mocha testing framework
   - `examples/playwright/` - Playwright testing framework
   - (and others...)
