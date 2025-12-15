/**
 * Value Add Card functionality for Sales Invoice
 * Adds button to apply Value Add Card to invoice
 */

frappe.ui.form.on('Sales Invoice', {
    refresh: function(frm) {
        add_value_add_card_button(frm);
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
                    // VAC covers full amount - disable POS mode
                    if (frm.doc.is_pos) {
                        frm.set_value('is_pos', 0);
                        frm.clear_table('payments');
                        frm.refresh_field('payments');
                        console.log('Disabled POS mode - VAC covers full amount');
                    }

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

                    // Remind user to check POS profile
                    frappe.msgprint({
                        title: __('Additional Payment Required'),
                        message: __('Card: {0}<br>Current Balance: {1}<br>Invoice Total: {2}<br>Shortfall: {3}<br><br><strong>Important:</strong> Please ensure your POS Profile is selected to add the additional payment method. The Value Add Card will cover {4} and you need to collect {5} using another payment method.',
                            [
                                card.name,
                                format_currency(card.current_balance),
                                format_currency(invoice_total),
                                format_currency(shortfall),
                                format_currency(card.current_balance),
                                format_currency(shortfall)
                            ]),
                        indicator: 'orange'
                    });

                    // Highlight the POS Profile field
                    if (!frm.doc.pos_profile) {
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

/**
 * Handle payments table changes to apply VAC shortfall
 * This event fires after POS Profile loads payment methods
 */
frappe.ui.form.on('Sales Invoice Payment', {
    payments_add: function(frm) {
        apply_vac_shortfall_to_payments(frm);
    },

    amount: function(frm, cdt, cdn) {
        // Only auto-adjust if we have a VAC shortfall stored and this isn't a VAC payment
        let row = locals[cdt][cdn];
        if (frm._vac_shortfall && row.mode_of_payment !== "Value Add Card") {
            // Prevent infinite loops
            if (!frm._adjusting_vac_payment) {
                apply_vac_shortfall_to_payments(frm);
            }
        }
    }
});

/**
 * Apply the stored VAC shortfall to non-VAC payment entries
 */
function apply_vac_shortfall_to_payments(frm) {
    if (!frm._vac_shortfall || !frm.doc.payments) return;

    // Set flag to prevent infinite loops
    frm._adjusting_vac_payment = true;

    // Update all non-VAC payments to use the shortfall amount
    frm.doc.payments.forEach((payment) => {
        if (payment.mode_of_payment !== "Value Add Card") {
            if (payment.amount !== frm._vac_shortfall) {
                frappe.model.set_value(payment.doctype, payment.name, 'amount', frm._vac_shortfall);
            }
        }
    });

    frm.refresh_field('payments');

    // Clear flag after a short delay
    setTimeout(() => {
        frm._adjusting_vac_payment = false;
    }, 100);
}