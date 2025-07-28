# Cypress Example

This directory contains examples of Cypress E2E tests with different statuses.

## Running the tests

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run the tests:

   ```bash
   npm test
   ```

   Or to open Cypress interactive mode:

   ```bash
   npm run test:open
   ```

## Test files

- `cypress/e2e/all-statuses-1.cy.js` - Contains tests with various statuses (pass, fail, skip, pending)
- `cypress/e2e/all-statuses-2.cy.js` - Additional test examples including error tests
- `cypress/e2e/focused-example.cy.js` - Example of using `.only` to focus on specific tests

## Configuration

The Cypress configuration is in `cypress.config.js` and includes the Buddy test collector reporter setup.
