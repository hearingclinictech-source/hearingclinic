// Client Script for Sales Invoice
// This script automatically expands Product Bundles as individual line items
// Configure your packages through Stock > Product Bundle (no hardcoding needed!)

// Helper function to determine if an item should have rate set to 0
function should_set_rate_to_zero(item_code, item_group) {
    // Keep rate for Package items and items ending with -PAIR
    // Set to 0 for everything else (components)
    return item_group !== "Packages" && !item_code.endsWith('-PAIR');
}

// Helper function to set component rates to 0
function set_component_rate_to_zero(frm, child_doctype, child_name, item_code, item_group) {
    if (should_set_rate_to_zero(item_code, item_group)) {
        return frappe.model.set_value(child_doctype, child_name, 'rate', 0);
    }
    return Promise.resolve();
}

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
                                    add_bundle_components(frm, bundle);
                                }
                            }
                        }
                    });
                }
            }
        });
    }
});

// Reusable function to add bundle components
function add_bundle_components(frm, bundle) {
    let item_promises = [];
    
    bundle.items.forEach(component => {
        let child = frm.add_child('items');
        
        // We need to fetch the item details first to get the item_group
        let p = frappe.db.get_value('Item', component.item_code, ['item_group'])
            .then((r) => {
                let item_group = r.message.item_group;
                
                // Now set the item_code
                return frappe.model.set_value(child.doctype, child.name, 'item_code', component.item_code)
                    .then(() => {
                        // Set quantity
                        return frappe.model.set_value(child.doctype, child.name, 'qty', component.qty);
                    })
                    .then(() => {
                        // Wait for ERPNext to set the rate from price list
                        // We'll poll until the rate is no longer undefined/null
                        return new Promise((resolve) => {
                            let checkCount = 0;
                            let checkInterval = setInterval(() => {
                                let updated_child = locals[child.doctype][child.name];
                                checkCount++;
                                
                                // If rate has been set by ERPNext, or we've waited too long (20 checks = ~2 seconds)
                                if (updated_child.rate !== undefined && updated_child.rate !== null || checkCount > 20) {
                                    clearInterval(checkInterval);
                                    resolve();
                                }
                            }, 100);
                        });
                    })
                    .then(() => {
                        // NOW set rate to 0 for components (not Packages, not -PAIR items)
                        // This happens AFTER ERPNext has definitely set the price
                        if (should_set_rate_to_zero(component.item_code, item_group)) {
                            return frappe.model.set_value(child.doctype, child.name, 'rate', 0);
                        }
                    });
            });
        
        item_promises.push(p);
    });
    
    // Refresh after all items are loaded
    Promise.all(item_promises).then(() => {
        frm.refresh_field('items');
        
        // Show success message
        frappe.show_alert({
            message: __('Package components added: {0}. Component rates set to 0.', [bundle.new_item_code]),
            indicator: 'green'
        }, 5);
    });
}

// Add custom buttons
frappe.ui.form.on('Sales Invoice', {
    refresh: function(frm) {
        if (frm.doc.docstatus === 0) {  // Only in draft mode
            // Button to set package component rates to 0
            frm.add_custom_button(__('Set Component Rates to 0'), function() {
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
    // Ask user for confirmation
    let d = new frappe.ui.Dialog({
        title: __('Set Component Rates to Zero'),
        fields: [
            {
                label: __('This will set the rate to 0 for all component items (not Packages, not -PAIR items). Continue?'),
                fieldname: 'info',
                fieldtype: 'HTML',
                options: '<p><strong>Items that will keep their prices:</strong></p><ul><li>Package items (Item Group = "Packages")</li><li>Pair items (item code ending with -PAIR)</li></ul><p><strong>All other items will be set to rate 0.</strong></p>'
            }
        ],
        primary_action_label: __('Set to Zero'),
        primary_action(values) {
            let updated = 0;
            
            frm.doc.items.forEach((item) => {
                // Skip if no item_code
                if (!item.item_code) {
                    return;
                }
                
                // Only set to 0 if it's a component (not Package, not -PAIR)
                if (should_set_rate_to_zero(item.item_code, item.item_group)) {
                    frappe.model.set_value(item.doctype, item.name, 'rate', 0);
                    updated++;
                }
            });
            
            if (updated > 0) {
                frm.refresh_field('items');
                frappe.show_alert({
                    message: __('Set {0} component item(s) to rate 0', [updated]),
                    indicator: 'green'
                }, 5);
            } else {
                frappe.show_alert({
                    message: __('No component items found to update'),
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
    let bundles_to_expand = [];
    
    // First, identify all bundles
    let check_promises = [];
    
    frm.doc.items.forEach((item, idx) => {
        if (!item.item_code) return;
        
        let check_promise = frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Product Bundle',
                filters: {
                    'new_item_code': item.item_code,
                    'disabled': 0
                },
                fields: ['name'],
                limit: 1
            }
        }).then((r) => {
            if (r.message && r.message.length > 0) {
                let next_item = frm.doc.items[idx + 1];
                bundles_to_expand.push({
                    name: r.message[0].name,
                    already_expanded: next_item ? true : false,
                    idx: idx
                });
            }
        });
        
        check_promises.push(check_promise);
    });
    
    // After checking all items, expand the bundles
    Promise.all(check_promises).then(() => {
        if (bundles_to_expand.length === 0) {
            frappe.show_alert({
                message: __('No bundles found to expand'),
                indicator: 'blue'
            }, 3);
            return;
        }
        
        let expand_promises = [];
        
        bundles_to_expand.forEach((bundle_info) => {
            let expand_promise = frappe.call({
                method: 'frappe.client.get',
                args: {
                    doctype: 'Product Bundle',
                    name: bundle_info.name
                }
            }).then((bundle_response) => {
                if (bundle_response.message) {
                    let bundle = bundle_response.message;
                    
                    // Check if not already expanded by looking at the next item
                    let next_item = frm.doc.items[bundle_info.idx + 1];
                    let is_expanded = next_item && bundle.items.some(comp => 
                        comp.item_code === next_item.item_code
                    );
                    
                    if (!is_expanded) {
                        add_bundle_components(frm, bundle);
                        bundle_count++;
                    }
                }
            });
            
            expand_promises.push(expand_promise);
        });
        
        Promise.all(expand_promises).then(() => {
            if (bundle_count > 0) {
                frappe.show_alert({
                    message: __('Expanded {0} bundle(s)', [bundle_count]),
                    indicator: 'green'
                }, 5);
            } else {
                frappe.show_alert({
                    message: __('All bundles already expanded'),
                    indicator: 'blue'
                }, 3);
            }
        });
    });
}