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
    // Try to close any dialogs/modals that might be blocking form access
    try {
      // Close any frappe dialogs
      await this.page.evaluate(() => {
        // @ts-ignore
        if (typeof cur_dialog !== 'undefined' && cur_dialog) {
          // @ts-ignore
          cur_dialog.hide();
        }
      });
      await this.page.waitForTimeout(300);
    } catch (e) {
      // Ignore any errors
    }

    // Try to close any autocomplete dropdowns that might be open
    try {
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(200);
    } catch (e) {
      // Ignore any errors
    }

    // Wait for frappe.cur_frm to be fully initialized
    // This is critical for newly created/navigated forms
    await this.page.waitForFunction(
      () => {
        // @ts-ignore
        return typeof frappe !== 'undefined' &&
               frappe.cur_frm &&
               frappe.cur_frm.doc &&
               frappe.cur_frm.doc.name;
      },
      { timeout: 5000 }
    ).catch(() => {
      console.log('[getFieldValue] Warning: frappe.cur_frm may not be fully initialized');
    });

    // Try to get value from Frappe's internal document object (most reliable)
    // Retry up to 3 times with increasing delays if the field is null
    // This handles cases where the form is still loading
    let fieldValue: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await this.page.waitForTimeout(1000); // Wait before retry
      }

      fieldValue = await this.page.evaluate((fieldname: string) => {
        // @ts-ignore - frappe.cur_frm is available on form pages
        if (typeof frappe !== 'undefined' && frappe.cur_frm && frappe.cur_frm.doc) {
          const value = frappe.cur_frm.doc[fieldname];

          // Also log the entire doc to see what fields are available
          const docKeys = Object.keys(frappe.cur_frm.doc);
          console.log(`[getFieldValue] Doc has ${docKeys.length} fields:`, docKeys.slice(0, 20));
          console.log(`[getFieldValue] Field: ${fieldname}, Value from doc:`, value, 'Type:', typeof value);

          // Return the raw value from the document
          if (value !== null && value !== undefined) {
            return String(value);
          }
        }
        return null;
      }, fieldname);

      console.log(`[getFieldValue] Attempt ${attempt + 1}: Returned value for ${fieldname}:`, fieldValue);

      if (fieldValue !== null && fieldValue !== undefined) {
        return fieldValue;
      }
    }

    // Fallback: Try select dropdown (for select fields where doc value might not be set yet)
    const selectField = this.page.locator(`[data-fieldname="${fieldname}"] select`).first();
    const hasSelect = await selectField.isVisible({ timeout: 1000 }).catch(() => false);

    if (hasSelect) {
      const selectedValue = await selectField.inputValue();
      return selectedValue;
    }

    // Fallback: Try input/textarea (editable fields)
    // For link fields, use input.input-with-feedback (Frappe's standard class for link fields)
    const inputField = this.page.locator(`[data-fieldname="${fieldname}"] input.input-with-feedback, [data-fieldname="${fieldname}"] input[data-doctype], [data-fieldname="${fieldname}"] input, [data-fieldname="${fieldname}"] textarea`).first();
    const hasInput = await inputField.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasInput) {
      let inputValue = await inputField.inputValue();
      console.log(`[getFieldValue] Got value from input element for ${fieldname}:`, inputValue);

      // Remove thousand separators (commas) from numeric/currency fields
      // This converts "1,600.00" to "1600.00" for proper parsing
      if (inputValue && /^[\d,]+\.?\d*$/.test(inputValue)) {
        inputValue = inputValue.replace(/,/g, '');
        console.log(`[getFieldValue] Cleaned numeric value: ${inputValue}`);
      }

      return inputValue;
    }

    // Otherwise, try to get text content from display field (read-only fields)
    const displayValue = this.page.locator(`[data-fieldname="${fieldname}"] .control-value, [data-fieldname="${fieldname}"] .like-disabled-input`).first();
    const hasDisplayValue = await displayValue.isVisible({ timeout: 1000 }).catch(() => false);

    if (hasDisplayValue) {
      let textContent = await displayValue.textContent();
      textContent = textContent?.trim() || '';
      console.log(`[getFieldValue] Got value from display field for ${fieldname}:`, textContent);

      // Clean currency formatting from display fields (e.g., "RM 1,600.00" -> "1600.00")
      if (textContent && /^[A-Z]{2,3}\s+[\d,]+\.?\d*$/.test(textContent)) {
        textContent = textContent.replace(/^[A-Z]{2,3}\s+/, '').replace(/,/g, '');
        console.log(`[getFieldValue] Cleaned currency display value: ${textContent}`);
      }

      return textContent;
    }

    // Final fallback: Try to get the input value directly from any input element in the field
    // This is the last resort and should work for most editable fields
    const anyInput = this.page.locator(`[data-fieldname="${fieldname}"] input, [data-fieldname="${fieldname}"] textarea`).first();
    const hasAnyInput = await anyInput.isVisible({ timeout: 1000 }).catch(() => false);

    if (hasAnyInput) {
      const anyInputValue = await anyInput.inputValue();
      console.log(`[getFieldValue] Got value from any input for ${fieldname}:`, anyInputValue);
      return anyInputValue;
    }

    // Absolute last resort: return empty string instead of grabbing all text which may include dropdown content
    console.log(`[getFieldValue] Could not get value for ${fieldname}, returning empty string`);
    return '';
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

    // Give the form a moment to fully load after save and for calculated fields to update
    await this.page.waitForTimeout(2000);

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

    // Wait for and handle the confirmation dialog if it appears
    // ERPNext shows a "Permanently Submit..." confirmation dialog
    await this.page.waitForTimeout(1000);

    const confirmDialog = this.page.locator('dialog:has-text("Confirm"), .modal-dialog:has-text("Confirm")').first();
    const hasDialog = await confirmDialog.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasDialog) {
      console.log('Submit confirmation dialog detected, clicking Yes');
      // Click "Yes" button to confirm submission
      await this.page.click('button:has-text("Yes")');
      await this.page.waitForTimeout(500);
    }

    // Wait for blue (Submitted) or green (Paid/Completed) indicator
    // POS invoices go directly to "Paid" status instead of "Submitted"
    await this.page.waitForSelector('.indicator-pill.blue, .indicator-pill.green', { timeout: 10000 });
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
   * Select an item from a specific Item Group in a child table
   * Opens the item selection dialog and filters by Item Group
   */
  async selectItemFromGroup(tablename: string, itemGroup: string) {
    // Click "Add Row" button - ERPNext opens a dialog for child table editing
    const addButton = this.page.locator(`[data-fieldname="${tablename}"] .grid-add-row, [data-fieldname="${tablename}"] button:has-text("Add Row")`).first();
    await addButton.click();
    await this.page.waitForTimeout(1500);

    // Now we need to fill the item_code field
    // First check if there's a grid form (dialog-based editing)
    const gridForm = this.page.locator('[data-fieldtype="Table"] .form-in-grid, .modal-dialog').first();
    const hasGridForm = await gridForm.isVisible({ timeout: 500 }).catch(() => false);

    if (hasGridForm) {
      // Click on the item_code link field to open autocomplete
      const itemCodeField = this.page.locator('.form-in-grid [data-fieldname="item_code"] input, .modal-dialog [data-fieldname="item_code"] input').first();
      await itemCodeField.click();
      await this.page.waitForTimeout(500);

      // Check if there's an advanced search link/button
      const advancedSearch = this.page.locator('.awesomplete button[title="Advanced Search"], .link-field .search-icon').first();
      const hasAdvancedSearch = await advancedSearch.isVisible({ timeout: 1000 }).catch(() => false);

      if (hasAdvancedSearch) {
        // Click advanced search to open the item selector dialog
        await advancedSearch.click();
        await this.page.waitForTimeout(1000);

        // Now we should have a search dialog - filter by Item Group
        const itemGroupFilter = this.page.locator('.modal-dialog [data-fieldname="item_group"] input').first();
        const hasItemGroupFilter = await itemGroupFilter.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasItemGroupFilter) {
          await itemGroupFilter.fill(itemGroup);
          await this.page.waitForTimeout(500);
          await this.page.keyboard.press('Enter');
          await this.page.waitForTimeout(1000);

          // Select the first item from the filtered results
          const firstResult = this.page.locator('.modal-dialog .result-row, .modal-dialog .list-row').first();
          const hasResults = await firstResult.isVisible({ timeout: 2000 }).catch(() => false);

          if (hasResults) {
            await firstResult.click();
            await this.page.waitForTimeout(1000);
            return;
          }
        }
      }

      // Fallback: Just type the item group name in the item_code field
      // and select the first match
      console.log(`Advanced search not available, using simple autocomplete for ${itemGroup}`);
      await itemCodeField.fill(itemGroup);
      await this.page.waitForTimeout(1000);
      await this.page.keyboard.press('ArrowDown');
      await this.page.keyboard.press('Enter');
      await this.page.waitForTimeout(1500);
    }
  }

  /**
   * Add a row to a child table
   */
  async addChildRow(tablename: string) {
    // Click "Add Row" button - ERPNext opens a dialog for child table editing
    const addButton = this.page.locator(`[data-fieldname="${tablename}"] .grid-add-row, [data-fieldname="${tablename}"] button:has-text("Add Row")`).first();
    await addButton.click();

    // Wait for the editing dialog to appear
    // ERPNext child table dialogs appear in a grid-form-container overlay
    await this.page.waitForTimeout(1500);

    // Try different selectors for child table editing dialog
    const dialogSelectors = [
      '.grid-form-container',  // ERPNext grid form overlay
      '.modal-dialog',
      '.frappe-dialog',
      '[data-fieldtype="Table"] .form-in-grid'
    ];

    let dialogFound = false;
    for (const selector of dialogSelectors) {
      const hasDialog = await this.page.locator(selector).isVisible().catch(() => false);
      if (hasDialog) {
        console.log(`Child table edit dialog opened (selector: ${selector})`);
        dialogFound = true;
        break;
      }
    }

    if (!dialogFound) {
      console.log('No dialog detected, assuming inline grid editing');
    }
  }

  /**
   * Set value in a child table row
   * Works with both dialog-based editing (ERPNext v14+) and inline grid editing
   */
  async setChildValue(tablename: string, rowIndex: number, fieldname: string, value: string) {
    // First check if there's an open child table editing form
    // ERPNext uses .form-in-grid for child table row editing
    const gridForm = this.page.locator('[data-fieldtype="Table"] .form-in-grid, .modal-dialog').first();
    const hasGridForm = await gridForm.isVisible({ timeout: 500 }).catch(() => false);

    console.log(`[setChildValue] Setting ${fieldname} = ${value}, hasGridForm: ${hasGridForm}`);

    if (hasGridForm) {
      // Use grid form field - check for both regular input and select fields
      const selectField = this.page.locator(`.form-in-grid [data-fieldname="${fieldname}"] select, .modal-dialog [data-fieldname="${fieldname}"] select`).first();
      const hasSelect = await selectField.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasSelect) {
        // It's a select field
        await selectField.selectOption(value);
        return;
      }

      // Otherwise it's an input or textarea field
      const field = this.page.locator(`.form-in-grid [data-fieldname="${fieldname}"] input, .form-in-grid [data-fieldname="${fieldname}"] textarea, .modal-dialog [data-fieldname="${fieldname}"] input, .modal-dialog [data-fieldname="${fieldname}"] textarea`).first();
      const hasInput = await field.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasInput) {
        await field.fill(value);
        await field.blur();
        return;
      }

      // Field not found in grid form - it might be hidden or read-only
      console.log(`Field ${fieldname} not found in child table grid form (checked input and textarea), skipping`);
    } else {
      // Fallback: inline grid editing (older ERPNext or specific configurations)
      const field = this.page.locator(
        `[data-fieldname="${tablename}"] .grid-row[data-idx="${rowIndex}"] [data-fieldname="${fieldname}"] input`
      );
      await field.fill(value);
    }
  }

  /**
   * Close the child table edit dialog and save the row
   */
  async closeChildDialog() {
    const gridForm = this.page.locator('[data-fieldtype="Table"] .form-in-grid, .modal-dialog').first();
    const hasGridForm = await gridForm.isVisible().catch(() => false);

    console.log(`[closeChildDialog] Grid form visible: ${hasGridForm}`);

    if (hasGridForm) {
      // Just press Escape to close and save the current row
      // Note: "Insert Below" button creates a new empty row which causes validation errors
      console.log('[closeChildDialog] Pressing Escape to close grid form');
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(500);

      // Verify it's actually closed
      const stillOpen = await this.page.locator('[data-fieldtype="Table"] .form-in-grid').isVisible().catch(() => false);
      if (stillOpen) {
        console.log('[closeChildDialog] Grid form still open after Escape, trying again');
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(500);
      } else {
        console.log('[closeChildDialog] Grid form closed successfully');
      }
    } else {
      console.log('[closeChildDialog] No grid form to close');
    }
  }

  /**
   * Delete empty rows from a child table (rows with no item_code/qty)
   * Useful for Sales Invoice items table where an empty row is pre-added
   */
  async deleteEmptyChildRows(tablename: string) {
    // Use page.evaluate to delete empty rows via frappe API
    await this.page.evaluate((tablename: string) => {
      // @ts-ignore
      if (typeof frappe !== 'undefined' && frappe.cur_frm) {
        const table = frappe.cur_frm.fields_dict[tablename];
        if (table && table.grid) {
          // Get all rows
          const rows = table.grid.grid_rows || [];

          // Delete empty rows (rows with no item_code)
          rows.forEach((row: any) => {
            if (row.doc && (!row.doc.item_code || row.doc.item_code === '')) {
              table.grid.grid_rows_by_docname[row.doc.name].remove();
            }
          });

          // Refresh the grid
          table.grid.refresh();
        }
      }
    }, tablename);

    await this.page.waitForTimeout(500);
    console.log(`[deleteEmptyChildRows] Deleted empty rows from ${tablename}`);
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
