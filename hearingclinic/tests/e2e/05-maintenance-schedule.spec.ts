/**
 * E2E Tests for Maintenance Schedule Creation
 * @S E2E Maintenance Schedule Tests
 *
 * Tests maintenance schedule workflows:
 * - Automatic creation after Delivery Note submission
 * - Verify schedule dates and customer
 * - Verify hearing aid items are tracked
 * - Check maintenance visit schedules
 */

import { test, expect } from '@playwright/test';
import { FrappeHelper } from './helpers/frappe-helpers';

test.describe('Maintenance Schedule Creation', () => {
  let frappe: FrappeHelper;
  let testCustomer: string;

  test.beforeAll(async ({ browser }) => {
    // Create test customer
    const page = await browser.newPage();
    const helper = new FrappeHelper(page);

    await helper.login();
    await helper.createNewDoc('Customer', true);
    await helper.setFieldValue('customer_name', 'Test Maintenance Customer E2E');
    await helper.selectFieldValue('gender', 'Female');
    await helper.saveForm();

    testCustomer = 'Test Maintenance Customer E2E';
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    frappe = new FrappeHelper(page);
    await frappe.login();
  });

  test('should create maintenance schedule after delivery note submission', async ({ page }) => {
    // Step 1: Create Sales Invoice
    await frappe.createNewDoc('Sales Invoice', true);
    await frappe.selectLinkValue('customer', testCustomer);
    await page.waitForTimeout(1000);

    // Add hearing aid item
    await frappe.addChildRow('items');
    await page.locator('[data-fieldname="items"] .grid-row[data-idx="1"] [data-fieldname="item_code"] input').fill('Hearing Aid');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    await frappe.setChildValue('items', 1, 'qty', '1');
    await page.waitForTimeout(500);

    // Save and submit invoice
    await frappe.saveForm();
    await frappe.submitForm();
    await frappe.waitForIndicator('blue');

    // Step 2: Create Delivery Note
    await page.click('[data-label="Menu"]');
    await page.waitForTimeout(500);

    const createMenu = page.locator('a:has-text("Create"), a:has-text("Make")').first();
    if (await createMenu.isVisible()) {
      await createMenu.click();
      await page.waitForTimeout(500);
    }

    await page.click('a:has-text("Delivery Note")');
    await page.waitForSelector('.form-layout');

    // Add serial number to hearing aid item
    await page.click('[data-fieldname="items"] .grid-row[data-idx="1"]');
    await page.waitForTimeout(500);

    const serialField = page.locator('[data-fieldname="custom_device_serial_number"] input');
    if (await serialField.isVisible()) {
      await serialField.fill('HA-MAINT-001');

      const earField = page.locator('[data-fieldname="custom_ear_designation"] select');
      if (await earField.isVisible()) {
        await earField.selectOption('Right');
      }
    }

    // Save the delivery note
    await frappe.saveForm();
    const deliveryNoteUrl = page.url();
    const deliveryNoteName = deliveryNoteUrl.split('/').pop() || '';

    // Submit the delivery note (this should trigger maintenance schedule creation)
    await frappe.submitForm();
    await frappe.waitForIndicator('blue');

    // Wait for maintenance schedule to be created (server-side hook)
    await page.waitForTimeout(3000);

    // Step 3: Navigate to Maintenance Schedule List
    await frappe.gotoList('Maintenance Schedule');

    // Search for schedules for this customer
    const searchInput = page.locator('.input-with-feedback[type="text"]').first();
    await searchInput.fill(testCustomer);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Verify at least one maintenance schedule exists for this customer
    const scheduleRows = await page.locator('.list-row-container').count();
    expect(scheduleRows).toBeGreaterThan(0);

    // Open the most recent maintenance schedule
    const firstSchedule = page.locator('.list-row-container').first();
    await firstSchedule.click();
    await page.waitForSelector('.form-layout');

    // Step 4: Verify maintenance schedule details
    const scheduleCustomer = await frappe.getFieldValue('customer');
    expect(scheduleCustomer).toBe(testCustomer);

    // Verify status
    const status = await page.locator('.indicator-pill').first().textContent();
    expect(status?.toLowerCase()).toContain('active');

    // Verify there are maintenance visit schedules
    const visitRows = await page.locator('[data-fieldname="schedules"] .grid-row').count();
    expect(visitRows).toBeGreaterThan(0);
  });

  test('should have correct maintenance schedule dates', async ({ page }) => {
    // Create complete workflow
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
      await serialField.fill('HA-DATES-TEST-001');
    }

    await frappe.saveForm();
    await frappe.submitForm();
    await frappe.waitForIndicator('blue');
    await page.waitForTimeout(3000);

    // Navigate to maintenance schedule
    await frappe.gotoList('Maintenance Schedule');
    const searchInput = page.locator('.input-with-feedback[type="text"]').first();
    await searchInput.fill(testCustomer);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator('.list-row-container').first().click();
    await page.waitForSelector('.form-layout');

    // Verify transaction date is set
    const transactionDate = await frappe.getFieldValue('transaction_date');
    expect(transactionDate).toBeTruthy();

    // Verify start date is set
    const startDate = await frappe.getFieldValue('start_date');
    expect(startDate).toBeTruthy();

    // Verify end date is set (usually 1 year or warranty period from start)
    const endDate = await frappe.getFieldValue('end_date');
    expect(endDate).toBeTruthy();

    // End date should be after start date
    const start = new Date(startDate);
    const end = new Date(endDate);
    expect(end.getTime()).toBeGreaterThan(start.getTime());
  });

  test('should track hearing aid items in maintenance schedule', async ({ page }) => {
    // Complete workflow
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

    await page.click('[data-label="Menu"]');
    await page.waitForTimeout(500);
    const createMenu = page.locator('a:has-text("Create"), a:has-text("Make")').first();
    if (await createMenu.isVisible()) {
      await createMenu.click();
      await page.waitForTimeout(500);
    }
    await page.click('a:has-text("Delivery Note")');
    await page.waitForSelector('.form-layout');

    const testSerial = `HA-TRACK-${Date.now()}`;
    await page.click('[data-fieldname="items"] .grid-row[data-idx="1"]');
    await page.waitForTimeout(500);
    const serialField = page.locator('[data-fieldname="custom_device_serial_number"] input');
    if (await serialField.isVisible()) {
      await serialField.fill(testSerial);
    }

    await frappe.saveForm();
    await frappe.submitForm();
    await frappe.waitForIndicator('blue');
    await page.waitForTimeout(3000);

    // Check maintenance schedule
    await frappe.gotoList('Maintenance Schedule');
    const searchInput = page.locator('.input-with-feedback[type="text"]').first();
    await searchInput.fill(testCustomer);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator('.list-row-container').first().click();
    await page.waitForSelector('.form-layout');

    // Verify items are in maintenance schedule
    const itemRows = await page.locator('[data-fieldname="items"] .grid-row').count();
    expect(itemRows).toBeGreaterThan(0);

    // Check if hearing aid item is present
    const hearingAidRow = await page.locator('[data-fieldname="items"] .grid-row:has-text("Hearing Aid")');
    expect(await hearingAidRow.count()).toBeGreaterThan(0);
  });

  test('should have multiple scheduled maintenance visits', async ({ page }) => {
    // Complete workflow
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

    await page.click('[data-label="Menu"]');
    await page.waitForTimeout(500);
    const createMenu = page.locator('a:has-text("Create"), a:has-text("Make")').first();
    if (await createMenu.isVisible()) {
      await createMenu.click();
      await page.waitForTimeout(500);
    }
    await page.click('a:has-text("Delivery Note")');
    await page.waitForSelector('.form-layout');

    await page.click('[data-fieldname="items"] .grid-row[data-idx="1"]');
    await page.waitForTimeout(500);
    const serialField = page.locator('[data-fieldname="custom_device_serial_number"] input');
    if (await serialField.isVisible()) {
      await serialField.fill(`HA-VISITS-${Date.now()}`);
    }

    await frappe.saveForm();
    await frappe.submitForm();
    await frappe.waitForIndicator('blue');
    await page.waitForTimeout(3000);

    // Navigate to maintenance schedule
    await frappe.gotoList('Maintenance Schedule');
    const searchInput = page.locator('.input-with-feedback[type="text"]').first();
    await searchInput.fill(testCustomer);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    await page.locator('.list-row-container').first().click();
    await page.waitForSelector('.form-layout');

    // Verify schedule has multiple visits
    // Typically 3 visits per year for hearing aids
    const scheduleRows = await page.locator('[data-fieldname="schedules"] .grid-row').count();
    expect(scheduleRows).toBeGreaterThanOrEqual(3);

    // Check if each visit has a scheduled date
    for (let i = 1; i <= Math.min(scheduleRows, 3); i++) {
      const dateField = page.locator(`[data-fieldname="schedules"] .grid-row[data-idx="${i}"] [data-fieldname="scheduled_date"]`);
      const hasDate = await dateField.count() > 0;
      expect(hasDate).toBe(true);
    }
  });

  test.afterAll(async ({ browser }) => {
    // Cleanup - delete all test maintenance schedules and customer
    const page = await browser.newPage();
    const helper = new FrappeHelper(page);
    await helper.login();

    try {
      // Note: You may need to delete maintenance schedules first
      // before deleting the customer

      await helper.openDoc('Customer', testCustomer);
      await helper.deleteDoc();
    } catch (e) {
      // Customer might already be deleted or have dependencies
      console.log('Cleanup note: Could not delete test customer, may have dependencies');
    }

    await page.close();
  });
});
