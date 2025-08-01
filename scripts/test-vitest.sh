#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

source "$SCRIPT_DIR/load-env.sh"
source "$SCRIPT_DIR/run-tests-with-api-check.sh"

"$SCRIPT_DIR/prepare-version.sh" devDependencies "vitest" "${VITEST_VERSION:-latest}" "$PROJECT_ROOT/examples/vitest"

cd "$PROJECT_ROOT/examples/vitest"
npm install

run_tests_with_api_check
