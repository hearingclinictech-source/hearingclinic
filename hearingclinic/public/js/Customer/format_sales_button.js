frappe.ui.form.on('Customer', {
    refresh(frm) {
        // Run both refresh logics
        customize_sales_invoice_button(frm);
    },

    custom_new_sales_invoice(frm) {
        frappe.new_doc('Sales Invoice', {
            customer: frm.doc.name,
            customer_name: frm.doc.customer_name
        });
    }
});

function customize_sales_invoice_button(frm) {
    if (!frm.is_new()) {
        setTimeout(() => {
            const control = frm.$wrapper.find('.frappe-control[data-fieldname="custom_new_sales_invoice"]');
            const btn = control.find('button');

            if (btn.length) {
                btn.removeClass('btn-default btn-xs').addClass('btn-success');
                btn.html('<i class="fa fa-plus"></i> Create Sales');
                btn.css({
                    'font-weight': '600',
                    'padding': '8px 16px',
                    'font-size': '12px',
                    'margin': '10px 0'
                });
            }
        }, 100);
    }
}
