#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

source "$SCRIPT_DIR/load-env.sh"

"$SCRIPT_DIR/prepare-version.sh" devDependencies "@playwright/test" "${PLAYWRIGHT_VERSION:-latest}" "$PROJECT_ROOT/examples/playwright"

cd "$PROJECT_ROOT/examples/playwright"
npm install
npm run test
