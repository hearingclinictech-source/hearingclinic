// Client Script for Maintenance Schedule
// Add this as a Client Script in ERPNext for the "Maintenance Schedule" DocType

frappe.ui.form.on('Maintenance Schedule', {
    refresh: function(frm) {
        // Only show button for submitted schedules with serial numbers
        if (frm.doc.docstatus === 1 && frm.doc.custom_device_serial_number) {
            frm.add_custom_button(__('Create Warranty Extension'), function() {
                show_extension_dialog(frm);
            }, __('Actions'));
        }
    }
});

function show_extension_dialog(frm) {
    // Count remaining and overdue visits
    let total_visits = 0;
    let completed_visits = 0;
    let overdue_visits = 0;
    let future_visits = 0;
    let last_scheduled_date = null;
    
    if (frm.doc.schedules) {
        frm.doc.schedules.forEach(visit => {
            total_visits++;
            if (visit.completion_status === 'Completed') {
                completed_visits++;
            } else {
                let visit_date = frappe.datetime.str_to_obj(visit.scheduled_date);
                let today = frappe.datetime.now_date(true);
                
                if (visit_date < today) {
                    overdue_visits++;
                } else {
                    future_visits++;
                }
            }
            
            // Track last scheduled date
            if (!last_scheduled_date || visit.scheduled_date > last_scheduled_date) {
                last_scheduled_date = visit.scheduled_date;
            }
        });
    }
    
    let remaining_visits = total_visits - completed_visits;
    
    // Create the extension dialog
    let d = new frappe.ui.Dialog({
        title: __('Create Warranty Extension'),
        fields: [
            {
                fieldtype: 'HTML',
                options: `
                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #2490ef; margin-bottom: 15px;">📋 Current Maintenance Schedule</h4>
                        <table class="table table-bordered" style="margin-bottom: 15px;">
                            <tr>
                                <td style="width: 40%;"><b>Schedule:</b></td>
                                <td>${frm.doc.name}</td>
                            </tr>
                            <tr>
                                <td><b>Customer:</b></td>
                                <td>${frm.doc.customer_name || frm.doc.customer || ''}</td>
                            </tr>
                            <tr>
                                <td><b>Serial Number(s):</b></td>
                                <td>${frm.doc.custom_device_serial_number}</td>
                            </tr>
                            <tr>
                                <td><b>Total Visits:</b></td>
                                <td>${total_visits} (${completed_visits} completed, ${remaining_visits} remaining)</td>
                            </tr>
                            <tr>
                                <td><b>Remaining Visits:</b></td>
                                <td>
                                    <span class="indicator ${overdue_visits > 0 ? 'red' : 'green'}">
                                        ${overdue_visits} overdue
                                    </span>
                                    <span class="indicator blue" style="margin-left: 10px;">
                                        ${future_visits} future
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td><b>Last Scheduled Date:</b></td>
                                <td>${frappe.datetime.str_to_user(last_scheduled_date)}</td>
                            </tr>
                        </table>
                        ${remaining_visits > 2 ? 
                            '<div class="alert alert-warning" style="margin-bottom: 15px;"><b>⚠️ Warning:</b> This schedule still has ' + remaining_visits + ' incomplete visits. Consider completing more visits before creating an extension.</div>' 
                            : ''}
                    </div>
                `
            },
            {
                fieldtype: 'Section Break',
                label: __('New Extension Details')
            },
            {
                fieldtype: 'Select',
                fieldname: 'warranty_duration',
                label: __('Warranty Duration'),
                options: [
                    '12',
                    '15',
                    '18',
                    '24',
                    '36',
                    '48'
                ],
                default: '12',
                reqd: 1,
                description: __('Select the warranty period in months')
            },
            {
                fieldtype: 'Column Break'
            },
            {
                fieldtype: 'Check',
                fieldname: 'start_from_today',
                label: __('Start from today'),
                default: 0,
                description: __('If checked, starts immediately. Otherwise starts after the last scheduled visit.')
            },
            {
                fieldtype: 'Section Break'
            },
            {
                fieldtype: 'Check',
                fieldname: 'create_draft',
                label: __('Create Sales Invoice as Draft'),
                default: 1,
                description: __('If checked, Sales Invoice will be created as draft for review before submission')
            },
            {
                fieldtype: 'Section Break'
            },
            {
                fieldtype: 'HTML',
                options: `
                    <div class="alert alert-info" style="margin-top: 10px;">
                        <b>ℹ️ What happens next:</b>
                        <ol style="margin: 10px 0 0 0; padding-left: 20px;">
                            <li>Sales Invoice will be created with the warranty item</li>
                            <li>Review, print, and collect payment from customer</li>
                            <li>Submit the Sales Invoice</li>
                            <li>New Maintenance Schedule will be created automatically with only recurring visits (6, 12, 18... months)</li>
                        </ol>
                        <br>
                        <b>Note:</b> The extension schedule will include <b>only recurring maintenance visits</b> 
                        (every 6 months). The initial 1-month and 4-month checks are not included in extensions.
                    </div>
                `
            }
        ],
        size: 'large',
        primary_action_label: __('Create Sales Invoice'),
        primary_action: function(values) {
            d.hide();
            create_extension_invoice(frm, values, last_scheduled_date);
        },
        secondary_action_label: __('Cancel')
    });
    
    d.show();
}

function create_extension_invoice(frm, values, last_scheduled_date) {
    frappe.show_alert({
        message: __('Creating warranty extension Sales Invoice...'),
        indicator: 'blue'
    });
    
    // Call server-side method to create the Sales Invoice
    frappe.call({
        method: 'hearingclinic.hearingclinic.api.warranty_extension.create_extension_sales_invoice',
        args: {
            maintenance_schedule: frm.doc.name,
            warranty_months: parseInt(values.warranty_duration),
            start_from_today: values.start_from_today,
            create_draft: values.create_draft,
            last_scheduled_date: last_scheduled_date,
            serial_numbers: frm.doc.custom_device_serial_number,
            customer: frm.doc.customer
        },
        freeze: true,
        freeze_message: __('Creating Sales Invoice...'),
        callback: function(r) {
            if (r.message && r.message.success) {
                frappe.show_alert({
                    message: __('Sales Invoice created successfully!'),
                    indicator: 'green'
                }, 5);
                
                // Show success details
                let status_text = r.message.is_draft ? 'Draft' : 'Submitted';
                frappe.msgprint({
                    title: __('Warranty Extension Invoice Created'),
                    indicator: 'green',
                    message: `
                        <b>✓ Sales Invoice (${status_text}):</b> <a href="/app/sales-invoice/${r.message.sales_invoice}">${r.message.sales_invoice}</a><br>
                        <b>Warranty Duration:</b> ${r.message.warranty_months} months<br>
                        <br>
                        <b>Next Steps:</b><br>
                        1. Open the Sales Invoice<br>
                        2. Review and print for customer<br>
                        3. Collect payment<br>
                        4. Submit the invoice<br>
                        5. Maintenance Schedule will be created automatically on submission
                    `
                });
                
                // Open the created Sales Invoice
                frappe.set_route('Form', 'Sales Invoice', r.message.sales_invoice);
            } else {
                frappe.msgprint({
                    title: __('Error'),
                    indicator: 'red',
                    message: r.message && r.message.error ? r.message.error : __('Failed to create Sales Invoice')
                });
            }
        },
        error: function(r) {
            frappe.msgprint({
                title: __('Error'),
                indicator: 'red',
                message: __('An error occurred while creating the Sales Invoice. Please check the error log.')
            });
        }
    });
}