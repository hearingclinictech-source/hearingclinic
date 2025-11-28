// Wait for the ERPNext class to be defined, then extend it
frappe.ui.form.on('Maintenance Visit', {
    refresh: function(frm) {
        // Use setTimeout to run after ERPNext's buttons are added
        setTimeout(() => {
            
            // Remove existing "Get Items From" buttons
            frm.remove_custom_button('Maintenance Schedule', __('Get Items From'));
            frm.remove_custom_button('Warranty Claim', __('Get Items From'));
            frm.remove_custom_button('Sales Order', __('Get Items From'));
            
            // Add only our Delivery Note button
            frm.add_custom_button(__('Delivery Note'), function() {
                show_delivery_note_dialog(frm);
            }, __('Get Items From'));
        }, 100);
    }
});

function show_delivery_note_dialog(frm) {
    let d = new frappe.ui.Dialog({
        title: __('Get Items from Delivery Note'),
        fields: [
            {
                fieldname: 'delivery_note',
                fieldtype: 'Link',
                label: __('Delivery Note'),
                options: 'Delivery Note',
                reqd: 1,
                get_query: function() {
                    let filters = {
                        'docstatus': 1
                    };
                    
                    // Add customer filter if customer is selected
                    if (frm.doc.customer) {
                        filters['customer'] = frm.doc.customer;
                    }
                    
                    return {
                        filters: filters
                    };
                }
            }
        ],
        primary_action_label: __('Get Items'),
        primary_action: function(values) {
            frappe.call({
                method: 'hearingclinic.hearingclinic.api.maintenance_visit.get_items_from_delivery_note',
                args: {
                    delivery_note: values.delivery_note
                },
                callback: function(r) {
                    if (r.message) {
                        frm.clear_table('purposes');
                        
                        r.message.forEach(function(item) {
                            let row = frm.add_child('purposes');
                            row.item_code = item.item_code;
                            row.item_name = item.item_name;
                            row.description = item.description;
                            row.serial_no = item.serial_no;
                        });
                        
                        frm.refresh_field('purposes');
                        
                        frappe.show_alert({
                            message: __('Items added successfully'),
                            indicator: 'green'
                        }, 3);
                        
                        d.hide();
                    }
                }
            });
        }
    });
    
    d.show();
}