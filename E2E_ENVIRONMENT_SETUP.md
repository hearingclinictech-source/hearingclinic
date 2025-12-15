# E2E Test Environment Configuration

This guide explains how to configure E2E tests for different environments and users with specific permissions.

## Overview

The E2E test suite supports:
- **Multiple environments** (development, staging, production)
- **Multiple users** with different permissions (admin, system manager, sales user, accountant)
- **Environment-specific credentials** via environment variables

## Quick Start

### 1. Development Environment (Default)

By default, tests run against local development with Administrator credentials:

```bash
# No configuration needed for development
npm run test:e2e
```

**Default credentials:**
- Username: `Administrator`
- Password: `admin`
- URL: `http://development.localhost:8000`

### 2. Staging Environment

To run tests against your staging environment:

```bash
# Set environment
export TEST_ENV=staging

# Set staging credentials (or use .env file)
export STAGING_ADMIN_USER=Administrator
export STAGING_ADMIN_PASSWORD=your_password

# Run tests
npm run test:e2e
```

Your staging URL is automatically configured: `https://hc-staging.emu-mora.ts.net`

### 3. Custom Environment via BASE_URL

Override any environment with a custom URL:

```bash
export BASE_URL=https://your-custom-url.com
npm run test:e2e
```

## Configuration Methods

### Option 1: Environment Variables (Recommended for CI/CD)

```bash
# Linux/Mac
export TEST_ENV=staging
export STAGING_ADMIN_PASSWORD=secret123

# Windows CMD
set TEST_ENV=staging
set STAGING_ADMIN_PASSWORD=secret123

# Windows PowerShell
$env:TEST_ENV="staging"
$env:STAGING_ADMIN_PASSWORD="secret123"
```

### Option 2: .env File (Recommended for Local Development)

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your credentials:
   ```bash
   TEST_ENV=staging
   STAGING_ADMIN_PASSWORD=your_actual_password
   STAGING_MANAGER_PASSWORD=manager_password
   ```

3. Run tests:
   ```bash
   npm run test:e2e
   ```

**Note:** The `.env` file is gitignored for security. Never commit credentials!

## User Types and Permissions

### Admin User (Default)
- **Role:** Administrator
- **Access:** Full system access
- **Use for:** Setup, configuration, critical workflows

```typescript
await frappe.login(); // Uses admin by default
// or explicitly
await frappe.login('admin');
```

### System Manager
- **Role:** System Manager
- **Access:** System configuration, user management
- **Use for:** DocType creation, workflow testing

```typescript
await frappe.login('systemManager');
```

### Sales User
- **Role:** Sales User
- **Access:** Customer, Sales Invoice, Delivery Note
- **Use for:** Sales workflow testing, permission checks

```typescript
await frappe.login('salesUser');
```

### Accountant
- **Role:** Accounts User
- **Access:** Payment Entry, accounting documents
- **Use for:** Financial workflow testing

```typescript
await frappe.login('accountant');
```

### Custom User
```typescript
await frappe.login(undefined, 'custom.user@example.com', 'password123');
```

## Environment Configuration Details

### Development Environment
**File:** `hearingclinic/tests/e2e/config/test-config.ts`

```typescript
development: {
  baseUrl: 'http://development.localhost:8000',
  users: {
    admin: {
      username: 'Administrator',
      password: 'admin'
    },
    systemManager: {
      username: 'test.manager@hearingclinic.local',
      password: 'test123'
    }
  }
}
```

### Staging Environment
**URL:** `https://hc-staging.emu-mora.ts.net`

```typescript
staging: {
  baseUrl: 'https://hc-staging.emu-mora.ts.net',
  users: {
    admin: {
      username: process.env.STAGING_ADMIN_USER || 'Administrator',
      password: process.env.STAGING_ADMIN_PASSWORD || ''
    }
  }
}
```

**Required environment variables:**
- `STAGING_ADMIN_USER`
- `STAGING_ADMIN_PASSWORD`

## Example Test Scenarios

### Test with Different Users

```typescript
import { test, expect } from '@playwright/test';
import { FrappeHelper } from './helpers/frappe-helpers';

test.describe('Sales Invoice Permissions', () => {
  test('admin can create and submit invoice', async ({ page }) => {
    const frappe = new FrappeHelper(page);
    await frappe.login('admin'); // Full access

    await frappe.createNewDoc('Sales Invoice');
    // ... create invoice
    await frappe.submitForm(); // Should succeed
  });

  test('sales user can create but may need approval', async ({ page }) => {
    const frappe = new FrappeHelper(page);
    await frappe.login('salesUser'); // Limited access

    await frappe.createNewDoc('Sales Invoice');
    // ... create invoice
    // May not have submit permission depending on your setup
  });

  test('accountant cannot create sales invoice', async ({ page }) => {
    const frappe = new FrappeHelper(page);
    await frappe.login('accountant');

    // Should not see "New" button or get permission error
    await frappe.gotoList('Sales Invoice');
    const newButton = page.locator('button:has-text("New")');
    expect(await newButton.isVisible()).toBe(false);
  });
});
```

### Test Against Staging

```typescript
test('create customer on staging', async ({ page }) => {
  // Automatically uses staging config if TEST_ENV=staging
  const frappe = new FrappeHelper(page);
  await frappe.login(); // Uses STAGING_ADMIN credentials

  await frappe.createNewDoc('Customer');
  await frappe.setFieldValue('customer_name', 'Staging Test Customer');
  await frappe.saveForm();
});
```

## Running Tests by Environment

### Development (Local)
```bash
npm run test:e2e
```

### Staging
```bash
TEST_ENV=staging npm run test:e2e

# Or with specific user
TEST_ENV=staging npm run test:e2e -- --grep "Sales Invoice"
```

### Production (Use with Caution!)
```bash
# Only run read-only tests on production!
TEST_ENV=production npm run test:e2e -- --grep "@readonly"
```

## Best Practices

### 1. Never Hardcode Credentials
❌ **Bad:**
```typescript
await frappe.login(undefined, 'admin@example.com', 'hardcoded123');
```

✅ **Good:**
```typescript
await frappe.login('admin'); // Uses config
```

### 2. Use Appropriate Users for Tests
```typescript
// Customer creation - use admin or system manager
await frappe.login('admin');
await frappe.createNewDoc('Customer');

// Sales workflow - use sales user to test real permissions
await frappe.login('salesUser');
await frappe.createNewDoc('Sales Invoice');
```

### 3. Clean Up Test Data
```typescript
test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  const frappe = new FrappeHelper(page);

  // Login with sufficient permissions to delete
  await frappe.login('admin');
  await frappe.openDoc('Customer', testCustomer);
  await frappe.deleteDoc();

  await page.close();
});
```

### 4. Tag Tests for Different Environments
```typescript
// Development only - creates lots of test data
test('bulk customer import @dev-only', async ({ page }) => {
  // ...
});

// Safe for staging
test('view customer list @staging-safe', async ({ page }) => {
  // Read-only operation
});

// Production read-only
test('verify production data @readonly @prod-safe', async ({ page }) => {
  // No modifications
});
```

Run specific tags:
```bash
# Only dev tests
npm run test:e2e -- --grep "@dev-only"

# Safe for staging
TEST_ENV=staging npm run test:e2e -- --grep "@staging-safe"
```

## Security Considerations

### 1. Protect Credentials
- ✅ Use environment variables or .env file
- ✅ Add `.env` to `.gitignore`
- ✅ Use CI/CD secrets for automated tests
- ❌ Never commit passwords to git
- ❌ Never hardcode credentials in test files

### 2. Separate Test Accounts
Create dedicated test users in staging/production:
- `test.e2e.admin@hearingclinic.com`
- `test.e2e.sales@hearingclinic.com`

### 3. Limit Production Testing
- Only run read-only tests on production
- Never create/modify data on production
- Use separate test instances when possible

### 4. Use Strong Passwords
For staging/production test accounts:
- Minimum 16 characters
- Use password manager
- Rotate regularly

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on:
  push:
    branches: [main, staging]

jobs:
  e2e-staging:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install
        working-directory: apps/hearingclinic

      - name: Install Playwright
        run: npx playwright install --with-deps
        working-directory: apps/hearingclinic

      - name: Run E2E tests on staging
        run: npm run test:e2e
        working-directory: apps/hearingclinic
        env:
          TEST_ENV: staging
          STAGING_ADMIN_USER: ${{ secrets.STAGING_ADMIN_USER }}
          STAGING_ADMIN_PASSWORD: ${{ secrets.STAGING_ADMIN_PASSWORD }}
          TESTOMATIO: ${{ secrets.TESTOMATIO_API_KEY }}
```

### GitLab CI Example

```yaml
e2e-staging:
  stage: test
  script:
    - cd apps/hearingclinic
    - npm install
    - npx playwright install --with-deps
    - npm run test:e2e
  variables:
    TEST_ENV: "staging"
    STAGING_ADMIN_USER: $STAGING_ADMIN_USER
    STAGING_ADMIN_PASSWORD: $STAGING_ADMIN_PASSWORD
  only:
    - staging
```

## Troubleshooting

### Issue: "Missing admin password for staging environment"

**Solution:** Set the required environment variable:
```bash
export STAGING_ADMIN_PASSWORD=your_password
```

### Issue: Tests fail with login errors

**Check:**
1. Credentials are correct
2. User exists in target environment
3. User has required permissions
4. Base URL is accessible

```bash
# Test connection
curl https://hc-staging.emu-mora.ts.net/api/method/frappe.auth.get_logged_user
```

### Issue: "Unknown test environment"

**Solution:** Use valid environment name:
```bash
export TEST_ENV=development  # or staging, or production
```

### Issue: Can't access staging URL

**Check:**
1. VPN/network access to `hc-staging.emu-mora.ts.net`
2. SSL certificates are valid
3. Firewall allows connections

## Summary

### Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `TEST_ENV` | Environment to test against | `development`, `staging`, `production` |
| `BASE_URL` | Override base URL | `https://custom.example.com` |
| `STAGING_ADMIN_USER` | Staging admin username | `Administrator` |
| `STAGING_ADMIN_PASSWORD` | Staging admin password | `SecurePassword123!` |
| `STAGING_MANAGER_USER` | Staging manager username | `test.manager@example.com` |
| `STAGING_MANAGER_PASSWORD` | Staging manager password | `ManagerPass123!` |
| `TESTOMATIO` | Testomat.io API key | `tk_abc123...` |

### Quick Commands

```bash
# Development (default)
npm run test:e2e

# Staging
TEST_ENV=staging npm run test:e2e

# Staging with specific user type
TEST_ENV=staging npm run test:e2e

# Custom URL
BASE_URL=https://custom.com npm run test:e2e

# Staging with Testomat.io reporting
TEST_ENV=staging TESTOMATIO=tk_abc123 npm run test:e2e
```

---

For more information, see:
- [E2E_TESTS_COMPLETE_SUMMARY.md](E2E_TESTS_COMPLETE_SUMMARY.md) - All test documentation
- [E2E_QUICK_START.md](E2E_QUICK_START.md) - Quick start guide
- [playwright.config.ts](playwright.config.ts) - Playwright configuration
