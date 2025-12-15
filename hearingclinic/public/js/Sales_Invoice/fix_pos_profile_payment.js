/**
 * Fix for POS Profile Payment Method not being applied correctly
 * This ensures the payment method from the selected POS Profile is applied to the Sales Invoice
 */

frappe.ui.form.on('Sales Invoice', {
    pos_profile: function(frm) {
        if (frm.doc.pos_profile && frm.doc.is_pos) {
            // If VAC is applied with insufficient balance, we need to handle partial payment
            if (frm.doc.value_add_card && frm._vac_shortfall) {
                console.log('Value Add Card with shortfall - will set payment to shortfall amount');

                // Load POS Profile to get payment methods
                frappe.call({
                    method: 'frappe.client.get',
                    args: {
                        doctype: 'POS Profile',
                        name: frm.doc.pos_profile
                    },
                    callback: function(r) {
                        if (r.message) {
                            let pos_profile = r.message;

                            // Clear existing payments
                            frm.clear_table('payments');

                            // Add payments from POS Profile with shortfall amount
                            if (pos_profile.payments && pos_profile.payments.length > 0) {
                                pos_profile.payments.forEach(function(payment_method) {
                                    let payment_row = frm.add_child('payments');
                                    payment_row.mode_of_payment = payment_method.mode_of_payment;
                                    payment_row.default = payment_method.default || 0;
                                    // Set amount to shortfall for non-VAC payments
                                    payment_row.amount = frm._vac_shortfall;

                                    // Get the account for this payment method
                                    frappe.call({
                                        method: 'erpnext.accounts.doctype.sales_invoice.sales_invoice.get_bank_cash_account',
                                        args: {
                                            mode_of_payment: payment_method.mode_of_payment,
                                            company: frm.doc.company
                                        },
                                        async: false,
                                        callback: function(r2) {
                                            if (r2.message) {
                                                payment_row.account = r2.message.account;
                                                payment_row.type = r2.message.account_type;
                                            }
                                        }
                                    });
                                });

                                // Refresh the payments table
                                frm.refresh_field('payments');

                                console.log('POS Profile payments applied with shortfall amount:', frm._vac_shortfall);
                            }
                        }
                    }
                });
                return;
            }

            // Don't override payments if a Value Add Card is applied (with sufficient balance)
            if (frm.doc.value_add_card) {
                console.log('Value Add Card already applied with sufficient balance, skipping POS Profile payment override');
                return;
            }

            // Standard POS Profile handling (no VAC)
            // Force reload the POS Profile and apply its payment methods
            frappe.call({
                method: 'frappe.client.get',
                args: {
                    doctype: 'POS Profile',
                    name: frm.doc.pos_profile
                },
                callback: function(r) {
                    if (r.message) {
                        let pos_profile = r.message;

                        // Clear existing payments
                        frm.clear_table('payments');

                        // Add payments from POS Profile
                        if (pos_profile.payments && pos_profile.payments.length > 0) {
                            pos_profile.payments.forEach(function(payment_method) {
                                let payment_row = frm.add_child('payments');
                                payment_row.mode_of_payment = payment_method.mode_of_payment;
                                payment_row.default = payment_method.default || 0;

                                // Get the account for this payment method
                                frappe.call({
                                    method: 'erpnext.accounts.doctype.sales_invoice.sales_invoice.get_bank_cash_account',
                                    args: {
                                        mode_of_payment: payment_method.mode_of_payment,
                                        company: frm.doc.company
                                    },
                                    async: false,
                                    callback: function(r2) {
                                        if (r2.message) {
                                            payment_row.account = r2.message.account;
                                            payment_row.type = r2.message.account_type;
                                        }
                                    }
                                });
                            });

                            // Refresh the payments table
                            frm.refresh_field('payments');

                            console.log('POS Profile payments applied:', pos_profile.name);
                        }
                    }
                }
            });
        }
    }
});
