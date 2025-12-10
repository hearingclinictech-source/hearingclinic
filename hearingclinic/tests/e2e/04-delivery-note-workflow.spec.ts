/**
 * E2E Tests for Delivery Note Workflow
 * @S E2E Delivery Note Tests
 *
 * Tests critical delivery note workflows:
 * - Create Delivery Note from Sales Invoice
 * - Add serial numbers and ear designations for hearing aids
 * - Transfer warranty and hearing aid items
 * - Verify all required fields are populated
 */

import { test, expect } from '@playwright/test';
import { FrappeHelper } from './helpers/frappe-helpers';

test.describe('Delivery Note from Sales Invoice', () => {
  let frappe: FrappeHelper;
  let testCustomer: string;
  let testInvoice: string;

  test.beforeAll(async ({ browser }) => {
    // Create test customer for delivery note tests
    const page = await browser.newPage();
    const helper = new FrappeHelper(page);

    await helper.login();
    await helper.createNewDoc('Customer', true);
    await helper.setFieldValue('customer_name', 'Test Delivery Customer E2E');
    await helper.selectFieldValue('gender', 'Male');
    await helper.saveForm();

    testCustomer = 'Test Delivery Customer E2E';
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    frappe = new FrappeHelper(page);
    await frappe.login();
  });

  test('should create delivery note from sales invoice via Actions button', async ({ page }) => {
    // First, create a Sales Invoice
    await frappe.createNewDoc('Sales Invoice', true);
    await frappe.selectLinkValue('customer', testCustomer);

    // Wait for customer to load
    await page.waitForTimeout(1000);

    // Add a hearing aid item (you may need to adjust item code based on your setup)
    await frappe.addChildRow('items');

    // Note: Replace 'Hearing Aid' with actual item code from your system
    // For this test to work, you need hearing aid items in your database
    await page.locator('[data-fieldname="items"] .grid-row[data-idx="1"] [data-fieldname="item_code"] input').fill('Hearing Aid');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Wait for item to load
    await page.waitForTimeout(1000);

    // Set quantity
    await frappe.setChildValue('items', 1, 'qty', '2');

    // Wait for rate to populate
    await page.waitForTimeout(500);

    // Save the invoice
    await frappe.saveForm();

    // Get invoice name for later verification
    const invoiceUrl = page.url();
    testInvoice = invoiceUrl.split('/').pop() || '';

    // Submit the invoice (required before creating delivery note)
    await frappe.submitForm();

    // Wait for submit to complete
    await frappe.waitForIndicator('blue');

    // Open Actions menu
    await page.click('[data-label="Menu"]');
    await page.waitForTimeout(500);

    // Look for "Create" or "Make" menu option
    const createMenu = page.locator('a:has-text("Create"), a:has-text("Make")').first();
    if (await createMenu.isVisible()) {
      await createMenu.click();
      await page.waitForTimeout(500);
    }

    // Click "Delivery Note" option
    const deliveryOption = page.locator('a:has-text("Delivery Note")');
    await deliveryOption.waitFor({ state: 'visible', timeout: 5000 });
    await deliveryOption.click();

    // Wait for Delivery Note form to load
    await page.waitForSelector('.form-layout', { timeout: 10000 });

    // Verify we're on a Delivery Note form
    const formTitle = await page.locator('.page-title').textContent();
    expect(formTitle?.toLowerCase()).toContain('delivery note');

    // Verify customer is pre-filled
    const customer = await frappe.getFieldValue('customer');
    expect(customer).toBe(testCustomer);

    // Verify items are copied from invoice
    const itemRows = await page.locator('[data-fieldname="items"] .grid-row').count();
    expect(itemRows).toBeGreaterThan(0);

    // Verify against_sales_invoice is set
    const againstInvoice = await frappe.getFieldValue('against_sales_invoice');
    expect(againstInvoice).toContain(testInvoice);
  });

  test('should add serial numbers and ear designations to hearing aid items', async ({ page }) => {
    // Create Sales Invoice
    await frappe.createNewDoc('Sales Invoice', true);
    await frappe.selectLinkValue('customer', testCustomer);
    await page.waitForTimeout(1000);

    // Add hearing aid items
    await frappe.addChildRow('items');
    await page.locator('[data-fieldname="items"] .grid-row[data-idx="1"] [data-fieldname="item_code"] input').fill('Hearing Aid');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await frappe.setChildValue('items', 1, 'qty', '2');
    await page.waitForTimeout(500);

    // Save and submit invoice
    await frappe.saveForm();
    await frappe.submitForm();
    await frappe.waitForIndicator('blue');

    // Create Delivery Note
    await page.click('[data-label="Menu"]');
    await page.waitForTimeout(500);

    const createMenu = page.locator('a:has-text("Create"), a:has-text("Make")').first();
    if (await createMenu.isVisible()) {
      await createMenu.click();
      await page.waitForTimeout(500);
    }

    await page.click('a:has-text("Delivery Note")');
    await page.waitForSelector('.form-layout', { timeout: 10000 });

    // Now add serial numbers and ear designations
    // Click on first item row to open detail view
    await page.click('[data-fieldname="items"] .grid-row[data-idx="1"]');
    await page.waitForTimeout(500);

    // Add custom fields for hearing aid items
    // Serial Number
    const serialField = page.locator('[data-fieldname="custom_device_serial_number"] input');
    if (await serialField.isVisible()) {
      await serialField.fill('HA-SN-001-LEFT');

      // Ear Designation
      const earField = page.locator('[data-fieldname="custom_ear_designation"] select');
      if (await earField.isVisible()) {
        await earField.selectOption('Left');
      }
    }

    // Save the delivery note
    await frappe.saveForm();

    // Verify serial number was saved
    await page.click('[data-fieldname="items"] .grid-row[data-idx="1"]');
    await page.waitForTimeout(500);

    const savedSerial = await page.locator('[data-fieldname="custom_device_serial_number"] input').inputValue();
    expect(savedSerial).toBe('HA-SN-001-LEFT');
  });

  test('should transfer warranty items from sales invoice', async ({ page }) => {
    // Create Sales Invoice with warranty item
    await frappe.createNewDoc('Sales Invoice', true);
    await frappe.selectLinkValue('customer', testCustomer);
    await page.waitForTimeout(1000);

    // Add hearing aid
    await frappe.addChildRow('items');
    await page.locator('[data-fieldname="items"] .grid-row[data-idx="1"] [data-fieldname="item_code"] input').fill('Hearing Aid');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    await frappe.setChildValue('items', 1, 'qty', '1');

    // Add warranty item
    await frappe.addChildRow('items');
    await page.locator('[data-fieldname="items"] .grid-row[data-idx="2"] [data-fieldname="item_code"] input').fill('Warranty');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    await frappe.setChildValue('items', 2, 'qty', '1');

    // Save and submit
    await frappe.saveForm();
    await frappe.submitForm();
    await frappe.waitForIndicator('blue');

    // Create Delivery Note
    await page.click('[data-label="Menu"]');
    await page.waitForTimeout(500);

    const createMenu = page.locator('a:has-text("Create"), a:has-text("Make")').first();
    if (await createMenu.isVisible()) {
      await createMenu.click();
      await page.waitForTimeout(500);
    }

    await page.click('a:has-text("Delivery Note")');
    await page.waitForSelector('.form-layout');

    // Verify both hearing aid and warranty items are present
    const itemRows = await page.locator('[data-fieldname="items"] .grid-row').count();
    expect(itemRows).toBe(2);

    // Verify warranty item is included
    const warrantyItem = await page.locator('[data-fieldname="items"] .grid-row:has-text("Warranty")');
    expect(await warrantyItem.count()).toBeGreaterThan(0);
  });

  test('should populate all required delivery note fields', async ({ page }) => {
    // Create and submit sales invoice
    await frappe.createNewDoc('Sales Invoice', true);
    await frappe.selectLinkValue('customer', testCustomer);
    await page.waitForTimeout(1000);

    await frappe.addChildRow('items');
    await page.locator('[data-fieldname="items"] .grid-row[data-idx="1"] [data-fieldname="item_code"] input').fill('Hearing Aid');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    await frappe.setChildValue('items', 1, 'qty', '1');

    await frappe.saveForm();
    await frappe.submitForm();
    await frappe.waitForIndicator('blue');

    // Create Delivery Note
    await page.click('[data-label="Menu"]');
    await page.waitForTimeout(500);

    const createMenu = page.locator('a:has-text("Create"), a:has-text("Make")').first();
    if (await createMenu.isVisible()) {
      await createMenu.click();
      await page.waitForTimeout(500);
    }

    await page.click('a:has-text("Delivery Note")');
    await page.waitForSelector('.form-layout');

    // Verify required fields are populated
    const customer = await frappe.getFieldValue('customer');
    expect(customer).toBe(testCustomer);

    const postingDate = await frappe.getFieldValue('posting_date');
    expect(postingDate).toBeTruthy();

    // Check if company is set
    const company = await frappe.getFieldValue('company');
    expect(company).toBeTruthy();

    // Save delivery note
    await frappe.saveForm();
    await frappe.waitForIndicator('green');

    // Verify status is Draft
    const status = await frappe.getFieldValue('status');
    expect(status).toBe('Draft');
  });

  test.afterAll(async ({ browser }) => {
    // Cleanup test customer
    const page = await browser.newPage();
    const helper = new FrappeHelper(page);
    await helper.login();

    try {
      await helper.openDoc('Customer', testCustomer);
      await helper.deleteDoc();
    } catch (e) {
      // Customer might already be deleted
    }

    await page.close();
  });
});
