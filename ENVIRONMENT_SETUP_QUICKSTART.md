# E2E Test Environment Setup - Quick Start

## For Your Specific Setup

### Your Environments
1. **Development:** `http://development.localhost:8000` (local)
2. **Staging:** `https://hc-staging.emu-mora.ts.net` (your Tailscale network)

---

## Setup for Development (5 minutes)

### Step 1: Create Test Users (One-time)

```bash
cd /workspace/frappe-bench

# Create test users with different permissions
bench execute hearingclinic.scripts.setup_test_users.setup_all_test_users
```

This creates:
- `test.manager@hearingclinic.local` - System Manager (password: test123)
- `test.sales@hearingclinic.local` - Sales User (password: test123)
- `test.accountant@hearingclinic.local` - Accounts User (password: test123)

### Step 2: Run Tests

```bash
cd /workspace/frappe-bench/apps/hearingclinic

# Run with default admin user
npm run test:e2e

# Or test with specific user
# (modify test file to use different user type)
```

**That's it for development!** No .env file needed, everything works out of the box.

---

## Setup for Staging (10 minutes)

### Step 1: Create .env File

```bash
cd /workspace/frappe-bench/apps/hearingclinic

# Copy example
cp .env.example .env

# Edit .env
nano .env  # or vim, code, etc.
```

### Step 2: Configure Staging Credentials

Add to `.env`:

```bash
TEST_ENV=staging

# Your staging credentials
STAGING_ADMIN_USER=Administrator
STAGING_ADMIN_PASSWORD=your_actual_staging_password

# Optional: other users if you've created them on staging
STAGING_MANAGER_USER=test.manager@hearingclinic.com
STAGING_MANAGER_PASSWORD=their_password
```

**Important:** The staging URL `https://hc-staging.emu-mora.ts.net` is already configured in the code, so you don't need to set it!

### Step 3: Test Connection

```bash
# Make sure you can access staging
curl https://hc-staging.emu-mora.ts.net

# Should return HTML or redirect to login
```

### Step 4: Run Tests on Staging

```bash
cd /workspace/frappe-bench/apps/hearingclinic

# Tests will automatically use staging config from .env
npm run test:e2e
```

---

## Quick Reference: Running Tests

### Development (Default)
```bash
npm run test:e2e
```

### Staging (Using .env)
```bash
# Make sure .env has TEST_ENV=staging
npm run test:e2e
```

### Staging (One-time, no .env)
```bash
TEST_ENV=staging \
STAGING_ADMIN_USER=Administrator \
STAGING_ADMIN_PASSWORD=your_password \
npm run test:e2e
```

### Specific Test File
```bash
npx playwright test hearingclinic/tests/e2e/01-customer-management.spec.ts
```

### With Different User in Test
Edit your test file:

```typescript
test.beforeEach(async ({ page }) => {
  frappe = new FrappeHelper(page);

  // Choose user type:
  await frappe.login('admin');           // Full access (default)
  // await frappe.login('systemManager'); // System Manager
  // await frappe.login('salesUser');     // Sales User only
  // await frappe.login('accountant');    // Accounts User only

  // Or custom credentials:
  // await frappe.login(undefined, 'custom@example.com', 'password');
});
```

---

## Testing Different Permission Levels

### Example: Test Sales User Permissions

1. Edit a test file (e.g., `01-customer-management.spec.ts`)

2. Change the login:

```typescript
test.beforeEach(async ({ page }) => {
  frappe = new FrappeHelper(page);
  await frappe.login('salesUser'); // Changed from 'admin'
});
```

3. Run the test to see what a Sales User can/cannot do

4. Test should fail or behave differently based on permissions

---

## Common Scenarios

### Scenario 1: Test on Local Development

```bash
# Default - uses Administrator/admin
npm run test:e2e
```

### Scenario 2: Test on Staging Before Deployment

```bash
# Set in .env: TEST_ENV=staging
npm run test:e2e

# Check results before deploying to production
```

### Scenario 3: Test Specific User Permissions

Create a new test file `09-permissions-test.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { FrappeHelper } from './helpers/frappe-helpers';

test.describe('Sales User Permissions', () => {
  let frappe: FrappeHelper;

  test.beforeEach(async ({ page }) => {
    frappe = new FrappeHelper(page);
    await frappe.login('salesUser'); // Test as sales user
  });

  test('sales user can create customer', async ({ page }) => {
    await frappe.createNewDoc('Customer');
    // Should have access
    expect(await page.locator('.form-layout').isVisible()).toBe(true);
  });

  test('sales user cannot access user management', async ({ page }) => {
    await frappe.gotoList('User');
    // Should see permission error or no access
    const error = page.locator('.msg-box:has-text("Not Permitted")');
    expect(await error.isVisible()).toBe(true);
  });
});
```

Run: `npx playwright test 09-permissions-test.spec.ts`

### Scenario 4: Debug Test on Staging

```bash
# Run in headed mode to see browser
TEST_ENV=staging npm run test:e2e:headed

# Or UI mode for interactive debugging
TEST_ENV=staging npm run test:e2e:ui
```

---

## Troubleshooting

### "Missing admin password for staging environment"

**Fix:** Add to `.env`:
```bash
STAGING_ADMIN_PASSWORD=your_actual_password
```

### Tests fail on staging but work locally

**Check:**
1. Can you access staging URL in browser?
   ```bash
   curl https://hc-staging.emu-mora.ts.net
   ```

2. Are you on the correct network (Tailscale)?

3. Are credentials correct?
   - Try logging in manually at https://hc-staging.emu-mora.ts.net

### "User does not exist"

**For development:**
```bash
# Create test users
bench execute hearingclinic.scripts.setup_test_users.setup_all_test_users
```

**For staging:**
- Manually create the test user in staging ERPNext
- Or update `.env` to use existing user credentials

### Tests timeout waiting for login

**Check:**
1. URL is accessible
2. Credentials are correct
3. User is enabled in ERPNext

---

## Security Checklist

- [ ] `.env` file is in `.gitignore` ✅ (already configured)
- [ ] Never commit passwords to git
- [ ] Use strong passwords for staging test accounts
- [ ] Don't run destructive tests on production
- [ ] Rotate test account passwords regularly
- [ ] Use separate test accounts, not real user accounts

---

## Next Steps

1. ✅ **Setup complete** - You can now run tests on both development and staging

2. **Create staging test users** (optional)
   - Login to https://hc-staging.emu-mora.ts.net
   - Create test users: `test.manager@hearingclinic.com`, etc.
   - Update `.env` with their credentials

3. **Add to CI/CD**
   - See [E2E_ENVIRONMENT_SETUP.md](E2E_ENVIRONMENT_SETUP.md) for GitHub Actions example
   - Use GitHub Secrets for staging credentials

4. **Write permission tests**
   - Test what each user role can/cannot do
   - Ensure security rules work correctly

---

## Complete Documentation

For detailed information, see:
- **[E2E_ENVIRONMENT_SETUP.md](E2E_ENVIRONMENT_SETUP.md)** - Complete environment guide
- **[E2E_TESTS_COMPLETE_SUMMARY.md](E2E_TESTS_COMPLETE_SUMMARY.md)** - All test documentation
- **[hearingclinic/tests/e2e/config/test-config.ts](hearingclinic/tests/e2e/config/test-config.ts)** - Configuration file

---

## Quick Copy-Paste Commands

```bash
# Setup development users
bench execute hearingclinic.scripts.setup_test_users.setup_all_test_users

# Create .env for staging
cp .env.example .env
nano .env  # Add: TEST_ENV=staging and STAGING_ADMIN_PASSWORD

# Run tests on development
npm run test:e2e

# Run tests on staging
TEST_ENV=staging npm run test:e2e

# Debug on staging
TEST_ENV=staging npm run test:e2e:ui
```

That's everything you need to get started! 🚀
