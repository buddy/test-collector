#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

source "$SCRIPT_DIR/load-env.sh"

"$SCRIPT_DIR/prepare-version.sh" devDependencies "jest" "${JEST_VERSION:-latest}" "$PROJECT_ROOT/examples/jest"

cd "$PROJECT_ROOT/examples/jest"
npm install
npm run test
