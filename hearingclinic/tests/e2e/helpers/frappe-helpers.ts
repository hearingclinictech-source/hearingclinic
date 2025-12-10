import { Page, expect } from '@playwright/test';
import { getTestUser, type TestUser } from '../config/test-config';

/**
 * Helper class for interacting with Frappe/ERPNext in E2E tests
 * Provides common actions for forms, lists, and navigation
 */
export class FrappeHelper {
  constructor(private page: Page) {}

  /**
   * Login to ERPNext
   *
   * @param userType - Type of user to login as (admin, systemManager, salesUser, accountant)
   * @param customUsername - Optional custom username (overrides userType)
   * @param customPassword - Optional custom password (required if customUsername is provided)
   *
   * @example
   * // Login as configured admin user for current environment
   * await frappe.login();
   *
   * @example
   * // Login as system manager
   * await frappe.login('systemManager');
   *
   * @example
   * // Login with custom credentials
   * await frappe.login(undefined, 'custom.user@example.com', 'password123');
   */
  async login(
    userType: 'admin' | 'systemManager' | 'salesUser' | 'accountant' = 'admin',
    customUsername?: string,
    customPassword?: string
  ) {
    let username: string;
    let password: string;

    if (customUsername && customPassword) {
      // Use custom credentials
      username = customUsername;
      password = customPassword;
    } else if (customUsername) {
      throw new Error('Password is required when using custom username');
    } else {
      // Use configured user from test-config
      const user = getTestUser(userType);
      username = user.username;
      password = user.password;
    }

    await this.page.goto('/login');

    // Wait for login form to be visible
    await this.page.waitForSelector('#login_email', { timeout: 10000 });

    await this.page.fill('#login_email', username);
    await this.page.fill('#login_password', password);
    await this.page.click('button[type="submit"]');

    // Wait for successful login (redirects to /app)
    await this.page.waitForURL(/\/app/, { timeout: 15000 });

    // Wait for page to fully load
    await this.page.waitForLoadState('networkidle', { timeout: 10000 });

    // Dismiss any notifications/popups that appear after login
    // Click on the main heading to close any dropdowns
    await this.page.waitForTimeout(1500);

    // Click on the page title/heading area to dismiss any dropdown
    const pageHeading = this.page.locator('.page-title, .layout-main-section-wrapper, body').first();
    await pageHeading.click({ position: { x: 10, y: 10 }, force: true });
    await this.page.waitForTimeout(500);

    console.log('Clicked on page content to dismiss any popups after login');
  }

  /**
   * Login with a specific TestUser object
   */
  async loginWithUser(user: TestUser) {
    await this.login(undefined, user.username, user.password);
  }

  /**
   * Navigate to a DocType list
   */
  async gotoList(doctype: string) {
    const doctypeSlug = doctype.toLowerCase().replace(/ /g, '-');
    await this.page.goto(`/app/${doctypeSlug}`, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for list to load - try multiple selectors
    try {
      await this.page.waitForSelector('.list-row-container, .empty-state', { timeout: 15000 });
    } catch (e) {
      // Fallback: wait for page title or any list indicator
      await this.page.waitForSelector('.page-title, .list-paging-area', { timeout: 5000 });
    }

    // Give page a moment to fully render
    await this.page.waitForTimeout(500);

    // Dismiss any notifications dropdown that might have opened
    await this.dismissNotifications();
  }

  /**
   * Create a new document
   * @param skipQuickEntry - If true, bypasses quick entry dialog and goes directly to full form
   */
  async createNewDoc(doctype: string, skipQuickEntry: boolean = false) {
    console.log(`Creating new ${doctype}, skipQuickEntry=${skipQuickEntry}`);

    if (skipQuickEntry) {
      // Directly navigate to the new form URL to bypass any quick entry issues
      const doctypeSlug = doctype.toLowerCase().replace(/ /g, '-');
      await this.page.goto(`/app/${doctypeSlug}/new`, { waitUntil: 'networkidle', timeout: 30000 });
      console.log(`Navigated directly to /app/${doctypeSlug}/new`);

      // Wait for form to load
      await this.page.waitForSelector('.form-layout', { timeout: 20000 });
      console.log('Form layout loaded');
      await this.page.waitForTimeout(1000);
      return;
    }

    // Normal flow with quick entry
    await this.gotoList(doctype);

    // Ensure notifications dropdown is closed before clicking New button
    await this.dismissNotifications();

    // Try multiple button selectors - ERPNext uses different text for different doctypes
    const newButton = this.page.locator('button:has-text("New"), button:has-text("Add"), .primary-action:has-text("New")').first();
    await newButton.click();
    console.log('Clicked new/add button');

    // Wait a moment for dialog or form to appear
    await this.page.waitForTimeout(2000);

    // Check if quick entry dialog appeared
    const quickEntryDialog = this.page.locator('.modal-dialog .quick-entry, .modal-dialog.quick-entry');
    const hasQuickEntry = await quickEntryDialog.isVisible().catch(() => false);

    console.log(`Quick entry dialog visible: ${hasQuickEntry}`);

    if (hasQuickEntry) {
      // Quick entry dialog is open - tests should fill these fields
      console.log('Quick entry dialog detected - test should use quick entry fields');
      return;
    }

    // Wait for full form to load
    console.log('Waiting for form to load...');
    await this.page.waitForSelector('.form-layout', { timeout: 20000 });
    console.log('Form layout loaded');
    await this.page.waitForTimeout(1000);
  }

  /**
   * Set value in a form field
   */
  async setFieldValue(fieldname: string, value: string) {
    const field = this.page.locator(`[data-fieldname="${fieldname}"] input, [data-fieldname="${fieldname}"] textarea`);
    await field.waitFor({ state: 'visible', timeout: 5000 });
    await field.fill(value);

    // Sometimes Frappe needs a blur event to register the change
    await field.blur();
  }

  /**
   * Select a value from a Link field (autocomplete)
   */
  async selectLinkValue(fieldname: string, value: string) {
    // Click the link field to open autocomplete
    const field = this.page.locator(`[data-fieldname="${fieldname}"] input`);
    await field.click();

    // Type the value
    await field.fill(value);

    // Wait a moment for autocomplete to appear
    await this.page.waitForTimeout(500);

    // Try multiple autocomplete selectors (ERPNext uses different structures)
    // First try: awesomplete dropdown (older style)
    const awesompleteOption = this.page.locator(`.awesomplete li:has-text("${value}")`).first();
    const hasAwesomplete = await awesompleteOption.isVisible({ timeout: 1000 }).catch(() => false);

    if (hasAwesomplete) {
      await awesompleteOption.click();
      return;
    }

    // Second try: listbox with options (newer ERPNext style)
    const listboxOption = this.page.locator(`[role="listbox"] [role="option"]:has-text("${value}")`).first();
    const hasListbox = await listboxOption.isVisible({ timeout: 1000 }).catch(() => false);

    if (hasListbox) {
      await listboxOption.click();
      return;
    }

    // Fallback: Press Enter to select first match
    console.log(`Autocomplete option not found visually, trying Enter key for field ${fieldname}`);
    await this.page.keyboard.press('Enter');
  }

  /**
   * Select a value from a Select field (dropdown)
   * Auto-detects if field is a select or link field
   */
  async selectFieldValue(fieldname: string, value: string, optional: boolean = false) {
    // First check if it's a select dropdown
    const select = this.page.locator(`[data-fieldname="${fieldname}"] select`);
    const selectExists = await select.isVisible({ timeout: 2000 }).catch(() => false);

    if (selectExists) {
      await select.selectOption(value);
      return;
    }

    // Otherwise, try as link field (autocomplete)
    const input = this.page.locator(`[data-fieldname="${fieldname}"] input`);
    const inputExists = await input.isVisible({ timeout: 2000 }).catch(() => false);

    if (inputExists) {
      await this.selectLinkValue(fieldname, value);
      return;
    }

    // If field not found
    if (optional) {
      console.log(`Optional field ${fieldname} not found, skipping`);
      return;
    }

    throw new Error(`Field ${fieldname} not found or not visible (tried select and input)`);
  }

  /**
   * Try to select a field value, but don't fail if field doesn't exist
   */
  async trySelectFieldValue(fieldname: string, value: string) {
    await this.selectFieldValue(fieldname, value, true);
  }

  /**
   * Check a checkbox field
   */
  async checkField(fieldname: string) {
    const checkbox = this.page.locator(`[data-fieldname="${fieldname}"] input[type="checkbox"]`);
    await checkbox.check();
  }

  /**
   * Uncheck a checkbox field
   */
  async uncheckField(fieldname: string) {
    const checkbox = this.page.locator(`[data-fieldname="${fieldname}"] input[type="checkbox"]`);
    await checkbox.uncheck();
  }

  /**
   * Get value from a form field
   * Works with both editable fields (input/textarea) and read-only display fields
   */
  async getFieldValue(fieldname: string): Promise<string> {
    // Try to get value from Frappe's internal field object first (most reliable for formatted fields)
    const fieldValue = await this.page.evaluate((fieldname: string) => {
      // @ts-ignore - frappe.cur_frm is available on form pages
      if (typeof frappe !== 'undefined' && frappe.cur_frm && frappe.cur_frm.doc) {
        return frappe.cur_frm.doc[fieldname];
      }
      return null;
    }, fieldname);

    if (fieldValue !== null && fieldValue !== undefined) {
      return String(fieldValue);
    }

    // Fallback: Try input/textarea (editable fields)
    const inputField = this.page.locator(`[data-fieldname="${fieldname}"] input, [data-fieldname="${fieldname}"] textarea`).first();
    const hasInput = await inputField.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasInput) {
      return await inputField.inputValue();
    }

    // Otherwise, try to get text content from display field (read-only fields)
    const displayValue = this.page.locator(`[data-fieldname="${fieldname}"] .control-value, [data-fieldname="${fieldname}"] .like-disabled-input`).first();
    const hasDisplayValue = await displayValue.isVisible({ timeout: 1000 }).catch(() => false);

    if (hasDisplayValue) {
      const textContent = await displayValue.textContent();
      return textContent?.trim() || '';
    }

    // Fallback: get all text content
    const displayField = this.page.locator(`[data-fieldname="${fieldname}"]`).first();
    const textContent = await displayField.textContent();
    const cleanedText = textContent?.replace(/.*?([A-Z0-9-]+)\s*$/s, '$1').trim() || '';
    return cleanedText;
  }

  /**
   * Save the current form
   */
  async saveForm() {
    // Get current URL to detect if it's a new document
    const urlBeforeSave = this.page.url();
    const isNewDoc = urlBeforeSave.includes('/new');

    // Click primary Save button
    await this.page.click('.primary-action:has-text("Save")');

    if (isNewDoc) {
      // For new documents, wait for URL change (navigation to saved document)
      await this.page.waitForURL(url => !url.toString().includes('/new'), { timeout: 10000 });
      console.log('Document saved and navigated to saved form');
    } else {
      // For existing documents, wait for green indicator
      await this.page.waitForSelector('.indicator-pill.green', { timeout: 10000 });
    }

    // Give the form a moment to fully load after save
    await this.page.waitForTimeout(1000);

    // Dismiss any dialogs that may appear after save (like duplicate name warnings)
    const dialog = this.page.locator('.modal-dialog:visible, .msgprint:visible');
    const hasDialog = await dialog.isVisible().catch(() => false);
    if (hasDialog) {
      console.log('Dialog detected after save, dismissing it');
      // Try clicking primary button or close button
      const primaryBtn = this.page.locator('.modal .btn-primary, .msgprint .btn-primary').first();
      const hasPrimaryBtn = await primaryBtn.isVisible({ timeout: 1000 }).catch(() => false);

      if (hasPrimaryBtn) {
        await primaryBtn.click();
      } else {
        // Press Escape to close
        await this.page.keyboard.press('Escape');
      }
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Submit the current form (workflow submit)
   */
  async submitForm() {
    await this.page.click('.primary-action:has-text("Submit")');
    await this.page.waitForSelector('.indicator-pill.blue', { timeout: 10000 });
  }

  /**
   * Click a custom button in the form
   */
  async clickButton(buttonLabel: string) {
    await this.page.click(`button:has-text("${buttonLabel}")`);
  }

  /**
   * Wait for and close a message dialog
   */
  async waitForMessage(message: string) {
    const msgDialog = this.page.locator(`.msgprint:has-text("${message}")`);
    await msgDialog.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Close any open dialogs
   */
  async closeDialog() {
    const closeBtn = this.page.locator('.modal-header .close, .btn-modal-close');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  }

  /**
   * Dismiss notifications/popups (like notifications panel after login)
   */
  async dismissNotifications() {
    // Wait a moment for any popups to appear
    await this.page.waitForTimeout(1000);

    // Check if notifications dropdown is open by looking for the dropdown menu
    const notificationsDropdown = this.page.locator('.dropdown-menu.notifications-list');
    const isVisible = await notificationsDropdown.isVisible().catch(() => false);

    if (isVisible) {
      console.log('Notifications dropdown is open, closing it...');

      // Click in the center-left of the page (where the main content area is)
      // This avoids clicking on any buttons or interactive elements
      await this.page.mouse.click(400, 300);
      await this.page.waitForTimeout(500);

      // Verify it's closed
      const stillVisible = await notificationsDropdown.isVisible().catch(() => false);
      if (stillVisible) {
        // Fallback: try clicking on the actual list area
        const listArea = this.page.locator('.layout-main-section, .page-content').first();
        const hasListArea = await listArea.isVisible().catch(() => false);
        if (hasListArea) {
          await listArea.click({ position: { x: 200, y: 200 }, force: true });
          await this.page.waitForTimeout(500);
        }
      }

      console.log('Dismissed notifications dropdown');
    }

    // Also check for any modal dialogs that might appear
    const modalBackdrop = this.page.locator('.modal-backdrop');
    const hasModal = await modalBackdrop.isVisible().catch(() => false);

    if (hasModal) {
      // Press Escape to close modal
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Fill a dialog field (for dialogs opened by custom buttons)
   */
  async fillDialogField(fieldname: string, value: string) {
    const field = this.page.locator(`.modal [data-fieldname="${fieldname}"] input`);
    await field.fill(value);
  }

  /**
   * Click primary button in a dialog
   */
  async clickDialogPrimary() {
    await this.page.click('.modal .btn-primary');
  }

  /**
   * Delete a document using Frappe API (more reliable than UI-based deletion)
   * @param doctype - The doctype to delete (e.g., 'Customer')
   * @param name - The document name/ID to delete
   */
  async deleteDocViaAPI(doctype: string, name: string) {
    // Ensure we're on a page with frappe loaded (not just the home page)
    const currentUrl = this.page.url();
    if (!currentUrl.includes('/app/') || currentUrl.endsWith('/app') || currentUrl.endsWith('/app/home')) {
      // Navigate to a page that has frappe loaded (the list page for this doctype)
      await this.gotoList(doctype);
    }

    await this.page.evaluate(
      async ({ doctype, name }: { doctype: string; name: string }) => {
        return new Promise((resolve, reject) => {
          // @ts-ignore - frappe is a global object in ERPNext
          if (typeof frappe === 'undefined') {
            reject(new Error('frappe object not available'));
            return;
          }

          frappe.call({
            method: 'frappe.client.delete',
            args: {
              doctype: doctype,
              name: name,
            },
            callback: (r: any) => {
              if (r.message) {
                resolve(r.message);
              } else {
                resolve(true);
              }
            },
            error: (err: any) => {
              reject(err);
            },
          });
        });
      },
      { doctype, name }
    );
    console.log(`Deleted ${doctype}: ${name} via API`);
  }

  /**
   * Delete the current document (extracts name from URL and uses API)
   */
  async deleteDoc() {
    // Extract doctype and name from current URL
    // URL format: /app/{doctype}/{name}
    const url = this.page.url();
    const match = url.match(/\/app\/([^/]+)\/([^/?]+)/);

    if (!match) {
      throw new Error('Could not extract doctype and name from URL');
    }

    const doctypeSlug = match[1];
    const name = decodeURIComponent(match[2]);

    // Convert slug back to proper doctype (e.g., 'customer' -> 'Customer')
    const doctype = doctypeSlug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    await this.deleteDocViaAPI(doctype, name);
  }

  /**
   * Search and open a document from list view
   */
  async openDoc(doctype: string, name: string) {
    await this.gotoList(doctype);

    // Search for the document
    const searchInput = this.page.locator('.input-with-feedback[type="text"]').first();
    await searchInput.fill(name);
    await this.page.keyboard.press('Enter');

    // Wait for search results
    await this.page.waitForTimeout(1000);

    // Click the document link
    await this.page.click(`.list-row-container a:has-text("${name}")`);

    // Wait for form to load
    await this.page.waitForSelector('.form-layout');
  }

  /**
   * Add a row to a child table
   */
  async addChildRow(tablename: string) {
    await this.page.click(`[data-fieldname="${tablename}"] .grid-add-row`);
    await this.page.waitForTimeout(500);
  }

  /**
   * Set value in a child table row
   */
  async setChildValue(tablename: string, rowIndex: number, fieldname: string, value: string) {
    const field = this.page.locator(
      `[data-fieldname="${tablename}"] .grid-row[data-idx="${rowIndex}"] [data-fieldname="${fieldname}"] input`
    );
    await field.fill(value);
  }

  /**
   * Wait for indicator to change (useful for checking save/submit status)
   */
  async waitForIndicator(color: 'green' | 'blue' | 'orange' | 'red' | 'gray') {
    await this.page.waitForSelector(`.indicator-pill.${color}`, { timeout: 10000 });
  }

  /**
   * Assert that a field has a specific value
   */
  async assertFieldValue(fieldname: string, expectedValue: string) {
    const actualValue = await this.getFieldValue(fieldname);
    expect(actualValue).toBe(expectedValue);
  }

  /**
   * Assert that a field matches a pattern
   */
  async assertFieldPattern(fieldname: string, pattern: RegExp) {
    const actualValue = await this.getFieldValue(fieldname);
    expect(actualValue).toMatch(pattern);
  }
}
