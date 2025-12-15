#!/bin/bash
# Backend test runner for HearingClinic app
# Runs tests module by module to avoid ERPNext fixture issues

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Get site name
SITE_NAME=${1:-development.localhost}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}HearingClinic Backend Test Runner${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Site:${NC} $SITE_NAME"
echo ""

# Ensure we're in the bench directory
# Get the real path of the script, resolving symlinks
SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}")"
SCRIPT_DIR="$(dirname "$SCRIPT_PATH")"
BENCH_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$BENCH_DIR" || exit 1

# Test modules to run
TEST_MODULES=(
    "hearingclinic.hearingclinic.doc_events.test_customer_id"
    "hearingclinic.hearingclinic.doc_events.test_customer_duplicate_check"
    "hearingclinic.hearingclinic.doctype.value_add_card.test_value_add_card"
    "hearingclinic.hearingclinic.doctype.card_transaction.test_card_transaction"
    "hearingclinic.hearingclinic.api.test_api"
    "hearingclinic.tests.test_integration"
    "hearingclinic.tests.test_package_unfolding"
)

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

for module in "${TEST_MODULES[@]}"; do
    echo -e "${BLUE}Running:${NC} $module"

    # Run the test and capture output
    bench --site $SITE_NAME run-tests --module "$module" 2>&1 | tee /tmp/test_output.txt
    EXIT_CODE=${PIPESTATUS[0]}

    # Extract test count from output
    count=$(grep -oP "Ran \K\d+" /tmp/test_output.txt || echo "0")
    TOTAL_TESTS=$((TOTAL_TESTS + count))

    # Check if tests passed
    if [ $EXIT_CODE -eq 0 ] && grep -q "^OK" /tmp/test_output.txt; then
        PASSED_TESTS=$((PASSED_TESTS + count))
        echo -e "${GREEN}✓${NC} All $count tests passed"
    else
        # Extract failure and error counts
        failed_count=$(grep -oP "failures=\K\d+" /tmp/test_output.txt || echo "0")
        error_count=$(grep -oP "errors=\K\d+" /tmp/test_output.txt || echo "0")

        failures_and_errors=$((failed_count + error_count))
        FAILED_TESTS=$((FAILED_TESTS + failures_and_errors))
        passed_in_module=$((count - failures_and_errors))
        PASSED_TESTS=$((PASSED_TESTS + passed_in_module))

        echo -e "${RED}✗${NC} $passed_in_module passed, $failures_and_errors failed (failures=$failed_count, errors=$error_count)"
    fi
    echo ""
done

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Total tests:  $TOTAL_TESTS"
echo -e "${GREEN}Passed:${NC}       $PASSED_TESTS"
echo -e "${RED}Failed:${NC}       $FAILED_TESTS"
echo ""

if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "${RED}Tests FAILED - $FAILED_TESTS failures/errors${NC}"
    exit 1
else
    echo -e "${GREEN}All tests PASSED!${NC}"
    exit 0
fi
