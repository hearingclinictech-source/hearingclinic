# Testomat.io Integration Setup

This document explains how to use Testomat.io integration with the HearingClinic app.

## What Was Fixed

### 1. Frontend Tests Not Appearing
**Problem:** Frontend tests were not being reported to Testomat.io even though the Jest reporter was configured.

**Solution:**
- Updated `run_tests_with_reporting.sh` to pass the `TESTOMATIO` environment variable to `npm test`
- This allows the Jest reporter configured in `package.json` to send results to Testomat.io

### 2. Backend Tests Missing Test Suite Assignments
**Problem:** Backend tests appeared in Testomat.io but many didn't have test suite assignments.

**Solution:**
- Added `@S` annotations to all backend test files to organize them into suites:
  - `@S Customer Management` - Customer ID and duplicate check tests
  - `@S Value Add Card` - Value Add Card and transaction tests
  - `@S API Tests` - API endpoint tests
  - `@S Integration Tests` - Integration and workflow tests
- Added JUnit XML upload functionality to send backend test results to Testomat.io

### 3. Backend Test Results Not Being Uploaded
**Problem:** Backend tests generated JUnit XML files but they were never uploaded to Testomat.io.

**Solution:**
- Added automatic XML upload after backend tests complete
- Uses `npx report-xml` command from `@testomatio/reporter` package to upload XML files

## Setup Instructions

### 1. Get Your Testomat.io API Key

1. Go to [https://app.testomat.io](https://app.testomat.io)
2. Sign in to your account
3. Navigate to your project
4. Copy your API key from the project settings

### 2. Set Environment Variable

```bash
export TESTOMATIO=your-api-key-here
```

To make this permanent, add it to your `~/.bashrc` or `~/.zshrc`:

```bash
echo 'export TESTOMATIO=your-api-key-here' >> ~/.bashrc
source ~/.bashrc
```

### 3. Import Tests (First Time Only)

Run this command to import all your tests into Testomat.io:

```bash
cd /workspace/frappe-bench/apps/hearingclinic
./import_tests_to_testomat.sh
```

This will:
- Scan all frontend test files (Jest)
- Scan all backend test files (Python)
- Create the test structure in Testomat.io with proper suite assignments
- Upload test metadata (names, descriptions, suites)

### 4. Run Tests with Reporting

```bash
cd /workspace/frappe-bench/apps/hearingclinic
./run_tests_with_reporting.sh [site_name]
```

Example:
```bash
./run_tests_with_reporting.sh development.localhost
```

This will:
- Run all backend tests and generate JUnit XML reports
- Upload backend test results to Testomat.io
- Run all frontend tests with Jest
- Report frontend test results to Testomat.io in real-time
- Display a summary of all test results

## Test Suite Organization

### Backend Tests

All backend tests are organized into the following suites:

1. **Customer Management** (`@S Customer Management`)
   - `test_customer_id.py` - Customer ID generation and validation
   - `test_customer_duplicate_check.py` - Duplicate customer detection

2. **Value Add Card** (`@S Value Add Card`)
   - `test_value_add_card.py` - Value Add Card functionality
   - `test_card_transaction.py` - Card transaction operations

3. **API Tests** (`@S API Tests`)
   - `test_api.py` - API endpoint tests

4. **Integration Tests** (`@S Integration Tests`)
   - `test_integration.py` - End-to-end workflow tests
   - `test_package_unfolding.py` - Package unfolding integration

### Frontend Tests

All frontend tests are organized into the following suites:

1. **Customer UI Tests** (`@S Customer UI Tests`)
   - `test_customer_ui.js` - Customer UI components
   - `test_customer_info_devices.js` - Device info display
   - `test_customer_info_maintenance.js` - Maintenance schedule display

2. **Sales Invoice Tests** (`@S Sales Invoice Tests`)
   - `test_auto_expand_packages.js` - Automatic package expansion

## Viewing Results

After running tests, view your results at:
[https://app.testomat.io](https://app.testomat.io)

You should now see:
- ✅ All backend tests organized into proper suites
- ✅ All frontend tests organized into proper suites
- ✅ Test execution results with pass/fail status
- ✅ Test run history and trends

## Troubleshooting

### Frontend tests not appearing?

1. Check that `TESTOMATIO` is set:
   ```bash
   echo $TESTOMATIO
   ```

2. Verify the Jest reporter is configured in `package.json`:
   ```json
   "reporters": [
     "default",
     "@testomatio/reporter/lib/adapter/jest.js"
   ]
   ```

3. Check that `@testomatio/reporter` is installed:
   ```bash
   npm list @testomatio/reporter
   ```

### Backend tests have no suite?

1. Verify all test files have `@S` annotations in their docstrings:
   ```python
   # @S Suite Name
   ```

2. Re-import tests:
   ```bash
   ./import_tests_to_testomat.sh
   ```

3. Run tests again to update the suite assignments

### Upload fails with "npx not found"?

Install Node.js:
```bash
# Ubuntu/Debian
sudo apt-get install nodejs npm

# macOS
brew install node
```

## Architecture

### Backend Test Flow

```
bench run-tests
  ↓
Generates JUnit XML files
  ↓
run_tests_with_reporting.sh
  ↓
Uploads XML to Testomat.io via "npx report-xml" command
```

### Frontend Test Flow

```
npm test (Jest)
  ↓
@testomatio/reporter (Jest adapter)
  ↓
Reports directly to Testomat.io API
```

## Configuration Files

- `.testomatrc` - Testomat.io configuration
- `pytest.ini` - Pytest configuration (test discovery)
- `package.json` - Jest and reporter configuration
- `run_tests_with_reporting.sh` - Main test runner script
- `import_tests_to_testomat.sh` - Test import script

## Support

For issues with:
- **Testomat.io platform**: [https://docs.testomat.io](https://docs.testomat.io)
- **HearingClinic app tests**: Contact the development team
