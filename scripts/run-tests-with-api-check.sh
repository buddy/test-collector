#!/bin/bash

# Function to run tests while allowing test failures but detecting API communication failures
# Usage: run_tests_with_api_check [test_command]
# Default test_command is "npm run test" if not provided
run_tests_with_api_check() {
    local test_command="${1:-npm run test}"
    
    # Run tests - allow test failures but detect API communication failures
    set +e  # Temporarily disable exit on error
    $test_command
    TEST_EXIT_CODE=$?
    set -e  # Re-enable exit on error

    # Check if API communication failed and exit with error if so
    if [ "$BUDDY_API_FAILURE" = "true" ]; then
        echo "ERROR: Failed to communicate with Buddy API - failing workflow"
        exit 1
    fi

    # If tests failed but API communication succeeded, that's OK for the workflow
    echo "Tests completed with exit code $TEST_EXIT_CODE (API communication successful)"
}