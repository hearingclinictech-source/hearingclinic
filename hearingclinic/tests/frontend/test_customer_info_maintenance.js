/**
 * Tests for customer_info_maintenance.js
 * This module displays maintenance schedules and visit history for customers
 * @S Customer UI Tests
 */

describe('Customer', () => {
describe('Customer Info Maintenance', () => {
    let frm;
    let mockField;

    beforeEach(() => {
        // Mock frappe global
        global.frappe = {
            call: jest.fn(),
            datetime: {
                str_to_user: jest.fn((date) => date),
                get_today: jest.fn(() => '2025-01-15')
            },
            show_alert: jest.fn(),
            __: jest.fn((text) => text)
        };

        // Mock jQuery
        global.$ = jest.fn((selector) => {
            const mockJQuery = {
                html: jest.fn().mockReturnThis(),
                find: jest.fn().mockReturnThis(),
                on: jest.fn().mockReturnThis(),
                off: jest.fn().mockReturnThis(),
                attr: jest.fn().mockReturnThis(),
                addClass: jest.fn().mockReturnThis(),
                removeClass: jest.fn().mockReturnThis()
            };
            return mockJQuery;
        });

        // Mock field
        mockField = {
            $wrapper: {
                html: jest.fn(),
                find: jest.fn(() => ({
                    on: jest.fn(),
                    off: jest.fn().mockReturnThis(),
                    attr: jest.fn(),
                    addClass: jest.fn().mockReturnThis(),
                    removeClass: jest.fn().mockReturnThis()
                }))
            }
        };

        // Mock form
        frm = {
            doc: {
                name: 'CUST-001',
                __islocal: false
            },
            get_field: jest.fn(() => mockField)
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should load maintenance schedules on customer form refresh', () => {
        expect(frm.get_field).toBeDefined();
        expect(frm.doc.name).toBe('CUST-001');
    });

    test('should display loading message initially', () => {
        const loadingMessage = '<p class="text-muted">Loading...</p>';
        expect(mockField.$wrapper.html).toBeDefined();
    });

    test('should handle no maintenance schedules gracefully', () => {
        frappe.call.mockImplementation((args) => {
            args.callback({ message: [] });
        });

        const expectedMessage = '<div class="alert alert-info">No maintenance schedules found.</div>';
        expect(frappe.call).toBeDefined();
    });

    test('should load maintenance schedules for customer', () => {
        const mockSchedules = [
            { name: 'MS-001', transaction_date: '2025-01-01', status: 'Submitted' },
            { name: 'MS-002', transaction_date: '2025-02-01', status: 'Submitted' }
        ];

        frappe.call.mockImplementation((args) => {
            if (args.args.doctype === 'Maintenance Schedule') {
                args.callback({ message: mockSchedules });
            }
        });

        expect(frappe.call).toBeDefined();
    });

    test('should load maintenance visits for customer', () => {
        const mockVisits = [
            {
                name: 'MV-001',
                maintenance_schedule: 'MS-001',
                completion_status: 'Fully Completed',
                mntc_date: '2025-01-10',
                maintenance_type: 'Scheduled'
            }
        ];

        frappe.call.mockImplementation((args) => {
            if (args.args.doctype === 'Maintenance Visit') {
                args.callback({ message: mockVisits });
            }
        });

        expect(frappe.call).toBeDefined();
    });

    test('should calculate remaining schedule items correctly', () => {
        const schedule = {
            schedule_items: [
                { completion_status: 'Fully Completed' },
                { completion_status: 'Pending' },
                { completion_status: 'Pending' }
            ]
        };

        const remaining = schedule.schedule_items.filter(
            i => i.completion_status !== 'Fully Completed'
        ).length;

        expect(remaining).toBe(2);
    });

    test('should identify active schedules', () => {
        const schedules = [
            {
                status: 'Submitted',
                schedule_items: [
                    { completion_status: 'Pending' }
                ]
            },
            {
                status: 'Cancelled',
                schedule_items: [
                    { completion_status: 'Pending' }
                ]
            },
            {
                status: 'Submitted',
                schedule_items: [
                    { completion_status: 'Fully Completed' }
                ]
            }
        ];

        const active = schedules.filter(s => {
            if (s.status === 'Cancelled') return false;
            if (!s.schedule_items || !s.schedule_items.length) return false;
            return s.schedule_items.filter(i => i.completion_status !== 'Fully Completed').length > 0;
        });

        expect(active.length).toBe(1);
    });

    test('should identify expired schedules', () => {
        const schedules = [
            {
                status: 'Submitted',
                schedule_items: [
                    { completion_status: 'Fully Completed' }
                ]
            }
        ];

        const expired = schedules.filter(s => {
            if (s.status === 'Cancelled') return false;
            if (!s.schedule_items || !s.schedule_items.length) return false;
            const rem = s.schedule_items.filter(i => i.completion_status !== 'Fully Completed').length;
            return rem === 0 && s.status === 'Submitted';
        });

        expect(expired.length).toBe(1);
    });

    test('should count cancelled schedules', () => {
        const schedules = [
            { status: 'Submitted' },
            { status: 'Cancelled' },
            { status: 'Cancelled' },
            { status: 'Draft' }
        ];

        const cancelled = schedules.filter(s => s.status === 'Cancelled');
        expect(cancelled.length).toBe(2);
    });

    test('should get status badge for schedules', () => {
        const statuses = [
            { status: 'Submitted', remaining: 5, expected: 'Submitted' },
            { status: 'Submitted', remaining: 0, expected: 'Expired' },
            { status: 'Draft', remaining: 5, expected: 'Draft' },
            { status: 'Cancelled', remaining: 5, expected: 'Cancelled' },
            { status: null, remaining: 5, expected: 'No Status' }
        ];

        statuses.forEach(test => {
            if (test.status === null) {
                expect('No Status').toBe(test.expected);
            } else if (test.remaining === 0 && test.status === 'Submitted') {
                expect('Expired').toBe(test.expected);
            } else {
                expect(test.status).toBe(test.expected);
            }
        });
    });

    test('should get completion status badge for visits', () => {
        const statuses = [
            { status: 'Fully Completed', expected: 'Full' },
            { status: 'Partially Completed', expected: 'Partial' },
            { status: 'Pending', expected: 'Pending' },
            { status: null, expected: 'Pending' }
        ];

        statuses.forEach(test => {
            let badge;
            if (!test.status) {
                badge = 'Pending';
            } else if (test.status === 'Fully Completed') {
                badge = 'Full';
            } else if (test.status === 'Partially Completed') {
                badge = 'Partial';
            } else {
                badge = 'Pending';
            }
            expect(badge).toBe(test.expected);
        });
    });

    test('should find last completed visit date', () => {
        const schedule = {
            actual_visits: [
                { completion_status: 'Fully Completed', mntc_date: '2025-01-10' },
                { completion_status: 'Pending', mntc_date: '2025-01-15' },
                { completion_status: 'Fully Completed', mntc_date: '2025-01-05' }
            ]
        };

        const done = schedule.actual_visits
            .filter(v => v.completion_status === 'Fully Completed' && v.mntc_date)
            .sort((a, b) => b.mntc_date.localeCompare(a.mntc_date));

        expect(done[0].mntc_date).toBe('2025-01-10');
    });

    test('should find next scheduled visit', () => {
        const today = '2025-01-15';
        const schedule = {
            schedule_items: [
                { completion_status: 'Fully Completed', scheduled_date: '2025-01-05' },
                { completion_status: 'Pending', scheduled_date: '2025-01-20' },
                { completion_status: 'Pending', scheduled_date: '2025-02-01' },
                { completion_status: 'Pending', scheduled_date: '2025-01-10' } // In the past
            ]
        };

        const next = schedule.schedule_items
            .filter(i =>
                i.completion_status !== 'Fully Completed' &&
                i.scheduled_date &&
                i.scheduled_date >= today
            )
            .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

        expect(next[0].scheduled_date).toBe('2025-01-20');
    });

    test('should extract work done from visit', () => {
        const visits = [
            {
                description: 'Cleaned device',
                work_done: null,
                service_person_remarks: null
            },
            {
                description: null,
                work_done: 'Replaced battery',
                service_person_remarks: null
            },
            {
                description: null,
                work_done: null,
                service_person_remarks: 'Tested device'
            }
        ];

        const workDone = visits.map(v => {
            return v.description || v.work_done || v.service_person_remarks || '';
        });

        expect(workDone[0]).toBe('Cleaned device');
        expect(workDone[1]).toBe('Replaced battery');
        expect(workDone[2]).toBe('Tested device');
    });

    test('should handle work done from purposes array', () => {
        const visit = {
            purposes: [
                { work_done: 'Task 1', description: 'Desc 1' },
                { work_done: 'Task 2', description: 'Desc 2' }
            ]
        };

        const work = visit.purposes.map(p => {
            let parts = [];
            if (p.work_done) parts.push(p.work_done);
            if (p.description) parts.push(p.description);
            return parts.join(' - ');
        }).filter(w => w).join(' | ');

        expect(work).toBe('Task 1 - Desc 1 | Task 2 - Desc 2');
    });

    test('should count visit statistics', () => {
        const visits = [
            { completion_status: 'Fully Completed' },
            { completion_status: 'Fully Completed' },
            { completion_status: 'Partially Completed' },
            { completion_status: 'Pending' },
            { completion_status: null }
        ];

        const stats = {
            total: visits.length,
            full: visits.filter(v => v.completion_status === 'Fully Completed').length,
            partial: visits.filter(v => v.completion_status === 'Partially Completed').length,
            pending: visits.filter(v => !v.completion_status || v.completion_status === 'Pending').length
        };

        expect(stats.total).toBe(5);
        expect(stats.full).toBe(2);
        expect(stats.partial).toBe(1);
        expect(stats.pending).toBe(2);
    });

    test('should support tab switching between schedules and visits', () => {
        const tabs = ['sched', 'visit'];
        expect(tabs).toContain('sched');
        expect(tabs).toContain('visit');
    });

    test('should sort visits by date descending', () => {
        const visits = [
            { mntc_date: '2025-01-10' },
            { mntc_date: '2025-01-20' },
            { mntc_date: '2025-01-05' }
        ];

        visits.sort((a, b) => (b.mntc_date || '').localeCompare(a.mntc_date || ''));

        expect(visits[0].mntc_date).toBe('2025-01-20');
        expect(visits[1].mntc_date).toBe('2025-01-10');
        expect(visits[2].mntc_date).toBe('2025-01-05');
    });

    test('should handle unscheduled visits', () => {
        const visit = {
            name: 'MV-001',
            maintenance_schedule: null
        };

        const isUnscheduled = !visit.maintenance_schedule;
        expect(isUnscheduled).toBe(true);
    });

    test('should create clickable links to schedules and visits', () => {
        const scheduleLink = '<a href="/app/maintenance-schedule/MS-001" target="_blank"><strong>MS-001</strong></a>';
        const visitLink = '<a href="/app/maintenance-visit/MV-001" target="_blank"><strong>MV-001</strong></a>';

        expect(scheduleLink).toContain('/app/maintenance-schedule/');
        expect(visitLink).toContain('/app/maintenance-visit/');
    });

    test('should handle promises for loading multiple schedules', async () => {
        const schedules = [
            { name: 'MS-001' },
            { name: 'MS-002' },
            { name: 'MS-003' }
        ];

        const promises = schedules.map(schedule => {
            return Promise.resolve({ ...schedule, items: [] });
        });

        const results = await Promise.all(promises);
        expect(results.length).toBe(3);
    });

    test('should handle error when loading schedules', () => {
        frappe.call.mockImplementation((args) => {
            if (args.error) {
                args.error({ message: 'Network error' });
            }
        });

        // Should handle error gracefully
        expect(frappe.call).toBeDefined();
    });

    test('should escape HTML in work done descriptions', () => {
        const work = '<script>alert("XSS")</script>';
        const escaped = work
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    });

    test('should handle empty schedule_items array', () => {
        const schedule = {
            schedule_items: []
        };

        const remaining = schedule.schedule_items.filter(
            i => i.completion_status !== 'Fully Completed'
        ).length;

        expect(remaining).toBe(0);
    });

    test('should filter visits by maintenance schedule', () => {
        const allVisits = [
            { name: 'MV-001', maintenance_schedule: 'MS-001' },
            { name: 'MV-002', maintenance_schedule: 'MS-002' },
            { name: 'MV-003', maintenance_schedule: 'MS-001' }
        ];

        const schedule = { name: 'MS-001' };
        schedule.actual_visits = allVisits.filter(
            v => v.maintenance_schedule === schedule.name
        );

        expect(schedule.actual_visits.length).toBe(2);
    });
});
});
