frappe.ui.form.on('Customer', {
    refresh: function(frm) {
        if (frm.doc.name && !frm.is_new()) {
            // UPDATE THIS to match your actual fieldname for maintenance schedules!
            let fieldname = 'custom_maintenance_info'; // CHANGE THIS to your field's name
            
            if (frm.get_field(fieldname)) {
                load_maintenance_schedules(frm, fieldname);
            } else {
                console.error('Field not found: ' + fieldname);
            }
        }
    }
});

function load_maintenance_schedules(frm, fieldname) {
    frm.get_field(fieldname).$wrapper.html('<p class="text-muted">Loading maintenance schedules...</p>');
    
    console.log('Loading maintenance schedules for customer:', frm.doc.name);
    
    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'Maintenance Schedule',
            filters: {
                'customer': frm.doc.name
            },
            fields: ['name', 'transaction_date', 'status'],
            limit_page_length: 500,
            order_by: 'transaction_date desc'
        },
        callback: function(response) {
            console.log('Maintenance Schedules found:', response.message ? response.message.length : 0);
            
            if (!response.message || response.message.length === 0) {
                frm.get_field(fieldname).$wrapper.html(
                    '<div class="alert alert-info">No maintenance schedules found for this customer.</div>'
                );
                return;
            }
            
            // Load maintenance visits for each schedule
            load_maintenance_visits(frm, response.message, fieldname);
        },
        error: function(r) {
            console.error('Error loading maintenance schedules:', r);
            frm.get_field(fieldname).$wrapper.html(
                '<div class="alert alert-danger">Error loading maintenance schedules. Check console for details.</div>'
            );
        }
    });
}

function load_maintenance_visits(frm, schedules, fieldname) {
    let promises = schedules.map(schedule => {
        return new Promise((resolve) => {
            frappe.call({
                method: 'frappe.client.get',
                args: {
                    doctype: 'Maintenance Schedule',
                    name: schedule.name
                },
                callback: function(r) {
                    if (r.message && r.message.schedules) {
                        schedule.schedule_items = r.message.schedules;
                    }
                    resolve();
                }
            });
        });
    });
    
    Promise.all(promises).then(() => {
        display_maintenance_schedules(frm, schedules, fieldname);
    });
}

function display_maintenance_schedules(frm, schedules, fieldname) {
    let html = `
        <div class="maintenance-schedules-container">
            <style>
                .maintenance-schedules-container { font-size: 13px; }
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
                .table-responsive { 
                    max-height: 500px; 
                    overflow-y: auto;
                    border: 1px solid #e9ecef;
                    border-radius: 6px;
                }
                .maintenance-table { 
                    width: 100%; 
                    border-collapse: collapse; 
                }
                .maintenance-table th { 
                    background: #f5f7fa; 
                    padding: 12px; 
                    text-align: left; 
                    font-weight: 600;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                    border-bottom: 2px solid #d1d8dd;
                }
                .maintenance-table td { 
                    padding: 12px; 
                    border-bottom: 1px solid #e9ecef; 
                }
                .maintenance-table tr:hover { 
                    background: #f8f9fa; 
                }
                .badge-success { 
                    background: #28a745; 
                    color: white; 
                    padding: 4px 10px; 
                    border-radius: 4px; 
                    font-size: 11px;
                    font-weight: 600;
                    display: inline-block;
                }
                .badge-warning { 
                    background: #ffc107; 
                    color: #212529; 
                    padding: 4px 10px; 
                    border-radius: 4px; 
                    font-size: 11px;
                    font-weight: 600;
                    display: inline-block;
                }
                .badge-info { 
                    background: #17a2b8; 
                    color: white; 
                    padding: 4px 10px; 
                    border-radius: 4px; 
                    font-size: 11px;
                    font-weight: 600;
                    display: inline-block;
                }
                .badge-secondary { 
                    background: #6c757d; 
                    color: white; 
                    padding: 4px 10px; 
                    border-radius: 4px; 
                    font-size: 11px;
                    font-weight: 600;
                    display: inline-block;
                }
                .badge-danger { 
                    background: #dc3545; 
                    color: white; 
                    padding: 4px 10px; 
                    border-radius: 4px; 
                    font-size: 11px;
                    font-weight: 600;
                    display: inline-block;
                }
                .btn-create-visit {
                    background: #2490ef;
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    cursor: pointer;
                    font-weight: 500;
                }
                .btn-create-visit:hover {
                    background: #1a7bc7;
                }
                .btn-create-visit:disabled {
                    background: #ccc;
                    cursor: not-allowed;
                }
            </style>
            
            <div class="summary-stats">
                <div class="stat-card">
                    <div class="stat-value">${schedules.length}</div>
                    <div class="stat-label">Total Schedules</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${count_by_status(schedules, 'Active')}</div>
                    <div class="stat-label">Active</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${count_by_status(schedules, 'Completed')}</div>
                    <div class="stat-label">Completed</div>
                </div>
            </div>
            
            <div class="table-responsive">
                <table class="maintenance-table">
                    <thead>
                        <tr>
                            <th>Schedule ID</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Last Completed Visit</th>
                            <th>Next Scheduled Visit</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>`;
    
    schedules.forEach(schedule => {
        let lastCompleted = get_last_completed_visit(schedule);
        let nextScheduled = get_next_scheduled_visit(schedule);
        let nextVisitData = get_next_visit_data(schedule);
        
        html += `
            <tr>
                <td>
                    <a href="/app/maintenance-schedule/${encodeURIComponent(schedule.name)}" target="_blank">
                        <strong>${schedule.name}</strong>
                    </a>
                </td>
                <td>${frappe.datetime.str_to_user(schedule.transaction_date)}</td>
                <td>${get_status_badge(schedule.status)}</td>
                <td>${lastCompleted}</td>
                <td>${nextScheduled}</td>
                <td>${get_action_button(schedule, nextVisitData)}</td>
            </tr>`;
    });
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>`;
    
    frm.get_field(fieldname).$wrapper.html(html);
    
    // Attach event listeners to the create visit buttons
    frm.get_field(fieldname).$wrapper.find('.btn-create-visit').on('click', function() {
        let schedule_name = $(this).data('schedule');
        let item_name = $(this).data('item');
        create_maintenance_visit(frm, schedule_name, item_name);
    });
}

function get_status_badge(status) {
    if (!status) return '<span class="badge-secondary">No Status</span>';
    
    let badge_class = 'badge-secondary';
    
    // Customize based on common maintenance schedule statuses
    if (status === 'Active') {
        badge_class = 'badge-success';
    } else if (status === 'Completed') {
        badge_class = 'badge-info';
    } else if (status === 'Pending') {
        badge_class = 'badge-warning';
    } else if (status === 'Cancelled') {
        badge_class = 'badge-danger';
    }
    
    return `<span class="${badge_class}">${status}</span>`;
}

function get_last_completed_visit(schedule) {
    if (!schedule.schedule_items || schedule.schedule_items.length === 0) {
        return '<span class="text-muted">-</span>';
    }
    
    let today = frappe.datetime.get_today();
    let completedVisits = schedule.schedule_items.filter(item => 
        item.completion_status === 'Fully Completed' || 
        (item.scheduled_date && item.scheduled_date < today)
    ).sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date));
    
    if (completedVisits.length > 0) {
        let lastVisit = completedVisits[0];
        return `${frappe.datetime.str_to_user(lastVisit.scheduled_date)}`;
    }
    
    return '<span class="text-muted">None</span>';
}

function get_next_scheduled_visit(schedule) {
    if (!schedule.schedule_items || schedule.schedule_items.length === 0) {
        return '<span class="text-muted">-</span>';
    }
    
    let today = frappe.datetime.get_today();
    let upcomingVisits = schedule.schedule_items.filter(item => 
        item.completion_status !== 'Fully Completed' && 
        item.scheduled_date && 
        item.scheduled_date >= today
    ).sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
    
    if (upcomingVisits.length > 0) {
        let nextVisit = upcomingVisits[0];
        return `<strong>${frappe.datetime.str_to_user(nextVisit.scheduled_date)}</strong>`;
    }
    
    return '<span class="text-muted">None scheduled</span>';
}

function count_by_status(schedules, status) {
    return schedules.filter(s => s.status === status).length;
}

function get_next_visit_data(schedule) {
    if (!schedule.schedule_items || schedule.schedule_items.length === 0) {
        return null;
    }
    
    let today = frappe.datetime.get_today();
    let upcomingVisits = schedule.schedule_items.filter(item => 
        item.completion_status !== 'Fully Completed' && 
        item.scheduled_date && 
        item.scheduled_date >= today
    ).sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
    
    if (upcomingVisits.length > 0) {
        return upcomingVisits[0];
    }
    
    return null;
}

function get_action_button(schedule, nextVisitData) {
    if (!nextVisitData) {
        return '<span class="text-muted">-</span>';
    }
    
    return `<button class="btn-create-visit" 
                    data-schedule="${schedule.name}" 
                    data-item="${nextVisitData.name}">
                Create Visit
            </button>`;
}

function create_maintenance_visit(frm, schedule_name, item_name) {
    frappe.call({
        method: 'frappe.client.get',
        args: {
            doctype: 'Maintenance Schedule',
            name: schedule_name
        },
        callback: function(r) {
            if (r.message) {
                let schedule = r.message;
                let schedule_item = schedule.schedules.find(item => item.name === item_name);
                
                if (!schedule_item) {
                    frappe.msgprint('Schedule item not found');
                    return;
                }
                
                // Prepare purposes data from schedule items
                let purposes = [];
                if (schedule.items && schedule.items.length > 0) {
                    schedule.items.forEach(item => {
                        purposes.push({
                            item_code: item.item_code,
                            item_name: item.item_name,
                            serial_no: item.serial_no,
                            description: item.description
                        });
                    });
                }
                
                // Create new Maintenance Visit with route
                frappe.route_options = {
                    customer: schedule.customer,
                    customer_name: schedule.customer_name,
                    maintenance_schedule: schedule_name,
                    maintenance_type: 'Scheduled',
                    mntc_date: schedule_item.scheduled_date,
                    company: schedule.company
                };
                
                frappe.new_doc('Maintenance Visit');
                
                // Add items after a short delay to ensure form is loaded
                setTimeout(() => {
                    let cur_form = cur_frm;
                    if (cur_form && cur_form.doctype === 'Maintenance Visit') {
                        purposes.forEach(purpose => {
                            let row = cur_form.add_child('purposes');
                            row.item_code = purpose.item_code;
                            row.item_name = purpose.item_name;
                            row.serial_no = purpose.serial_no;
                            row.description = purpose.description;
                        });
                        cur_form.refresh_field('purposes');
                    }
                }, 500);
            }
        }
    });
}