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

  test('should create VAC with 60% bonus value', async ({ page }) => {
    // Create new Value Add Card (use skipQuickEntry to go directly to form)
    await frappe.createNewDoc('Value Add Card', true);

    // Select customer
    await frappe.selectLinkValue('customer', testCustomer);

    // Set amount paid
    await frappe.setFieldValue('amount_paid', '1000');

    // Set issue date to today
    await page.click('[data-fieldname="issue_date"]');
    await page.keyboard.press('Escape'); // Close date picker (uses today)

    // Save the card
    await frappe.saveForm();

    // Verify card value is 1600 (1000 * 1.6)
    const cardValue = await frappe.getFieldValue('card_value');
    expect(parseFloat(cardValue)).toBe(1600);

    // Verify current balance equals card value
    const currentBalance = await frappe.getFieldValue('current_balance');
    expect(parseFloat(currentBalance)).toBe(1600);

    // Verify status is Active
    const status = await frappe.getFieldValue('status');
    expect(status).toBe('Active');

    // Cleanup
    await frappe.deleteDoc();
  });

  test('should calculate different bonus tiers correctly', async ({ page }) => {
    // Test 100: 100 * 1.6 = 160
    await frappe.createNewDoc('Value Add Card', true);
    await frappe.selectLinkValue('customer', testCustomer);
    await frappe.setFieldValue('amount_paid', '100');
    await page.click('[data-fieldname="issue_date"]');
    await page.keyboard.press('Escape');
    await frappe.saveForm();

    let cardValue = await frappe.getFieldValue('card_value');
    expect(parseFloat(cardValue)).toBe(160);
    await frappe.deleteDoc();

    // Test 500: 500 * 1.6 = 800
    await frappe.createNewDoc('Value Add Card', true);
    await frappe.selectLinkValue('customer', testCustomer);
    await frappe.setFieldValue('amount_paid', '500');
    await page.click('[data-fieldname="issue_date"]');
    await page.keyboard.press('Escape');
    await frappe.saveForm();

    cardValue = await frappe.getFieldValue('card_value');
    expect(parseFloat(cardValue)).toBe(800);
    await frappe.deleteDoc();

    // Test 2000: 2000 * 1.6 = 3200
    await frappe.createNewDoc('Value Add Card', true);
    await frappe.selectLinkValue('customer', testCustomer);
    await frappe.setFieldValue('amount_paid', '2000');
    await page.click('[data-fieldname="issue_date"]');
    await page.keyboard.press('Escape');
    await frappe.saveForm();

    cardValue = await frappe.getFieldValue('card_value');
    expect(parseFloat(cardValue)).toBe(3200);
    await frappe.deleteDoc();
  });

  test('should show card as Partially Used after transaction', async ({ page }) => {
    // Create VAC
    await frappe.createNewDoc('Value Add Card', true);
    await frappe.selectLinkValue('customer', testCustomer);
    await frappe.setFieldValue('amount_paid', '1000');
    await page.click('[data-fieldname="issue_date"]');
    await page.keyboard.press('Escape');
    await frappe.saveForm();

    // Verify initial status is Active
    let status = await frappe.getFieldValue('status');
    expect(status).toBe('Active');

    // Add a transaction manually (simulating purchase)
    // Note: In real scenario, this would be done via Sales Invoice
    // For now, we'll add a transaction row directly
    await frappe.addChildRow('card_transactions');
    // transaction_type field is not in the dialog - it's auto-set
    await frappe.setChildValue('card_transactions', 1, 'amount', '500');
    await frappe.setChildValue('card_transactions', 1, 'remarks', 'E2E Test Purchase');
    await frappe.closeChildDialog(); // Close the child table dialog

    // Save to trigger balance update
    await frappe.saveForm();

    // Verify current balance is 1100 (1600 - 500)
    const currentBalance = await frappe.getFieldValue('current_balance');
    expect(parseFloat(currentBalance)).toBe(1100);

    // Verify status changed to Partially Used
    status = await frappe.getFieldValue('status');
    expect(status).toBe('Partially Used');

    // Cleanup
    await frappe.deleteDoc();
  });

  test('should show card as Fully Used when balance is zero', async ({ page }) => {
    // Create VAC
    await frappe.createNewDoc('Value Add Card', true);
    await frappe.selectLinkValue('customer', testCustomer);
    await frappe.setFieldValue('amount_paid', '100'); // Small amount for easier testing
    await page.click('[data-fieldname="issue_date"]');
    await page.keyboard.press('Escape');
    await frappe.saveForm();

    // Use entire balance (160)
    await frappe.addChildRow('card_transactions');
    // transaction_type field is not in the dialog - it's auto-set
    await frappe.setChildValue('card_transactions', 1, 'amount', '160');
    await frappe.setChildValue('card_transactions', 1, 'remarks', 'E2E Test Full Purchase');
    await frappe.closeChildDialog(); // Close the child table dialog

    // Save to trigger balance update
    await frappe.saveForm();

    // Verify current balance is 0
    const currentBalance = await frappe.getFieldValue('current_balance');
    expect(parseFloat(currentBalance)).toBe(0);

    // Verify status is Fully Used
    const status = await frappe.getFieldValue('status');
    expect(status).toBe('Fully Used');

    // Cleanup
    await frappe.deleteDoc();
  });

  test.afterAll(async ({ browser }) => {
    // Cleanup test customer via API
    const page = await browser.newPage();
    const helper = new FrappeHelper(page);

    await helper.login();
    await helper.deleteDocViaAPI('Customer', testCustomer);
    await page.close();
  });
});
