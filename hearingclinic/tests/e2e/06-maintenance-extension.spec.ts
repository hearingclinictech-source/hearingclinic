/**
 * E2E Tests for Maintenance Extension
 * @S E2E Maintenance Extension Tests
 *
 * Tests maintenance extension workflows:
 * - Create maintenance extension from existing schedule
 * - Extend warranty period for hearing aids
 * - Verify extension dates are calculated correctly
 * - Verify extended schedules have updated end dates
 */

import { test, expect } from '@playwright/test';
import { FrappeHelper } from './helpers/frappe-helpers';

test.describe('Maintenance Extension Creation', () => {
  let frappe: FrappeHelper;
  let testCustomer: string;
  let maintenanceScheduleName: string;

  test.beforeAll(async ({ browser }) => {
    // Create test customer and maintenance schedule for extension tests
    const page = await browser.newPage();
    const helper = new FrappeHelper(page);

    await helper.login();

    // Create test customer
    await helper.createNewDoc('Customer', true);
    await helper.setFieldValue('customer_name', 'Test Extension Customer E2E');
    await helper.selectFieldValue('gender', 'Male');
    await helper.saveForm();

    testCustomer = 'Test Extension Customer E2E';

    // Create complete workflow to get a maintenance schedule
    // Step 1: Sales Invoice
    await helper.createNewDoc('Sales Invoice', true);
    await helper.selectLinkValue('customer', testCustomer);
    await page.waitForTimeout(1000);

    await helper.addChildRow('items');
    await page.locator('[data-fieldname="items"] .grid-row[data-idx="1"] [data-fieldname="item_code"] input').fill('Hearing Aid');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    await helper.setChildValue('items', 1, 'qty', '1');
    await page.waitForTimeout(500);

    await helper.saveForm();
    await helper.submitForm();
    await helper.waitForIndicator('blue');

    // Step 2: Delivery Note
    await page.click('[data-label="Menu"]');
    await page.waitForTimeout(500);

    const createMenu = page.locator('a:has-text("Create"), a:has-text("Make")').first();
    if (await createMenu.isVisible()) {
      await createMenu.click();
      await page.waitForTimeout(500);
    }

    await page.click('a:has-text("Delivery Note")');
    await page.waitForSelector('.form-layout');

    // Add serial number
    await page.click('[data-fieldname="items"] .grid-row[data-idx="1"]');
    await page.waitForTimeout(500);
    const serialField = page.locator('[data-fieldname="custom_device_serial_number"] input');
    if (await serialField.isVisible()) {
      await serialField.fill('HA-EXTEND-BASE-001');
    }

    await helper.saveForm();
    await helper.submitForm();
    await helper.waitForIndicator('blue');
    await page.waitForTimeout(3000); // Wait for maintenance schedule creation

    // Navigate to maintenance schedule to get its name
    await helper.gotoList('Maintenance Schedule');
    const searchInput = page.locator('.input-with-feedback[type="text"]').first();
    await searchInput.fill(testCustomer);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator('.list-row-container').first().click();
    await page.waitForSelector('.form-layout');

    // Get maintenance schedule name from URL
    const scheduleUrl = page.url();
    maintenanceScheduleName = scheduleUrl.split('/').pop() || '';

    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    frappe = new FrappeHelper(page);
    await frappe.login();
  });

  test('should create maintenance extension from existing schedule', async ({ page }) => {
    // Open the maintenance schedule
    await frappe.openDoc('Maintenance Schedule', maintenanceScheduleName);
    await page.waitForSelector('.form-layout');

    // Verify we're on the correct schedule
    const customer = await frappe.getFieldValue('customer');
    expect(customer).toBe(testCustomer);

    // Create extension via Actions menu
    await page.click('[data-label="Menu"]');
    await page.waitForTimeout(500);

    const createMenu = page.locator('a:has-text("Create"), a:has-text("Make")').first();
    if (await createMenu.isVisible()) {
      await createMenu.click();
      await page.waitForTimeout(500);
    }

    // Look for "Maintenance Extension" or similar option
    const extensionOption = page.locator('a:has-text("Extension"), a:has-text("Extend")').first();

    // If extension option doesn't exist via menu, create manually
    if (!(await extensionOption.isVisible({ timeout: 2000 }).catch(() => false))) {
      // Create extension manually
      await frappe.createNewDoc('Maintenance Extension', true);
      await frappe.selectLinkValue('maintenance_schedule', maintenanceScheduleName);
      await page.waitForTimeout(1000);
    } else {
      await extensionOption.click();
      await page.waitForSelector('.form-layout');
    }

    // Verify we're on a Maintenance Extension form
    const formTitle = await page.locator('.page-title').textContent();
    expect(formTitle?.toLowerCase()).toContain('maintenance extension');

    // Verify maintenance schedule is linked
    const linkedSchedule = await frappe.getFieldValue('maintenance_schedule');
    expect(linkedSchedule).toBe(maintenanceScheduleName);
  });

  test('should extend warranty period for hearing aids', async ({ page }) => {
    // Create maintenance extension
    await frappe.createNewDoc('Maintenance Extension', true);
    await frappe.selectLinkValue('maintenance_schedule', maintenanceScheduleName);
    await page.waitForTimeout(1000);

    // Set extension period (e.g., 6 months)
    await frappe.setFieldValue('extension_months', '6');

    // Verify customer is automatically filled
    const customer = await frappe.getFieldValue('customer');
    expect(customer).toBe(testCustomer);

    // Save the extension
    await frappe.saveForm();
    await frappe.waitForIndicator('green');

    // Verify extension was created
    const extensionUrl = page.url();
    const extensionName = extensionUrl.split('/').pop() || '';
    expect(extensionName).toBeTruthy();
    expect(extensionName).not.toBe('new-maintenance-extension-1');
  });

  test('should calculate extension dates correctly', async ({ page }) => {
    // Open existing maintenance schedule to get original end date
    await frappe.openDoc('Maintenance Schedule', maintenanceScheduleName);
    await page.waitForSelector('.form-layout');

    const originalEndDate = await frappe.getFieldValue('end_date');
    expect(originalEndDate).toBeTruthy();

    // Create extension
    await frappe.createNewDoc('Maintenance Extension', true);
    await frappe.selectLinkValue('maintenance_schedule', maintenanceScheduleName);
    await page.waitForTimeout(1000);

    // Set extension period
    const extensionMonths = 12;
    await frappe.setFieldValue('extension_months', extensionMonths.toString());
    await page.waitForTimeout(500);

    // New end date should be set automatically
    const newEndDate = await frappe.getFieldValue('new_end_date');
    expect(newEndDate).toBeTruthy();

    // Verify new end date is after original end date
    const original = new Date(originalEndDate);
    const extended = new Date(newEndDate);
    expect(extended.getTime()).toBeGreaterThan(original.getTime());

    // Verify the difference is approximately the extension period
    const monthsDiff = (extended.getFullYear() - original.getFullYear()) * 12 +
                       (extended.getMonth() - original.getMonth());
    expect(monthsDiff).toBeGreaterThanOrEqual(extensionMonths - 1); // Allow 1 month tolerance
    expect(monthsDiff).toBeLessThanOrEqual(extensionMonths + 1);
  });

  test('should update maintenance schedule after extension submission', async ({ page }) => {
    // Create and submit extension
    await frappe.createNewDoc('Maintenance Extension', true);
    await frappe.selectLinkValue('maintenance_schedule', maintenanceScheduleName);
    await page.waitForTimeout(1000);

    // Get original end date from the form (should be pre-filled)
    const originalEndDate = await frappe.getFieldValue('original_end_date');

    // Set extension
    await frappe.setFieldValue('extension_months', '6');
    await page.waitForTimeout(500);

    const newEndDate = await frappe.getFieldValue('new_end_date');

    // Save and submit extension
    await frappe.saveForm();
    await frappe.submitForm();
    await frappe.waitForIndicator('blue');

    // Wait for server-side processing
    await page.waitForTimeout(2000);

    // Navigate to maintenance schedule
    await frappe.openDoc('Maintenance Schedule', maintenanceScheduleName);
    await page.waitForSelector('.form-layout');

    // Verify end date has been updated
    const updatedEndDate = await frappe.getFieldValue('end_date');
    expect(updatedEndDate).toBe(newEndDate);

    // Verify it's different from original
    if (originalEndDate) {
      expect(updatedEndDate).not.toBe(originalEndDate);
    }
  });

  test('should add additional maintenance visits after extension', async ({ page }) => {
    // Get original visit count
    await frappe.openDoc('Maintenance Schedule', maintenanceScheduleName);
    await page.waitForSelector('.form-layout');

    const originalVisitCount = await page.locator('[data-fieldname="schedules"] .grid-row').count();

    // Create and submit extension
    await frappe.createNewDoc('Maintenance Extension', true);
    await frappe.selectLinkValue('maintenance_schedule', maintenanceScheduleName);
    await page.waitForTimeout(1000);

    await frappe.setFieldValue('extension_months', '12');
    await page.waitForTimeout(500);

    await frappe.saveForm();
    await frappe.submitForm();
    await frappe.waitForIndicator('blue');
    await page.waitForTimeout(2000);

    // Check maintenance schedule again
    await frappe.openDoc('Maintenance Schedule', maintenanceScheduleName);
    await page.waitForSelector('.form-layout');

    // Verify more visits have been added (typically 3 visits per year for hearing aids)
    const newVisitCount = await page.locator('[data-fieldname="schedules"] .grid-row').count();
    expect(newVisitCount).toBeGreaterThan(originalVisitCount);

    // Should have approximately 3 more visits for a 12-month extension
    const additionalVisits = newVisitCount - originalVisitCount;
    expect(additionalVisits).toBeGreaterThanOrEqual(2); // At least 2 additional visits
    expect(additionalVisits).toBeLessThanOrEqual(4); // No more than 4 additional visits
  });

  test('should track extension history in maintenance schedule', async ({ page }) => {
    // Create extension
    await frappe.createNewDoc('Maintenance Extension', true);
    await frappe.selectLinkValue('maintenance_schedule', maintenanceScheduleName);
    await page.waitForTimeout(1000);

    await frappe.setFieldValue('extension_months', '6');
    await frappe.saveForm();
    await frappe.submitForm();
    await frappe.waitForIndicator('blue');

    const extensionUrl = page.url();
    const extensionName = extensionUrl.split('/').pop() || '';
    await page.waitForTimeout(2000);

    // Navigate to maintenance schedule
    await frappe.openDoc('Maintenance Schedule', maintenanceScheduleName);
    await page.waitForSelector('.form-layout');

    // Look for extensions table or reference
    // (Implementation may vary based on your custom fields)
    const hasExtensionsSection = await page.locator('[data-fieldname="extensions"], [data-fieldname="extension_history"]').isVisible().catch(() => false);

    if (hasExtensionsSection) {
      // Verify extension is listed
      const extensionRows = await page.locator('[data-fieldname="extensions"] .grid-row, [data-fieldname="extension_history"] .grid-row').count();
      expect(extensionRows).toBeGreaterThan(0);
    }

    // Alternative: Check via connections/linked documents
    const connectionsButton = page.locator('button:has-text("Connections"), a:has-text("Connections")').first();
    if (await connectionsButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await connectionsButton.click();
      await page.waitForTimeout(500);

      // Look for Maintenance Extension link
      const extensionLink = page.locator(`:has-text("${extensionName}")`);
      expect(await extensionLink.count()).toBeGreaterThan(0);
    }
  });

  test.afterAll(async ({ browser }) => {
    // Cleanup - delete test data
    const page = await browser.newPage();
    const helper = new FrappeHelper(page);
    await helper.login();

    try {
      // Delete maintenance schedules and extensions
      // Note: You may need to delete in specific order due to dependencies

      // Delete customer (this may cascade delete related documents)
      await helper.openDoc('Customer', testCustomer);
      await helper.deleteDoc();
    } catch (e) {
      // Customer might have dependencies that prevent deletion
      console.log('Cleanup note: Could not delete test customer, may have dependencies');
    }

    await page.close();
  });
});
