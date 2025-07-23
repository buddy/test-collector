# Jest with Buddy Reporter

This is a Jest test setup that can optionally use the Buddy test results collector.

## Setup

[First build and prepare the package in parent repository.](../../README.md)

Install dependencies using npm:

```bash
npm install
```

## Running Tests

To run tests **without** buddy reporter:

```bash
npm test
```

To run tests **with** buddy reporter (parallel execution):

```bash
npm run test:collect
```
