frappe.ui.form.on('Customer', {
    refresh: function(frm) {
        if (frm.doc.name && !frm.is_new()) {
            // UPDATE THIS to match your actual fieldname!
            let fieldname = 'custom_items_purchased'; // CHANGE THIS to your field's name
            
            if (frm.get_field(fieldname)) {
                load_purchased_items(frm, fieldname);
            } else {
                console.error('Field not found: ' + fieldname);
            }
        }
    }
});

function load_purchased_items(frm, fieldname) {
    frm.get_field(fieldname).$wrapper.html('<p class="text-muted">Loading purchase history...</p>');
    
    // console.log('Loading purchase history for customer:', frm.doc.name);
    
    // Query Sales Invoice with items
    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'Sales Invoice',
            filters: {
                'customer': frm.doc.name,
                'docstatus': 1
            },
            fields: ['name', 'posting_date', 'grand_total', 'status'],
            limit_page_length: 500
        },
        callback: function(inv_response) {
            // console.log('Sales Invoices found:', inv_response.message ? inv_response.message.length : 0);
            
            if (!inv_response.message || inv_response.message.length === 0) {
                frm.get_field(fieldname).$wrapper.html(
                    '<div class="alert alert-info">No purchase history found for this customer.</div>'
                );
                return;
            }
            
            let invoice_names = inv_response.message.map(inv => inv.name);
            
            // Check if we can access invoice details
            frappe.call({
                method: 'frappe.client.get',
                args: {
                    doctype: 'Sales Invoice',
                    name: invoice_names[0]
                },
                callback: function(r) {
                    if (r.message) {
                        load_all_invoice_items(frm, invoice_names, inv_response.message, fieldname);
                    } else {
                        display_invoice_summary_only(frm, inv_response.message, fieldname);
                    }
                }
            });
        },
        error: function(r) {
            console.error('Error loading invoices:', r);
            frm.get_field(fieldname).$wrapper.html(
                '<div class="alert alert-danger">Error loading purchase history. Check console for details.</div>'
            );
        }
    });
}

function load_all_invoice_items(frm, invoice_names, invoices, fieldname) {
    let all_items = [];
    let completed = 0;
    
    // First, get all delivery notes for this customer
    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'Delivery Note',
            filters: {
                'customer': frm.doc.name,
                'docstatus': 1
            },
            fields: ['name', 'posting_date'],
            limit_page_length: 500
        },
        callback: function(dn_response) {
            // console.log('Delivery Notes found:', dn_response.message ? dn_response.message.length : 0);
            
            let delivery_note_map = {};
            
            // Create map of delivery notes by invoice reference
            if (dn_response.message && dn_response.message.length > 0) {
                let dn_completed = 0;
                let total_dns = dn_response.message.length;
                
                dn_response.message.forEach(function(dn) {
                    let dn_name = dn.name;
                    // console.log('Loading Delivery Note:', dn_name);
                    
                    frappe.call({
                        method: 'frappe.client.get',
                        args: {
                            doctype: 'Delivery Note',
                            name: dn_name,
                            fields: ['name', 'items']
                        },
                        callback: function(dn_detail) {
                            if (dn_detail.message && dn_detail.message.items) {
                                dn_detail.message.items.forEach(function(dn_item) {
                                    // Map by si_detail (the link to the specific Sales Invoice Item)
                                    if (dn_item.si_detail) {
                                        let key = dn_item.si_detail;
                                        delivery_note_map[key] = {
                                            device_serial: dn_item.serial_no || dn_item.custom_device_serial_number || '',
                                            for_ear: dn_item.custom_for_ear || '',
                                            delivery_note: dn_name,
                                            item_code: dn_item.item_code
                                        };
                                    }
                                });
                            }
                            
                            dn_completed++;
                            
                            // When all delivery notes are loaded, load invoice items
                            if (dn_completed === total_dns) {
                                // console.log('All DNs loaded. Final DN Map:', delivery_note_map);
                                load_invoice_items_with_dn_data(frm, invoice_names, invoices, delivery_note_map, fieldname);
                            }
                        },
                        error: function(r) {
                            console.error('Error loading DN details for', dn_name, ':', r);
                            dn_completed++;
                            if (dn_completed === total_dns) {
                                load_invoice_items_with_dn_data(frm, invoice_names, invoices, delivery_note_map, fieldname);
                            }
                        }
                    });
                });
            } else {
                // No delivery notes found, load items without serial numbers
                // console.log('No delivery notes found, loading items without serial data');
                load_invoice_items_with_dn_data(frm, invoice_names, invoices, {}, fieldname);
            }
        },
        error: function(r) {
            console.error('Error loading delivery notes:', r);
            load_invoice_items_with_dn_data(frm, invoice_names, invoices, {}, fieldname);
        }
    });
}

function load_invoice_items_with_dn_data(frm, invoice_names, invoices, delivery_note_map, fieldname) {
    // console.log('Loading invoice items with DN data');
    
    let all_items = [];
    let items_to_check = new Set();
    let completed = 0;
    
    // Load each invoice's items
    invoice_names.forEach(invoice_name => {
        frappe.call({
            method: 'frappe.client.get',
            args: {
                doctype: 'Sales Invoice',
                name: invoice_name,
                fields: ['name', 'posting_date', 'items']
            },
            callback: function(r) {
                // console.log('Invoice loaded:', invoice_name);
                
                if (r.message && r.message.items) {
                    r.message.items.forEach(item => {
                        // Look up delivery note data using the Sales Invoice Item's unique name
                        let dn_key = item.name;
                        let dn_data = delivery_note_map[dn_key] || {};
                        
                        all_items.push({
                            item_code: item.item_code,
                            item_name: item.item_name,
                            qty: item.qty,
                            rate: item.rate,
                            amount: item.amount,
                            parent: r.message.name,
                            posting_date: r.message.posting_date,
                            device_serial: dn_data.device_serial || '',
                            for_ear: dn_data.for_ear || '',
                            delivery_note: dn_data.delivery_note || ''
                        });
                        
                        // Track unique items to check their groups
                        items_to_check.add(item.item_code);
                    });
                }
                
                completed++;
                // console.log('Invoice items completed:', completed, 'of', invoice_names.length);
                
                // When all invoices are loaded, check item groups
                if (completed === invoice_names.length) {
                    // console.log('All items loaded. Total items:', all_items.length);
                    // console.log('Unique items to check:', items_to_check.size);
                    
                    if (all_items.length > 0 && items_to_check.size > 0) {
                        // Load item groups for filtering
                        check_item_groups(frm, all_items, Array.from(items_to_check), invoices, fieldname);
                    } else {
                        display_invoice_summary_only(frm, invoices, fieldname);
                    }
                }
            },
            error: function(r) {
                console.error('Error loading invoice items for', invoice_name, ':', r);
                completed++;
                if (completed === invoice_names.length) {
                    if (all_items.length > 0) {
                        check_item_groups(frm, all_items, Array.from(items_to_check), invoices, fieldname);
                    } else {
                        display_invoice_summary_only(frm, invoices, fieldname);
                    }
                }
            }
        });
    });
}

function check_item_groups(frm, all_items, item_codes, invoices, fieldname) {
    // console.log('Checking item groups for', item_codes.length, 'unique items');
    
    let item_group_map = {};
    let items_checked = 0;
    
    // Load item group for each unique item
    item_codes.forEach(item_code => {
        frappe.call({
            method: 'frappe.client.get_value',
            args: {
                doctype: 'Item',
                filters: { name: item_code },
                fieldname: 'item_group'
            },
            callback: function(r) {
                if (r.message) {
                    item_group_map[item_code] = r.message.item_group;
                    // console.log('Item:', item_code, 'Group:', r.message.item_group);
                }
                
                items_checked++;
                
                // When all items are checked, filter and display
                if (items_checked === item_codes.length) {
                    // console.log('All item groups loaded:', item_group_map);
                    
                    // Filter items to only include "Hearing Aids" group for display
                    let filtered_items = all_items.filter(item => {
                        return item_group_map[item.item_code] === 'Hearing Aids';
                    });
                    
                    // console.log('Filtered items (Hearing Aids only):', filtered_items.length);
                    // console.log('All items (for revenue calc):', all_items.length);
                    
                    if (filtered_items.length > 0) {
                        // Pass both filtered items (for display) and all items (for total revenue)
                        process_and_display_items(frm, filtered_items, all_items, invoices, fieldname);
                    } else {
                        // No hearing aids found, but still show total revenue
                        display_invoice_summary_only(frm, invoices, fieldname);
                    }
                }
            },
            error: function(r) {
                console.error('Error loading item group for', item_code, ':', r);
                items_checked++;
                
                if (items_checked === item_codes.length) {
                    // Still process with what we have
                    let filtered_items = all_items.filter(item => {
                        return item_group_map[item.item_code] === 'Hearing Aids';
                    });
                    
                    if (filtered_items.length > 0) {
                        process_and_display_items(frm, filtered_items, all_items, invoices, fieldname);
                    } else {
                        display_invoice_summary_only(frm, invoices, fieldname);
                    }
                }
            }
        });
    });
}

function process_and_display_items(frm, filtered_items, all_items, invoices, fieldname) {
    // Group filtered items (Hearing Aids only) by item_code for display
    let item_summary = {};
    
    filtered_items.forEach(item => {
        if (!item_summary[item.item_code]) {
            item_summary[item.item_code] = {
                item_code: item.item_code,
                item_name: item.item_name,
                total_qty: 0,
                total_amount: 0,
                last_purchased: item.posting_date,
                purchase_count: 0,
                avg_rate: 0
            };
        }
        item_summary[item.item_code].total_qty += item.qty;
        item_summary[item.item_code].total_amount += item.amount;
        item_summary[item.item_code].purchase_count += 1;
        
        if (item.posting_date > item_summary[item.item_code].last_purchased) {
            item_summary[item.item_code].last_purchased = item.posting_date;
        }
    });
    
    // Calculate average rate
    Object.keys(item_summary).forEach(key => {
        let item = item_summary[key];
        item.avg_rate = item.total_amount / item.total_qty;
    });
    
    // Convert to array and sort by total amount
    let items_array = Object.values(item_summary);
    items_array.sort((a, b) => b.total_amount - a.total_amount);
    
    // Calculate total revenue from ALL items (not just hearing aids)
    let total_revenue = all_items.reduce((sum, item) => sum + item.amount, 0);
    
    display_items_table(frm, items_array, filtered_items, total_revenue, invoices, fieldname);
}

function display_items_table(frm, summary_items, detail_items, total_revenue, invoices, fieldname) {
    let hearing_aids_value = summary_items.reduce((sum, item) => sum + item.total_amount, 0);
    
    // Format revenue with thousands separator, no decimals
    let formatted_revenue = Math.round(total_revenue).toLocaleString('en-US');
    
    let html = `
        <div class="purchase-history-container">
            <style>
                .purchase-history-container { font-size: 13px; }
                .nav-tabs { border-bottom: 2px solid #d1d8dd; margin-bottom: 15px; }
                .nav-tabs .nav-link { 
                    color: #6c757d; 
                    padding: 8px 16px; 
                    cursor: pointer;
                    border: none;
                    background: none;
                }
                .nav-tabs .nav-link.active { 
                    color: #2490ef; 
                    border-bottom: 2px solid #2490ef; 
                }
                .tab-content > div { display: none; }
                .tab-content > div.active { display: block; }
                .table-responsive { max-height: 500px; overflow-y: auto; }
                .purchase-table { width: 100%; border-collapse: collapse; }
                .purchase-table th { 
                    background: #f5f7fa; 
                    padding: 10px; 
                    text-align: left; 
                    font-weight: 600;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }
                .purchase-table td { 
                    padding: 10px; 
                    border-bottom: 1px solid #e9ecef; 
                }
                .purchase-table tr:hover { background: #f8f9fa; }
                .badge-primary { 
                    background: #2490ef; 
                    color: white; 
                    padding: 3px 8px; 
                    border-radius: 3px; 
                    font-size: 11px;
                }
                .text-right { text-align: right; }
                .summary-stats {
                    display: flex;
                    gap: 20px;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                }
                .stat-card {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 6px;
                    flex: 1;
                    min-width: 150px;
                }
                .stat-card.highlight {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                .stat-card.highlight .stat-value {
                    color: white;
                }
                .stat-card.highlight .stat-label {
                    color: rgba(255, 255, 255, 0.9);
                }
                .stat-value {
                    font-size: 24px;
                    font-weight: 600;
                    color: #2490ef;
                }
                .stat-label {
                    font-size: 12px;
                    color: #6c757d;
                    text-transform: uppercase;
                }
                .filter-badge {
                    background: #28a745;
                    color: white;
                    padding: 4px 10px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 600;
                    margin-left: 10px;
                }
            </style>
            
            <div class="summary-stats">
                <div class="stat-card highlight">
                    <div class="stat-value">RM ${formatted_revenue}</div>
                    <div class="stat-label">Total Value</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${invoices.length}</div>
                    <div class="stat-label">Total Invoices</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${summary_items.length}</div>
                    <div class="stat-label">Hearing Aid Types</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${detail_items.length}</div>
                    <div class="stat-label">Total Devices</div>
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <span style="font-weight: 600;">Showing:</span>
                <span class="filter-badge">Hearing Aids Items Only</span>
            </div>
            
            <ul class="nav nav-tabs" role="tablist">
                <li class="nav-item">
                    <a class="nav-link active" data-tab="summary">Summary by Item</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" data-tab="details">All Devices</a>
                </li>
            </ul>
            
            <div class="tab-content">
                <div id="summary" class="active">
                    <div class="table-responsive">
                        <table class="purchase-table">
                            <thead>
                                <tr>
                                    <th>Item Code</th>
                                    <th>Item Name</th>
                                    <th class="text-right">Total Qty</th>
                                    <th class="text-right">Avg Rate</th>
                                    <th class="text-right">Total Amount</th>
                                    <th class="text-right">Times Purchased</th>
                                    <th>Last Purchase</th>
                                </tr>
                            </thead>
                            <tbody>`;
    
    summary_items.forEach(item => {
        html += `
            <tr>
                <td><strong><a href="/app/item/${encodeURIComponent(item.item_code)}" >${item.item_code}</a></strong></td>
                <td>${item.item_name || '-'}</td>
                <td class="text-right">${format_number(item.total_qty)}</td>
                <td class="text-right">${format_currency(item.avg_rate)}</td>
                <td class="text-right"><strong>${format_currency(item.total_amount)}</strong></td>
                <td class="text-right"><span class="badge-primary">${item.purchase_count}</span></td>
                <td>${frappe.datetime.str_to_user(item.last_purchased)}</td>
            </tr>`;
    });
    
    html += `
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div id="details">
                    <div class="table-responsive">
                        <table class="purchase-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Invoice</th>
                                    <th>Item Code</th>
                                    <th>Item Name</th>
                                    <th>Device Serial</th>
                                    <th>Ear</th>
                                    <th>Delivery Note</th>
                                    <th class="text-right">Qty</th>
                                    <th class="text-right">Rate</th>
                                    <th class="text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>`;
    
    detail_items.sort((a, b) => new Date(b.posting_date) - new Date(a.posting_date));
    
    detail_items.forEach(item => {
        let device_serial = item.device_serial || '-';
        
        let ear_display = '-';
        if (item.for_ear) {
            let ear_color = item.for_ear === 'R' ? '#dc3545' : '#007bff';
            ear_display = `<span style="background: ${ear_color}; color: white; padding: 2px 8px; border-radius: 3px; font-weight: 600;">${item.for_ear}</span>`;
        }
        
        let dn_link = item.delivery_note ? 
            `<a href="/app/delivery-note/${item.delivery_note}" >${item.delivery_note}</a>` : '-';
        
        html += `
            <tr>
                <td>${frappe.datetime.str_to_user(item.posting_date)}</td>
                <td><a href="/app/sales-invoice/${item.parent}" >${item.parent}</a></td>
                <td><a href="/app/item/${encodeURIComponent(item.item_code)}" >${item.item_code}</a></td>
                <td>${item.item_name || '-'}</td>
                <td style="font-family: monospace; font-size: 12px;">${device_serial}</td>
                <td style="text-align: center;">${ear_display}</td>
                <td>${dn_link}</td>
                <td class="text-right">${format_number(item.qty)}</td>
                <td class="text-right">${format_currency(item.rate)}</td>
                <td class="text-right">${format_currency(item.amount)}</td>
            </tr>`;
    });
    
    html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>`;
    
    frm.get_field(fieldname).$wrapper.html(html);
    
    // Add tab switching functionality
    frm.get_field(fieldname).$wrapper.find('.nav-link').on('click', function() {
        let tab = $(this).data('tab');
        $(this).closest('.nav-tabs').find('.nav-link').removeClass('active');
        $(this).addClass('active');
        $(this).closest('.purchase-history-container').find('.tab-content > div').removeClass('active');
        $(this).closest('.purchase-history-container').find('#' + tab).addClass('active');
    });
}

function display_invoice_summary_only(frm, invoices, fieldname) {
    let total_value = invoices.reduce((sum, inv) => sum + inv.grand_total, 0);
    
    let html = `
        <div class="purchase-history-container">
            <style>
                .purchase-history-container { font-size: 13px; }
                .summary-stats {
                    display: flex;
                    gap: 20px;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                }
                .stat-card {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 6px;
                    flex: 1;
                    min-width: 150px;
                }
                .stat-card.highlight {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                .stat-card.highlight .stat-value {
                    color: white;
                }
                .stat-card.highlight .stat-label {
                    color: rgba(255, 255, 255, 0.9);
                }
                .stat-value {
                    font-size: 24px;
                    font-weight: 600;
                    color: #2490ef;
                }
                .stat-label {
                    font-size: 12px;
                    color: #6c757d;
                    text-transform: uppercase;
                }
                .purchase-table { width: 100%; border-collapse: collapse; }
                .purchase-table th { 
                    background: #f5f7fa; 
                    padding: 10px; 
                    text-align: left; 
                    font-weight: 600;
                }
                .purchase-table td { 
                    padding: 10px; 
                    border-bottom: 1px solid #e9ecef; 
                }
                .purchase-table tr:hover { background: #f8f9fa; }
                .text-right { text-align: right; }
            </style>
            
            <div class="summary-stats">
                <div class="stat-card highlight">
                    <div class="stat-value">${format_currency(total_value)}</div>
                    <div class="stat-label">Total Value</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${invoices.length}</div>
                    <div class="stat-label">Total Invoices</div>
                </div>
            </div>
            
            <h4>Invoices</h4>
            <table class="purchase-table">
                <thead>
                    <tr>
                        <th>Invoice</th>
                        <th>Date</th>
                        <th class="text-right">Amount</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>`;
    
    invoices.sort((a, b) => new Date(b.posting_date) - new Date(a.posting_date));
    
    invoices.forEach(inv => {
        html += `
            <tr>
                <td><a href="/app/sales-invoice/${inv.name}" >${inv.name}</a></td>
                <td>${frappe.datetime.str_to_user(inv.posting_date)}</td>
                <td class="text-right"><strong>${format_currency(inv.grand_total)}</strong></td>
                <td>${inv.status}</td>
            </tr>`;
    });
    
    html += `
                </tbody>
            </table>
        </div>`;
    
    frm.get_field(fieldname).$wrapper.html(html);
}

function format_currency(value) {
    return frappe.format(value, {fieldtype: 'Currency'});
}

function format_number(value) {
    return frappe.format(value, {fieldtype: 'Float', precision: 2});
}