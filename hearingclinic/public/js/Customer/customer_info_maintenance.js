frappe.ui.form.on('Customer', {
    refresh: function(frm) {
        try {
            if (frm.doc.name && !frm.doc.__islocal) {
                let fieldname = 'custom_maintenance_info';
                let field = frm.get_field(fieldname);
                if (field) {
                    load_maintenance_schedules(frm, fieldname);
                }
            }
        } catch (error) {
            console.error('Error in Customer refresh:', error);
        }
    }
});

function load_maintenance_schedules(frm, fieldname) {
    try {
        frm.get_field(fieldname).$wrapper.html('<p class="text-muted">Loading...</p>');
        
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Maintenance Schedule',
                filters: { 'customer': frm.doc.name },
                fields: ['name', 'transaction_date', 'status'],
                limit_page_length: 500,
                order_by: 'transaction_date desc'
            },
            callback: function(response) {
                try {
                    if (!response.message || response.message.length === 0) {
                        frm.get_field(fieldname).$wrapper.html('<div class="alert alert-info">No maintenance schedules found.</div>');
                        return;
                    }
                    load_schedule_details(frm, response.message, fieldname);
                } catch (error) {
                    console.error('Error in callback:', error);
                }
            },
            error: function(r) {
                console.error('Error loading schedules:', r);
            }
        });
    } catch (error) {
        console.error('Exception in load_maintenance_schedules:', error);
    }
}

function load_schedule_details(frm, schedules, fieldname) {
    let promises = schedules.map(schedule => {
        return new Promise((resolve) => {
            frappe.call({
                method: 'frappe.client.get',
                args: { doctype: 'Maintenance Schedule', name: schedule.name },
                callback: function(r) {
                    if (r.message && r.message.schedules) {
                        schedule.schedule_items = r.message.schedules;
                        schedule.items = r.message.items;
                    }
                    resolve();
                },
                error: function() { resolve(); }
            });
        });
    });
    
    Promise.all(promises).then(() => {
        load_all_visits(frm, schedules, fieldname);
    });
}

function load_all_visits(frm, schedules, fieldname) {
    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'Maintenance Visit',
            filters: { 'customer': frm.doc.name },
            fields: ['name', 'maintenance_schedule', 'completion_status', 'mntc_date', 'maintenance_type'],
            limit_page_length: 0,
            order_by: 'mntc_date desc'
        },
        callback: function(response) {
            if (response.message && response.message.length > 0) {
                load_visit_details(frm, schedules, response.message, fieldname);
            } else {
                schedules.forEach(s => { s.actual_visits = []; });
                render_display(frm, schedules, [], fieldname);
            }
        },
        error: function(r) {
            console.error('Error loading visits:', r);
            schedules.forEach(s => { s.actual_visits = []; });
            render_display(frm, schedules, [], fieldname);
        }
    });
}

function load_visit_details(frm, schedules, visits, fieldname) {
    let promises = visits.map(visit => {
        return new Promise((resolve) => {
            frappe.call({
                method: 'frappe.client.get',
                args: { doctype: 'Maintenance Visit', name: visit.name },
                callback: function(r) {
                    if (r.message) {
                        Object.assign(visit, r.message);
                    }
                    resolve();
                },
                error: function() { resolve(); }
            });
        });
    });
    
    Promise.all(promises).then(() => {
        schedules.forEach(schedule => {
            schedule.actual_visits = visits.filter(v => v.maintenance_schedule === schedule.name);
        });
        render_display(frm, schedules, visits, fieldname);
    });
}

function render_display(frm, schedules, allVisits, fieldname) {
    allVisits.sort((a, b) => (b.mntc_date || '').localeCompare(a.mntc_date || ''));
    
    let html = '<div class="maint-container"><style>';
    html += '.maint-container{font-size:13px}';
    html += '.maint-container .mtab-head{border-bottom:2px solid #e9ecef;margin-bottom:20px}';
    html += '.maint-container .mtab-btns{display:flex;gap:5px}';
    html += '.maint-container .mtab-btn{background:transparent;border:none;padding:12px 24px;font-size:14px;font-weight:500;color:#6c757d;cursor:pointer;border-bottom:3px solid transparent;transition:all 0.2s}';
    html += '.maint-container .mtab-btn:hover{color:#2490ef}';
    html += '.maint-container .mtab-btn.active{color:#2490ef;border-bottom-color:#2490ef}';
    html += '.maint-container .mtab-pane{display:none}';
    html += '.maint-container .mtab-pane.active{display:block}';
    html += '.maint-container .stats{display:flex;gap:20px;margin-bottom:20px;flex-wrap:wrap}';
    html += '.maint-container .stat{background:#f8f9fa;padding:15px;border-radius:6px;flex:1;min-width:150px}';
    html += '.maint-container .stat-val{font-size:24px;font-weight:600;color:#2490ef}';
    html += '.maint-container .stat-lbl{font-size:12px;color:#6c757d;text-transform:uppercase}';
    html += '.maint-container .tbl-wrap{max-height:500px;overflow-y:auto;border:1px solid #e9ecef;border-radius:6px}';
    html += '.maint-container .mtbl{width:100%;border-collapse:collapse}';
    html += '.maint-container .mtbl th{background:#f5f7fa;padding:12px;text-align:left;font-weight:600;position:sticky;top:0;z-index:10;border-bottom:2px solid #d1d8dd}';
    html += '.maint-container .mtbl td{padding:12px;border-bottom:1px solid #e9ecef}';
    html += '.maint-container .mtbl tr:hover{background:#f8f9fa}';
    html += '.maint-container .wdone{max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}';
    html += '.maint-container .bg{padding:4px 10px;border-radius:4px;font-size:11px;font-weight:600}';
    html += '.maint-container .bg-ok{background:#28a745;color:white}';
    html += '.maint-container .bg-warn{background:#ffc107;color:#212529}';
    html += '.maint-container .bg-info{background:#17a2b8;color:white}';
    html += '.maint-container .bg-sec{background:#6c757d;color:white}';
    html += '.maint-container .bg-err{background:#dc3545;color:white}';
    html += '</style>';
    
    html += '<div class="mtab-head"><div class="mtab-btns">';
    html += '<button class="mtab-btn active" data-tab="sched">Schedules (' + schedules.length + ')</button>';
    html += '<button class="mtab-btn" data-tab="visit">Visits (' + allVisits.length + ')</button>';
    html += '</div></div>';
    
    // Schedules tab
    html += '<div id="tab-sched" class="mtab-pane active">';
    html += '<div class="stats">';
    html += '<div class="stat"><div class="stat-val">' + schedules.length + '</div><div class="stat-lbl">Total</div></div>';
    html += '<div class="stat"><div class="stat-val">' + count_active(schedules) + '</div><div class="stat-lbl">Active</div></div>';
    html += '<div class="stat"><div class="stat-val">' + count_expired(schedules) + '</div><div class="stat-lbl">Expired</div></div>';
    html += '<div class="stat"><div class="stat-val">' + count_cancelled(schedules) + '</div><div class="stat-lbl">Cancelled</div></div>';
    html += '</div>';
    html += '<div class="tbl-wrap"><table class="mtbl"><thead><tr>';
    html += '<th>Schedule</th><th>Created</th><th>Status</th><th>Remaining</th><th>Last Done</th><th>Next</th>';
    html += '</tr></thead><tbody>';
    
    schedules.forEach(s => {
        let rem = get_remaining(s);
        html += '<tr>';
        html += '<td><a href="/app/maintenance-schedule/' + encodeURIComponent(s.name) + '" target="_blank"><strong>' + s.name + '</strong></a></td>';
        html += '<td>' + frappe.datetime.str_to_user(s.transaction_date) + '</td>';
        html += '<td>' + get_status_badge(s.status, rem.count) + '</td>';
        html += '<td>' + rem.display + '</td>';
        html += '<td>' + get_last_done(s) + '</td>';
        html += '<td>' + get_next_visit(s) + '</td>';
        html += '</tr>';
    });
    
    html += '</tbody></table></div></div>';
    
    // Visits tab
    html += '<div id="tab-visit" class="mtab-pane">';
    if (allVisits.length === 0) {
        html += '<div class="alert alert-info">No visits found.</div>';
    } else {
        html += '<div class="stats">';
        html += '<div class="stat"><div class="stat-val">' + allVisits.length + '</div><div class="stat-lbl">Total</div></div>';
        html += '<div class="stat"><div class="stat-val">' + allVisits.filter(v => v.completion_status === 'Fully Completed').length + '</div><div class="stat-lbl">Full</div></div>';
        html += '<div class="stat"><div class="stat-val">' + allVisits.filter(v => v.completion_status === 'Partially Completed').length + '</div><div class="stat-lbl">Partial</div></div>';
        html += '<div class="stat"><div class="stat-val">' + allVisits.filter(v => !v.completion_status || v.completion_status === 'Pending').length + '</div><div class="stat-lbl">Pending</div></div>';
        html += '</div>';
        html += '<div class="tbl-wrap"><table class="mtbl"><thead><tr>';
        html += '<th>Visit</th><th>Date</th><th>Type</th><th>Status</th><th>Work Done</th><th>Schedule</th>';
        html += '</tr></thead><tbody>';
        
        allVisits.forEach(v => {
            let work = get_work_done(v);
            html += '<tr>';
            html += '<td><a href="/app/maintenance-visit/' + encodeURIComponent(v.name) + '" target="_blank"><strong>' + v.name + '</strong></a></td>';
            html += '<td>' + (v.mntc_date ? frappe.datetime.str_to_user(v.mntc_date) : '-') + '</td>';
            html += '<td>' + (v.maintenance_type || '-') + '</td>';
            html += '<td>' + get_comp_badge(v.completion_status) + '</td>';
            html += '<td class="wdone" title="' + work + '">' + (work || '-') + '</td>';
            html += '<td>' + (v.maintenance_schedule ? '<a href="/app/maintenance-schedule/' + encodeURIComponent(v.maintenance_schedule) + '" target="_blank">' + v.maintenance_schedule + '</a>' : '<span class="bg bg-err">Unscheduled</span>') + '</td>';
            html += '</tr>';
        });
        
        html += '</tbody></table></div>';
    }
    html += '</div></div>';
    
    let $w = frm.get_field(fieldname).$wrapper;
    $w.html(html);
    
    setTimeout(() => {
        $w.find('.mtab-btn').off('click').on('click', function() {
            let tab = $(this).attr('data-tab');
            $w.find('.mtab-btn').removeClass('active');
            $w.find('.mtab-pane').removeClass('active');
            $(this).addClass('active');
            $w.find('#tab-' + tab).addClass('active');
        });
    }, 50);
}

function get_work_done(visit) {
    let work = visit.description || visit.work_done || visit.service_person_remarks || '';
    if (!work && visit.purposes && Array.isArray(visit.purposes)) {
        work = visit.purposes.map(p => {
            let parts = [];
//            if (p.service_person) parts.push('By: ' + p.service_person);
            if (p.work_done) parts.push(p.work_done);
            if (p.description) parts.push(p.description);
            return parts.join(' - ');
        }).filter(w => w).join(' | ');
    }
    if (work) {
        work = String(work).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    return work;
}

function get_status_badge(status, remaining) {
    if (!status) return '<span class="bg bg-sec">No Status</span>';
    if (remaining === 0 && status === 'Submitted') return '<span class="bg bg-info">Expired</span>';
    if (status === 'Submitted') return '<span class="bg bg-ok">Submitted</span>';
    if (status === 'Draft') return '<span class="bg bg-warn">Draft</span>';
    if (status === 'Cancelled') return '<span class="bg bg-err">Cancelled</span>';
    return '<span class="bg bg-sec">' + status + '</span>';
}

function get_comp_badge(status) {
    if (!status) return '<span class="bg bg-sec">Pending</span>';
    if (status === 'Fully Completed') return '<span class="bg bg-ok">Full</span>';
    if (status === 'Partially Completed') return '<span class="bg bg-warn">Partial</span>';
    if (status === 'Pending') return '<span class="bg bg-sec">Pending</span>';
    return '<span class="bg bg-sec">' + status + '</span>';
}

function get_last_done(schedule) {
    if (!schedule.actual_visits || !schedule.actual_visits.length) return '-';
    let done = schedule.actual_visits.filter(v => v.completion_status === 'Fully Completed' && v.mntc_date).sort((a,b) => b.mntc_date.localeCompare(a.mntc_date));
    return done.length ? frappe.datetime.str_to_user(done[0].mntc_date) : 'None';
}

function get_remaining(schedule) {
    if (!schedule.schedule_items || !schedule.schedule_items.length) return {count:0, display:'0'};
    let rem = schedule.schedule_items.filter(i => i.completion_status !== 'Fully Completed').length;
    if (rem === 0) return {count:0, display:'<span class="bg bg-info">0 (Expired)</span>'};
    return {count:rem, display:'<strong>' + rem + '</strong>'};
}

function get_next_visit(schedule) {
    if (!schedule.schedule_items || !schedule.schedule_items.length) return '-';
    let today = frappe.datetime.get_today();
    let next = schedule.schedule_items.filter(i => i.completion_status !== 'Fully Completed' && i.scheduled_date && i.scheduled_date >= today).sort((a,b) => a.scheduled_date.localeCompare(b.scheduled_date));
    return next.length ? '<strong>' + frappe.datetime.str_to_user(next[0].scheduled_date) + '</strong>' : 'None';
}

function count_active(schedules) {
    return schedules.filter(s => {
        if (s.status === 'Cancelled') return false;
        if (!s.schedule_items || !s.schedule_items.length) return false;
        return s.schedule_items.filter(i => i.completion_status !== 'Fully Completed').length > 0;
    }).length;
}

function count_expired(schedules) {
    return schedules.filter(s => {
        if (s.status === 'Cancelled') return false;
        if (!s.schedule_items || !s.schedule_items.length) return false;
        let rem = s.schedule_items.filter(i => i.completion_status !== 'Fully Completed').length;
        return rem === 0 && s.status === 'Submitted';
    }).length;
}

function count_cancelled(schedules) {
    return schedules.filter(s => s.status === 'Cancelled').length;
}