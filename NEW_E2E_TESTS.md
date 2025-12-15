# New E2E Tests Summary

This document summarizes the three new E2E test files created to cover critical HearingClinic workflows.

## Test Files Created

### 1. Delivery Note Workflow Tests
**File**: [hearingclinic/tests/e2e/04-delivery-note-workflow.spec.ts](hearingclinic/tests/e2e/04-delivery-note-workflow.spec.ts)
**Suite**: `@S E2E Delivery Note Tests`
**Test Count**: 4 tests

#### Tests:
1. **should create delivery note from sales invoice via Actions button**
   - Creates a Sales Invoice with hearing aid items
   - Uses Actions menu to create Delivery Note
   - Verifies customer and items are transferred correctly
   - Verifies against_sales_invoice is set

2. **should add serial numbers and ear designations to hearing aid items**
   - Creates Sales Invoice and Delivery Note
   - Adds custom fields: serial number and ear designation (Left/Right)
   - Verifies serial numbers are saved correctly

3. **should transfer warranty items from sales invoice**
   - Creates Sales Invoice with both hearing aid and warranty items
   - Verifies both item types are transferred to Delivery Note
   - Ensures warranty items are included

4. **should populate all required delivery note fields**
   - Verifies customer, posting_date, company are populated
   - Checks status is Draft after save
   - Validates all required fields are present

---

### 2. Maintenance Schedule Verification Tests
**File**: [hearingclinic/tests/e2e/05-maintenance-schedule.spec.ts](hearingclinic/tests/e2e/05-maintenance-schedule.spec.ts)
**Suite**: `@S E2E Maintenance Schedule Tests`
**Test Count**: 5 tests

#### Tests:
1. **should create maintenance schedule after delivery note submission**
   - Creates complete workflow: Sales Invoice → Delivery Note
   - Adds serial number to hearing aid item
   - Submits Delivery Note (triggers server-side hook)
   - Verifies Maintenance Schedule is created automatically
   - Checks customer and status are correct

2. **should have correct maintenance schedule dates**
   - Verifies transaction_date, start_date, end_date are set
   - Ensures end_date is after start_date
   - Validates date calculations are correct

3. **should track hearing aid items in maintenance schedule**
   - Verifies hearing aid items are transferred to schedule
   - Uses unique serial numbers for tracking
   - Checks item details are preserved

4. **should have multiple scheduled maintenance visits**
   - Verifies schedule contains multiple visit dates
   - Expects at least 3 visits per year for hearing aids
   - Validates each visit has a scheduled_date

5. **Bug Fix**: Fixed typo on line 112 (changed `schedules` to `scheduleRows`)

---

### 3. Maintenance Extension Tests
**File**: [hearingclinic/tests/e2e/06-maintenance-extension.spec.ts](hearingclinic/tests/e2e/06-maintenance-extension.spec.ts)
**Suite**: `@S E2E Maintenance Extension Tests`
**Test Count**: 6 tests

#### Tests:
1. **should create maintenance extension from existing schedule**
   - Opens existing Maintenance Schedule
   - Creates extension via Actions menu or manually
   - Verifies Maintenance Extension form opens
   - Checks maintenance schedule is linked

2. **should extend warranty period for hearing aids**
   - Creates new Maintenance Extension
   - Sets extension_months field (e.g., 6 months)
   - Verifies customer is auto-filled
   - Saves and validates extension record

3. **should calculate extension dates correctly**
   - Retrieves original end_date from schedule
   - Creates extension with specific month period
   - Verifies new_end_date is calculated automatically
   - Validates date difference matches extension period (±1 month tolerance)

4. **should update maintenance schedule after extension submission**
   - Creates and submits Maintenance Extension
   - Waits for server-side processing
   - Opens original Maintenance Schedule
   - Verifies end_date has been updated to new_end_date
   - Confirms it differs from original end_date

5. **should add additional maintenance visits after extension**
   - Counts original visit rows in schedule
   - Creates 12-month extension
   - Verifies new visits are added (typically 3 per year)
   - Validates 2-4 additional visits are created

6. **should track extension history in maintenance schedule**
   - Creates extension and verifies it's submitted
   - Checks for extensions table/section in Maintenance Schedule
   - Alternative: Checks Connections/linked documents
   - Validates extension is tracked

---

## Test Setup

### Prerequisites
All tests use the `FrappeHelper` class from [helpers/frappe-helpers.ts](hearingclinic/tests/e2e/helpers/frappe-helpers.ts)

### Test Data
Each test suite creates its own test customer:
- **Delivery Note Tests**: "Test Delivery Customer E2E"
- **Maintenance Schedule Tests**: "Test Maintenance Customer E2E"
- **Maintenance Extension Tests**: "Test Extension Customer E2E" (includes pre-created maintenance schedule)

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
npx playwright test hearingclinic/tests/e2e/04-delivery-note-workflow.spec.ts
npx playwright test hearingclinic/tests/e2e/05-maintenance-schedule.spec.ts
npx playwright test hearingclinic/tests/e2e/06-maintenance-extension.spec.ts
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
npx playwright test --debug hearingclinic/tests/e2e/06-maintenance-extension.spec.ts
```

---

## Integration with Testomat.io

All tests include `@S` suite annotations and will be automatically organized in Testomat.io:

- **E2E Delivery Note Tests** (4 tests)
- **E2E Maintenance Schedule Tests** (5 tests)
- **E2E Maintenance Extension Tests** (6 tests)

### Total New Tests: **15 E2E tests**

### Run with Testomat.io reporting:
```bash
TESTOMATIO=your_api_key npm run test:e2e
```

---

## Notes

### Custom Fields Required
These tests assume the following custom fields exist in your ERPNext instance:

**Delivery Note Item**:
- `custom_device_serial_number` (Data)
- `custom_ear_designation` (Select: Left/Right)

**Maintenance Extension** (may vary based on implementation):
- `maintenance_schedule` (Link to Maintenance Schedule)
- `extension_months` (Int)
- `original_end_date` (Date)
- `new_end_date` (Date)
- `customer` (Link to Customer)

### Server-Side Hooks Required
- **Delivery Note submission** should trigger automatic Maintenance Schedule creation
- **Maintenance Extension submission** should update the linked Maintenance Schedule's end_date
- **Maintenance Extension submission** should add additional visit schedules

### Known Limitations
- Tests use `page.waitForTimeout()` for server-side processing - may need adjustment based on server performance
- Some fields/features may vary based on ERPNext version and customizations
- Extension history tracking implementation may differ (extensions table vs. connections)

---

## Test Coverage

These tests cover the complete workflow from Sales Invoice through Delivery Note to Maintenance Schedule and Extensions:

```
Sales Invoice → Delivery Note → Maintenance Schedule → Maintenance Extension
      ↓              ↓                   ↓                      ↓
  (4 tests)      (4 tests)          (5 tests)              (6 tests)
```

Combined with the initial 10 E2E tests ([01-customer-management.spec.ts](hearingclinic/tests/e2e/01-customer-management.spec.ts), [02-value-add-card.spec.ts](hearingclinic/tests/e2e/02-value-add-card.spec.ts), [03-sales-invoice-packages.spec.ts](hearingclinic/tests/e2e/03-sales-invoice-packages.spec.ts)), you now have **25 total E2E tests** covering critical HearingClinic workflows.

---

## Troubleshooting

### Test Failures

**Timeout waiting for form layout**:
- Increase timeout values in test
- Check if ERPNext instance is running
- Verify baseURL in [playwright.config.ts](playwright.config.ts)

**Custom fields not found**:
- Verify custom fields are created in ERPNext
- Check field names match exactly (including `custom_` prefix)
- Ensure fields are visible in the form

**Maintenance schedule not created**:
- Verify server-side hook is configured
- Check ERPNext logs for errors
- Increase wait time after Delivery Note submission

**Extension updates not reflected**:
- Verify server-side processing hook exists
- Check permissions for Maintenance Extension doctype
- Review ERPNext error logs

### Debug Mode

Use `--debug` flag to step through tests:
```bash
npx playwright test --debug hearingclinic/tests/e2e/06-maintenance-extension.spec.ts
```

---

## Next Steps

1. **Run tests locally** to verify they pass in your environment
2. **Adjust custom field names** if they differ in your implementation
3. **Fine-tune timeouts** based on server performance
4. **Add to CI/CD pipeline** for automated testing
5. **Report to Testomat.io** for test management and tracking
