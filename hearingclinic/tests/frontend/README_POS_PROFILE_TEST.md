# POS Profile Payment Fix - Test Documentation

## Overview

This document describes the unit tests for the POS Profile Payment Fix feature (`fix_pos_profile_payment.js`).

## Problem Being Solved

The tests verify that when a user selects a POS Profile on a Sales Invoice, the correct payment method from that POS Profile is applied to the invoice's payments table. Previously, the system was incorrectly defaulting to "Bank Transfer" regardless of which POS Profile was selected.

## Test File

**Location**: `hearingclinic/tests/frontend/test_pos_profile_payment_fix.js`

## Test Coverage

### 1. **When POS Profile is selected** (5 tests)

These tests verify the core functionality:

- ✅ **Fetches POS Profile details** - Ensures the system calls the correct API to retrieve POS Profile data
- ✅ **Clears existing payments table** - Verifies old payment methods are removed before applying new ones
- ✅ **Adds payment method from POS Profile** - Confirms the correct payment method is added with proper default flag
- ✅ **Fetches and sets bank account** - Validates that the correct bank account is retrieved and assigned
- ✅ **Refreshes payments field** - Ensures the UI is updated after changes

### 2. **Multiple payment methods** (1 test)

- ✅ **Handles POS Profiles with multiple payment methods** - Verifies all payment methods are correctly added

### 3. **Conditional logic** (2 tests)

- ✅ **Skips when is_pos is false** - Ensures the fix only applies to POS invoices
- ✅ **Skips when POS Profile is not set** - Verifies no action is taken without a selected profile

### 4. **Edge cases** (3 tests)

- ✅ **Handles empty payment methods** - Gracefully handles POS Profiles with no payment methods
- ✅ **Handles API errors (POS Profile)** - Properly manages failed API calls when fetching profile
- ✅ **Handles API errors (bank account)** - Properly manages failed API calls when fetching accounts

### 5. **Integration scenarios** (1 test)

- ✅ **Switching between POS Profiles** - Validates correct behavior when changing from one profile to another (e.g., Bank Transfer → Credit Card)

## Running the Tests

### Run only POS Profile tests:
```bash
cd /workspace/frappe-bench/apps/hearingclinic
npm test -- test_pos_profile_payment_fix.js
```

### Run all frontend tests:
```bash
cd /workspace/frappe-bench/apps/hearingclinic
npm test
```

### Run with coverage:
```bash
cd /workspace/frappe-bench/apps/hearingclinic
npm run test:coverage
```

### Run in watch mode (for development):
```bash
cd /workspace/frappe-bench/apps/hearingclinic
npm run test:watch
```

## Test Results Summary

```
Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total
Snapshots:   0 total
Time:        ~0.7s
```

## Example Test Scenario

### Scenario: User selects "Credit Card" POS Profile

**Given:**
- Sales Invoice with `is_pos = 1`
- User selects "Credit Card" POS Profile

**When:**
- The `pos_profile` field changes

**Then:**
1. System fetches "Credit Card" POS Profile details
2. Clears any existing payments
3. Adds new payment row with `mode_of_payment = "Credit Card"`
4. Fetches correct bank account for Credit Card payments
5. Sets the account on the payment row
6. Refreshes the UI

**Verified by tests:**
- `should fetch the POS Profile details`
- `should clear existing payments table`
- `should add payment method from POS Profile`
- `should fetch and set bank account for payment method`
- `should refresh payments field after applying changes`

## Test Data

### Mock POS Profile:
```javascript
{
    name: 'Credit Card',
    payments: [
        {
            mode_of_payment: 'Credit Card',
            default: 1
        }
    ]
}
```

### Mock Bank Account Response:
```javascript
{
    account: '8003027876 - CIMB 8003027876 - HC-PJ',
    account_type: 'Bank'
}
```

## Maintenance

When updating the `fix_pos_profile_payment.js` script:

1. ✅ Run tests to ensure no regressions
2. ✅ Add new tests for new functionality
3. ✅ Update this documentation if behavior changes
4. ✅ Verify coverage remains above 80%

## Related Files

- **Script under test**: `hearingclinic/public/js/Sales_Invoice/fix_pos_profile_payment.js`
- **Hooks registration**: `hearingclinic/hooks.py` (line 21)
- **Test setup**: `hearingclinic/tests/frontend/setup.js`
- **Package config**: `package.json` (Jest configuration)

## Known Limitations

- Tests use mocked API calls (not integration tests with actual database)
- Asynchronous behavior is simulated (not actual async execution)
- UI refresh behavior is mocked (actual DOM manipulation not tested)

For full end-to-end testing, consider adding Playwright tests that interact with a real ERPNext instance.

## Debugging Failed Tests

If tests fail:

1. **Check mock data** - Ensure mock responses match current API contract
2. **Verify async handling** - Async callbacks must call `done()` or return promises
3. **Review console output** - Check for warnings about unmocked frappe calls
4. **Run in verbose mode** - `npm run test:verbose` for detailed output
5. **Check API changes** - ERPNext updates may change method signatures

## Contributing

When adding new tests:
- Follow existing test structure and naming conventions
- Use descriptive test names (`should ... when ...`)
- Group related tests in `describe` blocks
- Add comments for complex test logic
- Ensure tests are isolated (no shared state)
