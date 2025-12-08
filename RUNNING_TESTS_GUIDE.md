# Running Tests - Quick Guide

## Two Test Runner Scripts

You have **two test runner scripts**, each serving a different purpose:

### 1. `run_backend_tests.sh` - Backend Tests Only (Recommended for Development)

**Purpose**: Runs Python backend tests module-by-module

**Advantages**:
- ✅ Reliable - avoids ERPNext fixture dependencies
- ✅ Fast - runs only what's needed
- ✅ Clear output - shows which module passed/failed
- ✅ Works every time

**Usage**:
```bash
cd /workspace/frappe-bench
./run_backend_tests.sh development.localhost
```

**What it runs**:
- Customer ID tests (17 tests)
- Customer Duplicate Check tests (12 tests)
- Value Add Card tests (16 tests)
- Card Transaction tests (13 tests)
- API tests (10 tests)
- Integration tests (11 tests)

**Total**: 79 backend tests

---

### 2. `run_tests_with_reporting.sh` - Full Test Suite + Testomat.io

**Purpose**: Runs ALL tests (backend + frontend) with optional Testomat.io reporting

**Advantages**:
- ✅ Complete coverage - runs everything
- ✅ Testomat.io integration - sends results to test management platform
- ✅ Frontend tests included - runs Jest tests
- ✅ CI/CD ready - suitable for automated pipelines

**Usage**:
```bash
cd /workspace/frappe-bench

# Without Testomat.io
./run_tests_with_reporting.sh development.localhost

# With Testomat.io reporting
export TESTOMATIO=your-api-key-here
./run_tests_with_reporting.sh development.localhost
```

**What it runs**:
1. ALL backend tests via `bench run-tests --app hearingclinic`
2. Frontend Jest tests via `npm test`
3. Sends results to Testomat.io (if API key is set)

**Note**: May encounter ERPNext fixture errors when run, which is why `run_backend_tests.sh` is recommended for local development.

---

## Running From Anywhere

Both scripts have symlinks in the bench directory, so you can run them from:

**Option 1: From bench directory** (recommended):
```bash
cd /workspace/frappe-bench
./run_backend_tests.sh development.localhost
./run_tests_with_reporting.sh development.localhost
```

**Option 2: From app directory**:
```bash
cd /workspace/frappe-bench/apps/hearingclinic
./run_backend_tests.sh development.localhost
./run_tests_with_reporting.sh development.localhost
```

The scripts automatically detect their location and navigate to the correct bench directory.

---

## Running Individual Test Modules

If you want to run specific test modules manually:

```bash
cd /workspace/frappe-bench

# Customer ID tests
bench --site development.localhost run-tests --module "hearingclinic.hearingclinic.doc_events.test_customer_id"

# Value Add Card tests
bench --site development.localhost run-tests --module "hearingclinic.hearingclinic.doctype.value_add_card.test_value_add_card"

# Card Transaction tests
bench --site development.localhost run-tests --module "hearingclinic.hearingclinic.doctype.card_transaction.test_card_transaction"

# Customer Duplicate Check tests
bench --site development.localhost run-tests --module "hearingclinic.hearingclinic.doc_events.test_customer_duplicate_check"

# API tests
bench --site development.localhost run-tests --module "hearingclinic.hearingclinic.api.test_api"

# Integration tests
bench --site development.localhost run-tests --module "hearingclinic.tests.test_integration"
```

---

## Frontend Tests Only

```bash
cd /workspace/frappe-bench/apps/hearingclinic
npm test
```

**Note**: Requires Node.js and npm dependencies installed.

---

## Testomat.io Integration

### Setup

1. **Get your API key** from https://app.testomat.io

2. **Set environment variable**:
   ```bash
   export TESTOMATIO=your-api-key-here
   ```

3. **Run tests with reporting**:
   ```bash
   ./run_tests_with_reporting.sh development.localhost
   ```

### One-Time Setup

To import tests into Testomat.io for the first time:

```bash
cd /workspace/frappe-bench/apps/hearingclinic
./setup_testomat.sh
```

---

## Which Script Should I Use?

| Scenario | Recommended Script |
|----------|-------------------|
| Local development & debugging | `run_backend_tests.sh` |
| Quick test run | `run_backend_tests.sh` |
| Before committing code | `run_backend_tests.sh` |
| CI/CD pipeline | `run_tests_with_reporting.sh` |
| Need Testomat.io reporting | `run_tests_with_reporting.sh` |
| Want to test frontend too | `run_tests_with_reporting.sh` |

---

## Troubleshooting

### "Command not being executed in bench directory"

The scripts automatically handle this. If you still see this error, make sure you're running the script from `/workspace/frappe-bench` or `/workspace/frappe-bench/apps/hearingclinic`.

### "ModuleNotFoundError: No module named 'frappe'"

Don't use `pytest` directly. Always use:
- `bench --site SITE run-tests` for manual runs
- `./run_backend_tests.sh` or `./run_tests_with_reporting.sh` scripts

### "Testing is disabled for the site"

Enable testing:
```bash
bench --site development.localhost set-config allow_tests true
```

### Tests failing due to existing data

Some tests may fail if run multiple times. The `setUp` methods should handle cleanup, but you can manually clean test data:

```bash
bench --site development.localhost console
```

Then in the console:
```python
frappe.db.delete("Customer", {"customer_name": ["like", "_Test%"]})
frappe.db.commit()
```

---

## Summary

- **For day-to-day development**: Use `run_backend_tests.sh`
- **For comprehensive testing with reporting**: Use `run_tests_with_reporting.sh`
- **Both scripts work from anywhere** - they auto-detect their location
- **79 backend tests covering all major functionality**
- **Testomat.io integration ready** - just set the API key

Happy testing! 🧪
