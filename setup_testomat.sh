#!/bin/bash
# Initial setup script for Testomat.io integration

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Testomat.io Setup for HearingClinic${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Check if API key is provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: ./setup_testomat.sh YOUR_TESTOMATIO_API_KEY${NC}"
    echo ""
    echo -e "${BLUE}Steps to get your API key:${NC}"
    echo "1. Go to https://app.testomat.io"
    echo "2. Sign up or log in"
    echo "3. Create a new project (e.g., 'HearingClinic')"
    echo "4. Go to Settings → API Keys"
    echo "5. Copy your API key"
    echo "6. Run: ./setup_testomat.sh YOUR_API_KEY"
    echo ""
    exit 1
fi

API_KEY=$1

echo -e "${GREEN}✓${NC} API key provided"
echo ""

# Step 2: Set environment variable
echo -e "${BLUE}Setting up environment variable...${NC}"

# Add to .bashrc if not already there
if ! grep -q "TESTOMATIO" ~/.bashrc 2>/dev/null; then
    echo "" >> ~/.bashrc
    echo "# Testomat.io API Key for HearingClinic" >> ~/.bashrc
    echo "export TESTOMATIO=$API_KEY" >> ~/.bashrc
    echo -e "${GREEN}✓${NC} Added TESTOMATIO to ~/.bashrc"
else
    echo -e "${YELLOW}!${NC} TESTOMATIO already in ~/.bashrc (skipping)"
fi

# Set for current session
export TESTOMATIO=$API_KEY
echo -e "${GREEN}✓${NC} TESTOMATIO set for current session"
echo ""

# Step 3: Install Python dependencies
echo -e "${BLUE}Installing Python test dependencies...${NC}"
if [ -f "requirements-test.txt" ]; then
    # Install most dependencies
    pip install pytest pytest-cov pytest-xdist flake8 black faker factory-boy freezegun responses -q 2>/dev/null || \
        pip install pytest pytest-cov pytest-xdist -q
    echo -e "${GREEN}✓${NC} Python dependencies installed"
else
    echo -e "${YELLOW}!${NC} requirements-test.txt not found (continuing)"
fi
echo ""

# Step 4: Install Node dependencies
echo -e "${BLUE}Installing Node.js test dependencies...${NC}"
if [ -f "package.json" ]; then
    npm install
    echo -e "${GREEN}✓${NC} Node dependencies installed"
else
    echo -e "${RED}✗${NC} package.json not found"
    exit 1
fi
echo ""

# Step 5: Install Testomat CLI globally
echo -e "${BLUE}Installing Testomat.io CLI tools...${NC}"
npm install -g @testomatio/reporter check-tests 2>/dev/null || \
    echo -e "${YELLOW}!${NC} Install manually if needed: npm install -g @testomatio/reporter"
echo ""

# Step 6: Import tests to Testomat.io
echo -e "${BLUE}Importing tests to Testomat.io...${NC}"

# Import JavaScript tests first (easier)
echo -e "  ${YELLOW}→${NC} Importing frontend JavaScript tests..."
npx check-tests jest 'hearingclinic/tests/frontend/**/*.js' --create 2>/dev/null && \
    echo -e "${GREEN}✓${NC} Frontend tests imported" || \
    echo -e "${YELLOW}!${NC} Frontend import - run manually: npm run test:testomat:import${NC}"

# For Python tests, we'll use JUnit XML approach
echo -e "  ${YELLOW}→${NC} Backend Python tests will be imported on first test run"
echo -e "    ${BLUE}Tip:${NC} Run ./run_tests_with_reporting.sh to send results"

echo ""

# Step 7: Make test runners executable
echo -e "${BLUE}Setting up test runners...${NC}"
chmod +x run_tests_testomat.sh 2>/dev/null || true
chmod +x run_tests_with_reporting.sh 2>/dev/null || true
echo -e "${GREEN}✓${NC} Test runners are executable"
echo ""

# Step 8: Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setup Complete! 🎉${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""
echo "1. Reload your shell or run:"
echo -e "   ${YELLOW}source ~/.bashrc${NC}"
echo ""
echo "2. Run tests with Testomat reporting:"
echo -e "   ${YELLOW}./run_tests_with_reporting.sh [site-name]${NC}"
echo -e "   ${BLUE}(Recommended)${NC} or ./run_tests_testomat.sh"
echo ""
echo "3. View results at:"
echo -e "   ${YELLOW}https://app.testomat.io${NC}"
echo ""
echo "4. For CI/CD integration, add TESTOMATIO secret to your repository:"
echo "   - GitHub: Settings → Secrets → New repository secret"
echo "   - GitLab: Settings → CI/CD → Variables"
echo "   - Jenkins: Credentials → Add credentials"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "- Full guide: TESTOMAT_INTEGRATION.md"
echo "- Quick start: QUICKSTART_TESTING.md"
echo "- Architecture: TESTOMAT_ARCHITECTURE.md"
echo ""
echo -e "${GREEN}Happy testing! 🧪${NC}"
echo ""
