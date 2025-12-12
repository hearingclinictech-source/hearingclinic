/**
 * Sales Invoice Partial Payment Client Script
 * Version: 2024-11-29 Final
 * File: hearingclinic/public/js/sales_invoice_partial_payment.js
 */

frappe.ui.form.on('Sales Invoice', {
    refresh: function(frm) {
        // Add "Record Final Payment" button for partly paid POS invoices
        if (frm.doc.docstatus === 1 && 
            frm.doc.outstanding_amount > 0 && 
            frm.doc.is_pos === 1) {
            
            frm.add_custom_button(__('Record Final Payment'), function() {
                record_final_payment(frm);
            }, __('Actions'));
        }
        
        // Display payment history for submitted invoices
        if (frm.doc.docstatus === 1) {
            display_payment_history(frm);
        }
    },
    
    is_pos: function(frm) {
        // Reset partial payment amount when POS checkbox changes
        if (!frm.doc.is_pos) {
            frm.set_value('custom_partial_payment_amount', 0);
        }
    },
    
    custom_partial_payment_amount: function(frm) {
        // Validate partial payment amount
        if (frm.doc.custom_partial_payment_amount) {
            if (frm.doc.custom_partial_payment_amount > frm.doc.grand_total) {
                frappe.msgprint(__('Partial payment amount cannot exceed invoice total'));
                frm.set_value('custom_partial_payment_amount', 0);
                return;
            }
            if (frm.doc.custom_partial_payment_amount < 0) {
                frappe.msgprint(__('Partial payment amount must be positive'));
                frm.set_value('custom_partial_payment_amount', 0);
                return;
            }
        }
    },
    
    before_save: function(frm) {
        // Store the payment amount for this transaction before submission
        if (frm.doc.is_pos && frm.doc.docstatus === 0) {
            if (frm.doc.custom_partial_payment_amount && frm.doc.custom_partial_payment_amount > 0) {
                frm.set_value('custom_amount_paid_this_transaction', frm.doc.custom_partial_payment_amount);
            } else {
                // Full payment - store the grand total
                frm.set_value('custom_amount_paid_this_transaction', frm.doc.grand_total);
            }
        }
    }
});

function record_final_payment(frm) {
    let d = new frappe.ui.Dialog({
        title: __('Record Final Payment'),
        fields: [
            {
                fieldname: 'outstanding_amount',
                label: __('Outstanding Amount'),
                fieldtype: 'Currency',
                default: frm.doc.outstanding_amount,
                read_only: 1,
                options: frm.doc.currency
            },
            {
                fieldname: 'payment_amount',
                label: __('Payment Amount'),
                fieldtype: 'Currency',
                default: frm.doc.outstanding_amount,
                reqd: 1,
                options: frm.doc.currency
            },
            {
                fieldname: 'mode_of_payment',
                label: __('Mode of Payment'),
                fieldtype: 'Link',
                options: 'Mode of Payment',
                reqd: 1,
                get_query: function() {
                    return {
                        filters: {
                            'enabled': 1
                        }
                    };
                }
            },
            {
                fieldname: 'posting_date',
                label: __('Posting Date'),
                fieldtype: 'Date',
                default: frappe.datetime.get_today(),
                reqd: 1
            },
            {
                fieldname: 'reference_no',
                label: __('Reference No'),
                fieldtype: 'Data',
                description: __('Cheque/Reference Number')
            },
            {
                fieldname: 'reference_date',
                label: __('Reference Date'),
                fieldtype: 'Date',
                depends_on: 'eval:doc.reference_no'
            },
            {
                fieldname: 'remarks',
                label: __('Remarks'),
                fieldtype: 'Small Text',
                default: __('Final payment for invoice {0}', [frm.doc.name])
            }
        ],
        primary_action_label: __('Record Payment'),
        primary_action(values) {
            // Validate payment amount
            if (values.payment_amount > frm.doc.outstanding_amount) {
                frappe.msgprint(__('Payment amount cannot exceed outstanding amount'));
                return;
            }
            if (values.payment_amount <= 0) {
                frappe.msgprint(__('Payment amount must be greater than zero'));
                return;
            }
            
            frappe.call({
                method: 'hearingclinic.hearingclinic.doc_events.sales_invoice_partial_payment.record_final_payment',
                args: {
                    invoice_name: frm.doc.name,
                    payment_amount: values.payment_amount,
                    mode_of_payment: values.mode_of_payment,
                    posting_date: values.posting_date,
                    reference_no: values.reference_no,
                    reference_date: values.reference_date,
                    remarks: values.remarks
                },
                freeze: true,
                freeze_message: __('Recording payment...'),
                callback: function(r) {
                    if (r.message) {
                        frappe.msgprint({
                            title: __('Payment Recorded'),
                            message: __('Payment Entry {0} created successfully', 
                                ['<a href="/app/payment-entry/' + r.message + '">' + r.message + '</a>']),
                            indicator: 'green'
                        });
                        frm.reload_doc();
                        d.hide();
                    }
                }
            });
        }
    });
    
    d.show();
}

function display_payment_history(frm) {
    // Remove existing payment history if present
    if (frm.fields_dict.custom_payment_history_html) {
        frm.fields_dict.custom_payment_history_html.$wrapper.empty();
    }
    
    frappe.call({
        method: 'hearingclinic.hearingclinic.doc_events.sales_invoice_partial_payment.get_payment_history',
        args: {
            invoice_name: frm.doc.name
        },
        callback: function(r) {
            if (r.message && r.message.payments !== undefined) {
                render_payment_history_table(frm, r.message);
            }
        }
    });
}

function render_payment_history_table(frm, data) {
    let html = `
        <div class="payment-history-section" style="margin-top: 15px; margin-bottom: 15px;">
            <h4 style="margin-bottom: 10px; color: #36414C;">Complete Payment History</h4>
            <table class="table table-bordered table-hover" style="margin-bottom: 10px;">
                <thead style="background-color: #F7FAFC;">
                    <tr>
                        <th style="width: 15%;">Date</th>
                        <th style="width: 25%;">Reference</th>
                        <th style="width: 20%;">Payment Method</th>
                        <th style="width: 15%; text-align: right;">Amount</th>
                        <th style="width: 25%;">Type</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    if (data.payments.length === 0) {
        html += `
            <tr>
                <td colspan="5" style="text-align: center; color: #8D99A6; padding: 20px;">
                    No payments recorded yet
                </td>
            </tr>
        `;
    } else {
        data.payments.forEach(function(payment) {
            let ref_link = payment.reference;
            if (payment.type === "Payment Entry") {
                ref_link = `<a href="/app/payment-entry/${payment.reference}" target="_blank">${payment.reference}</a>`;
            } else {
                ref_link = `<a href="/app/sales-invoice/${payment.reference}" target="_blank">${payment.reference}</a>`;
            }

            // Determine badge color based on payment type
            let badge_class = 'primary'; // Default for POS Payment
            if (payment.type === 'Payment Entry') {
                badge_class = 'success';
            } else if (payment.type === 'Value Add Card') {
                badge_class = 'warning'; // Yellow/orange badge for VAC
            }

            html += `
                <tr>
                    <td>${payment.date}</td>
                    <td>${ref_link}</td>
                    <td>${payment.mode_of_payment}</td>
                    <td style="text-align: right;">${format_currency(payment.amount, data.currency)}</td>
                    <td><span class="badge badge-${badge_class}">${payment.type}</span></td>
                </tr>
            `;
        });
    }
    
    html += `
                </tbody>
                <tfoot style="background-color: #F7FAFC; font-weight: bold;">
                    <tr>
                        <td colspan="3" style="text-align: right;">Total Paid:</td>
                        <td style="text-align: right;">${format_currency(data.total_paid, data.currency)}</td>
                        <td></td>
                    </tr>
    `;
    
    if (frm.doc.outstanding_amount > 0) {
        html += `
                    <tr>
                        <td colspan="3" style="text-align: right; color: #F56565;">Outstanding Balance:</td>
                        <td style="text-align: right; color: #F56565;">${format_currency(frm.doc.outstanding_amount, data.currency)}</td>
                        <td></td>
                    </tr>
        `;
    } else {
        html += `
                    <tr style="background-color: #C6F6D5;">
                        <td colspan="5" style="text-align: center; color: #22543D; font-weight: bold; padding: 10px;">
                            ✓ FULLY PAID
                        </td>
                    </tr>
        `;
    }
    
    html += `
                </tfoot>
            </table>
        </div>
    `;
    
    // Insert the HTML into the custom field
    if (frm.fields_dict.custom_payment_history_html) {
        frm.fields_dict.custom_payment_history_html.$wrapper.html(html);
    }
}