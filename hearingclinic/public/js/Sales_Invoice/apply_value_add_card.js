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
                
                // Warn if balance is insufficient
                if (card.current_balance < invoice_total) {
                    frappe.msgprint({
                        title: __('Insufficient Balance'),
                        message: __('Card balance ({0}) is less than invoice total ({1}). You will need an additional payment method.', 
                            [format_currency(card.current_balance), format_currency(invoice_total)]),
                        indicator: 'orange'
                    });
                }
                
                // Store card in custom field
                frm.set_value('value_add_card', card_name);
                
                // Show success message with card details
                frappe.msgprint({
                    title: __('Value Add Card Applied'),
                    message: __('Card: {0}<br>Current Balance: {1}<br>Status: {2}', 
                        [card.name, format_currency(card.current_balance), card.status]),
                    indicator: 'green'
                });
                
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