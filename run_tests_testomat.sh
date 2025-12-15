#!/bin/bash
# Script to run tests and report to Testomat.io

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}HearingClinic - Testomat.io Test Runner${NC}"
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

# Get site name
SITE_NAME=${1:-test_site}
echo -e "${BLUE}Using site:${NC} $SITE_NAME"
echo ""

# Install test dependencies if needed
if ! pip show pytest-testomat-reporter > /dev/null 2>&1; then
    echo -e "${YELLOW}Installing test dependencies...${NC}"
    pip install -r requirements-test.txt
    echo ""
fi

# Backend Tests
echo -e "${GREEN}Running Backend Tests...${NC}"
echo "========================================"

# Use pytest with Testomat reporter
cd ../../../
pytest apps/hearingclinic/hearingclinic \
    --testomatio=$TESTOMATIO \
    --testomatio-title="HearingClinic Backend Tests" \
    --tb=short \
    -v

BACKEND_EXIT_CODE=$?

# Frontend Tests
echo ""
echo -e "${GREEN}Running Frontend Tests...${NC}"
echo "========================================"

cd apps/hearingclinic
npm test

FRONTEND_EXIT_CODE=$?

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"

if [ $BACKEND_EXIT_CODE -eq 0 ]; then
    echo -e "Backend Tests:  ${GREEN}PASSED ✓${NC}"
else
    echo -e "Backend Tests:  ${RED}FAILED ✗${NC}"
fi

if [ $FRONTEND_EXIT_CODE -eq 0 ]; then
    echo -e "Frontend Tests: ${GREEN}PASSED ✓${NC}"
else
    echo -e "Frontend Tests: ${RED}FAILED ✗${NC}"
fi

echo ""
echo -e "${BLUE}View results at:${NC} https://app.testomat.io"
echo ""

# Exit with error if any tests failed
if [ $BACKEND_EXIT_CODE -ne 0 ] || [ $FRONTEND_EXIT_CODE -ne 0 ]; then
    exit 1
fi

exit 0
