# Testomat.io Integration Guide

Complete guide for integrating HearingClinic test suite with Testomat.io for centralized test management and reporting.

## Table of Contents

- [What is Testomat.io?](#what-is-testomatio)
- [Setup](#setup)
- [Configuration](#configuration)
- [Running Tests](#running-tests)
- [CI/CD Integration](#cicd-integration)
- [Test Organization](#test-organization)
- [Advanced Features](#advanced-features)

## What is Testomat.io?

Testomat.io is a test management platform that helps you:

- **Centralize test management** - All your tests in one place
- **Track test results** - Historical test run data and trends
- **Organize tests** - Group tests by features, suites, or tags
- **Integrate with CI/CD** - Automatic test reporting from pipelines
- **Collaborate** - Share test results with team members
- **Analyze** - Get insights into test coverage and flaky tests

**Website**: https://testomat.io
**Documentation**: https://docs.testomat.io

## Setup

### 1. Create Testomat.io Account

1. Go to https://app.testomat.io
2. Sign up for a free account
3. Create a new project for "HearingClinic"

### 2. Get Your API Key

1. In Testomat.io, go to **Settings** → **API Keys**
2. Copy your API key
3. Set it as an environment variable:

```bash
export TESTOMATIO=your-api-key-here
```

Add to your `.bashrc` or `.zshrc` for persistence:

```bash
echo 'export TESTOMATIO=your-api-key-here' >> ~/.bashrc
source ~/.bashrc
```

### 3. Install Dependencies

#### Backend (Python)
```bash
cd apps/hearingclinic
pip install -r requirements-test.txt
```

This installs:
- `pytest-testomat-reporter` - Pytest plugin for Testomat.io

#### Frontend (JavaScript)
```bash
cd apps/hearingclinic
npm install
```

This installs:
- `@testomatio/reporter` - Jest reporter for Testomat.io

## Configuration

### Files Created for Testomat Integration

1. **[.testomatrc](/.testomatrc)** - Main configuration file
2. **[pytest.ini](/pytest.ini)** - Pytest configuration with Testomat markers
3. **[package.json](/package.json)** - Updated with Testomat scripts
4. **[requirements-test.txt](/requirements-test.txt)** - Python test dependencies
5. **[run_tests_testomat.sh](/run_tests_testomat.sh)** - Automated test runner
6. **[.github/workflows/tests.yml](/.github/workflows/tests.yml)** - CI/CD with Testomat

### Configuration Options

Edit `.testomatrc` to customize:

```ini
# Project API Key
TESTOMATIO=your-api-key-here

# Test Framework
TESTOMATIO_FRAMEWORK=pytest

# Title for test runs
TESTOMATIO_TITLE="HearingClinic ERPNext Tests"

# Auto-create tests in Testomat
TESTOMATIO_CREATE=1

# Continue on test failures
TESTOMATIO_PROCEED_ON_FAIL=1
```

## Running Tests

### Option 1: Use the Automated Script (Recommended)

```bash
# Make sure TESTOMATIO is set
export TESTOMATIO=your-api-key

# Run all tests with Testomat reporting
./run_tests_testomat.sh [site-name]

# Example
./run_tests_testomat.sh test_site
```

This script:
- ✅ Runs backend Python tests with Testomat reporting
- ✅ Runs frontend JavaScript tests with Testomat reporting
- ✅ Provides colored output
- ✅ Shows summary at the end
- ✅ Uploads results to Testomat.io

### Option 2: Backend Tests Only

Using pytest directly:

```bash
cd frappe-bench

# Run all backend tests
pytest apps/hearingclinic/hearingclinic \
    --testomatio=$TESTOMATIO \
    --testomatio-title="HearingClinic Backend Tests" \
    -v

# Run specific test file
pytest apps/hearingclinic/hearingclinic/doctype/value_add_card/test_value_add_card.py \
    --testomatio=$TESTOMATIO \
    --testomatio-title="VAC Tests" \
    -v

# Run with markers
pytest apps/hearingclinic/hearingclinic \
    --testomatio=$TESTOMATIO \
    -m unit \
    -v
```

### Option 3: Frontend Tests Only

```bash
cd apps/hearingclinic

# Run with Testomat reporting
npm run test:testomat:report

# Or manually
TESTOMATIO=$TESTOMATIO npm test
```

### Option 4: Import Tests to Testomat (First Time)

Import your test structure to Testomat.io:

#### Backend Tests
```bash
cd frappe-bench

# Import test structure
npx check-tests@latest pytest \
    'apps/hearingclinic/**/*.py' \
    --typescript \
    --update-ids
```

#### Frontend Tests
```bash
cd apps/hearingclinic

# Import test structure
npm run test:testomat:import
```

This creates a test hierarchy in Testomat.io matching your file structure.

## CI/CD Integration

### GitHub Actions Setup

The integration is already configured in `.github/workflows/tests.yml`.

#### Add Secret to GitHub

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `TESTOMATIO`
5. Value: Your Testomat.io API key
6. Click **Add secret**

#### How It Works

When you push code or create a PR:

1. GitHub Actions runs the workflow
2. Tests are executed with Testomat reporting enabled
3. Results are sent to Testomat.io
4. You can view results in the Testomat.io dashboard

### Other CI/CD Platforms

#### GitLab CI

Add to `.gitlab-ci.yml`:

```yaml
test:
  script:
    - export TESTOMATIO=$TESTOMATIO_SECRET
    - ./run_tests_testomat.sh
  variables:
    TESTOMATIO_SECRET: $TESTOMATIO
```

#### Jenkins

Add to Jenkinsfile:

```groovy
pipeline {
    environment {
        TESTOMATIO = credentials('testomatio-api-key')
    }
    stages {
        stage('Test') {
            steps {
                sh './run_tests_testomat.sh'
            }
        }
    }
}
```

## Test Organization

### Test Markers (Backend)

Use pytest markers to organize tests:

```python
import pytest

@pytest.mark.unit
def test_card_value_calculation():
    """Unit test for card value calculation"""
    pass

@pytest.mark.integration
def test_complete_customer_workflow():
    """Integration test for customer workflow"""
    pass

@pytest.mark.api
def test_check_balance_api():
    """API endpoint test"""
    pass
```

Run tests by marker:

```bash
pytest -m unit --testomatio=$TESTOMATIO
pytest -m integration --testomatio=$TESTOMATIO
pytest -m api --testomatio=$TESTOMATIO
```

### Test Suites in Testomat

Organize tests into suites in Testomat.io:

```
HearingClinic/
├── Backend/
│   ├── DocTypes/
│   │   ├── Value Add Card/
│   │   └── Card Transaction/
│   ├── Business Logic/
│   │   ├── Customer ID Generation/
│   │   └── Duplicate Check/
│   └── API/
│       └── REST Endpoints/
└── Frontend/
    └── UI Components/
        ├── Customer/
        ├── VAC/
        └── Sales Invoice/
```

### Test IDs

Testomat can add test IDs to your code:

```python
# @T96f8b2c1
def test_card_value_calculation():
    """Test with Testomat ID"""
    pass
```

These IDs link your code to Testomat.io tests.

## Advanced Features

### Test Analytics

View in Testomat.io:

- **Test execution trends** - Pass/fail rates over time
- **Flaky test detection** - Tests that fail intermittently
- **Duration analysis** - Slowest tests
- **Coverage mapping** - Test coverage by feature

### Test Plans

Create test plans for different scenarios:

- **Smoke Tests** - Critical path tests
- **Regression Tests** - Full test suite
- **API Tests** - Only API endpoints
- **Frontend Tests** - Only UI tests

### Jira Integration

Link tests to Jira issues:

```python
# @T96f8b2c1 @JIRA:HC-123
def test_customer_duplicate_check():
    """Test linked to Jira ticket HC-123"""
    pass
```

### Parallel Execution

Run tests in parallel and aggregate results:

```bash
# Run 4 parallel processes
pytest apps/hearingclinic/hearingclinic \
    --testomatio=$TESTOMATIO \
    -n 4 \
    -v
```

### Custom Reports

Generate custom reports:

```bash
# Export test results
npx testomatio-reporter \
    --from-junit test-results.xml \
    --title "Weekly Regression"
```

## Viewing Results

### In Testomat.io Dashboard

1. Go to https://app.testomat.io
2. Select your HearingClinic project
3. View:
   - **Recent Runs** - Latest test executions
   - **Tests** - All tests organized by suites
   - **Analytics** - Test trends and statistics
   - **Reports** - Generate custom reports

### Test Run Details

Each test run shows:

- ✅ Passed tests (green)
- ❌ Failed tests (red)
- ⏭️ Skipped tests (yellow)
- ⏱️ Duration
- 📊 Coverage
- 📝 Logs and screenshots (if configured)

### Notifications

Configure notifications in Testomat.io:

- Email on test failures
- Slack integration
- Webhook to custom endpoints

## Troubleshooting

### API Key Issues

**Problem**: `TESTOMATIO environment variable is not set`

**Solution**:
```bash
# Check if set
echo $TESTOMATIO

# Set it
export TESTOMATIO=your-api-key-here

# Make permanent
echo 'export TESTOMATIO=your-api-key' >> ~/.bashrc
```

### Tests Not Appearing

**Problem**: Tests don't show up in Testomat.io

**Solution**:
```bash
# Import tests first
npx check-tests@latest pytest 'apps/hearingclinic/**/*.py' --update-ids

# Then run tests
pytest --testomatio=$TESTOMATIO
```

### Reporter Not Found

**Problem**: `Module 'pytest_testomat_reporter' not found`

**Solution**:
```bash
pip install -r requirements-test.txt
```

### CI/CD Not Reporting

**Problem**: Tests run but don't report to Testomat in CI

**Solution**:
1. Verify `TESTOMATIO` secret is set in CI platform
2. Check environment variable is passed to test command
3. Review CI logs for connection errors

## Best Practices

### 1. Consistent Test Naming

Use descriptive names:
```python
# Good
def test_card_value_calculated_with_1_6_multiplier():

# Bad
def test_calc():
```

### 2. Tag Tests Appropriately

```python
@pytest.mark.unit
@pytest.mark.smoke
def test_critical_feature():
    pass
```

### 3. Regular Test Runs

Schedule regular test runs:
- On every commit (fast tests)
- Nightly (full suite)
- Weekly (extended suite)

### 4. Review Failures Promptly

- Check Testomat.io daily
- Triage failures
- Fix or mark as known issues

### 5. Update Test Documentation

Keep test descriptions current:
```python
def test_feature():
    """
    Test that feature X works correctly.

    Given: Preconditions
    When: Action
    Then: Expected result
    """
```

## Resources

- **Testomat.io Docs**: https://docs.testomat.io
- **Pytest Plugin**: https://github.com/testomatio/pytestomat-reporter
- **Jest Reporter**: https://github.com/testomatio/reporter
- **Support**: support@testomat.io

## Quick Reference

| Task | Command |
|------|---------|
| Set API key | `export TESTOMATIO=key` |
| Run all tests | `./run_tests_testomat.sh` |
| Backend only | `pytest --testomatio=$TESTOMATIO` |
| Frontend only | `npm run test:testomat:report` |
| Import tests | `npx check-tests@latest --update-ids` |
| View results | https://app.testomat.io |

---

**Last Updated**: 2025-12-07
**Maintained By**: Thomas Roch (thomas@dierochs.de)
