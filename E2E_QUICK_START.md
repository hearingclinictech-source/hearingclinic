# E2E Testing Quick Start Guide

## What You Now Have

✅ **Playwright installed** and configured
✅ **10 "Must Have" E2E tests** ready to run
✅ **Frappe helper utilities** for easy test writing
✅ **Testomat.io integration** for test reporting

## File Structure

```
hearingclinic/
├── playwright.config.ts           # Playwright configuration
├── package.json                    # Updated with E2E scripts
└── hearingclinic/tests/e2e/
    ├── README.md                   # Detailed documentation
    ├── helpers/
    │   └── frappe-helpers.ts       # Utility functions
    ├── 01-customer-management.spec.ts   # 4 customer tests
    ├── 02-value-add-card.spec.ts        # 4 VAC tests
    └── 03-sales-invoice-packages.spec.ts # 2 invoice tests
```

## Running Your First E2E Test

### Step 1: Start ERPNext

```bash
cd /workspace/frappe-bench
bench start
```

Keep this running in one terminal.

### Step 2: Run E2E Tests (New Terminal)

```bash
cd /workspace/frappe-bench/apps/hearingclinic

# Run all E2E tests
npm run test:e2e

# Or run with UI mode (recommended first time)
npm run test:e2e:ui
```

### Step 3: View Results

Results appear in terminal and HTML report opens automatically.

## Available Test Commands

```bash
# Run all E2E tests (headless, fast)
npm run test:e2e

# Run with visual UI (best for development)
npm run test:e2e:ui

# Run with browser visible (see what happens)
npm run test:e2e:headed

# Run in debug mode (step through tests)
npm run test:e2e:debug

# View HTML report after run
npm run test:e2e:report

# Run specific test file
npx playwright test 01-customer-management

# Run all unit tests + E2E tests
npm run test:all
```

## Test Coverage Summary

### Customer Management (4 tests)
1. ✅ Create male customer with M- prefix
2. ✅ Create female customer with F- prefix
3. ✅ Prevent duplicate customer (same NRIC)
4. ✅ Sequential ID generation

### Value Add Card (4 tests)
1. ✅ Create VAC with 60% bonus (1000 → 1600)
2. ✅ Calculate different bonus tiers
3. ✅ Status: Active → Partially Used
4. ✅ Status: Partially Used → Fully Used

### Sales Invoice (2 tests)
1. ✅ Create invoice with customer
2. ✅ Add items to invoice
3. ⚠️  Package unfolding (requires setup)

**Total: 10 E2E tests implemented**

## Integrate with Testomat.io

### Run Tests with Reporting

```bash
# Set your API key
export TESTOMATIO=your-api-key-here

# Run tests - results upload automatically
npm run test:e2e

# View at https://app.testomat.io
```

### Import E2E Tests to Testomat.io

```bash
# Import test structure
npx check-tests@latest playwright 'hearingclinic/tests/e2e/**/*.spec.ts' --create
```

## Complete Testing Strategy

Your app now has **3 layers of tests**:

```
Layer 1: Unit Tests (Jest)
├── 89 frontend tests
└── Fast, cheap, test logic

Layer 2: Backend Tests (Python)
├── 92 backend tests
└── Test API and data

Layer 3: E2E Tests (Playwright)  ← NEW!
├── 10 E2E tests
└── Test real user workflows
```

**Total: 191 tests** across all layers!

## Run Complete Test Suite

```bash
# Run everything (unit + backend + E2E)
./run_tests_with_reporting.sh && npm run test:e2e

# With Testomat.io reporting
TESTOMATIO=your-key ./run_tests_with_reporting.sh && TESTOMATIO=your-key npm run test:e2e
```

## Next Steps

### 1. Try the Tests (5 minutes)

```bash
# Start ERPNext
bench start

# New terminal - run tests with UI
cd /workspace/frappe-bench/apps/hearingclinic
npm run test:e2e:ui
```

### 2. Add More Tests (ongoing)

See priority list in [E2E_TEST_STRATEGY.md](E2E_TEST_STRATEGY.md):
- VAC application to Sales Invoice
- Custom button interactions
- Delivery Note creation
- Error handling scenarios

### 3. CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup ERPNext
        run: |
          # ... ERPNext setup
          bench start &
      - name: Run E2E Tests
        run: npm run test:e2e
        env:
          TESTOMATIO: ${{ secrets.TESTOMATIO_KEY }}
```

## Troubleshooting

### ❌ Tests timeout

**Solution:** Ensure ERPNext is running and accessible at `http://development.localhost:8000`

### ❌ Login fails

**Solution:** Check Administrator password is `admin` or update in test:
```typescript
await frappe.login('Administrator', 'your-password');
```

### ❌ Can't find test files

**Solution:** Make sure you're in the right directory:
```bash
cd /workspace/frappe-bench/apps/hearingclinic
```

### ❌ Need to see what's happening

**Solution:** Use headed mode:
```bash
npm run test:e2e:headed
```

## Test Development Tips

### 1. Use UI Mode for Development

```bash
npm run test:e2e:ui
```

This gives you:
- Visual test explorer
- Step-by-step execution
- DOM snapshots
- Easy debugging

### 2. Debug Failing Tests

```bash
npm run test:e2e:debug
```

Opens Playwright Inspector to step through tests.

### 3. Write Tests Incrementally

```typescript
test.only('should test this feature', async ({ page }) => {
  // Focus on one test at a time
});
```

### 4. Clean Up Test Data

```typescript
test.afterEach(async () => {
  // Always delete test data
  await frappe.deleteDoc();
});
```

## Documentation

- **Quick Start**: This file
- **Complete Strategy**: [E2E_TEST_STRATEGY.md](E2E_TEST_STRATEGY.md)
- **Test Details**: [hearingclinic/tests/e2e/README.md](hearingclinic/tests/e2e/README.md)
- **Helper Functions**: [hearingclinic/tests/e2e/helpers/frappe-helpers.ts](hearingclinic/tests/e2e/helpers/frappe-helpers.ts)

## Summary

You now have a complete E2E testing setup with:

✅ 10 critical workflow tests
✅ Reusable Frappe helpers
✅ Testomat.io integration
✅ Easy-to-run commands
✅ Comprehensive documentation

**Start testing now:**
```bash
npm run test:e2e:ui
```

Happy testing! 🎉
