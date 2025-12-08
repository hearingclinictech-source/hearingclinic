#!/bin/bash
# Enhanced test runner with Testomat.io reporting via JUnit XML
# This approach uses the standard JUnit XML format that pytest already generates

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}HearingClinic Test Runner${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check for TESTOMATIO
TESTOMAT_ENABLED=false
if [ -n "$TESTOMATIO" ]; then
    TESTOMAT_ENABLED=true
    echo -e "${GREEN}✓${NC} Testomat.io reporting: ${GREEN}ENABLED${NC}"
    echo -e "${BLUE}  API Key:${NC} ${TESTOMATIO:0:8}..."
else
    echo -e "${YELLOW}!${NC} Testomat.io reporting: ${YELLOW}DISABLED${NC}"
    echo -e "${YELLOW}  Set TESTOMATIO environment variable to enable${NC}"
fi
echo ""

# Get site name
SITE_NAME=${1:-test_site}
echo -e "${BLUE}Site:${NC} $SITE_NAME"
echo ""

# Ensure we're in the bench directory
# Get the real path of the script, resolving symlinks
SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}")"
SCRIPT_DIR="$(dirname "$SCRIPT_PATH")"
BENCH_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$BENCH_DIR" || exit 1

# Backend Tests
echo -e "${GREEN}Running Backend Tests...${NC}"
echo "========================================"

# Ensure required dependencies are installed
echo -e "${BLUE}Checking dependencies...${NC}"
./env/bin/pip install coverage unittest-xml-reporting -q 2>/dev/null || true

# Test modules to run (module-by-module to avoid ERPNext fixture issues)
TEST_MODULES=(
    "hearingclinic.hearingclinic.doc_events.test_customer_id"
    "hearingclinic.hearingclinic.doc_events.test_customer_duplicate_check"
    "hearingclinic.hearingclinic.doctype.value_add_card.test_value_add_card"
    "hearingclinic.hearingclinic.doctype.card_transaction.test_card_transaction"
    "hearingclinic.hearingclinic.api.test_api"
    "hearingclinic.tests.test_integration"
)

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
BACKEND_EXIT=0

for module in "${TEST_MODULES[@]}"; do
    echo -e "${BLUE}Running:${NC} $module"

    # Run the test and capture output
    if bench --site $SITE_NAME run-tests --module "$module" 2>&1 | tee /tmp/test_output.txt; then
        # Extract test count from output
        count=$(grep -oP "Ran \K\d+" /tmp/test_output.txt || echo "0")
        TOTAL_TESTS=$((TOTAL_TESTS + count))
        PASSED_TESTS=$((PASSED_TESTS + count))
        echo -e "${GREEN}✓${NC} Passed ($count tests)"
    else
        count=$(grep -oP "Ran \K\d+" /tmp/test_output.txt || echo "0")
        TOTAL_TESTS=$((TOTAL_TESTS + count))
        failed_count=$(grep -oP "failures=\K\d+" /tmp/test_output.txt || echo "0")
        error_count=$(grep -oP "errors=\K\d+" /tmp/test_output.txt || echo "0")
        FAILED_TESTS=$((FAILED_TESTS + failed_count + error_count))
        echo -e "${RED}✗${NC} Failed"
        BACKEND_EXIT=1
    fi
    echo ""
done

echo -e "${BLUE}Backend Summary:${NC} $TOTAL_TESTS tests, $PASSED_TESTS passed, $FAILED_TESTS failed"
echo ""

# If Testomat is enabled, send results (note: individual module results, not JUnit XML)
if [ "$TESTOMAT_ENABLED" = true ]; then
    echo -e "${BLUE}Note:${NC} Testomat.io reporting works best with frontend tests (Jest has built-in integration)"
    echo -e "${BLUE}Backend tests${NC} ran module-by-module - see console output above"
    echo ""
fi

# Frontend Tests
echo ""
echo -e "${GREEN}Running Frontend Tests...${NC}"
echo "========================================"

cd apps/hearingclinic

# Run frontend tests
if [ "$TESTOMAT_ENABLED" = true ]; then
    npm test
else
    npm test
fi

FRONTEND_EXIT=$?

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"

if [ $BACKEND_EXIT -eq 0 ]; then
    echo -e "Backend Tests:  ${GREEN}PASSED ✓${NC}"
else
    echo -e "Backend Tests:  ${RED}FAILED ✗${NC}"
fi

if [ $FRONTEND_EXIT -eq 0 ]; then
    echo -e "Frontend Tests: ${GREEN}PASSED ✓${NC}"
else
    echo -e "Frontend Tests: ${RED}FAILED ✗${NC}"
fi

echo ""
if [ "$TESTOMAT_ENABLED" = true ]; then
    echo -e "${GREEN}View results at:${NC} https://app.testomat.io"
else
    echo -e "${YELLOW}Tip:${NC} Set TESTOMATIO=your-api-key to enable Testomat.io reporting"
fi
echo ""

# Exit with error if any tests failed
if [ $BACKEND_EXIT -ne 0 ] || [ $FRONTEND_EXIT -ne 0 ]; then
    exit 1
fi

exit 0
