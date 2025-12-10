# HearingClinic E2E Tests with Playwright

## Overview

This directory contains end-to-end (E2E) tests for the HearingClinic ERPNext app using Playwright. These tests verify actual user workflows in a real browser environment.

## Test Coverage

**Total: 41 E2E tests across 8 test files**

### Priority 1: Must Have Tests (25 tests)

1. **Customer Management** (`01-customer-management.spec.ts`) - 4 tests
   - ✅ Create male customer with M- prefix ID
   - ✅ Create female customer with F- prefix ID
   - ✅ Prevent duplicate customer with same NRIC
   - ✅ Auto-generate sequential customer IDs

2. **Value Add Card** (`02-value-add-card.spec.ts`) - 4 tests
   - ✅ Create VAC with 60% bonus value
   - ✅ Calculate different bonus tiers correctly
   - ✅ Show card as Partially Used after transaction
   - ✅ Show card as Fully Used when balance is zero

3. **Sales Invoice** (`03-sales-invoice-packages.spec.ts`) - 3 tests
   - ✅ Create sales invoice with customer
   - ✅ Add items to sales invoice
   - ⚠️  Package unfolding (requires Product Bundle setup)

4. **Delivery Note Workflow** (`04-delivery-note-workflow.spec.ts`) - 4 tests
   - ✅ Create delivery note from sales invoice via Actions button
   - ✅ Add serial numbers and ear designations
   - ✅ Transfer warranty items from sales invoice
   - ✅ Populate all required delivery note fields

5. **Maintenance Schedule** (`05-maintenance-schedule.spec.ts`) - 5 tests
   - ✅ Create maintenance schedule after delivery note submission
   - ✅ Verify correct maintenance schedule dates
   - ✅ Track hearing aid items in maintenance schedule
   - ✅ Verify multiple scheduled maintenance visits

6. **Maintenance Extension** (`06-maintenance-extension.spec.ts`) - 6 tests
   - ✅ Create maintenance extension from existing schedule
   - ✅ Extend warranty period for hearing aids
   - ✅ Calculate extension dates correctly
   - ✅ Update maintenance schedule after extension
   - ✅ Add additional maintenance visits
   - ✅ Track extension history

### Priority 2: Should Have Tests (16 tests)

7. **VAC Selection Dialog** (`07-vac-dialog.spec.ts`) - 7 tests
   - ✅ Show Apply Value Add Card button on Sales Invoice
   - ✅ Open VAC selection dialog when button clicked
   - ✅ Show only active VACs with balance
   - ✅ Apply VAC amount to invoice and create payment
   - ✅ Update VAC status after partial use
   - ✅ Prevent applying VAC to different customer's invoice

8. **Customer Info Sections** (`08-customer-info-sections.spec.ts`) - 9 tests
   - ✅ Display Devices section in customer form
   - ✅ List purchased hearing aids with serial numbers
   - ✅ Display warranty information
   - ✅ Show maintenance schedules
   - ✅ Display device details including ear designation
   - ✅ Show purchase history timeline
   - ✅ Display device count summary
   - ✅ Navigate to linked documents
   - ✅ Display VAC information if customer has cards

## Prerequisites

### 1. ERPNext Instance Running

Make sure your ERPNext development instance is running:

```bash
cd /workspace/frappe-bench
bench start
```

The default URL is `http://development.localhost:8000`

### 2. Test Data Setup

Before running E2E tests, ensure:
- Administrator credentials work (default: admin/admin)
- Customer Group "Individual" exists
- Territory "All Territories" exists
- System is in development mode

## Running Tests

### Quick Start

```bash
cd /workspace/frappe-bench/apps/hearingclinic

# Run all E2E tests (headless)
npm run test:e2e

# Run with UI mode (recommended for debugging)
npm run test:e2e:ui

# Run with browser visible
npm run test:e2e:headed

# Run specific test file
npx playwright test 01-customer-management.spec.ts

# Run tests matching a pattern
npx playwright test --grep "customer"
```

### With Testomat.io Reporting

```bash
# Set your Testomat.io API key
export TESTOMATIO=your-api-key-here

# Run tests with reporting
npm run test:e2e

# Results will be uploaded to Testomat.io
```

### Debug Mode

```bash
# Run in debug mode with Playwright Inspector
npm run test:e2e:debug

# Debug specific test
npx playwright test 01-customer-management.spec.ts --debug
```

## Test Structure

Each test file follows this pattern:

```typescript
import { test, expect } from '@playwright/test';
import { FrappeHelper } from './helpers/frappe-helpers';

test.describe('Feature Name', () => {
  let frappe: FrappeHelper;

  test.beforeEach(async ({ page }) => {
    frappe = new FrappeHelper(page);
    await frappe.login();
  });

  test('should do something', async ({ page }) => {
    // Test implementation
  });
});
```

## Helper Functions

The `FrappeHelper` class (`helpers/frappe-helpers.ts`) provides utilities for:

### Navigation & Forms
- `login()` - Login to ERPNext
- `gotoList(doctype)` - Navigate to list view
- `createNewDoc(doctype)` - Create new document
- `openDoc(doctype, name)` - Open existing document

### Form Interactions
- `setFieldValue(field, value)` - Set text field
- `selectLinkValue(field, value)` - Select from Link field
- `selectFieldValue(field, value)` - Select from dropdown
- `checkField(field)` / `uncheckField(field)` - Toggle checkbox

### Form Actions
- `saveForm()` - Save document
- `submitForm()` - Submit document
- `deleteDoc()` - Delete current document

### Child Tables
- `addChildRow(table)` - Add row to child table
- `setChildValue(table, row, field, value)` - Set child table value

### Assertions
- `assertFieldValue(field, value)` - Assert field equals value
- `assertFieldPattern(field, pattern)` - Assert field matches regex
- `waitForIndicator(color)` - Wait for status indicator

## Common Patterns

### Creating a Customer

```typescript
await frappe.createNewDoc('Customer');
await frappe.setFieldValue('customer_name', 'Test Customer');
await frappe.selectFieldValue('customer_type', 'Individual');
await frappe.selectLinkValue('customer_group', 'Individual');
await frappe.selectLinkValue('territory', 'All Territories');
await frappe.selectFieldValue('gender', 'Male');
await frappe.saveForm();

// Verify
const customerId = await frappe.getFieldValue('custom_customer_id');
expect(customerId).toMatch(/^M-\d{4}$/);
```

### Creating a Value Add Card

```typescript
await frappe.createNewDoc('Value Add Card');
await frappe.selectLinkValue('customer', customerName);
await frappe.setFieldValue('amount_paid', '1000');
await page.click('[data-fieldname="issue_date"]');
await page.keyboard.press('Escape'); // Use today
await frappe.saveForm();

// Verify
const cardValue = await frappe.getFieldValue('card_value');
expect(parseFloat(cardValue)).toBe(1600);
```

### Cleanup After Test

```typescript
test.afterEach(async () => {
  // Delete test data
  await frappe.deleteDoc();
});
```

## Viewing Test Results

### HTML Report

After running tests, view the HTML report:

```bash
npm run test:e2e:report
```

This opens the Playwright HTML report with:
- Test results
- Screenshots on failure
- Videos on failure
- Traces for debugging

### Testomat.io Dashboard

If running with `TESTOMATIO` set:
1. Go to https://app.testomat.io
2. Navigate to your project
3. View E2E test results with suite "E2E Tests"

## Test Environment Configuration

### Change Base URL

Edit `playwright.config.ts`:

```typescript
use: {
  baseURL: 'http://your-site.localhost:8000',
}
```

Or set environment variable:

```bash
BASE_URL=http://your-site.localhost:8000 npm run test:e2e
```

### Change Login Credentials

In test files, pass credentials to login:

```typescript
await frappe.login('username@example.com', 'password');
```

## Troubleshooting

### Tests Fail with "Login Failed"

- Ensure ERPNext is running: `bench start`
- Check Administrator password hasn't changed
- Try logging in manually first

### Tests Timeout

- Increase timeout in `playwright.config.ts`
- Check ERPNext server is responsive
- Use headed mode to see what's happening

### Can't Find Elements

- Use Playwright Inspector: `npm run test:e2e:debug`
- Check selector in browser DevTools
- Ensure form has loaded before interacting

### Database Conflicts

- Tests run sequentially (workers: 1)
- Each test should clean up its data
- Use unique test data (timestamps, random IDs)

## Next Steps

### Expand Test Coverage

Add more tests for:
- VAC application to Sales Invoice
- Delivery Note creation
- Custom field displays
- Error handling scenarios

### CI/CD Integration

Add to `.github/workflows/test.yml`:

```yaml
- name: Run E2E Tests
  run: |
    bench start &
    sleep 30
    npm run test:e2e
  env:
    TESTOMATIO: ${{ secrets.TESTOMATIO_API_KEY }}
```

### Cross-Browser Testing

Enable Firefox and Safari in `playwright.config.ts`:

```typescript
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
],
```

## Resources

- **Playwright Docs**: https://playwright.dev
- **Frappe Testing**: https://frappeframework.com/docs/v14/user/en/testing
- **Testomat.io**: https://docs.testomat.io
- **Main Test Strategy**: See `E2E_TEST_STRATEGY.md` in app root

## Support

For issues with:
- **Playwright**: Check Playwright docs or GitHub issues
- **Frappe helpers**: See `helpers/frappe-helpers.ts` comments
- **Test failures**: Enable debug mode and check traces
