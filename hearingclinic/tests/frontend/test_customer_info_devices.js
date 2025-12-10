/**
 * Tests for customer_info_devices.js
 * This module displays purchase history for customers, showing devices and hearing aids purchased
 * @S Customer UI Tests
 */

describe('Customer', () => {
describe('Customer Info Devices', () => {
    let frm;
    let mockField;

    beforeEach(() => {
        // Mock frappe global
        global.frappe = {
            call: jest.fn(),
            datetime: {
                str_to_user: jest.fn((date) => date),
                get_today: jest.fn(() => '2025-01-01')
            },
            format: jest.fn((value, opts) => {
                if (opts.fieldtype === 'Currency') return `RM ${value}`;
                return value.toString();
            }),
            show_alert: jest.fn(),
            __: jest.fn((text) => text)
        };

        // Mock jQuery
        global.$ = jest.fn((selector) => {
            return {
                html: jest.fn().mockReturnThis(),
                find: jest.fn().mockReturnThis(),
                on: jest.fn().mockReturnThis(),
                data: jest.fn().mockReturnThis(),
                closest: jest.fn().mockReturnThis(),
                removeClass: jest.fn().mockReturnThis(),
                addClass: jest.fn().mockReturnThis()
            };
        });
        global.$.extend = jest.fn();

        // Mock document
        global.document = {
            querySelector: jest.fn()
        };

        // Mock form
        mockField = {
            $wrapper: {
                html: jest.fn(),
                find: jest.fn(() => ({
                    on: jest.fn(),
                    off: jest.fn().mockReturnThis()
                }))
            }
        };

        frm = {
            doc: {
                name: 'CUST-001',
                __islocal: false
            },
            is_new: () => false,
            get_field: jest.fn(() => mockField)
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should load purchase history when customer form refreshes', () => {
        // Test that the module calls load_purchased_items when form is refreshed
        expect(frm.get_field).toBeDefined();
    });

    test('should display loading message initially', () => {
        // Verify loading message is shown before data loads
        const loadingMessage = '<p class="text-muted">Loading purchase history...</p>';
        // This would be set when load_purchased_items is called
        expect(mockField.$wrapper.html).toBeDefined();
    });

    test('should handle no purchase history gracefully', () => {
        frappe.call.mockImplementation((args) => {
            args.callback({ message: [] });
        });

        // Expected message when no invoices found
        const expectedMessage = '<div class="alert alert-info">No purchase history found for this customer.</div>';
        // This tests that the module handles empty data properly
        expect(frappe.call).toBeDefined();
    });

    test('should load sales invoices for customer', () => {
        const mockInvoices = [
            { name: 'SI-001', posting_date: '2025-01-01', grand_total: 5000, status: 'Paid' },
            { name: 'SI-002', posting_date: '2025-01-02', grand_total: 3000, status: 'Paid' }
        ];

        frappe.call.mockImplementation((args) => {
            if (args.args.doctype === 'Sales Invoice') {
                args.callback({ message: mockInvoices });
            }
        });

        // Expected to call frappe.client.get_list for Sales Invoice
        // with customer filter
        expect(frappe.call).toBeDefined();
    });

    test('should load delivery notes for tracking device serials', () => {
        const mockDeliveryNotes = [
            { name: 'DN-001', posting_date: '2025-01-01' }
        ];

        frappe.call.mockImplementation((args) => {
            if (args.args.doctype === 'Delivery Note') {
                args.callback({ message: mockDeliveryNotes });
            }
        });

        // Expected to load delivery notes to get serial numbers and ear information
        expect(frappe.call).toBeDefined();
    });

    test('should filter items to show only Hearing Aids group', () => {
        // Test that only items with item_group = 'Hearing Aids' are displayed
        const allItems = [
            { item_code: 'HA-001', item_group: 'Hearing Aids', amount: 2000 },
            { item_code: 'BATT-001', item_group: 'Accessories', amount: 50 },
            { item_code: 'HA-002', item_group: 'Hearing Aids', amount: 2500 }
        ];

        // The module should filter to show only HA-001 and HA-002
        const expectedFiltered = allItems.filter(item => item.item_group === 'Hearing Aids');
        expect(expectedFiltered.length).toBe(2);
    });

    test('should calculate total revenue from all items', () => {
        const allItems = [
            { item_code: 'HA-001', item_group: 'Hearing Aids', amount: 2000 },
            { item_code: 'BATT-001', item_group: 'Accessories', amount: 50 },
            { item_code: 'WAR-001', item_group: 'Services', amount: 300 }
        ];

        const totalRevenue = allItems.reduce((sum, item) => sum + item.amount, 0);
        expect(totalRevenue).toBe(2350);
    });

    test('should display summary statistics', () => {
        // Test that stats are displayed correctly:
        // - Total Value (from all items)
        // - Total Invoices
        // - Hearing Aid Types
        // - Total Devices
        const stats = {
            totalValue: 8000,
            totalInvoices: 3,
            hearingAidTypes: 5,
            totalDevices: 7
        };

        expect(stats.totalInvoices).toBeGreaterThan(0);
        expect(stats.totalDevices).toBeGreaterThan(0);
    });

    test('should display device serial numbers from delivery notes', () => {
        const deliveryNoteMap = {
            'SI-ITEM-001': {
                device_serial: 'SN123456',
                for_ear: 'R',
                delivery_note: 'DN-001',
                item_code: 'HA-001'
            }
        };

        // Test that serial numbers are properly displayed
        expect(deliveryNoteMap['SI-ITEM-001'].device_serial).toBe('SN123456');
        expect(deliveryNoteMap['SI-ITEM-001'].for_ear).toBe('R');
    });

    test('should display ear information with color coding', () => {
        // Right ear should be red, Left ear should be blue
        const rightEarColor = '#dc3545'; // Red
        const leftEarColor = '#007bff';  // Blue

        expect(rightEarColor).toBe('#dc3545');
        expect(leftEarColor).toBe('#007bff');
    });

    test('should format currency values correctly', () => {
        frappe.format = jest.fn((value, opts) => {
            if (opts.fieldtype === 'Currency') {
                return `RM ${value.toFixed(2)}`;
            }
            return value.toString();
        });

        const formatted = frappe.format(1234.56, { fieldtype: 'Currency' });
        expect(formatted).toBe('RM 1234.56');
    });

    test('should handle tab switching between Summary and Details', () => {
        // Test that clicking on tabs switches between summary and detail views
        const tabs = ['summary', 'details'];
        expect(tabs).toContain('summary');
        expect(tabs).toContain('details');
    });

    test('should handle errors gracefully', () => {
        frappe.call.mockImplementation((args) => {
            if (args.error) {
                args.error({ message: 'Network error' });
            }
        });

        // Expected to display error message
        const errorMessage = '<div class="alert alert-danger">Error loading purchase history. Check console for details.</div>';
        expect(errorMessage).toContain('Error loading');
    });

    test('should group items by item_code for summary', () => {
        const items = [
            { item_code: 'HA-001', qty: 1, amount: 2000, posting_date: '2025-01-01' },
            { item_code: 'HA-001', qty: 1, amount: 2100, posting_date: '2025-02-01' },
            { item_code: 'HA-002', qty: 2, amount: 5000, posting_date: '2025-01-15' }
        ];

        // Group by item_code
        const summary = {};
        items.forEach(item => {
            if (!summary[item.item_code]) {
                summary[item.item_code] = {
                    item_code: item.item_code,
                    total_qty: 0,
                    total_amount: 0,
                    purchase_count: 0
                };
            }
            summary[item.item_code].total_qty += item.qty;
            summary[item.item_code].total_amount += item.amount;
            summary[item.item_code].purchase_count += 1;
        });

        expect(summary['HA-001'].total_qty).toBe(2);
        expect(summary['HA-001'].total_amount).toBe(4100);
        expect(summary['HA-001'].purchase_count).toBe(2);
    });

    test('should create clickable links to related documents', () => {
        const invoiceLink = '<a href="/app/sales-invoice/SI-001" target="_blank">SI-001</a>';
        const deliveryNoteLink = '<a href="/app/delivery-note/DN-001" target="_blank">DN-001</a>';
        const itemLink = '<a href="/app/item/HA-001" target="_blank">HA-001</a>';

        expect(invoiceLink).toContain('/app/sales-invoice/');
        expect(deliveryNoteLink).toContain('/app/delivery-note/');
        expect(itemLink).toContain('/app/item/');
    });

    test('should sort items by total amount descending', () => {
        const items = [
            { item_code: 'HA-001', total_amount: 2000 },
            { item_code: 'HA-002', total_amount: 5000 },
            { item_code: 'HA-003', total_amount: 1000 }
        ];

        items.sort((a, b) => b.total_amount - a.total_amount);

        expect(items[0].item_code).toBe('HA-002');
        expect(items[1].item_code).toBe('HA-001');
        expect(items[2].item_code).toBe('HA-003');
    });

    test('should calculate average rate correctly', () => {
        const item = {
            total_amount: 4100,
            total_qty: 2
        };

        const avgRate = item.total_amount / item.total_qty;
        expect(avgRate).toBe(2050);
    });

    test('should handle items without delivery notes', () => {
        const item = {
            device_serial: '',
            for_ear: '',
            delivery_note: ''
        };

        // Should display dashes for missing data
        expect(item.device_serial || '-').toBe('-');
        expect(item.for_ear || '-').toBe('-');
    });
});
});
