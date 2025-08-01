#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

source "$SCRIPT_DIR/load-env.sh"

"$SCRIPT_DIR/prepare-version.sh" devDependencies "mocha" "${MOCHA_VERSION:-latest}" "$PROJECT_ROOT/examples/mocha"

cd "$PROJECT_ROOT/examples/mocha"
npm install
npm run test
