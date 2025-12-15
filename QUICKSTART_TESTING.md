# Quick Start - Testing Guide

Get up and running with the HearingClinic test suite in 5 minutes.

## Prerequisites

- Working Frappe bench installation
- HearingClinic app installed
- A test site configured

## Quick Commands

### Run All Backend Tests

```bash
# From your bench directory
cd frappe-bench

# Run all tests
bench --site [your-site-name] run-tests --app hearingclinic

# Run with verbose output
bench --site [your-site-name] run-tests --app hearingclinic --verbose
```

### Run Specific Test Files

```bash
# Value Add Card tests
bench --site [your-site-name] run-tests --module hearingclinic.hearingclinic.doctype.value_add_card.test_value_add_card

# Customer ID tests
bench --site [your-site-name] run-tests --module hearingclinic.hearingclinic.doc_events.test_customer_id

# API tests
bench --site [your-site-name] run-tests --module hearingclinic.hearingclinic.api.test_api

# Integration tests
bench --site [your-site-name] run-tests --module hearingclinic.hearingclinic.tests.test_integration
```

### Run Tests with Coverage

```bash
# Install coverage if needed
pip install coverage

# Run with coverage
bench --site [your-site-name] run-tests --app hearingclinic --coverage

# View coverage report
coverage report

# Generate HTML report
coverage html
open htmlcov/index.html
```

## Frontend Tests Setup

```bash
# Navigate to app directory
cd apps/hearingclinic

# Install dependencies (first time only)
npm install

# Run frontend tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode (for development)
npm run test:watch
```

## What Gets Tested

✅ **Value Add Card** (19 tests)
- Card creation, balance calculations, transactions, status changes

✅ **Card Transactions** (13 tests)
- Purchase/refund transactions, balance tracking

✅ **Customer ID Generation** (15 tests)
- Auto-generation, gender prefixes, sequential numbering

✅ **Customer Duplicate Check** (12 tests)
- NRIC validation, name similarity detection

✅ **API Endpoints** (12+ tests)
- REST API functionality, permissions, response formats

✅ **Integration Workflows** (15+ tests)
- Complete customer workflows, VAC lifecycle, data consistency

✅ **Frontend UI** (15+ tests)
- UI components, validation, user interactions

**Total: 100+ automated tests**

## Common Test Scenarios

### Test a Single Function

```bash
bench --site [site] run-tests \
  --module hearingclinic.hearingclinic.doctype.value_add_card.test_value_add_card \
  --test TestValueAddCard.test_card_value_calculation
```

### Run Tests in Parallel (Faster)

```bash
bench --site [site] run-tests --app hearingclinic --parallel 4
```

### Debug a Failing Test

```bash
# Add this to the test you want to debug:
import pdb; pdb.set_trace()

# Run the specific test
bench --site [site] run-tests --module [...] --test [...]
```

## Expected Output

### Successful Run
```
.......................
----------------------------------------------------------------------
Ran 19 tests in 12.345s

OK
```

### With Coverage
```
Name                                    Stmts   Miss  Cover
-----------------------------------------------------------
value_add_card.py                         56      2    96%
card_transaction.py                       28      1    96%
customer_id.py                            34      0   100%
-----------------------------------------------------------
TOTAL                                    612     12    98%
```

## Troubleshooting

### Tests Won't Run?

```bash
# Reinstall app
bench get-app hearingclinic
bench --site [site] install-app hearingclinic

# Clear cache
bench --site [site] clear-cache
```

### Import Errors?

```bash
# Restart bench
bench restart

# Or migrate
bench --site [site] migrate
```

### Tests Failing?

1. Check if test data exists: `bench --site [site] console`
2. Clean test data manually
3. Ensure database is accessible
4. Check for custom modifications

## Next Steps

1. ✅ Run all tests to verify setup
2. ✅ Review [TESTING.md](TESTING.md) for detailed documentation
3. ✅ Check [TEST_SUMMARY.md](TEST_SUMMARY.md) for coverage details
4. ✅ Write tests for your own customizations

## File Structure

```
hearingclinic/
├── doctype/
│   ├── value_add_card/
│   │   └── test_value_add_card.py      # 19 tests
│   └── card_transaction/
│       └── test_card_transaction.py    # 13 tests
├── doc_events/
│   ├── test_customer_id.py             # 15 tests
│   └── test_customer_duplicate_check.py # 12 tests
├── api/
│   └── test_api.py                     # 12+ tests
├── tests/
│   ├── test_integration.py             # 15+ tests
│   ├── test_fixtures.py                # Test utilities
│   └── frontend/
│       ├── test_customer_ui.js         # 15+ tests
│       └── setup.js                    # Jest config
├── TESTING.md                          # Full documentation
├── TEST_SUMMARY.md                     # Coverage summary
├── QUICKSTART_TESTING.md               # This file
└── package.json                        # NPM config
```

## Quick Reference Card

| Task | Command |
|------|---------|
| All tests | `bench --site X run-tests --app hearingclinic` |
| With coverage | `bench --site X run-tests --app hearingclinic --coverage` |
| Verbose | Add `--verbose` flag |
| Parallel | Add `--parallel 4` flag |
| Frontend | `cd apps/hearingclinic && npm test` |
| Single test | Use `--module` and `--test` flags |

## Support

- **Documentation**: See [TESTING.md](TESTING.md)
- **Coverage Details**: See [TEST_SUMMARY.md](TEST_SUMMARY.md)
- **Issues**: Contact thomas@dierochs.de

---

**Last Updated**: 2025-12-07
