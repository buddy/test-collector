#!/bin/bash

# Script to update package versions in package.json
# Usage: ./prepare-version.sh <dependency-type> <package-name> <version> [directory]
# Example: ./prepare-version.sh devDependencies jest 29.7.0
# Example: ./prepare-version.sh dependencies axios 1.7.0 /path/to/project
# Example: ./prepare-version.sh peerDependencies react 18.0.0 ../other-project

set -e

if [ $# -lt 3 ] || [ $# -gt 4 ]; then
    echo "Usage: $0 <dependency-type> <package-name> <version> [directory]"
    echo ""
    echo "dependency-type: devDependencies | dependencies | peerDependencies"
    echo "package-name: name of the npm package"
    echo "version: version to set"
    echo "directory: optional path to directory containing package.json (default: script directory)"
    echo ""
    echo "Examples:"
    echo "  $0 devDependencies jest 29.7.0"
    echo "  $0 dependencies axios 1.7.0 /path/to/project"
    echo "  $0 peerDependencies react 18.0.0 ../other-project"
    exit 1
fi

DEPENDENCY_TYPE="$1"
PACKAGE_NAME="$2"
VERSION="$3"

# Validate dependency type
case "$DEPENDENCY_TYPE" in
    devDependencies|dependencies|peerDependencies)
        ;;
    *)
        echo "Error: Invalid dependency type '$DEPENDENCY_TYPE'"
        echo "Must be one of: devDependencies, dependencies, peerDependencies"
        exit 1
        ;;
esac

# Set target directory - use 4th argument if provided, otherwise use script directory
if [ $# -eq 4 ]; then
    TARGET_DIR="$4"
else
    TARGET_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi

PACKAGE_JSON="$TARGET_DIR/package.json"

if [ ! -f "$PACKAGE_JSON" ]; then
    echo "Error: package.json not found at $PACKAGE_JSON"
    exit 1
fi

# Check if jq is available
if ! command -v jq &>/dev/null; then
    echo "Error: jq is required but not installed"
    exit 1
fi

echo "Updating $PACKAGE_NAME to version $VERSION in $DEPENDENCY_TYPE..."

# Update the package version using jq
jq --arg depType "$DEPENDENCY_TYPE" --arg pkg "$PACKAGE_NAME" --arg version "$VERSION" \
   '.[$depType][$pkg] = $version' "$PACKAGE_JSON" > "$PACKAGE_JSON.tmp" && mv "$PACKAGE_JSON.tmp" "$PACKAGE_JSON"

echo "✅ Successfully updated $PACKAGE_NAME to version $VERSION"
echo "📦 Current $DEPENDENCY_TYPE:"
jq --arg depType "$DEPENDENCY_TYPE" '.[$depType]' "$PACKAGE_JSON"
