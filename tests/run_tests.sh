#!/bin/bash
# Test runner script for Serverless CMS integration tests

set -e

echo "==================================="
echo "Serverless CMS Integration Tests"
echo "==================================="
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing test dependencies..."
pip install -q -r tests/requirements.txt

# Run tests
echo ""
echo "Running integration tests..."
echo ""

if [ "$1" == "coverage" ]; then
    echo "Running with coverage report..."
    pytest tests/ -v --cov=lambda --cov-report=term --cov-report=html
    echo ""
    echo "Coverage report generated in htmlcov/index.html"
elif [ "$1" == "specific" ] && [ -n "$2" ]; then
    echo "Running specific test: $2"
    pytest "$2" -v
else
    pytest tests/ -v
fi

# Deactivate virtual environment
deactivate

echo ""
echo "==================================="
echo "Tests completed!"
echo "==================================="
