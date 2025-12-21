/**
 * Value Add Card functionality for Sales Invoice
 * Adds button to apply Value Add Card to invoice
 */

frappe.ui.form.on('Sales Invoice', {
    refresh: function(frm) {
        add_value_add_card_button(frm);

        // Clear any stale VAC shortfall data when form refreshes
        // This prevents amounts from previous transactions persisting
        if (!frm.doc.value_add_card) {
            console.log('Clearing stale VAC shortfall on refresh');
            frm._vac_shortfall = null;
        }
    },

    value_add_card: function(frm) {
        // When VAC is removed, restore POS Profile requirement
        if (!frm.doc.value_add_card) {
            console.log('VAC removed - restoring POS Profile requirement');
            frm.set_value('custom_partial_payment_amount', 0);
            frm._vac_shortfall = null;

            // Restore POS Profile requirement if POS mode is enabled
            if (frm.doc.is_pos) {
                frm.set_df_property('pos_profile', 'reqd', 1);
            }
        }
    },

    grand_total: function(frm) {
        // Recalculate VAC shortfall if VAC is applied and grand total changes
        if (frm.doc.value_add_card && frm.doc.docstatus === 0) {
            console.log('Grand total changed with VAC applied - recalculating shortfall');

            // Fetch current card balance and recalculate
            frappe.call({
                method: 'frappe.client.get',
                args: {
                    doctype: 'Value Add Card',
                    name: frm.doc.value_add_card
                },
                callback: function(r) {
                    if (r.message) {
                        let card = r.message;
                        let invoice_total = frm.doc.grand_total || 0;
                        let balance_sufficient = card.current_balance >= invoice_total;

                        if (balance_sufficient) {
                            // VAC now covers full amount
                            frm.set_value('is_pos', 0);
                            frm.set_value('custom_partial_payment_amount', 0);
                            frm._vac_shortfall = null;
                            frm.clear_table('payments');
                            frm.refresh_field('payments');
                            frm.set_df_property('pos_profile', 'reqd', 0);
                            console.log('VAC now covers full amount - disabled POS mode');
                        } else {
                            // VAC insufficient - recalculate shortfall
                            let shortfall = invoice_total - card.current_balance;
                            frm._vac_shortfall = shortfall;
                            frm.set_value('custom_partial_payment_amount', shortfall);

                            // Ensure POS mode is enabled
                            if (!frm.doc.is_pos) {
                                frm.set_value('is_pos', 1);
                            }

                            // Reload POS Profile payments with new shortfall
                            if (frm.doc.pos_profile) {
                                frm.trigger('pos_profile');
                            }

                            console.log('VAC insufficient - updated shortfall to', shortfall);
                        }
                    }
                }
            });
        }
    },

    pos_profile: function(frm) {
        if (frm.doc.pos_profile && frm.doc.is_pos) {
            console.log('POS Profile changed:', frm.doc.pos_profile, 'VAC shortfall:', frm._vac_shortfall);

            // If VAC is applied with insufficient balance, we need to handle partial payment
            if (frm.doc.value_add_card && frm._vac_shortfall) {
                console.log('Value Add Card with shortfall - loading POS Profile payment methods');

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

/**
 * Add "Apply Value Add Card" button to Sales Invoice
 */
function add_value_add_card_button(frm) {
    // Only show button for draft invoices
    if (frm.doc.docstatus === 0) {
        frm.add_custom_button(__('Apply Value Add Card'), function() {
            show_value_add_card_dialog(frm);
        }, __('Actions'));
    }
    
    // If card is already applied, show card info
    if (frm.doc.value_add_card) {
        show_card_info(frm);
    }
}

/**
 * Show dialog to select a Value Add Card
 */
function show_value_add_card_dialog(frm) {
    frappe.prompt([
        {
            fieldname: 'value_add_card',
            fieldtype: 'Link',
            label: __('Value Add Card'),
            options: 'Value Add Card',
            reqd: 1,
            get_query: function() {
                return {
                    filters: {
                        'customer': frm.doc.customer,
                        'status': ['in', ['Active', 'Partially Used']],
                        'current_balance': ['>', 0]
                    }
                };
            }
        }
    ], function(values) {
        apply_value_add_card(frm, values.value_add_card);
    }, __('Select Value Add Card'), __('Apply'));
}

/**
 * Apply the selected Value Add Card to the invoice
 */
function apply_value_add_card(frm, card_name) {
    frappe.call({
        method: 'frappe.client.get',
        args: {
            doctype: 'Value Add Card',
            name: card_name
        },
        callback: function(r) {
            if (r.message) {
                let card = r.message;
                let invoice_total = frm.doc.grand_total || 0;
                let balance_sufficient = card.current_balance >= invoice_total;

                // Store card in custom field
                frm.set_value('value_add_card', card_name);

                // Handle POS mode based on whether balance is sufficient
                if (balance_sufficient) {
                    // VAC covers full amount - disable POS mode and make POS Profile optional
                    if (frm.doc.is_pos) {
                        frm.set_value('is_pos', 0);
                        frm.clear_table('payments');
                        frm.refresh_field('payments');
                        console.log('Disabled POS mode - VAC covers full amount');
                    }

                    // Make POS Profile optional since VAC covers everything
                    frm.set_df_property('pos_profile', 'reqd', 0);

                    frappe.msgprint({
                        title: __('Value Add Card Applied'),
                        message: __('Card: {0}<br>Current Balance: {1}<br>Status: {2}<br><br><strong>Note:</strong> Card balance is sufficient. POS payment mode has been disabled.',
                            [card.name, format_currency(card.current_balance), card.status]),
                        indicator: 'green'
                    });
                } else {
                    // VAC balance insufficient - keep POS mode enabled for additional payment
                    let shortfall = invoice_total - card.current_balance;

                    // Ensure POS mode is enabled
                    if (!frm.doc.is_pos) {
                        frm.set_value('is_pos', 1);
                    }

                    // Store shortfall for later use
                    frm._vac_shortfall = shortfall;

                    // Set the partial payment amount field so backend validation works correctly
                    frm.set_value('custom_partial_payment_amount', shortfall);

                    // Show message about partial payment
                    frappe.msgprint({
                        title: __('Additional Payment Required'),
                        message: __('Card: {0}<br>Current Balance: {1}<br>Invoice Total: {2}<br>Shortfall: {3}<br><br><strong>Important:</strong> The Value Add Card will cover {4}. Please {5} a POS Profile to add the payment method for the remaining {6}.',
                            [
                                card.name,
                                format_currency(card.current_balance),
                                format_currency(invoice_total),
                                format_currency(shortfall),
                                format_currency(card.current_balance),
                                frm.doc.pos_profile ? 'change or re-select' : 'select',
                                format_currency(shortfall)
                            ]),
                        indicator: 'orange'
                    });

                    // If POS Profile is already selected, trigger it to reload with correct amounts
                    if (frm.doc.pos_profile) {
                        console.log('POS Profile already selected, triggering reload with VAC shortfall');
                        // Trigger the pos_profile event handler to reload payments with shortfall
                        frm.trigger('pos_profile');
                    } else {
                        // Highlight the POS Profile field
                        frappe.utils.play_sound('error');
                        frm.scroll_to_field('pos_profile');
                        setTimeout(() => {
                            frappe.msgprint({
                                title: __('Action Required'),
                                message: __('Please select a POS Profile to add the additional payment method'),
                                indicator: 'red'
                            });
                        }, 1500);
                    }
                }

                show_card_info(frm);
            }
        }
    });
}

/**
 * Display card information in the form
 */
function show_card_info(frm) {
    if (!frm.doc.value_add_card) return;

    frappe.call({
        method: 'frappe.client.get',
        args: {
            doctype: 'Value Add Card',
            name: frm.doc.value_add_card
        },
        callback: function(r) {
            if (r.message) {
                let card = r.message;

                // Create info display in the form
                let info_html = `
                    <div class="alert alert-info">
                        <strong>${__('Value Add Card')}: ${card.name}</strong><br>
                        ${__('Balance')}: ${format_currency(card.current_balance)}<br>
                        ${__('Status')}: ${card.status}
                    </div>
                `;

                // You can add this to a custom HTML field or show as message
                frm.dashboard.add_comment(info_html, 'blue', true);
            }
        }
    });
}

