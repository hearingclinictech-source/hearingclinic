/**
 * Clear Default POS Profile
 * Forces users to manually select a POS Profile instead of auto-selecting one
 */

// Override set_pos_data to intercept the callback after set_missing_values
(function() {
    frappe.provide('erpnext.accounts');

    // Wait for controller to load, then override
    $(document).on('app_ready', function() {
        if (erpnext.accounts.SalesInvoiceController) {
            const original_set_pos_data = erpnext.accounts.SalesInvoiceController.prototype.set_pos_data;

            erpnext.accounts.SalesInvoiceController.prototype.set_pos_data = function() {
                const frm = this.frm;

                // Don't interfere with return invoices - they need their POS Profile cleared differently
                if (frm.doc.is_return) {
                    return original_set_pos_data.apply(this, arguments);
                }

                // Store original callback
                const original_args = arguments;

                // Call original method which makes the server call
                const promise = original_set_pos_data.apply(this, original_args);

                // If this is a new doc without user selection, clear pos_profile after callback
                if (promise && promise.then && frm.is_new() && !frm._user_selected_pos_profile) {
                    promise.then(() => {
                        setTimeout(() => {
                            if (frm.doc.pos_profile && !frm._user_selected_pos_profile) {
                                console.log('Clearing auto-populated POS Profile after set_missing_values:', frm.doc.pos_profile);
                                frm.doc.pos_profile = null;
                                frm.doc.payments = [];
                                frm.refresh_field('pos_profile');
                                frm.refresh_field('payments');
                                frm.set_df_property('pos_profile', 'reqd', 1);
                            }
                        }, 100);
                    });
                }

                return promise;
            };
        }
    });
})();

frappe.ui.form.on('Sales Invoice', {
    setup: function(frm) {
        // Override set_pos_data if controller is already loaded
        if (erpnext.accounts.SalesInvoiceController && !frm._pos_data_override_done) {
            const original_set_pos_data = erpnext.accounts.SalesInvoiceController.prototype.set_pos_data;

            erpnext.accounts.SalesInvoiceController.prototype.set_pos_data = function() {
                // Don't interfere with return invoices
                if (this.frm.doc.is_return) {
                    return original_set_pos_data.apply(this, arguments);
                }

                const promise = original_set_pos_data.apply(this, arguments);

                if (promise && promise.then && this.frm.is_new() && !this.frm._user_selected_pos_profile) {
                    promise.then(() => {
                        setTimeout(() => {
                            if (this.frm.doc.pos_profile && !this.frm._user_selected_pos_profile) {
                                console.log('Clearing auto-populated POS Profile (from setup):', this.frm.doc.pos_profile);
                                this.frm.doc.pos_profile = null;
                                this.frm.doc.payments = [];
                                this.frm.refresh_field('pos_profile');
                                this.frm.refresh_field('payments');
                                this.frm.set_df_property('pos_profile', 'reqd', 1);
                            }
                        }, 100);
                    });
                }

                return promise;
            };

            frm._pos_data_override_done = true;
        }
    },

    onload: function(frm) {
        // For return invoices, always clear POS Profile and make it optional
        if (frm.doc.is_return) {
            console.log('Return invoice detected - clearing POS Profile to prevent payment recalculation');
            frm.doc.pos_profile = null;
            frm.refresh_field('pos_profile');
            frm.set_df_property('pos_profile', 'reqd', 0);
            // Block user from manually selecting POS Profile on returns
            frm.set_df_property('pos_profile', 'read_only', 1);
            return;
        }

        // Clear any auto-populated POS Profile on new documents
        if (frm.is_new() && frm.doc.is_pos && frm.doc.pos_profile && !frm._user_selected_pos_profile) {
            console.log('Clearing auto-populated POS Profile in onload:', frm.doc.pos_profile);
            frm.doc.pos_profile = null;
            frm.doc.payments = [];
            frm.refresh_field('pos_profile');
            frm.refresh_field('payments');
        }

        // Make POS Profile mandatory when POS is enabled
        if (frm.is_new() && frm.doc.is_pos) {
            frm.set_df_property('pos_profile', 'reqd', 1);
        }
    },

    refresh: function(frm) {
        // For return invoices, always clear POS Profile and make it optional
        if (frm.doc.is_return) {
            console.log('Return invoice refresh - clearing POS Profile');
            frm.doc.pos_profile = null;
            frm.refresh_field('pos_profile');
            frm.set_df_property('pos_profile', 'reqd', 0);
            frm.set_df_property('pos_profile', 'read_only', 1);
            return;
        }

        // Ensure POS Profile is mandatory when POS is enabled on unsaved docs
        if (frm.doc.is_pos && frm.doc.docstatus === 0) {
            frm.set_df_property('pos_profile', 'reqd', 1);
        }

        // Clear auto-populated POS Profile on refresh for new docs
        if (frm.is_new() && frm.doc.is_pos && frm.doc.pos_profile && !frm._user_selected_pos_profile) {
            console.log('Clearing auto-populated POS Profile in refresh:', frm.doc.pos_profile);
            frm.doc.pos_profile = null;
            frm.doc.payments = [];
            frm.refresh_field('pos_profile');
            frm.refresh_field('payments');
        }
    },

    pos_profile: function(frm) {
        // Mark that user has manually selected a POS Profile
        // This flag allows the normal POS Profile logic to work
        if (frm.doc.pos_profile) {
            console.log('User selected POS Profile:', frm.doc.pos_profile);
            frm._user_selected_pos_profile = true;
        }
    }
});
