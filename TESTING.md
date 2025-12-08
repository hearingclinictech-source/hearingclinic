# Testing Guide for HearingClinic ERPNext App

This document provides comprehensive instructions for running and writing tests for the HearingClinic custom ERPNext application.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Writing New Tests](#writing-new-tests)
- [Frontend Testing](#frontend-testing)
- [Testomat.io Integration](#testomatio-integration)
- [Continuous Integration](#continuous-integration)
- [Troubleshooting](#troubleshooting)

## Overview

The HearingClinic app includes comprehensive test coverage for:

- **Unit Tests**: Individual DocType and function tests
- **Integration Tests**: Multi-document workflow tests
- **API Tests**: REST API endpoint tests
- **Frontend Tests**: JavaScript UI component tests

### Test Framework

Tests are built using:
- **Backend**: Frappe's test framework (based on Python's unittest)
- **Frontend**: Jest (JavaScript testing framework)

## Test Structure

```
hearingclinic/
├── hearingclinic/
│   ├── doctype/
│   │   ├── value_add_card/
│   │   │   └── test_value_add_card.py          # VAC unit tests
│   │   ├── card_transaction/
│   │   │   └── test_card_transaction.py        # Transaction unit tests
│   │   └── ...
│   ├── doc_events/
│   │   ├── test_customer_id.py                 # Customer ID generation tests
│   │   └── test_customer_duplicate_check.py    # Duplicate checking tests
│   ├── api/
│   │   └── test_api.py                         # API endpoint tests
│   └── tests/
│       ├── test_integration.py                 # Integration/workflow tests
│       ├── test_fixtures.py                    # Test utilities and fixtures
│       └── frontend/
│           └── test_customer_ui.js             # Frontend UI tests
└── TESTING.md                                  # This file
```

## Running Tests

### Prerequisites

1. Ensure you have a working Frappe bench installation
2. The HearingClinic app should be installed and configured
3. You should have a test site set up

### Running All Backend Tests

From the bench directory:

```bash
# Run all tests for the hearingclinic app
bench --site [your-site] run-tests --app hearingclinic

# Run with verbose output
bench --site [your-site] run-tests --app hearingclinic --verbose
```

### Running Specific Test Files

```bash
# Run Value Add Card tests
bench --site [your-site] run-tests --module hearingclinic.hearingclinic.doctype.value_add_card.test_value_add_card

# Run Customer ID tests
bench --site [your-site] run-tests --module hearingclinic.hearingclinic.doc_events.test_customer_id

# Run API tests
bench --site [your-site] run-tests --module hearingclinic.hearingclinic.api.test_api

# Run integration tests
bench --site [your-site] run-tests --module hearingclinic.hearingclinic.tests.test_integration
```

### Running Specific Test Classes

```bash
# Run only Value Add Card test class
bench --site [your-site] run-tests --module hearingclinic.hearingclinic.doctype.value_add_card.test_value_add_card --test TestValueAddCard

# Run only a specific test method
bench --site [your-site] run-tests --module hearingclinic.hearingclinic.doctype.value_add_card.test_value_add_card --test TestValueAddCard.test_card_value_calculation
```

### Running Tests in Parallel

For faster execution on multi-core systems:

```bash
# Run tests in parallel (use number of CPU cores)
bench --site [your-site] run-tests --app hearingclinic --parallel 4
```

### Running Tests with Coverage

To generate a coverage report:

```bash
# Install coverage if not already installed
pip install coverage

# Run tests with coverage
bench --site [your-site] run-tests --app hearingclinic --coverage

# Generate HTML coverage report
coverage html

# View report (opens in browser)
open htmlcov/index.html
```

## Test Coverage

### Current Test Coverage

| Component | Test File | Test Count | Status |
|-----------|-----------|------------|--------|
| Value Add Card | test_value_add_card.py | 19 tests | ✅ Complete |
| Card Transaction | test_card_transaction.py | 13 tests | ✅ Complete |
| Customer ID Generation | test_customer_id.py | 15 tests | ✅ Complete |
| Customer Duplicate Check | test_customer_duplicate_check.py | 12 tests | ✅ Complete |
| API Endpoints | test_api.py | 12+ tests | ✅ Complete |
| Integration Workflows | test_integration.py | 15+ tests | ✅ Complete |
| Frontend UI | test_customer_ui.js | 15+ tests | ✅ Complete |

### What's Tested

#### Value Add Card (test_value_add_card.py)
- ✅ Card value calculation (1.6x multiplier)
- ✅ Initial balance setup
- ✅ Transaction addition (Purchase/Refund)
- ✅ Balance updates and validation
- ✅ Status transitions (Active → Partially Used → Fully Used)
- ✅ Transaction removal and reversal
- ✅ Balance cannot go negative
- ✅ API methods (check_balance, get_balance)
- ✅ Multiple sequential transactions
- ✅ Edge cases and error handling

#### Card Transaction (test_card_transaction.py)
- ✅ Transaction date auto-generation
- ✅ Balance before/after tracking
- ✅ Purchase and refund transaction types
- ✅ Sales Invoice reference linking
- ✅ Custom remarks
- ✅ Transaction persistence
- ✅ Balance validation
- ✅ Multiple transaction sequences

#### Customer ID Generation (test_customer_id.py)
- ✅ Gender-based prefix (M-/F-)
- ✅ Sequential numbering
- ✅ Format validation (X-0000)
- ✅ Separate sequences for male/female
- ✅ Auto-generation on customer creation
- ✅ Validation of ID/gender mismatch
- ✅ Edge cases (no gender, invalid gender)

#### Customer Duplicate Check (test_customer_duplicate_check.py)
- ✅ NRIC duplicate detection (hard stop)
- ✅ Name similarity detection (soft warning)
- ✅ Case-insensitive matching
- ✅ Partial name matching
- ✅ Integration with customer insert
- ✅ Empty/null NRIC handling

#### API Endpoints (test_api.py)
- ✅ check_card_balance API
- ✅ get_active_cards API
- ✅ get_customer_badge_info API
- ✅ Whitelisted function verification
- ✅ Response format validation
- ✅ Parameter validation
- ✅ Permission checks

#### Integration Workflows (test_integration.py)
- ✅ Complete customer creation workflow
- ✅ VAC lifecycle (creation → usage → depletion)
- ✅ Transaction reversal workflow
- ✅ Multi-document workflows
- ✅ Data consistency checks
- ✅ Concurrent operations
- ✅ Error handling and edge cases

#### Frontend UI (test_customer_ui.js)
- ✅ Customer ID badge formatting
- ✅ Customer since badge display
- ✅ VAC card selection and filtering
- ✅ Balance validation
- ✅ Partial payment calculations
- ✅ Delivery note item extraction
- ✅ Warranty extension UI logic
- ✅ Helper functions and utilities

### Test Coverage Metrics

To view detailed coverage metrics:

```bash
# Generate coverage report
bench --site [your-site] run-tests --app hearingclinic --coverage

# View coverage summary
coverage report

# Generate HTML report for detailed view
coverage html
```

## Writing New Tests

### Backend Test Template

Create a new test file following this template:

```python
# Copyright (c) 2025, Thomas Roch and Contributors
# Test cases for [Component Name]

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import nowdate


class Test[ComponentName](FrappeTestCase):
    """Test cases for [Component Name]"""

    def setUp(self):
        """Set up test data before each test"""
        # Create test data
        pass

    def tearDown(self):
        """Clean up after each test"""
        # Delete test data
        frappe.db.delete("DocType", {
            "field": ["like", "_Test%"]
        })
        frappe.db.commit()

    def test_feature_name(self):
        """Test that [feature] works correctly"""
        # Arrange
        # ... setup test data

        # Act
        # ... perform action

        # Assert
        self.assertEqual(expected, actual)
```

### Using Test Fixtures

The `test_fixtures.py` module provides utilities for creating test data:

```python
from hearingclinic.hearingclinic.tests.test_fixtures import TestDataFactory

class TestMyFeature(FrappeTestCase):
    def test_something(self):
        # Use factory to create test customer
        customer = TestDataFactory.create_test_customer(
            gender="Male",
            custom_nricpassport="S1234567A"
        )

        # Use factory to create test VAC
        card = TestDataFactory.create_test_value_add_card(
            customer=customer,
            amount_paid=1000
        )

        # Perform tests...
```

### Best Practices

1. **Isolation**: Each test should be independent
2. **Clean Up**: Always clean up test data in tearDown()
3. **Descriptive Names**: Use clear test method names (test_feature_does_what)
4. **One Assertion**: Focus each test on one thing
5. **Use Fixtures**: Reuse test data creation utilities
6. **Document**: Add docstrings explaining what's being tested

### Test Naming Conventions

- Test files: `test_[module_name].py`
- Test classes: `Test[ClassName]`
- Test methods: `test_[what_it_tests]`

Example:
```python
class TestValueAddCard(FrappeTestCase):
    def test_card_value_calculation(self):
        """Test that card value is auto-calculated as amount_paid * 1.6"""
        pass
```

## Frontend Testing

### Setup Frontend Tests

Frontend tests use Jest. To set up:

```bash
# From the hearingclinic app directory
cd apps/hearingclinic

# Install Jest and dependencies
npm install --save-dev jest @testing-library/jest-dom

# Create package.json if it doesn't exist
npm init -y

# Add test script to package.json
```

Add to `package.json`:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "testEnvironment": "jsdom",
    "testMatch": ["**/tests/frontend/**/*.js"]
  }
}
```

### Running Frontend Tests

```bash
# Run all frontend tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Frontend Test Example

```javascript
describe('Customer ID Formatting', () => {
    test('should format male customer ID with blue badge', () => {
        const customerId = 'M-0001';
        expect(customerId.startsWith('M-')).toBe(true);
    });
});
```

## Testomat.io Integration

### What is Testomat.io?

Testomat.io is a test management platform that centralizes your test suite, tracks results, and provides analytics.

**Benefits:**
- 📊 Centralized test management dashboard
- 📈 Historical test run tracking and analytics
- 🔗 CI/CD integration for automated reporting
- 🏷️ Test organization with tags and suites
- 👥 Team collaboration and reporting

### Quick Setup

1. **Get API Key**
   - Sign up at https://app.testomat.io
   - Create project "HearingClinic"
   - Copy API key from Settings → API Keys

2. **Run Setup Script**
   ```bash
   cd apps/hearingclinic
   ./setup_testomat.sh YOUR_API_KEY
   ```

3. **Run Tests with Testomat**
   ```bash
   ./run_tests_testomat.sh [site-name]
   ```

4. **View Results**
   - Go to https://app.testomat.io
   - See real-time test results and analytics

### Full Documentation

For complete Testomat.io integration guide, see:
- **[TESTOMAT_INTEGRATION.md](TESTOMAT_INTEGRATION.md)** - Detailed setup and usage guide

### Manual Integration

#### Backend Tests
```bash
export TESTOMATIO=your-api-key
pytest apps/hearingclinic/hearingclinic \
    --testomatio=$TESTOMATIO \
    --testomatio-title="HearingClinic Tests" \
    -v
```

#### Frontend Tests
```bash
export TESTOMATIO=your-api-key
npm run test:testomat:report
```

## Continuous Integration

### GitHub Actions Example

Create `.github/workflows/test.yml`:

```yaml
name: Run Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2

    - name: Setup Python
      uses: actions/setup-python@v2
      with:
        python-version: '3.10'

    - name: Install Frappe Bench
      run: |
        pip install frappe-bench

    - name: Initialize Bench
      run: |
        bench init frappe-bench --frappe-branch version-15

    - name: Create Test Site
      run: |
        cd frappe-bench
        bench new-site test_site --admin-password admin

    - name: Install App
      run: |
        cd frappe-bench
        bench get-app hearingclinic
        bench --site test_site install-app hearingclinic

    - name: Run Tests
      run: |
        cd frappe-bench
        bench --site test_site run-tests --app hearingclinic --coverage

    - name: Upload Coverage
      uses: codecov/codecov-action@v2
```

## Troubleshooting

### Common Issues

#### 1. Test Database Connection Errors

**Problem**: `Could not connect to database`

**Solution**:
```bash
# Ensure MariaDB is running
sudo systemctl start mariadb

# Check site config
cat sites/[your-site]/site_config.json
```

#### 2. Import Errors

**Problem**: `ModuleNotFoundError: No module named 'hearingclinic'`

**Solution**:
```bash
# Reinstall app in develop mode
bench get-app hearingclinic
bench --site [your-site] install-app hearingclinic
```

#### 3. Permission Errors

**Problem**: Tests fail with permission errors

**Solution**:
```python
# Use ignore_permissions=True in tests
doc.insert(ignore_permissions=True)
```

#### 4. Test Data Not Cleaning Up

**Problem**: Test data persists across test runs

**Solution**:
```python
def tearDown(self):
    """Always include comprehensive cleanup"""
    frappe.db.delete("Value Add Card", {"customer": ["like", "_Test%"]})
    frappe.db.delete("Customer", {"customer_name": ["like", "_Test%"]})
    frappe.db.commit()
```

#### 5. Tests Timing Out

**Problem**: Tests run very slowly or timeout

**Solution**:
```bash
# Run tests in parallel
bench --site [your-site] run-tests --app hearingclinic --parallel 4

# Or increase timeout
bench --site [your-site] run-tests --app hearingclinic --timeout 600
```

### Debug Mode

Run tests with debug output:

```bash
# Verbose output
bench --site [your-site] run-tests --app hearingclinic --verbose

# With debug logging
bench --site [your-site] run-tests --app hearingclinic --loglevel DEBUG
```

### Test Data Inspection

To inspect test data during development:

```python
def test_something(self):
    customer = TestDataFactory.create_test_customer()

    # Add breakpoint for inspection
    import pdb; pdb.set_trace()

    # Continue with test...
```

## Additional Resources

- [Frappe Testing Documentation](https://frappeframework.com/docs/user/en/testing)
- [ERPNext Testing Guide](https://docs.erpnext.com/docs/user/manual/en/setting-up/articles/running-tests)
- [Python unittest Documentation](https://docs.python.org/3/library/unittest.html)
- [Jest Documentation](https://jestjs.io/docs/getting-started)

## Contributing

When contributing new features:

1. **Write tests first** (TDD approach recommended)
2. **Ensure all tests pass** before submitting PR
3. **Maintain coverage** - aim for >80% coverage on new code
4. **Update this document** if adding new test types or procedures

## Test Checklist

Before committing code, ensure:

- [ ] All existing tests pass
- [ ] New tests written for new features
- [ ] Test coverage remains above 80%
- [ ] Tests are documented with docstrings
- [ ] Test data is properly cleaned up
- [ ] Edge cases are covered
- [ ] Integration tests added for workflows
- [ ] Frontend tests added for UI changes

---

**Last Updated**: 2025-12-07
**Maintained By**: Thomas Roch (thomas@dierochs.de)
