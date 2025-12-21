/**
 * Shared helper to apply POS Profile payment methods to a Sales Invoice
 * If `amount` is provided, each payment row will receive that amount (for shortfalls)
 */
(function() {
    frappe.provide('hearingclinic.pos');

    frappe.hearingclinic.apply_pos_profile_payments = function(frm, amount) {
        if (!frm.doc.pos_profile || !frm.doc.is_pos) return;

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

                            // Optionally set amount (used for VAC shortfall)
                            if (amount) {
                                payment_row.amount = amount;
                            }

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
                        console.log('POS Profile payments applied' + (amount ? (' with amount: ' + amount) : ''), pos_profile.name);
                    }
                }
            }
        });
    };
})();
