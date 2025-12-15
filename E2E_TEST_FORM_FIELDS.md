# E2E Test Form Fields Reference

Based on your fixture/property setter configuration, here are the **visible fields** for each DocType that E2E tests should use.

## Customer Quick Entry Dialog

**IMPORTANT**: When clicking "New" on the Customer list, a **Quick Entry dialog** appears first with these fields:
- `custom_nricpassport` - NRIC/Passport Number
- `custom_date_of_birth` - Date of Birth
- `custom_ethnicity` - Ethnicity (Select: Chinese/Malay/Indian/Other)
- `email_address` - Email
- `mobile_number` - Mobile Number
- `custom_contact_relationship` - Contact Relationship
- `custom_contact_name` - Contact Name (if different)
- Address fields (address_line1, address_line2, city, pincode, etc.)

**Note**: The quick entry dialog does NOT have `customer_name` or `gender` fields!

To test with `customer_name` and `gender`, you must:
1. Skip the quick entry dialog by clicking "Edit in full page"
2. Or use `createNewDoc('Customer', true)` with skipQuickEntry = true

## Customer Form (Full Form)

### Hidden Fields (Don't test these - they have defaults or are hidden)
- `customer_type` - Hidden, default: "Individual"
- `customer_group` - Hidden
- `territory` - Hidden
- `lead_name` - Hidden
- `opportunity_name` - Hidden
- `prospect_name` - Hidden
- `account_manager` - Hidden
- `defaults_tab` - Hidden
- `internal_customer_section` - Hidden
- `more_info` - Hidden
- `tax_tab` - Hidden
- `accounting_tab` - Hidden
- `sales_team_tab` - Hidden
- `settings_tab` - Hidden
- `portal_users_tab` - Hidden

### Visible/Required Fields (Tests should use these)
- ✅ `customer_name` - Required, visible
- ✅ `gender` - Required, visible
- ✅ `custom_nricpassport` - Custom field (if visible)
- ✅ `custom_customer_id` - Auto-generated, visible (read-only)

### Defaults Applied
- `customer_type`: "Individual" (auto-set)
- `default_price_list`: "Hearing Clinic Products" (auto-set)

## Simplified Customer Creation Test Pattern

### Using Full Form (with customer_name and gender)

```typescript
test('create customer with full form', async ({ page }) => {
  // Skip quick entry to access customer_name and gender fields
  await frappe.createNewDoc('Customer', true);  // skipQuickEntry = true

  // Only fill visible, required fields
  await frappe.setFieldValue('customer_name', 'Test Customer');
  await frappe.selectFieldValue('gender', 'Male');

  // Optional: NRIC if testing duplicate check
  // await frappe.setFieldValue('custom_nricpassport', 'S1234567A');

  await frappe.saveForm();

  // Verify auto-generated ID
  const customerId = await frappe.getFieldValue('custom_customer_id');
  expect(customerId).toMatch(/^M-\d{4}$/);
});
```

### Using Quick Entry Dialog

```typescript
test('create customer via quick entry', async ({ page }) => {
  // Don't skip quick entry
  await frappe.createNewDoc('Customer');

  // Fill quick entry fields (customer_name and gender NOT available here)
  await frappe.setFieldValue('custom_nricpassport', 'S1234567A');
  await frappe.setFieldValue('custom_date_of_birth', '1990-01-01');
  await frappe.selectFieldValue('custom_ethnicity', 'Chinese');
  await frappe.setFieldValue('mobile_number', '91234567');

  // Save quick entry
  await page.click('.modal-dialog button.btn-primary');
  await page.waitForURL(/\/app\/customer\//);
});
```

## Other DocTypes

### Sales Invoice
- Most standard fields visible
- Custom section: `value_add_card_section` (not collapsible)
- Hidden: `redeem_loyalty_points`

### Item
- Hidden: many standard stock fields
- Simplified for hearing clinic use

### Maintenance Visit
- Hidden: `contact_info_section`

## Notes for E2E Tests

1. **Don't test hidden fields** - they're not visible to users
2. **Don't try to fill fields with defaults** - they're auto-set
3. **Only test the minimal user workflow** - what users actually see
4. **Use `trySelectFieldValue()` for fields that might be hidden**

## Updated Test Approach

The tests should be updated to:
- Remove attempts to set `customer_type` (hidden + has default)
- Remove attempts to set `customer_group` (hidden)
- Remove attempts to set `territory` (hidden)
- Only test: `customer_name` + `gender`
