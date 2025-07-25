#!/bin/sh
# Load environment variables from .env file if it exists
# This script works with both sh and bash

if [ -f .env ]; then
    # Export variables from .env file
    set -a
    . ./.env
    set +a
fi

# Execute the command passed as arguments
exec "$@"