/**
 * E2E Tests for Customer Management
 * @S E2E Customer Tests
 *
 * Tests critical customer workflows:
 * - Customer creation with auto-generated ID
 * - Duplicate customer prevention
 * - Gender-based ID prefixes
 *
 * Note: Tests only use visible fields based on your form customizations
 * Hidden fields (customer_type, customer_group, territory) have defaults
 */

import { test, expect } from '@playwright/test';
import { FrappeHelper } from './helpers/frappe-helpers';

test.describe('Customer Management', () => {
  let frappe: FrappeHelper;

  test.beforeEach(async ({ page }) => {
    frappe = new FrappeHelper(page);
    await frappe.login();
  });

  test('should create male customer with M- prefix ID', async ({ page }) => {
    // Navigate to Customer DocType and skip quick entry to get to full form
    // The quick entry dialog doesn't have customer_name or gender fields
    await frappe.createNewDoc('Customer', true);  // skipQuickEntry = true

    // Fill only visible, required fields
    // Note: customer_type, customer_group, territory are hidden with defaults
    // Use timestamp to ensure unique names
    const timestamp = Date.now();
    const customerName = `E2E Male ${timestamp}`;
    await frappe.setFieldValue('customer_name', customerName);
    await frappe.selectFieldValue('gender', 'Male');

    // Save customer
    await frappe.saveForm();

    // Verify customer ID was auto-generated with M- prefix
    const customerId = await frappe.getFieldValue('custom_customer_id');
    expect(customerId).toMatch(/^M-\d{4}$/);

    console.log(`✅ Customer created successfully with ID: ${customerId}`);

    // Cleanup via API
    await frappe.deleteDoc();
  });

  test('should create female customer with F- prefix ID', async ({ page }) => {
    // Navigate to Customer DocType and skip quick entry
    await frappe.createNewDoc('Customer', true);

    // Fill only visible, required fields
    const timestamp = Date.now();
    const customerName = `E2E Female ${timestamp}`;
    await frappe.setFieldValue('customer_name', customerName);
    await frappe.selectFieldValue('gender', 'Female');

    // Save customer
    await frappe.saveForm();

    // Verify customer ID was auto-generated with F- prefix
    const customerId = await frappe.getFieldValue('custom_customer_id');
    expect(customerId).toMatch(/^F-\d{4}$/);

    console.log(`✅ Customer created successfully with ID: ${customerId}`);

    // Cleanup via API
    await frappe.deleteDoc();
  });

  test('should prevent duplicate customer with same NRIC', async ({ page }) => {
    const timestamp = Date.now();
    const testNRIC = `S${timestamp}A`; // Unique NRIC for this test run
    const customer1Name = `E2E Dup1 ${timestamp}`;

    // Create first customer
    await frappe.createNewDoc('Customer', true);
    await frappe.setFieldValue('customer_name', customer1Name);
    await frappe.selectFieldValue('gender', 'Male');
    await frappe.setFieldValue('custom_nricpassport', testNRIC);
    await frappe.saveForm();

    // Try to create duplicate customer with same NRIC
    await frappe.createNewDoc('Customer', true);
    await frappe.setFieldValue('customer_name', `E2E Dup2 ${timestamp}`);
    await frappe.selectFieldValue('gender', 'Female');
    await frappe.setFieldValue('custom_nricpassport', testNRIC); // Same NRIC

    // Click save and expect error
    await page.click('.primary-action:has-text("Save")');

    // Wait for error message
    await page.waitForSelector('.msgprint, .alert', { timeout: 5000 });

    // Verify error message contains "already exists" or similar
    const errorText = await page.locator('.msgprint, .alert').textContent();
    expect(errorText?.toLowerCase()).toContain('already exists');

    console.log('✅ Duplicate NRIC validation working correctly');

    // Close error dialog
    await frappe.closeDialog();

    // Cleanup first customer via API
    await frappe.deleteDocViaAPI('Customer', customer1Name);
  });

  test('should auto-generate sequential customer IDs', async ({ page }) => {
    const timestamp = Date.now();
    const customer1Name = `E2E Seq1 ${timestamp}`;
    const customer2Name = `E2E Seq2 ${timestamp}`;

    // Create first customer
    await frappe.createNewDoc('Customer', true);
    await frappe.setFieldValue('customer_name', customer1Name);
    await frappe.selectFieldValue('gender', 'Male');
    await frappe.saveForm();

    const firstId = await frappe.getFieldValue('custom_customer_id');
    const firstIdNumber = parseInt(firstId.replace('M-', ''));

    // Create second customer
    await frappe.createNewDoc('Customer', true);
    await frappe.setFieldValue('customer_name', customer2Name);
    await frappe.selectFieldValue('gender', 'Male');
    await frappe.saveForm();

    const secondId = await frappe.getFieldValue('custom_customer_id');
    const secondIdNumber = parseInt(secondId.replace('M-', ''));

    // Verify IDs are sequential
    expect(secondIdNumber).toBe(firstIdNumber + 1);

    console.log(`✅ Sequential IDs verified: ${firstId} -> ${secondId}`);

    // Cleanup both customers via API
    await frappe.deleteDocViaAPI('Customer', customer2Name);
    await frappe.deleteDocViaAPI('Customer', customer1Name);
  });
});
