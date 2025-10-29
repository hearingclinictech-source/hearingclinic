
frappe.ui.form.on('Customer', {
    refresh(frm) {
        // Run both refresh logics
        format_customer_id(frm);
    },

    onload(frm) {
        format_customer_id(frm);
    },

    custom_customer_id(frm) {
        format_customer_id(frm);
    },

});

function format_customer_id(frm) {
    setTimeout(() => {
        const customer_id = frm.doc.custom_customer_id;
        if (!customer_id) return;

        let color, bg_color;
        if (customer_id.startsWith('F-')) {
            color = '#C2185B';  // Pink for Female
            bg_color = '#FCE4EC';
        } else if (customer_id.startsWith('M-')) {
            color = '#1976D2';  // Blue for Male
            bg_color = '#E3F2FD';
        } else {
            color = '#757575';  // Gray for Unknown
            bg_color = '#F5F5F5';
        }

        const field = frm.fields_dict.custom_customer_id;
        if (!field) return;

        if (field.label_area) {
            field.label_area.style.display = 'none';
        }

        const wrapper = field.$wrapper;

        wrapper.find('.control-value').css({
            'font-size': '14px',
            'font-weight': '600',
            'color': color,
            'background-color': bg_color,
            'padding': '6px 12px',
            'border-radius': '4px',
            'border': '1px solid ' + color,
            'text-align': 'center',
            'letter-spacing': '0.5px',
            'font-family': 'monospace',
            'display': 'inline-block',
            'min-width': '100px'
        });

        wrapper.find('input').css({
            'font-size': '14px',
            'font-weight': '600',
            'color': color,
            'background-color': bg_color,
            'padding': '6px 12px',
            'border-radius': '4px',
            'border': '1px solid ' + color,
            'text-align': 'center',
            'letter-spacing': '0.5px',
            'font-family': 'monospace'
        });
    }, 100);
}