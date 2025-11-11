// Client Script for Sales Invoice
// Adds a "Create Delivery Note" button that works even for paid (POS) invoices

frappe.ui.form.on('Sales Invoice', {
    refresh: function(frm) {
        // Add button only for submitted invoices
        if (frm.doc.docstatus === 1) {
            frm.add_custom_button(__('Delivery Note'), function() {
                create_delivery_note_from_invoice(frm);
            }, __('Create'));
        }
    }
});

function create_delivery_note_from_invoice(frm) {
    // Confirm with user
    frappe.confirm(
        __('Create a Delivery Note from this Sales Invoice?<br>Relevant Items will be copied automatically.'),
        function() {
            // Yes - create the Delivery Note
            frappe.call({
                method: 'hearingclinic.hearingclinic.api.delivery_note.create_delivery_note_from_invoice',
                args: {
                    sales_invoice_name: frm.doc.name
                },
                freeze: true,
                freeze_message: __('Creating Delivery Note...'),
                callback: function(r) {
                    if (r.message) {
                        // Success - open the new Delivery Note
                        frappe.set_route('Form', 'Delivery Note', r.message);
                    }
                },
                error: function(r) {
                    frappe.msgprint({
                        title: __('Error'),
                        message: __('Failed to create Delivery Note. Please check error log.'),
                        indicator: 'red'
                    });
                }
            });
        },
        function() {
            // No - do nothing
        }
    );
}