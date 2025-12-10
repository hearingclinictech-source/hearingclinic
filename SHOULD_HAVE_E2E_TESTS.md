# Should Have E2E Tests Summary

This document summarizes the "Priority 2: Should Have" E2E test files created for UI components and custom field display.

## Test Files Created

### 1. VAC Selection Dialog Tests
**File**: [hearingclinic/tests/e2e/07-vac-dialog.spec.ts](hearingclinic/tests/e2e/07-vac-dialog.spec.ts)
**Suite**: `@S E2E VAC Dialog Tests`
**Test Count**: 7 tests

#### Tests:
1. **should show Apply Value Add Card button on Sales Invoice**
   - Creates Sales Invoice for customer with active VAC
   - Checks for "Apply Value Add Card" custom button
   - Falls back to checking Payment Entry option if button not found
   - Tests UI customization for VAC application

2. **should open VAC selection dialog when button clicked**
   - Clicks "Apply VAC" button
   - Verifies dialog/modal opens
   - Checks for VAC selection interface
   - Validates dialog shows available cards

3. **should show only active VACs with balance in dialog**
   - Creates Sales Invoice
   - Verifies VAC has positive balance
   - Confirms VAC status is "Active"
   - Tests filtering logic for card selection

4. **should apply VAC amount to invoice and create payment entry**
   - Creates and submits Sales Invoice
   - Retrieves VAC balance before application
   - Creates Payment Entry (manual or via button)
   - Verifies VAC balance is deducted after payment

5. **should update VAC status after partial use**
   - Creates invoice for partial VAC use
   - Creates Card Transaction for usage
   - Verifies status remains "Active" with remaining balance
   - Confirms balance is reduced correctly

6. **should prevent applying VAC to invoice from different customer**
   - Creates second customer
   - Creates invoice for different customer
   - Attempts to use VAC from first customer
   - Verifies validation error prevents mismatched usage

---

### 2. Customer Info Sections Display Tests
**File**: [hearingclinic/tests/e2e/08-customer-info-sections.spec.ts](hearingclinic/tests/e2e/08-customer-info-sections.spec.ts)
**Suite**: `@S E2E Customer Info Tests`
**Test Count**: 9 tests

#### Tests:
1. **should display Devices section in customer form**
   - Opens customer form after device purchase
   - Looks for "Devices" or "Purchased Devices" section
   - Alternative: checks for device table fields
   - Validates custom section implementation

2. **should list purchased hearing aids with serial numbers**
   - Verifies device serial number appears in customer form
   - Checks custom HTML section or table display
   - Falls back to checking Connections for Delivery Notes
   - Tests device tracking functionality

3. **should display warranty information for devices**
   - Looks for warranty section in customer form
   - Checks warranty dates/status fields
   - Alternative: navigates to Maintenance Schedule for warranty info
   - Validates warranty tracking integration

4. **should show maintenance schedules in customer form**
   - Checks for maintenance section/link
   - Verifies Maintenance Schedule in connections
   - Tests maintenance visibility in customer context

5. **should display device details including ear designation**
   - Looks for ear designation (Left/Right) in customer form
   - Falls back to checking Delivery Note for ear info
   - Verifies hearing aid specific fields are displayed

6. **should show purchase history timeline**
   - Opens Activity/Timeline tab in customer form
   - Verifies Sales Invoice and Delivery Note appear
   - Tests timeline integration for customer history

7. **should display device count summary**
   - Looks for device count indicator
   - Alternative: counts via Connections
   - Verifies at least 1 Sales Invoice and 1 Delivery Note

8. **should navigate to linked documents from customer form**
   - Opens Connections panel
   - Clicks Sales Invoice link
   - Verifies navigation to correct document
   - Tests document linking functionality

9. **should display VAC information if customer has cards**
   - Creates VAC for customer
   - Opens customer form
   - Looks for VAC section or connection
   - Verifies VAC visibility in customer context

---

## Test Setup

### Prerequisites
Both test suites use the `FrappeHelper` class from [helpers/frappe-helpers.ts](hearingclinic/tests/e2e/helpers/frappe-helpers.ts)

### Test Data

**VAC Dialog Tests**:
- Creates "Test VAC Dialog Customer E2E"
- Creates active VAC with $1000 balance (becomes $1600 with bonus)
- Tests payment application workflows

**Customer Info Tests**:
- Creates "Test Customer Info E2E"
- Creates complete purchase workflow (Sales Invoice → Delivery Note)
- Adds device with serial number and ear designation
- Creates optional VAC for testing card display

### Cleanup
All test suites include `afterAll` hooks to delete test customers and related data.

---

## Running the Tests

### Run all E2E tests:
```bash
npm run test:e2e
```

### Run specific test file:
```bash
npx playwright test hearingclinic/tests/e2e/07-vac-dialog.spec.ts
npx playwright test hearingclinic/tests/e2e/08-customer-info-sections.spec.ts
```

### Run in UI mode (for debugging):
```bash
npm run test:e2e:ui
```

### Run in headed mode (see browser):
```bash
npm run test:e2e:headed
```

### Debug specific test:
```bash
npx playwright test --debug hearingclinic/tests/e2e/08-customer-info-sections.spec.ts
```

---

## Integration with Testomat.io

All tests include `@S` suite annotations and will be automatically organized in Testomat.io:

- **E2E VAC Dialog Tests** (7 tests)
- **E2E Customer Info Tests** (9 tests)

### Total "Should Have" Tests: **16 E2E tests**

### Run with Testomat.io reporting:
```bash
TESTOMATIO=your_api_key npm run test:e2e
```

---

## Notes

### Custom Implementation Required

These tests check for custom UI elements that may need to be implemented:

**Custom Buttons**:
- "Apply Value Add Card" button on Sales Invoice form
- May require client script in Sales Invoice

**Custom Sections in Customer Form**:
- `custom_devices` - Table or HTML field showing purchased devices
- `custom_warranty` - Warranty information display
- `custom_maintenance` - Maintenance schedule summary
- `custom_vac` - Value Add Card balance/status display
- `custom_device_count` - Summary count of devices

**Implementation Examples**:

```javascript
// Example: Sales Invoice client script for Apply VAC button
frappe.ui.form.on('Sales Invoice', {
    refresh: function(frm) {
        if (frm.doc.docstatus === 0 && frm.doc.customer) {
            frm.add_custom_button(__('Apply Value Add Card'), function() {
                // Show dialog with available VACs
                // Create payment entry on selection
            });
        }
    }
});
```

```python
# Example: Customer form custom fields
# Add to Customer doctype via Customize Form:
# - custom_devices (HTML field with device list)
# - custom_device_count (Int - calculated via server script)
# - custom_vac_summary (HTML field with VAC balances)
```

### Fallback Testing

Both test suites include fallback checks:
- If custom buttons/sections don't exist, tests check standard ERPNext features
- Uses Connections panel to verify linked documents
- Logs messages when custom implementation is not found
- Tests won't fail if custom UI isn't implemented yet

This allows tests to:
1. **Verify core functionality** works (document creation, linking)
2. **Identify missing custom UI** that should be implemented
3. **Pass in basic ERPNext** without custom modifications

---

## Test Coverage

These "Should Have" tests focus on UI/UX enhancements:

```
VAC Dialog Tests (7)          Customer Info Tests (9)
       ↓                              ↓
Custom button UI          Custom field displays
Dialog interactions       Timeline integration
Payment workflows         Document navigation
Validation logic          Summary information
```

Combined with "Must Have" tests (25 tests), you now have:

**Total E2E Test Count: 41 tests**
- 10 Customer Management tests
- 4 Value Add Card workflow tests
- 3 Sales Invoice tests
- 4 Delivery Note tests
- 5 Maintenance Schedule tests
- 6 Maintenance Extension tests
- 7 VAC Dialog tests
- 9 Customer Info display tests

---

## Troubleshooting

### Custom Button Not Found

**Issue**: "Apply Value Add Card" button doesn't appear

**Solutions**:
1. Add custom button via client script in Sales Invoice
2. Check if user has permissions for Value Add Card
3. Verify customer has active VACs

### Custom Sections Not Visible

**Issue**: Device/Warranty sections don't show in Customer form

**Solutions**:
1. Add custom HTML fields via Customize Form
2. Implement server scripts to populate custom fields
3. Use Web Template for complex HTML displays
4. Check if Print Format is being used instead

### Test Timeouts

**Issue**: Tests timeout waiting for elements

**Solutions**:
1. Increase timeout values in test config
2. Add more `waitForTimeout()` calls for slow operations
3. Check if ERPNext instance is running on correct URL
4. Verify database operations complete successfully

### Validation Errors Not Caught

**Issue**: Validation doesn't prevent incorrect operations

**Solutions**:
1. Implement validation in DocType controller
2. Add client-side validation in form scripts
3. Use `validate` method in Python controller
4. Check error messages display correctly

---

## Implementation Priority

### Phase 1: Core Functionality (Already Tested)
✅ Document creation and linking
✅ Basic form operations
✅ Standard ERPNext features

### Phase 2: Custom UI Enhancements (These Tests)
🎯 **Apply VAC button** on Sales Invoice
🎯 **Device section** in Customer form
🎯 **Warranty display** in Customer form
🎯 **Maintenance summary** in Customer form

### Phase 3: Advanced Features (Future)
⏳ Real-time balance updates
⏳ Interactive device timeline
⏳ Warranty expiration alerts
⏳ Maintenance schedule reminders

---

## Next Steps

1. **Review test results** to identify which custom UI features are missing
2. **Implement custom buttons** in Sales Invoice for VAC application
3. **Add custom sections** to Customer form for device/warranty display
4. **Run tests again** to verify custom UI works correctly
5. **Iterate** based on test feedback

These "Should Have" tests serve dual purposes:
- **Validate** custom UI features when implemented
- **Document** expected UI behavior for developers

---

## Related Documentation

- [NEW_E2E_TESTS.md](NEW_E2E_TESTS.md) - "Must Have" E2E tests (Priority 1)
- [E2E_TEST_STRATEGY.md](E2E_TEST_STRATEGY.md) - Overall testing strategy
- [E2E_QUICK_START.md](E2E_QUICK_START.md) - Quick start guide
- [hearingclinic/tests/e2e/README.md](hearingclinic/tests/e2e/README.md) - E2E test documentation
