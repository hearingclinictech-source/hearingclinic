# .env File Setup for E2E Tests

## Quick Setup for Your Changed Admin Password

Since you've changed your admin password on development, you need to tell the tests to use your new password.

### Step 1: Check if .env exists

```bash
cd /workspace/frappe-bench/apps/hearingclinic
ls -la .env
```

### Step 2: Create or edit .env

If it doesn't exist:
```bash
cp .env.example .env
```

If it exists, just edit it:
```bash
nano .env  # or code .env, vim .env, etc.
```

### Step 3: Add your credentials

Add these lines to `.env`:

```bash
# Simple method - works for all environments unless overridden
ADMIN_USER=Administrator
ADMIN_PASSWORD=your_new_password_here

# Or if you want to be specific for development only
# DEV_ADMIN_USER=Administrator
# DEV_ADMIN_PASSWORD=your_new_password_here
```

**That's it!** The tests will now use your password from `.env` instead of the hardcoded default.

---

## How It Works

### Priority Order for Credentials

The system checks for credentials in this order:

1. **Environment-specific variables** (highest priority)
   - `DEV_ADMIN_USER`, `DEV_ADMIN_PASSWORD` for development
   - `STAGING_ADMIN_USER`, `STAGING_ADMIN_PASSWORD` for staging

2. **Generic variables**
   - `ADMIN_USER`, `ADMIN_PASSWORD` (works for any environment)

3. **Hardcoded defaults** (lowest priority, fallback)
   - `Administrator` / `admin` (only used if nothing else is set)

### Examples

#### Example 1: Simple Setup (Same password everywhere)
```bash
# .env
ADMIN_USER=Administrator
ADMIN_PASSWORD=MyNewPassword123
```

This will use `MyNewPassword123` for admin in **all environments** (dev, staging, production).

#### Example 2: Different Passwords Per Environment
```bash
# .env
DEV_ADMIN_USER=Administrator
DEV_ADMIN_PASSWORD=DevPassword123

STAGING_ADMIN_USER=Administrator
STAGING_ADMIN_PASSWORD=StagingPassword456
```

This uses different passwords for dev vs staging.

#### Example 3: Development Only (Your Case)
```bash
# .env
ADMIN_PASSWORD=YourNewDevPassword
```

Since you only changed the dev password, just set `ADMIN_PASSWORD` and you're done!

---

## Testing It Works

### Test 1: Check if .env is loaded

```bash
cd /workspace/frappe-bench/apps/hearingclinic

# Run a single quick test
npx playwright test hearingclinic/tests/e2e/01-customer-management.spec.ts --headed
```

Watch the browser - it should:
1. Navigate to login page
2. Fill in `Administrator` as username
3. Fill in **your password from .env** (not 'admin')
4. Login successfully

### Test 2: Verify credentials are loaded

Add this temporary test file to check:

```typescript
// hearingclinic/tests/e2e/00-test-env.spec.ts
import { test } from '@playwright/test';
import { getTestUser } from './config/test-config';

test('verify env credentials loaded', async () => {
  const user = getTestUser('admin');
  console.log('Username:', user.username);
  console.log('Password:', user.password === 'admin' ? '⚠️  Using default' : '✅ Using .env');
});
```

Run:
```bash
npx playwright test 00-test-env.spec.ts
```

If you see `✅ Using .env`, your `.env` is working!

---

## Common Issues

### Issue 1: Tests still use old password

**Symptom:** Tests fail with login error, or you see 'admin' password being used

**Solutions:**
1. Make sure `.env` file is in the correct location:
   ```bash
   ls -la /workspace/frappe-bench/apps/hearingclinic/.env
   ```

2. Check `.env` syntax (no spaces around `=`):
   ```bash
   # ✅ Correct
   ADMIN_PASSWORD=MyPassword123

   # ❌ Wrong (spaces)
   ADMIN_PASSWORD = MyPassword123
   ```

3. Restart any running test processes

### Issue 2: .env file doesn't exist

**Fix:**
```bash
cd /workspace/frappe-bench/apps/hearingclinic
cp .env.example .env
nano .env  # Add your password
```

### Issue 3: Tests can't find .env

The `.env` file must be at: `/workspace/frappe-bench/apps/hearingclinic/.env`

**Not** in:
- `/workspace/frappe-bench/.env` ❌
- `/workspace/frappe-bench/apps/hearingclinic/hearingclinic/.env` ❌
- `/workspace/frappe-bench/apps/hearingclinic/tests/.env` ❌

---

## Security Note

✅ **Good news:** `.env` is already in `.gitignore`

This means your passwords are **never** committed to git. Keep it that way!

```bash
# Check it's ignored
cat .gitignore | grep .env

# Should show:
# .env
```

---

## Full .env Example for Development

Here's a complete example for your setup:

```bash
# /workspace/frappe-bench/apps/hearingclinic/.env

# Test Environment
TEST_ENV=development

# Development Admin Credentials (your changed password)
ADMIN_USER=Administrator
ADMIN_PASSWORD=YourActualPasswordHere

# Optional: Other dev users if you created them
# DEV_MANAGER_USER=test.manager@hearingclinic.local
# DEV_MANAGER_PASSWORD=test123

# Optional: Staging credentials (for when you run TEST_ENV=staging)
# STAGING_ADMIN_USER=Administrator
# STAGING_ADMIN_PASSWORD=YourStagingPassword

# Optional: Testomat.io (if you use it)
# TESTOMATIO=your_api_key
```

---

## Quick Commands

```bash
# Create .env from example
cp .env.example .env

# Edit .env
nano .env

# Test if it works
npx playwright test hearingclinic/tests/e2e/01-customer-management.spec.ts

# Run all tests
npm run test:e2e
```

---

## Summary

**What you need to do:**

1. Create/edit `.env` file:
   ```bash
   cd /workspace/frappe-bench/apps/hearingclinic
   nano .env
   ```

2. Add your password:
   ```bash
   ADMIN_PASSWORD=your_new_password
   ```

3. Save and run tests:
   ```bash
   npm run test:e2e
   ```

**Done!** The tests will now use your password from `.env` instead of the hardcoded `admin` default.
