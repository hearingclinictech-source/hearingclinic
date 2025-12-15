# E2E Testing Strategy for HearingClinic App

## Overview

This document outlines the recommended E2E (End-to-End) testing strategy for the HearingClinic ERPNext app using Playwright.

## Current vs Recommended Testing Approach

### Current Testing (Jest Unit Tests)
- **Location:** `hearingclinic/tests/frontend/test_*.js`
- **Type:** Unit tests with mocked Frappe framework
- **Coverage:** 89 tests for business logic
- **Execution:** Fast (~2 seconds)
- **Limitations:** No actual browser, no real UI testing

### Recommended Addition (Playwright E2E Tests)
- **Location:** `hearingclinic/tests/e2e/` (new)
- **Type:** Real browser tests with actual Frappe/ERPNext
- **Coverage:** Critical user workflows
- **Execution:** Slower (~30-60 seconds)
- **Benefits:** Tests real user interactions

## Why Add Playwright E2E Tests?

### What Jest Can't Test
1. ❌ Actual DocType form rendering
2. ❌ Frappe UI components (buttons, dialogs, grids)
3. ❌ Server-side validation and workflows
4. ❌ Database operations and data persistence
5. ❌ CSS and layout issues
6. ❌ Browser-specific bugs
7. ❌ Real network requests and responses

### What Playwright Will Test
1. ✅ Complete user workflows (click, type, submit)
2. ✅ Real Frappe UI interactions
3. ✅ DocType form behavior
4. ✅ Custom buttons and scripts
5. ✅ Dialogs and alerts
6. ✅ Data saved to database
7. ✅ Cross-browser compatibility

## Recommended E2E Test Coverage

### Priority 1: Critical Business Flows (Must Have)

#### 1. Customer Management
**Test:** Create Customer with Auto-Generated ID
```
Scenario: Create new male customer
  Given I am logged in as System Manager
  When I navigate to Customer List
  And I click "New Customer"
  And I enter customer name "Test Male Customer"
  And I select gender "Male"
  And I click "Save"
  Then customer ID should start with "M-"
  And customer ID should have 4-digit number
  And customer should appear in Customer List
```

**Test:** Duplicate Customer Prevention
```
Scenario: Prevent duplicate customer creation
  Given a customer exists with NRIC "S1234567A"
  When I try to create another customer with NRIC "S1234567A"
  Then I should see error message "Customer already exists"
  And the form should not be saved
```

#### 2. Value Add Card Workflow
**Test:** Purchase and Use Value Add Card
```
Scenario: Complete VAC lifecycle
  Given I have a customer "Test Customer"
  When I create a Value Add Card for $1000
  Then card value should be $1600 (with 60% bonus)
  And current balance should be $1600
  And status should be "Active"

  When I apply $500 to a Sales Invoice
  Then current balance should be $1100
  And status should be "Partially Used"

  When I apply remaining $1100 to another invoice
  Then current balance should be $0
  And status should be "Fully Used"
```

#### 3. Sales Invoice with Package Unfolding
**Test:** Automatic Package Expansion
```
Scenario: Package items automatically expand in Sales Invoice
  Given a Product Bundle exists "Hearing Aid Package" with:
    - Hearing Aid Device
    - 2-Year Warranty
    - Cleaning Kit
  When I create a Sales Invoice
  And I add "Hearing Aid Package" to items
  Then the package should automatically expand
  And I should see 3 separate line items
  And component prices should be set to zero
  And bundle item rate should remain as package price
```

### Priority 2: UI Components (Should Have)

#### 4. Custom Buttons and Dialogs
**Test:** VAC Selection Dialog
```
Scenario: Apply Value Add Card to Sales Invoice
  Given I have a Sales Invoice for $500
  And customer has an active VAC with $1000 balance
  When I click "Apply Value Add Card" button
  Then I should see VAC selection dialog
  And only active cards with balance > 0 should show
  When I select a card and confirm
  Then the invoice amount should be deducted from card
  And payment entry should be created
```

#### 5. Custom Fields Display
**Test:** Customer Info Sections
```
Scenario: View customer purchase history
  Given a customer has purchased devices
  When I open the customer form
  Then I should see "Devices" section
  And purchased hearing aids should be listed
  And device serial numbers should be visible
  And warranty information should display
```

### Priority 3: Edge Cases (Nice to Have)

#### 6. Error Handling
**Test:** Insufficient VAC Balance
```
Scenario: Attempt to use VAC with insufficient balance
  Given a VAC has $100 balance
  When I try to apply it to $200 invoice
  Then I should see warning message
  And I should be able to apply partial amount
  Or I should be able to choose different payment method
```

## Implementation Plan

### Step 1: Setup Playwright (15 minutes)

```bash
cd /workspace/frappe-bench/apps/hearingclinic

# Install Playwright
npm install --save-dev @playwright/test

# Install browsers
npx playwright install

# Create test directory structure
mkdir -p hearingclinic/tests/e2e
```

### Step 2: Create Playwright Configuration

**File:** `playwright.config.ts`

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './hearingclinic/tests/e2e',
  timeout: 30000,
  fullyParallel: false, // ERPNext tests should run sequentially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid database conflicts

  use: {
    baseURL: 'http://development.localhost:8000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        // ERPNext specific settings
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
});
```

### Step 3: Create Helper Utilities

**File:** `hearingclinic/tests/e2e/helpers/frappe-helpers.ts`

```typescript
import { Page } from '@playwright/test';

export class FrappeHelper {
  constructor(private page: Page) {}

  async login(username = 'Administrator', password = 'admin') {
    await this.page.goto('/login');
    await this.page.fill('#login_email', username);
    await this.page.fill('#login_password', password);
    await this.page.click('button[type="submit"]');
    await this.page.waitForURL('/app');
  }

  async createNewDoc(doctype: string) {
    await this.page.goto(`/app/${doctype.toLowerCase()}`);
    await this.page.click('button:has-text("New")');
    await this.page.waitForSelector('.form-layout');
  }

  async setFieldValue(fieldname: string, value: string) {
    await this.page.fill(`[data-fieldname="${fieldname}"]`, value);
  }

  async selectFieldValue(fieldname: string, value: string) {
    await this.page.click(`[data-fieldname="${fieldname}"]`);
    await this.page.click(`text="${value}"`);
  }

  async saveForm() {
    await this.page.click('button:has-text("Save")');
    await this.page.waitForSelector('.indicator-pill.green');
  }

  async getFieldValue(fieldname: string): Promise<string> {
    return await this.page.inputValue(`[data-fieldname="${fieldname}"]`);
  }
}
```

### Step 4: Write First E2E Test

**File:** `hearingclinic/tests/e2e/customer.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { FrappeHelper } from './helpers/frappe-helpers';

test.describe('Customer Management', () => {
  let frappe: FrappeHelper;

  test.beforeEach(async ({ page }) => {
    frappe = new FrappeHelper(page);
    await frappe.login();
  });

  test('should create customer with auto-generated ID', async ({ page }) => {
    // Navigate to Customer DocType
    await frappe.createNewDoc('Customer');

    // Fill customer details
    await frappe.setFieldValue('customer_name', 'Test Male Customer E2E');
    await frappe.selectFieldValue('customer_type', 'Individual');
    await frappe.selectFieldValue('customer_group', 'Individual');
    await frappe.selectFieldValue('territory', 'All Territories');
    await frappe.selectFieldValue('gender', 'Male');

    // Save customer
    await frappe.saveForm();

    // Verify customer ID was auto-generated
    const customerId = await frappe.getFieldValue('custom_customer_id');
    expect(customerId).toMatch(/^M-\d{4}$/);

    // Verify success message
    await expect(page.locator('.indicator-pill.green')).toBeVisible();
  });

  test('should prevent duplicate customer creation', async ({ page }) => {
    // Create first customer
    await frappe.createNewDoc('Customer');
    await frappe.setFieldValue('customer_name', 'Test Duplicate Customer');
    await frappe.selectFieldValue('gender', 'Female');
    await frappe.setFieldValue('custom_nricpassport', 'S9999999Z');
    await frappe.saveForm();

    // Try to create duplicate
    await frappe.createNewDoc('Customer');
    await frappe.setFieldValue('customer_name', 'Test Duplicate Customer 2');
    await frappe.selectFieldValue('gender', 'Female');
    await frappe.setFieldValue('custom_nricpassport', 'S9999999Z'); // Same NRIC

    // Click save and expect error
    await page.click('button:has-text("Save")');

    // Verify error message appears
    await expect(page.locator('.msgprint')).toContainText('already exists');
  });
});
```

### Step 5: Add to package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:all": "npm test && npm run test:e2e"
  }
}
```

### Step 6: Integrate with Testomat.io

Playwright has native Testomat.io support!

```bash
# Install Playwright reporter for Testomat.io
npm install --save-dev @testomatio/reporter
```

**Update playwright.config.ts:**

```typescript
export default defineConfig({
  // ... other config
  reporter: [
    ['list'],
    ['@testomatio/reporter/lib/adapter/playwright.js', {
      apiKey: process.env.TESTOMATIO
    }]
  ],
});
```

## Test Organization

### Recommended Structure

```
hearingclinic/tests/
├── frontend/              # Jest unit tests (current)
│   ├── test_customer_ui.js
│   ├── test_auto_expand_packages.js
│   └── setup.js
│
├── e2e/                   # Playwright E2E tests (new)
│   ├── helpers/
│   │   └── frappe-helpers.ts
│   ├── customer.spec.ts
│   ├── value-add-card.spec.ts
│   ├── sales-invoice.spec.ts
│   └── package-unfolding.spec.ts
│
└── backend/               # Python tests (current)
    └── test_*.py
```

## Running the Tests

### Local Development

```bash
# Run all unit tests (fast)
npm test

# Run E2E tests (slow, requires running ERPNext instance)
npm run test:e2e

# Run E2E tests with UI mode (debug)
npm run test:e2e:ui

# Run specific E2E test
npx playwright test customer.spec.ts

# Run all tests
npm run test:all
```

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
- name: Run Unit Tests
  run: npm test

- name: Start ERPNext
  run: bench start &

- name: Run E2E Tests
  run: npm run test:e2e
  env:
    TESTOMATIO: ${{ secrets.TESTOMATIO_API_KEY }}
```

## Test Coverage Goals

### Current State
- ✅ 89 Jest unit tests (business logic)
- ✅ 92 Python backend tests
- ❌ 0 E2E browser tests

### Recommended Target
- ✅ 89 Jest unit tests (70% of frontend testing)
- ✅ 92 Python backend tests
- 🎯 **20-30 Playwright E2E tests** (30% of frontend testing)
  - 10 critical workflow tests
  - 10 UI component tests
  - 5-10 edge case tests

## Benefits of This Approach

### Combined Testing Strategy

1. **Jest Unit Tests** (Fast, Cheap)
   - Test calculations and business logic
   - Run on every commit
   - Catch logic errors early
   - No ERPNext instance needed

2. **Playwright E2E Tests** (Slow, Expensive)
   - Test user workflows end-to-end
   - Run before releases
   - Catch integration issues
   - Requires running ERPNext

### Example Workflow

```
Developer makes changes
  ↓
Run Jest tests locally (2 seconds) ✓
  ↓
Commit and push
  ↓
CI runs Jest tests (5 seconds) ✓
  ↓
CI runs Python tests (30 seconds) ✓
  ↓
CI runs Playwright tests (60 seconds) ✓
  ↓
All tests pass → Deploy
```

## Next Steps

1. **Install Playwright** (15 min)
   ```bash
   npm install --save-dev @playwright/test
   npx playwright install
   ```

2. **Create first test** (30 min)
   - Start with customer creation test
   - Verify it works locally

3. **Add Testomat.io integration** (10 min)
   - Install reporter
   - Configure in playwright.config.ts

4. **Gradually add tests** (ongoing)
   - Add 1-2 E2E tests per week
   - Focus on critical workflows first

5. **Update CI/CD** (30 min)
   - Add E2E tests to pipeline
   - Configure to run on staging/production deployments

## Resources

- **Playwright Docs:** https://playwright.dev/
- **Frappe E2E Testing:** https://frappeframework.com/docs/v14/user/en/testing
- **Testomat.io Playwright:** https://docs.testomat.io/test-reporting/frameworks/
- **ERPNext Testing Guide:** https://github.com/frappe/frappe/wiki/Testing

## Conclusion

**Yes, you should add Playwright E2E tests!** They complement your existing Jest unit tests and provide confidence that your app works correctly in real-world scenarios. Start with 5-10 critical workflow tests and expand from there.

Your complete testing strategy will be:
- **181 total tests** → **201+ total tests**
  - 89 Jest unit tests (frontend logic)
  - 92 Python tests (backend)
  - **20+ Playwright E2E tests (user workflows)** ← NEW
