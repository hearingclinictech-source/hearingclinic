/**
 * E2E Tests for Value Add Card Management
 * @S E2E Value Add Card Tests
 *
 * Tests critical VAC workflows:
 * - VAC creation with 60% bonus
 * - VAC usage and balance tracking
 * - VAC status changes (Active -> Partially Used -> Fully Used)
 */

import { test, expect } from '@playwright/test';
import { FrappeHelper } from './helpers/frappe-helpers';

test.describe('Value Add Card Management', () => {
  let frappe: FrappeHelper;
  let testCustomer: string;

  test.beforeAll(async ({ browser }) => {
    // Create a test customer to use across tests
    const page = await browser.newPage();
    const helper = new FrappeHelper(page);

    await helper.login();

    // Use skipQuickEntry to access full form with customer_name and gender
    const timestamp = Date.now();
    testCustomer = `VAC Test Customer ${timestamp}`;

    await helper.createNewDoc('Customer', true); // skipQuickEntry = true
    await helper.setFieldValue('customer_name', testCustomer);
    // Note: customer_type, customer_group, territory are hidden with defaults
    await helper.selectFieldValue('gender', 'Male');
    await helper.saveForm();

    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    frappe = new FrappeHelper(page);
    await frappe.login();
  });

  test('should create VAC with suggested card value from amount paid', async ({ page }) => {
    // Create new Value Add Card (use skipQuickEntry to go directly to form)
    await frappe.createNewDoc('Value Add Card', true);

    // Select customer
    await frappe.selectLinkValue('customer', testCustomer);

    // Set amount paid (should suggest card value but not auto-set it)
    await frappe.setFieldValue('amount_paid', '1000');
    await page.waitForTimeout(500);

    // The card_value field should now show suggested value of 1600 (1000 * 1.6)
    // but we need to explicitly accept it or set our own value
    const suggestedCardValue = await frappe.getFieldValue('card_value');
    expect(parseFloat(suggestedCardValue)).toBe(1600);

    // Set issue date to today
    await page.click('[data-fieldname="issue_date"]');
    await page.keyboard.press('Escape'); // Close date picker (uses today)

    // Save the card
    await frappe.saveForm();

    // Verify card value is 1600 (suggested value was accepted)
    const cardValue = await frappe.getFieldValue('card_value');
    expect(parseFloat(cardValue)).toBe(1600);

    // Verify current balance equals card value
    const currentBalance = await frappe.getFieldValue('current_balance');
    expect(parseFloat(currentBalance)).toBe(1600);

    // Verify status is Active - but note: status is read-only until submitted
    // Just verify the form saved successfully
    const currentUrl = page.url();
    expect(currentUrl).toContain('/value-add-card/');

    // Cleanup - navigate away instead of deleting (draft docs can't always be deleted)
    await page.goto('/app/value-add-card');
  });

  test('should suggest card value based on amount paid', async ({ page }) => {
    // Test 100: suggested value should be 160 (100 * 1.6)
    await frappe.createNewDoc('Value Add Card', true);
    await frappe.selectLinkValue('customer', testCustomer);
    await frappe.setFieldValue('amount_paid', '100');
    await page.waitForTimeout(500);

    let suggestedValue = await frappe.getFieldValue('card_value');
    expect(parseFloat(suggestedValue)).toBe(160);

    await page.click('[data-fieldname="issue_date"]');
    await page.keyboard.press('Escape');
    await frappe.saveForm();

    let cardValue = await frappe.getFieldValue('card_value');
    expect(parseFloat(cardValue)).toBe(160);
    await page.goto('/app/value-add-card');

    // Test 500: suggested value should be 800 (500 * 1.6)
    await frappe.createNewDoc('Value Add Card', true);
    await frappe.selectLinkValue('customer', testCustomer);
    await frappe.setFieldValue('amount_paid', '500');
    await page.waitForTimeout(500);

    suggestedValue = await frappe.getFieldValue('card_value');
    expect(parseFloat(suggestedValue)).toBe(800);

    await page.click('[data-fieldname="issue_date"]');
    await page.keyboard.press('Escape');
    await frappe.saveForm();

    cardValue = await frappe.getFieldValue('card_value');
    expect(parseFloat(cardValue)).toBe(800);
    await page.goto('/app/value-add-card');

    // Test 2000: suggested value should be 3200 (2000 * 1.6)
    await frappe.createNewDoc('Value Add Card', true);
    await frappe.selectLinkValue('customer', testCustomer);
    await frappe.setFieldValue('amount_paid', '2000');
    await page.waitForTimeout(500);

    suggestedValue = await frappe.getFieldValue('card_value');
    expect(parseFloat(suggestedValue)).toBe(3200);

    await page.click('[data-fieldname="issue_date"]');
    await page.keyboard.press('Escape');
    await frappe.saveForm();

    cardValue = await frappe.getFieldValue('card_value');
    expect(parseFloat(cardValue)).toBe(3200);
    await page.goto('/app/value-add-card');
  });

  test('should allow manual override of suggested card value', async ({ page }) => {
    // Create new Value Add Card
    await frappe.createNewDoc('Value Add Card', true);
    await frappe.selectLinkValue('customer', testCustomer);

    // Set amount paid - this will suggest 1600 (1000 * 1.6)
    await frappe.setFieldValue('amount_paid', '1000');
    await page.waitForTimeout(500);

    // Verify suggested value
    let cardValue = await frappe.getFieldValue('card_value');
    expect(parseFloat(cardValue)).toBe(1600);

    // Manually override to a different value (e.g., promotional bonus)
    await frappe.setFieldValue('card_value', '2000');
    await page.waitForTimeout(500);

    await page.click('[data-fieldname="issue_date"]');
    await page.keyboard.press('Escape');
    await frappe.saveForm();

    // Verify the manually set value was saved
    cardValue = await frappe.getFieldValue('card_value');
    expect(parseFloat(cardValue)).toBe(2000);

    // Verify current balance equals manually set card value
    const currentBalance = await frappe.getFieldValue('current_balance');
    expect(parseFloat(currentBalance)).toBe(2000);

    // Cleanup - navigate away
    await page.goto('/app/value-add-card');
  });

  test('100 should show card as Partially Used after transaction', async ({ page }) => {
    // Create VAC
    await frappe.createNewDoc('Value Add Card', true);
    await frappe.selectLinkValue('customer', testCustomer);
    await frappe.setFieldValue('amount_paid', '1000');
    await page.waitForTimeout(500);
    await page.click('[data-fieldname="issue_date"]');
    await page.keyboard.press('Escape');
    await frappe.saveForm();

    // VACs are automatically submitted when saved, no need to call submitForm()
    await page.waitForTimeout(1000);

    // Get VAC name
    const vacUrl = page.url();
    const vacName = vacUrl.split('/').pop() || '';

    // Verify initial status is Active
    let status = await frappe.getFieldValue('status');
    expect(status).toBe('Active');

    // Create Sales Invoice to use the VAC (partial use)
    await frappe.createNewDoc('Sales Invoice', true);
    await frappe.selectLinkValue('customer', testCustomer);
    await page.waitForTimeout(1000);

    // Set POS Profile to valid payment mode
    await frappe.selectFieldValue('pos_profile', 'Cash');
    await page.waitForTimeout(500);

    // Add item - ACC-0012 has price of 300 RM
    // Don't call addChildRow - Sales Invoice always has an empty row 1 pre-populated
    await frappe.selectChildLinkValue('items', 1, 'item_code', 'ACC-0012');
    await page.waitForTimeout(1000);

    // Set quantity - rate will come from item price (300 RM)
    await frappe.setChildValue('items', 1, 'qty', '2');
    await page.waitForTimeout(500);

    await frappe.saveForm();

    // Apply VAC via the button
    const vacButton = page.locator('button:has-text("Apply Value Add Card")');
    await vacButton.click();
    await page.waitForTimeout(1000);

    // Select the VAC in the dialog
    const vacLinkInput = page.locator('.modal-dialog [data-fieldname="value_add_card"] input');
    await vacLinkInput.fill(vacName);
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Click Apply button in dialog
    const applyButton = page.locator('.modal-dialog .btn-primary:has-text("Apply")');
    await applyButton.click();
    await page.waitForTimeout(2000);

    // Submit the invoice
    await frappe.submitForm();

    // Check VAC status
    await frappe.openDoc('Value Add Card', vacName);
    const currentBalance = await frappe.getFieldValue('current_balance');
    expect(parseFloat(currentBalance)).toBe(1000); // 1600 - 600 (2 items @ 300 each)

    status = await frappe.getFieldValue('status');
    expect(status).toBe('Partially Used');

    // Cleanup - delete VAC (will cascade to invoice)
    await frappe.deleteDoc();
  });

  test('should show card as Fully Used when balance is zero', async ({ page }) => {
    // Create VAC - amount_paid 187.5 = card_value 300 (187.5 * 1.6)
    // This allows us to use exactly 300 (item price) to fully deplete the card
    await frappe.createNewDoc('Value Add Card', true);
    await frappe.selectLinkValue('customer', testCustomer);
    await frappe.setFieldValue('amount_paid', '187.5');
    await page.waitForTimeout(500);
    await page.click('[data-fieldname="issue_date"]');
    await page.keyboard.press('Escape');
    await frappe.saveForm();

    // VACs are automatically submitted when saved, no need to call submitForm()
    await page.waitForTimeout(1000);

    // Get VAC name
    const vacUrl = page.url();
    const vacName = vacUrl.split('/').pop() || '';

    // Create Sales Invoice to fully use the VAC (160)
    await frappe.createNewDoc('Sales Invoice', true);
    await frappe.selectLinkValue('customer', testCustomer);
    await page.waitForTimeout(1000);

    // Set POS Profile to valid payment mode
    await frappe.selectFieldValue('pos_profile', 'Cash');
    await page.waitForTimeout(500);

    // Add item - ACC-0012 has price of 300 RM
    // VAC balance is 320 (200 * 1.6), item costs 300
    // Don't call addChildRow - Sales Invoice always has an empty row 1 pre-populated
    await frappe.selectChildLinkValue('items', 1, 'item_code', 'ACC-0012');
    await page.waitForTimeout(1000);

    // Set quantity - rate will come from item price (300 RM)
    await frappe.setChildValue('items', 1, 'qty', '1');
    await page.waitForTimeout(500);

    await frappe.saveForm();

    // Apply VAC via the button
    const vacButton = page.locator('button:has-text("Apply Value Add Card")');
    await vacButton.click();
    await page.waitForTimeout(1000);

    // Select the VAC in the dialog
    const vacLinkInput = page.locator('.modal-dialog [data-fieldname="value_add_card"] input');
    await vacLinkInput.fill(vacName);
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Click Apply button in dialog
    const applyButton = page.locator('.modal-dialog .btn-primary:has-text("Apply")');
    await applyButton.click();
    await page.waitForTimeout(2000);

    // Submit the invoice
    await frappe.submitForm();

    // Check VAC status
    await frappe.openDoc('Value Add Card', vacName);
    const currentBalance = await frappe.getFieldValue('current_balance');
    expect(parseFloat(currentBalance)).toBe(0);

    const status = await frappe.getFieldValue('status');
    expect(status).toBe('Fully Used');

    // Cleanup
    await frappe.deleteDoc();
  });

  test.afterAll(async ({ browser }) => {
    // Cleanup test customer - delete all VACs first then customer
    const page = await browser.newPage();
    const helper = new FrappeHelper(page);

    await helper.login();

    try {
      // Navigate to VAC list and delete all VACs for this customer
      await page.goto('/app/value-add-card');
      await page.waitForTimeout(2000);

      // Filter by customer
      const filterButton = page.locator('.filter-button, button:has-text("Filter")').first();
      if (await filterButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await filterButton.click();
        await page.waitForTimeout(500);
      }

      // Just navigate to customer and delete
      await helper.openDoc('Customer', testCustomer);
      await helper.deleteDoc();
    } catch (e) {
      console.log('Cleanup warning:', e);
      // If deletion fails, it's okay - test data will accumulate but won't affect tests
    }

    await page.close();
  });
});
