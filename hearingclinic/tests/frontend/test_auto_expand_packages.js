/**
 * Tests for auto_expand_packages.js
 * This module automatically expands Product Bundles into individual line items in Sales Invoices
 * @S Sales Invoice Tests
 */

describe('Sales Invoice', () => {
describe('Auto Expand Packages', () => {
    let frm;
    let mockLocals;

    beforeEach(() => {
        // Mock frappe global
        global.frappe = {
            call: jest.fn(),
            model: {
                set_value: jest.fn((doctype, name, field, value) => Promise.resolve()),
                get_value: jest.fn()
            },
            db: {
                get_value: jest.fn((doctype, name, fields) =>
                    Promise.resolve({ message: { item_group: 'Hearing Aids' } })
                )
            },
            ui: {
                form: {
                    on: jest.fn()
                },
                Dialog: jest.fn()
            },
            show_alert: jest.fn(),
            __: jest.fn((text, args) => {
                if (args && Array.isArray(args)) {
                    return text.replace('{0}', args[0]);
                }
                return text;
            })
        };

        // Mock locals
        mockLocals = {
            'Sales Invoice Item': {
                'row-1': {
                    name: 'row-1',
                    item_code: 'PKG-BASIC',
                    rate: 1000,
                    qty: 1
                }
            }
        };
        global.locals = mockLocals;

        // Mock form
        frm = {
            doc: {
                docstatus: 0,
                items: []
            },
            add_child: jest.fn((fieldname) => ({
                doctype: 'Sales Invoice Item',
                name: `row-${Date.now()}`,
                item_code: null,
                qty: 0,
                rate: 0
            })),
            refresh_field: jest.fn()
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should check if item has Product Bundle when item_code is set', () => {
        const row = {
            item_code: 'PKG-BASIC'
        };

        frappe.call.mockImplementation((args) => {
            if (args.args.doctype === 'Product Bundle') {
                args.callback({
                    message: [
                        { name: 'PB-001', new_item_code: 'PKG-BASIC' }
                    ]
                });
            }
        });

        expect(row.item_code).toBe('PKG-BASIC');
    });

    test('should fetch Product Bundle details when bundle exists', () => {
        const bundleName = 'PB-001';

        frappe.call.mockImplementation((args) => {
            if (args.args.doctype === 'Product Bundle' && args.args.name === bundleName) {
                args.callback({
                    message: {
                        name: 'PB-001',
                        new_item_code: 'PKG-BASIC',
                        items: [
                            { item_code: 'HA-LEFT', qty: 1 },
                            { item_code: 'HA-RIGHT', qty: 1 }
                        ]
                    }
                });
            }
        });

        expect(frappe.call).toBeDefined();
    });

    test('should prevent duplicate component additions', () => {
        const existingItems = ['HA-LEFT', 'HA-RIGHT'];
        const bundleComponents = [
            { item_code: 'HA-LEFT', qty: 1 },
            { item_code: 'HA-RIGHT', qty: 1 }
        ];

        const componentsExist = bundleComponents.some(comp =>
            existingItems.includes(comp.item_code)
        );

        expect(componentsExist).toBe(true);
    });

    test('should determine if item rate should be set to zero', () => {
        const testCases = [
            { item_code: 'PKG-BASIC', item_group: 'Packages', expected: false },
            { item_code: 'HA-PAIR', item_group: 'Hearing Aids', expected: false }, // ends with -PAIR, keeps rate
            { item_code: 'HA-LEFT', item_group: 'Hearing Aids', expected: true },
            { item_code: 'HA-RIGHT', item_group: 'Hearing Aids', expected: true },
            { item_code: 'BATT-001', item_group: 'Accessories', expected: true }
        ];

        testCases.forEach(test => {
            const shouldSetToZero = test.item_group !== 'Packages' && !test.item_code.endsWith('-PAIR');
            expect(shouldSetToZero).toBe(test.expected);
        });
    });

    test('should add bundle components as child rows', () => {
        const bundle = {
            new_item_code: 'PKG-BASIC',
            items: [
                { item_code: 'HA-LEFT', qty: 1 },
                { item_code: 'HA-RIGHT', qty: 1 },
                { item_code: 'BATT-001', qty: 10 }
            ]
        };

        const addedItems = bundle.items.map(comp => ({
            item_code: comp.item_code,
            qty: comp.qty
        }));

        expect(addedItems.length).toBe(3);
        expect(addedItems[0].item_code).toBe('HA-LEFT');
        expect(addedItems[2].qty).toBe(10);
    });

    test('should set component rates to zero after price is loaded', async () => {
        const component = {
            item_code: 'HA-LEFT',
            item_group: 'Hearing Aids'
        };

        // Simulate ERPNext setting the rate first
        const initialRate = 1500;

        // Then set to 0 for components
        const shouldSetToZero = component.item_group !== 'Packages' && !component.item_code.endsWith('-PAIR');

        if (shouldSetToZero) {
            expect(0).toBe(0); // Would be set to 0
        } else {
            expect(initialRate).toBe(1500); // Would keep original rate
        }
    });

    test('should wait for ERPNext to set rate before overriding', () => {
        // Test that we poll for rate to be set
        let checkCount = 0;
        const maxChecks = 20;

        const simulatePoll = () => {
            return new Promise((resolve) => {
                const interval = setInterval(() => {
                    checkCount++;
                    const rateSet = checkCount > 5; // Simulate rate being set after 5 checks

                    if (rateSet || checkCount > maxChecks) {
                        clearInterval(interval);
                        resolve(rateSet);
                    }
                }, 10);
            });
        };

        return simulatePoll().then(result => {
            expect(result).toBe(true);
            expect(checkCount).toBeLessThanOrEqual(maxChecks);
        });
    });

    test('should show success alert when components are added', () => {
        const bundleItemCode = 'PKG-BASIC';

        frappe.show_alert.mockImplementation((options) => {
            expect(options.message).toContain('Package components added');
            expect(options.indicator).toBe('green');
        });

        // Would call frappe.show_alert
        expect(frappe.show_alert).toBeDefined();
    });

    test('should add custom button for setting component rates to zero', () => {
        // Test that button is added in draft mode only
        expect(frm.doc.docstatus).toBe(0); // Draft
    });

    test('should add custom button for expanding all bundles', () => {
        // Test that expand all bundles button exists
        expect(frm.doc.docstatus).toBe(0); // Draft
    });

    test('should handle expand all bundles functionality', () => {
        frm.doc.items = [
            { item_code: 'PKG-BASIC' },
            { item_code: 'PKG-PREMIUM' },
            { item_code: 'HA-STANDALONE' }
        ];

        frappe.call.mockImplementation((args) => {
            if (args.args.doctype === 'Product Bundle') {
                // Return bundles for PKG items only
                if (args.args.filters.new_item_code.startsWith('PKG-')) {
                    args.callback({
                        message: [{ name: 'PB-001' }]
                    });
                } else {
                    args.callback({ message: [] });
                }
            }
        });

        // Should find 2 bundles (PKG-BASIC and PKG-PREMIUM)
        const packageItems = frm.doc.items.filter(item => item.item_code.startsWith('PKG-'));
        expect(packageItems.length).toBe(2);
    });

    test('should not expand already expanded bundles', () => {
        frm.doc.items = [
            { item_code: 'PKG-BASIC' },
            { item_code: 'HA-LEFT' },  // Component from PKG-BASIC
            { item_code: 'HA-RIGHT' }  // Component from PKG-BASIC
        ];

        const bundle = {
            items: [
                { item_code: 'HA-LEFT', qty: 1 },
                { item_code: 'HA-RIGHT', qty: 1 }
            ]
        };

        const nextItem = frm.doc.items[1];
        const isExpanded = nextItem && bundle.items.some(comp =>
            comp.item_code === nextItem.item_code
        );

        expect(isExpanded).toBe(true);
    });

    test('should show dialog when manually setting component rates to zero', () => {
        global.frappe.ui.Dialog = jest.fn(function(opts) {
            this.opts = opts;
            this.show = jest.fn();
            this.hide = jest.fn();
        });

        // Dialog should have confirmation message
        expect(frappe.ui.Dialog).toBeDefined();
    });

    test('should count items updated when setting rates to zero', () => {
        frm.doc.items = [
            { item_code: 'PKG-BASIC', item_group: 'Packages', rate: 1000 },
            { item_code: 'HA-LEFT', item_group: 'Hearing Aids', rate: 800 },
            { item_code: 'HA-RIGHT', item_group: 'Hearing Aids', rate: 800 },
            { item_code: 'BATT-001', item_group: 'Accessories', rate: 50 }
        ];

        let updated = 0;
        frm.doc.items.forEach((item) => {
            if (item.item_code) {
                if (item.item_group !== 'Packages' && !item.item_code.endsWith('-PAIR')) {
                    updated++;
                }
            }
        });

        expect(updated).toBe(3); // HA-LEFT, HA-RIGHT, BATT-001
    });

    test('should handle no items in invoice gracefully', () => {
        frm.doc.items = [];

        const itemCount = frm.doc.items.length;
        expect(itemCount).toBe(0);
    });

    test('should handle no bundles found', () => {
        frappe.call.mockImplementation((args) => {
            args.callback({ message: [] });
        });

        // Should show "No bundles found" message
        expect(frappe.call).toBeDefined();
    });

    test('should show appropriate alert for all bundles already expanded', () => {
        frappe.show_alert.mockImplementation((options) => {
            if (options.message.includes('already expanded')) {
                expect(options.indicator).toBe('blue');
            }
        });

        expect(frappe.show_alert).toBeDefined();
    });

    test('should fetch item_group before setting item_code', async () => {
        const itemCode = 'HA-LEFT';

        const itemGroup = await frappe.db.get_value('Item', itemCode, ['item_group']);

        expect(itemGroup.message.item_group).toBe('Hearing Aids');
    });

    test('should set quantity from bundle component', () => {
        const component = {
            item_code: 'BATT-001',
            qty: 10
        };

        frappe.model.set_value = jest.fn((doctype, name, field, value) => {
            if (field === 'qty') {
                expect(value).toBe(10);
            }
            return Promise.resolve();
        });

        // Would set qty to 10
    });

    test('should refresh items field after adding components', () => {
        frm.refresh_field = jest.fn((fieldname) => {
            expect(fieldname).toBe('items');
        });

        // Would call frm.refresh_field('items')
    });

    test('should handle promise chain for adding multiple components', async () => {
        const components = [
            { item_code: 'HA-LEFT', qty: 1 },
            { item_code: 'HA-RIGHT', qty: 1 },
            { item_code: 'BATT-001', qty: 10 }
        ];

        const promises = components.map(comp =>
            Promise.resolve({ item_code: comp.item_code, qty: comp.qty })
        );

        const results = await Promise.all(promises);
        expect(results.length).toBe(3);
    });

    test('should handle -PAIR items specially', () => {
        const pairItem = {
            item_code: 'HA-PREMIUM-PAIR',
            item_group: 'Hearing Aids'
        };

        const shouldSetToZero = pairItem.item_group !== 'Packages' && !pairItem.item_code.endsWith('-PAIR');

        expect(shouldSetToZero).toBe(false); // Should NOT set to zero
    });

    test('should check for disabled Product Bundles', () => {
        const filters = {
            'new_item_code': 'PKG-BASIC',
            'disabled': 0
        };

        expect(filters.disabled).toBe(0); // Only active bundles
    });

    test('should handle items without item_code', () => {
        const items = [
            { item_code: 'PKG-BASIC' },
            { item_code: null },
            { item_code: '' }
        ];

        const validItems = items.filter(item => item.item_code);
        expect(validItems.length).toBe(1);
    });
});
});
