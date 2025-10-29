// Client Script for Sales Invoice
// This script automatically expands Product Bundles as individual line items
// Configure your packages through Stock > Product Bundle (no hardcoding needed!)

frappe.ui.form.on('Sales Invoice Item', {
    item_code: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        
        if (!row.item_code) return;
        
        // Check if this item has a Product Bundle
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Product Bundle',
                filters: {
                    'new_item_code': row.item_code,
                    'disabled': 0
                },
                fields: ['name', 'new_item_code'],
                limit: 1
            },
            callback: function(r) {
                if (r.message && r.message.length > 0) {
                    let bundle_name = r.message[0].name;
                    
                    // Fetch the full Product Bundle with items
                    frappe.call({
                        method: 'frappe.client.get',
                        args: {
                            doctype: 'Product Bundle',
                            name: bundle_name
                        },
                        callback: function(bundle_response) {
                            if (bundle_response.message) {
                                let bundle = bundle_response.message;
                                
                                // Check if components already added (prevent duplicates)
                                let existing_items = frm.doc.items.map(item => item.item_code);
                                let components_exist = bundle.items.some(comp => 
                                    existing_items.includes(comp.item_code)
                                );
                                
                                if (!components_exist && bundle.items && bundle.items.length > 0) {
                                    // Add all components from the bundle
                                    let item_promises = [];
                                    bundle.items.forEach(component => {
                                        let child = frm.add_child('items');
                                        // Trigger item fetch by using set_value
                                        let p = frappe.model.set_value(child.doctype, child.name, 'item_code', component.item_code)
                                            .then(() => {
                                                // Set quantity after item is loaded
                                                return frappe.model.set_value(child.doctype, child.name, 'qty', component.qty);
                                            })
                                            .then(() => {
                                                // Set rate to 0 for package components (ACC- and SER- items)
                                                if (component.item_code.startsWith('ACC-') || component.item_code.startsWith('SER-')) {
                                                    return frappe.model.set_value(child.doctype, child.name, 'rate', 0);
                                                }
                                            });
                                        item_promises.push(p);
                                    });
                                    
                                    // Refresh after all items are loaded
                                    Promise.all(item_promises).then(() => {
                                        frm.refresh_field('items');
                                    });
                                    
                                    // Show success message
                                    frappe.show_alert({
                                        message: __('Package components added: {0}. Accessory and service rates set to 0.', [bundle.new_item_code]),
                                        indicator: 'green'
                                    }, 5);
                                }
                            }
                        }
                    });
                }
            }
        });
    }
});

// Add a button to set all component rates to 0
frappe.ui.form.on('Sales Invoice', {
    refresh: function(frm) {
        if (frm.doc.docstatus === 0) {  // Only in draft mode
            // Button to set package component rates to 0
            frm.add_custom_button(__('Set Package Items to 0'), function() {
                set_package_items_to_zero(frm);
            }, __('Actions'));
            
            // Button to expand all bundles
            frm.add_custom_button(__('Expand All Bundles'), function() {
                expand_all_bundles(frm);
            }, __('Actions'));
        }
    }
});

function set_package_items_to_zero(frm) {
    // Ask user which items should be set to 0
    let d = new frappe.ui.Dialog({
        title: __('Set Package Component Rates to Zero'),
        fields: [
            {
                label: __('This will set the rate to 0 for all items except the package parent items. Continue?'),
                fieldname: 'info',
                fieldtype: 'HTML',
                options: '<p>Package parent items (starting with PACK-) or pairs (ending with -PAIR) will keep their prices.</p>'
            }
        ],
        primary_action_label: __('Set to Zero'),
        primary_action(values) {
            let updated = 0;
            
            frm.doc.items.forEach((item, idx) => {
                // Skip if it's a package parent (starts with PB-) or if no item_code
                if (!item.item_code || item.item_code.startsWith('PACK-') || item.item_code.endsWith('PAIR')) {
                    return;
                }
                
                // Skip hearing aid models (you can customize this condition)
                // For now, we'll set accessories and services to 0
                if (item.item_code.startsWith('ACC-') || item.item_code.startsWith('SERV-') || item.item_code.startsWith('HA-'))  {
                    frappe.model.set_value(item.doctype, item.name, 'rate', 0);
                    updated++;
                }
            });
            
            if (updated > 0) {
                frm.refresh_field('items');
                frappe.show_alert({
                    message: __('Set {0} item(s) to rate 0', [updated]),
                    indicator: 'green'
                }, 5);
            } else {
                frappe.show_alert({
                    message: __('No package components found to update'),
                    indicator: 'orange'
                }, 3);
            }
            
            d.hide();
        }
    });
    
    d.show();
}

function expand_all_bundles(frm) {
    if (!frm.doc.items || frm.doc.items.length === 0) {
        frappe.show_alert({
            message: __('No items in the invoice'),
            indicator: 'orange'
        }, 3);
        return;
    }
    
    let bundle_count = 0;
    let processed = 0;
    
    frm.doc.items.forEach((item, idx) => {
        if (!item.item_code) return;
        
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Product Bundle',
                filters: {
                    'new_item_code': item.item_code,
                    'disabled': 0
                },
                fields: ['name'],
                limit: 1
            },
            callback: function(r) {
                if (r.message && r.message.length > 0) {
                    bundle_count++;
                    
                    // Check if already expanded
                    let next_item = frm.doc.items[idx + 1];
                    let bundle_name = r.message[0].name;
                    
                    // Fetch and expand the bundle
                    frappe.call({
                        method: 'frappe.client.get',
                        args: {
                            doctype: 'Product Bundle',
                            name: bundle_name
                        },
                        callback: function(bundle_response) {
                            if (bundle_response.message) {
                                let bundle = bundle_response.message;
                                
                                // Check if not already expanded
                                if (!next_item || !bundle.items.some(comp => comp.item_code === next_item.item_code)) {
                                    let item_promises = [];
                                    bundle.items.forEach(component => {
                                        let child = frm.add_child('items');
                                        // Trigger item fetch by using set_value
                                        let p = frappe.model.set_value(child.doctype, child.name, 'item_code', component.item_code)
                                            .then(() => {
                                                // Set quantity after item is loaded
                                                return frappe.model.set_value(child.doctype, child.name, 'qty', component.qty);
                                            })
                                            .then(() => {
                                                // Set rate to 0 for package components (ACC- and SER- items)
                                                if (component.item_code.startsWith('ACC-') || component.item_code.startsWith('SER-')) {
                                                    return frappe.model.set_value(child.doctype, child.name, 'rate', 0);
                                                }
                                            });
                                        item_promises.push(p);
                                    });
                                    
                                    // Wait for all items to be processed
                                    Promise.all(item_promises).then(() => {
                                        processed++;
                                        // If all bundles processed, refresh
                                        if (processed === bundle_count) {
                                            frm.refresh_field('items');
                                            frappe.show_alert({
                                                message: __('Expanded {0} bundle(s)', [bundle_count]),
                                                indicator: 'green'
                                            }, 5);
                                        }
                                    });
                                } else {
                                    processed++;
                                }
                            }
                        }
                    });
                }
            }
        });
    });
    
    setTimeout(() => {
        if (bundle_count === 0) {
            frappe.show_alert({
                message: __('No bundles found to expand'),
                indicator: 'blue'
            }, 3);
        }
    }, 500);
}