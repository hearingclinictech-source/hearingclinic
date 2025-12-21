#!/bin/bash
# Enhanced test runner with Testomat.io reporting via JUnit XML
# This approach uses the standard JUnit XML format that pytest already generates

set -e

# Get the real path of the script, resolving symlinks
SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}")"
SCRIPT_DIR="$(dirname "$SCRIPT_PATH")"

# Load .env file if it exists
if [ -f "$SCRIPT_DIR/.env" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
    echo "Loaded environment variables from .env"
fi

# Detect if we're running in Docker environment (hc-staging)
DOCKER_PREFIX=""
if [ -f "/.dockerenv" ] || grep -q docker /proc/1/cgroup 2>/dev/null; then
    # We're inside a Docker container, run commands directly
    DOCKER_PREFIX=""
elif docker compose -p frappe ps 2>/dev/null | grep -q "backend.*running"; then
    # We're on hc-staging host and backend container is RUNNING
    DOCKER_PREFIX="docker compose -p frappe exec -T backend"
    echo "Detected hc-staging environment - using Docker exec"
else
    # Local environment or backend not running
    DOCKER_PREFIX=""
fi

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
SITE_NAME=${1:-development.localhost}
echo -e "${BLUE}Site:${NC} $SITE_NAME"

# Show environment info
if [ -n "$DOCKER_PREFIX" ]; then
    echo -e "${BLUE}Environment:${NC} hc-staging (Docker)"
    echo -e "${BLUE}Command prefix:${NC} $DOCKER_PREFIX"
else
    echo -e "${BLUE}Environment:${NC} Local"
fi
echo ""

# Sync tests with Testomat.io if enabled
if [ "$TESTOMAT_ENABLED" = true ]; then
    echo -e "${GREEN}Syncing tests with Testomat.io...${NC}"
    echo "========================================"

    if command -v npx &> /dev/null; then
        cd "$SCRIPT_DIR"

        # Update test IDs in frontend tests
        echo -e "${BLUE}Updating frontend test IDs...${NC}"
        npx -y check-tests@latest jest 'hearingclinic/tests/frontend/**/*.js' --update-ids 2>&1 | grep -v "warn" || true

        # Update test IDs in backend tests
        echo -e "${BLUE}Updating backend test IDs...${NC}"
        npx -y check-tests@latest pytest 'hearingclinic/**/*.py' --update-ids 2>&1 | grep -v "warn" || true

        echo -e "${GREEN}✓${NC} Tests synced with Testomat.io"
    else
        echo -e "${YELLOW}Warning: npx not found. Skipping test sync.${NC}"
    fi
    echo ""
fi

# Ensure we're in the bench directory
BENCH_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$BENCH_DIR" || exit 1

# Backend Tests
echo -e "${GREEN}Running Backend Tests with XML Output...${NC}"
echo "========================================"

# Ensure required dependencies are installed
echo -e "${BLUE}Checking dependencies...${NC}"
if [ -z "$DOCKER_PREFIX" ]; then
    ./env/bin/pip install unittest-xml-reporting -q 2>/dev/null || true
else
    $DOCKER_PREFIX pip install unittest-xml-reporting -q 2>/dev/null || true
fi

# Create test results directory (use absolute path)
TEST_RESULTS_DIR="$BENCH_DIR/test-results/backend"
mkdir -p "$TEST_RESULTS_DIR"

# Test modules to run
TEST_MODULES=(
    "hearingclinic.hearingclinic.doc_events.test_customer_id"
    "hearingclinic.hearingclinic.doc_events.test_customer_duplicate_check"
    "hearingclinic.hearingclinic.doc_events.test_vac_sales_invoice"
    "hearingclinic.hearingclinic.doctype.value_add_card.test_value_add_card"
    "hearingclinic.hearingclinic.doctype.card_transaction.test_card_transaction"
    "hearingclinic.hearingclinic.api.test_api"
    "hearingclinic.tests.test_integration"
    "hearingclinic.tests.test_package_unfolding"
)

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
BACKEND_EXIT=0

# Run tests module by module with XML output
for module in "${TEST_MODULES[@]}"; do
    echo -e "${BLUE}Running:${NC} $module"

    # Create module-specific XML file
    module_name=$(echo "$module" | sed 's/\./_/g')
    xml_file="$TEST_RESULTS_DIR/${module_name}.xml"

    # Run test with XML output
    if $DOCKER_PREFIX bench --site "$SITE_NAME" run-tests --module "$module" --junit-xml-output "$xml_file" 2>&1 | tee /tmp/test_output.txt; then
        test_passed=true
    else
        test_passed=false
        BACKEND_EXIT=1
    fi

    # Extract test count from output
    count=$(grep -oP "Ran \K\d+" /tmp/test_output.txt || echo "0")
    TOTAL_TESTS=$((TOTAL_TESTS + count))

    # Check results
    if [ "$test_passed" = true ] && grep -q "^OK" /tmp/test_output.txt; then
        PASSED_TESTS=$((PASSED_TESTS + count))
        echo -e "${GREEN}✓${NC} All $count tests passed - XML: $xml_file"
    else
        # Extract failure and error counts
        failed_count=$(grep -oP "failures=\K\d+" /tmp/test_output.txt || echo "0")
        error_count=$(grep -oP "errors=\K\d+" /tmp/test_output.txt || echo "0")

        failures_and_errors=$((failed_count + error_count))
        FAILED_TESTS=$((FAILED_TESTS + failures_and_errors))
        passed_in_module=$((count - failures_and_errors))
        PASSED_TESTS=$((PASSED_TESTS + passed_in_module))

        echo -e "${RED}✗${NC} $passed_in_module passed, $failures_and_errors failed - XML: $xml_file"
    fi
    echo ""
done

echo -e "${BLUE}Backend Summary:${NC} $TOTAL_TESTS tests, $PASSED_TESTS passed, $FAILED_TESTS failed"
echo -e "${BLUE}XML Output:${NC} $TEST_RESULTS_DIR/"
echo ""

# Upload backend test results to Testomat.io if enabled
if [ "$TESTOMAT_ENABLED" = true ]; then
    echo -e "${GREEN}Uploading backend test results to Testomat.io...${NC}"

    # Check if npx is available (needed for testomatio reporter)
    if command -v npx &> /dev/null; then
        # Upload all XML files to Testomat.io using the correct command
        # Use report-xml command from @testomatio/reporter package
        cd "$BENCH_DIR/apps/hearingclinic"

        # Generate test run title with date
        RUN_TITLE="Backend Tests - $(date '+%Y-%m-%d %H:%M:%S')"

        # Upload with TESTOMATIO_CREATE env var to create tests if they don't exist
        # TESTOMATIO_TITLE sets the run title
        TESTOMATIO=$TESTOMATIO \
        TESTOMATIO_CREATE=1 \
        TESTOMATIO_TITLE="$RUN_TITLE" \
        npx report-xml "$TEST_RESULTS_DIR/*.xml" --lang=Python

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓${NC} Backend test results uploaded to Testomat.io"
            echo -e "${BLUE}  Run title:${NC} $RUN_TITLE"
        else
            echo -e "${YELLOW}Warning: Failed to upload XML reports to Testomat.io${NC}"
        fi
    else
        echo -e "${YELLOW}Warning: npx not found. Install Node.js to enable backend test upload to Testomat.io${NC}"
    fi
    echo ""
fi

# Frontend Tests
echo ""
echo -e "${GREEN}Running Frontend Tests...${NC}"
echo "========================================"

cd "$BENCH_DIR/apps/hearingclinic"

# Run frontend tests with Testomat.io reporting if enabled
if [ "$TESTOMAT_ENABLED" = true ]; then
    # Generate test run title with date
    FRONTEND_RUN_TITLE="Frontend Tests - $(date '+%Y-%m-%d %H:%M:%S')"
    echo -e "${BLUE}Run title:${NC} $FRONTEND_RUN_TITLE"
    echo ""

    # Pass TESTOMATIO and TESTOMATIO_TITLE to npm test so Jest reporter can use them
    TESTOMATIO=$TESTOMATIO TESTOMATIO_TITLE="$FRONTEND_RUN_TITLE" npm test
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
