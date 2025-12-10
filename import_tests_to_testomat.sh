#!/bin/bash
# Script to import tests into Testomat.io
# This creates the test structure in Testomat.io based on your test files

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Import Tests to Testomat.io${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if TESTOMATIO key is set
if [ -z "$TESTOMATIO" ]; then
    echo -e "${RED}Error: TESTOMATIO environment variable is not set${NC}"
    echo -e "${YELLOW}Please set your Testomat.io API key:${NC}"
    echo "  export TESTOMATIO=your-api-key-here"
    echo ""
    echo -e "${YELLOW}Get your API key from:${NC} https://app.testomat.io"
    exit 1
fi

echo -e "${GREEN}✓${NC} Testomat.io API Key found: ${TESTOMATIO:0:8}..."
echo ""

# Get the script directory
SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}")"
SCRIPT_DIR="$(dirname "$SCRIPT_PATH")"
cd "$SCRIPT_DIR" || exit 1

# Import Frontend Tests (Jest)
echo -e "${GREEN}Importing Frontend Tests (Jest)...${NC}"
echo "========================================"

if command -v npx &> /dev/null; then
    # Import Jest tests
    npx check-tests@latest jest 'hearingclinic/tests/frontend/**/*.js' --create
    echo -e "${GREEN}✓${NC} Frontend tests imported"
else
    echo -e "${RED}Error: npx not found. Please install Node.js${NC}"
    exit 1
fi
echo ""

# Import Backend Tests (Python)
echo -e "${GREEN}Importing Backend Tests (Python)...${NC}"
echo "========================================"

# For Python tests using unittest (Frappe framework), we need to use pytest format
# The check-tests tool will scan the files and extract test methods
# Scan all Python test files recursively
npx check-tests@latest pytest 'hearingclinic/**/*.py' --create

echo -e "${GREEN}✓${NC} Backend tests imported"
echo ""

# Note about backend test structure
echo -e "${YELLOW}Note:${NC} Backend tests are organized into suites:"
echo "  - Customer Management (test_customer_*.py)"
echo "  - Value Add Card (test_value_add_card.py, test_card_transaction.py)"
echo "  - API Tests (test_api.py)"
echo "  - Integration Tests (test_integration.py, test_package_unfolding.py)"
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Import Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}All tests have been imported to Testomat.io${NC}"
echo -e "${BLUE}View your tests at:${NC} https://app.testomat.io"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Review the imported tests in your Testomat.io dashboard"
echo "  2. Run tests with: ./run_tests_with_reporting.sh"
echo "  3. Check test results in Testomat.io"
echo ""

exit 0
