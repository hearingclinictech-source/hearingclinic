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
                        schedule.items = r.message.items;
                        schedule.customer_name = r.message.customer_name;
                        schedule.company = r.message.company;
                    }
                    resolve();
                }
            });
        });
    });
    
    Promise.all(promises).then(() => {
        // Now load actual maintenance visits
        load_actual_maintenance_visits(frm, schedules, fieldname);
    });
}

function load_actual_maintenance_visits(frm, schedules, fieldname) {
    // Get all maintenance visits for this customer
    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'Maintenance Visit',
            filters: {
                'customer': frm.doc.name
            },
            fields: ['name', 'maintenance_schedule', 'completion_status', 'mntc_date'],
            limit_page_length: 0
        },
        callback: function(response) {
            // Map visits to schedules
            if (response.message) {
                schedules.forEach(schedule => {
                    schedule.actual_visits = response.message.filter(
                        visit => visit.maintenance_schedule === schedule.name
                    );
                });
            }
            display_maintenance_schedules(frm, schedules, fieldname);
        },
        error: function(r) {
            console.error('Error loading maintenance visits:', r);
            // Still display schedules even if visits fail to load
            display_maintenance_schedules(frm, schedules, fieldname);
        }
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
                    <div class="stat-value">${count_active_schedules(schedules)}</div>
                    <div class="stat-label">Active</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${count_expired_schedules(schedules)}</div>
                    <div class="stat-label">Expired</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${count_by_status(schedules, 'Cancelled')}</div>
                    <div class="stat-label">Cancelled</div>
                </div>
            </div>
            
            <div class="table-responsive">
                <table class="maintenance-table">
                    <thead>
                        <tr>
                            <th>Maintenance Schedule ID</th>
                            <th>Date Created</th>
                            <th>Status</th>
                            <th>Remaining Visits</th>
                            <th>Last Completed</th>
                            <th>Next Scheduled</th>
                        </tr>
                    </thead>
                    <tbody>`;
    
    schedules.forEach(schedule => {
        let remainingVisits = get_remaining_visits_info(schedule);
        let lastCompleted = get_last_completed_visit(schedule);
        let nextScheduled = get_next_scheduled_visit(schedule);
        
        html += `
            <tr>
                <td>
                    <a href="/app/maintenance-schedule/${encodeURIComponent(schedule.name)}" target="_blank">
                        <strong>${schedule.name}</strong>
                    </a>
                </td>
                <td>${frappe.datetime.str_to_user(schedule.transaction_date)}</td>
                <td>${get_status_badge(schedule.status, remainingVisits.count)}</td>
                <td>${remainingVisits.display}</td>
                <td>${lastCompleted}</td>
                <td>${nextScheduled}</td>
            </tr>`;
    });
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>`;
    
    frm.get_field(fieldname).$wrapper.html(html);
}

function get_status_badge(status, remainingVisits) {
    if (!status) return '<span class="badge-secondary">No Status</span>';
    
    // If no remaining visits and status is Submitted, show as Expired
    if (remainingVisits === 0 && status === 'Submitted') {
        return '<span class="badge-info">Expired</span>';
    }
    
    let badge_class = 'badge-secondary';
    
    // Handle standard ERPNext document statuses
    if (status === 'Submitted') {
        badge_class = 'badge-success';
    } else if (status === 'Draft') {
        badge_class = 'badge-warning';
    } else if (status === 'Cancelled') {
        badge_class = 'badge-danger';
    }
    
    return `<span class="${badge_class}">${status}</span>`;
}

function get_last_completed_visit(schedule) {
    // Check if we have actual maintenance visits
    if (!schedule.actual_visits || schedule.actual_visits.length === 0) {
        return '<span class="text-muted">-</span>';
    }
    
    // Filter completed visits and sort by maintenance date (descending)
    let completedVisits = schedule.actual_visits.filter(visit => 
        visit.completion_status === 'Fully Completed' && visit.mntc_date
    ).sort((a, b) => new Date(b.mntc_date) - new Date(a.mntc_date));
    
    if (completedVisits.length > 0) {
        let lastVisit = completedVisits[0];
        return `${frappe.datetime.str_to_user(lastVisit.mntc_date)}`;
    }
    
    return '<span class="text-muted">None</span>';
}

function get_remaining_visits_info(schedule) {
    if (!schedule.schedule_items || schedule.schedule_items.length === 0) {
        return { count: 0, display: '<span class="text-muted">0</span>' };
    }
    
    // Count visits that are not fully completed
    let remainingCount = schedule.schedule_items.filter(item => 
        item.completion_status !== 'Fully Completed'
    ).length;
    
    if (remainingCount === 0) {
        return { 
            count: 0, 
            display: '<span class="badge-info">0 (Expired)</span>' 
        };
    }
    
    return { 
        count: remainingCount, 
        display: `<strong>${remainingCount}</strong>` 
    };
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

function count_active_schedules(schedules) {
    return schedules.filter(s => {
        if (s.status === 'Cancelled') return false;
        if (!s.schedule_items || s.schedule_items.length === 0) return false;
        
        let remainingCount = s.schedule_items.filter(item => 
            item.completion_status !== 'Fully Completed'
        ).length;
        
        return remainingCount > 0;
    }).length;
}

function count_expired_schedules(schedules) {
    return schedules.filter(s => {
        if (s.status === 'Cancelled') return false;
        if (!s.schedule_items || s.schedule_items.length === 0) return false;
        
        let remainingCount = s.schedule_items.filter(item => 
            item.completion_status !== 'Fully Completed'
        ).length;
        
        return remainingCount === 0 && s.status === 'Submitted';
    }).length;
}