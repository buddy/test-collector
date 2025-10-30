#!/bin/bash
set -e

FRAMEWORKS=(
  "vitest:3:4"
)

echo "Multi-version linting started"

echo "Setting all frameworks to previous versions"
for config in "${FRAMEWORKS[@]}"; do
  IFS=':' read -r framework prev latest <<< "$config"
  ./scripts/prepare-version.sh devDependencies "$framework" "$prev" .
done
npm install --silent

echo "Linting against previous versions"
npm run lint
npm run lint:types

echo "Setting all frameworks to latest versions"
for config in "${FRAMEWORKS[@]}"; do
  IFS=':' read -r framework prev latest <<< "$config"
  ./scripts/prepare-version.sh devDependencies "$framework" "$latest" .
done
npm install --silent

echo "Linting against latest versions"
npm run lint
npm run lint:types

echo "All frameworks validated"
