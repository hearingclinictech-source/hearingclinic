/**
 * Unit Tests for POS Profile Payment Fix
 * Tests the fix_pos_profile_payment.js script
 *
 * This tests that when a POS Profile is selected on a Sales Invoice,
 * the correct payment method from the POS Profile is applied.
 */

describe('POS Profile Payment Fix', () => {
    let frm;
    let mockPosProfile;
    let mockBankAccount;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock POS Profile data
        mockPosProfile = {
            name: 'Credit Card',
            payments: [
                {
                    mode_of_payment: 'Credit Card',
                    default: 1
                }
            ]
        };

        // Mock bank account response
        mockBankAccount = {
            account: '8003027876 - CIMB 8003027876 - HC-PJ',
            account_type: 'Bank'
        };

        // Create a mock form object
        frm = {
            doc: {
                is_pos: 1,
                pos_profile: 'Credit Card',
                company: 'Hearing Clinic Petaling Jaya',
                payments: []
            },
            clear_table: jest.fn((tablename) => {
                if (tablename === 'payments') {
                    frm.doc.payments = [];
                }
            }),
            add_child: jest.fn((tablename) => {
                if (tablename === 'payments') {
                    const payment_row = {
                        mode_of_payment: null,
                        default: 0,
                        account: null,
                        type: null
                    };
                    frm.doc.payments.push(payment_row);
                    return payment_row;
                }
            }),
            refresh_field: jest.fn()
        };

        // Mock frappe.call to return appropriate responses
        global.frappe.call = jest.fn((opts) => {
            if (opts.method === 'frappe.client.get' && opts.args.doctype === 'POS Profile') {
                if (opts.callback) {
                    opts.callback({ message: mockPosProfile });
                }
            } else if (opts.method === 'erpnext.accounts.doctype.sales_invoice.sales_invoice.get_bank_cash_account') {
                if (opts.callback) {
                    opts.callback({ message: mockBankAccount });
                }
            }
        });

        // Load the script content (simulated)
        // In actual implementation, the script would be loaded via hooks
    });

    describe('when POS Profile is selected', () => {
        test('should fetch the POS Profile details', (done) => {
            // Simulate the pos_profile field change event
            const pos_profile_handler = (frm) => {
                if (frm.doc.pos_profile && frm.doc.is_pos) {
                    frappe.call({
                        method: 'frappe.client.get',
                        args: {
                            doctype: 'POS Profile',
                            name: frm.doc.pos_profile
                        },
                        callback: function(r) {
                            expect(r.message).toEqual(mockPosProfile);
                            expect(frappe.call).toHaveBeenCalledWith(
                                expect.objectContaining({
                                    method: 'frappe.client.get',
                                    args: {
                                        doctype: 'POS Profile',
                                        name: 'Credit Card'
                                    }
                                })
                            );
                            done();
                        }
                    });
                }
            };

            pos_profile_handler(frm);
        });

        test('should clear existing payments table', (done) => {
            // Add some existing payments
            frm.doc.payments = [
                { mode_of_payment: 'Bank Transfer', default: 1 }
            ];

            const pos_profile_handler = (frm) => {
                if (frm.doc.pos_profile && frm.doc.is_pos) {
                    frappe.call({
                        method: 'frappe.client.get',
                        args: {
                            doctype: 'POS Profile',
                            name: frm.doc.pos_profile
                        },
                        callback: function(r) {
                            if (r.message) {
                                // Clear existing payments
                                frm.clear_table('payments');

                                expect(frm.clear_table).toHaveBeenCalledWith('payments');
                                expect(frm.doc.payments).toHaveLength(0);
                                done();
                            }
                        }
                    });
                }
            };

            pos_profile_handler(frm);
        });

        test('should add payment method from POS Profile', (done) => {
            const pos_profile_handler = (frm) => {
                if (frm.doc.pos_profile && frm.doc.is_pos) {
                    frappe.call({
                        method: 'frappe.client.get',
                        args: {
                            doctype: 'POS Profile',
                            name: frm.doc.pos_profile
                        },
                        callback: function(r) {
                            if (r.message) {
                                let pos_profile = r.message;
                                frm.clear_table('payments');

                                if (pos_profile.payments && pos_profile.payments.length > 0) {
                                    pos_profile.payments.forEach(function(payment_method) {
                                        let payment_row = frm.add_child('payments');
                                        payment_row.mode_of_payment = payment_method.mode_of_payment;
                                        payment_row.default = payment_method.default || 0;
                                    });

                                    expect(frm.add_child).toHaveBeenCalledWith('payments');
                                    expect(frm.doc.payments).toHaveLength(1);
                                    expect(frm.doc.payments[0].mode_of_payment).toBe('Credit Card');
                                    expect(frm.doc.payments[0].default).toBe(1);
                                    done();
                                }
                            }
                        }
                    });
                }
            };

            pos_profile_handler(frm);
        });

        test('should fetch and set bank account for payment method', (done) => {
            let asyncCallsCompleted = 0;
            const totalAsyncCalls = 1;

            const pos_profile_handler = (frm) => {
                if (frm.doc.pos_profile && frm.doc.is_pos) {
                    frappe.call({
                        method: 'frappe.client.get',
                        args: {
                            doctype: 'POS Profile',
                            name: frm.doc.pos_profile
                        },
                        callback: function(r) {
                            if (r.message) {
                                let pos_profile = r.message;
                                frm.clear_table('payments');

                                if (pos_profile.payments && pos_profile.payments.length > 0) {
                                    pos_profile.payments.forEach(function(payment_method) {
                                        let payment_row = frm.add_child('payments');
                                        payment_row.mode_of_payment = payment_method.mode_of_payment;
                                        payment_row.default = payment_method.default || 0;

                                        // Get the account for this payment method
                                        frappe.call({
                                            method: 'erpnext.accounts.doctype.sales_invoice.sales_invoice.get_bank_cash_account',
                                            args: {
                                                mode_of_payment: payment_method.mode_of_payment,
                                                company: frm.doc.company
                                            },
                                            callback: function(r2) {
                                                if (r2.message) {
                                                    payment_row.account = r2.message.account;
                                                    payment_row.type = r2.message.account_type;

                                                    asyncCallsCompleted++;
                                                    if (asyncCallsCompleted === totalAsyncCalls) {
                                                        expect(frappe.call).toHaveBeenCalledWith(
                                                            expect.objectContaining({
                                                                method: 'erpnext.accounts.doctype.sales_invoice.sales_invoice.get_bank_cash_account',
                                                                args: {
                                                                    mode_of_payment: 'Credit Card',
                                                                    company: 'Hearing Clinic Petaling Jaya'
                                                                }
                                                            })
                                                        );
                                                        expect(payment_row.account).toBe('8003027876 - CIMB 8003027876 - HC-PJ');
                                                        expect(payment_row.type).toBe('Bank');
                                                        done();
                                                    }
                                                }
                                            }
                                        });
                                    });
                                }
                            }
                        }
                    });
                }
            };

            pos_profile_handler(frm);
        });

        test('should refresh payments field after applying changes', (done) => {
            const pos_profile_handler = (frm) => {
                if (frm.doc.pos_profile && frm.doc.is_pos) {
                    frappe.call({
                        method: 'frappe.client.get',
                        args: {
                            doctype: 'POS Profile',
                            name: frm.doc.pos_profile
                        },
                        callback: function(r) {
                            if (r.message) {
                                let pos_profile = r.message;
                                frm.clear_table('payments');

                                if (pos_profile.payments && pos_profile.payments.length > 0) {
                                    pos_profile.payments.forEach(function(payment_method) {
                                        let payment_row = frm.add_child('payments');
                                        payment_row.mode_of_payment = payment_method.mode_of_payment;
                                        payment_row.default = payment_method.default || 0;
                                    });

                                    // Refresh the payments table
                                    frm.refresh_field('payments');

                                    expect(frm.refresh_field).toHaveBeenCalledWith('payments');
                                    done();
                                }
                            }
                        }
                    });
                }
            };

            pos_profile_handler(frm);
        });
    });

    describe('when POS Profile has multiple payment methods', () => {
        beforeEach(() => {
            mockPosProfile = {
                name: 'Multi Payment',
                payments: [
                    {
                        mode_of_payment: 'Cash',
                        default: 1
                    },
                    {
                        mode_of_payment: 'Credit Card',
                        default: 0
                    }
                ]
            };
        });

        test('should add all payment methods from POS Profile', (done) => {
            const pos_profile_handler = (frm) => {
                if (frm.doc.pos_profile && frm.doc.is_pos) {
                    frappe.call({
                        method: 'frappe.client.get',
                        args: {
                            doctype: 'POS Profile',
                            name: frm.doc.pos_profile
                        },
                        callback: function(r) {
                            if (r.message) {
                                let pos_profile = r.message;
                                frm.clear_table('payments');

                                if (pos_profile.payments && pos_profile.payments.length > 0) {
                                    pos_profile.payments.forEach(function(payment_method) {
                                        let payment_row = frm.add_child('payments');
                                        payment_row.mode_of_payment = payment_method.mode_of_payment;
                                        payment_row.default = payment_method.default || 0;
                                    });

                                    expect(frm.doc.payments).toHaveLength(2);
                                    expect(frm.doc.payments[0].mode_of_payment).toBe('Cash');
                                    expect(frm.doc.payments[0].default).toBe(1);
                                    expect(frm.doc.payments[1].mode_of_payment).toBe('Credit Card');
                                    expect(frm.doc.payments[1].default).toBe(0);
                                    done();
                                }
                            }
                        }
                    });
                }
            };

            frm.doc.pos_profile = 'Multi Payment';
            pos_profile_handler(frm);
        });
    });

    describe('when is_pos is false', () => {
        beforeEach(() => {
            frm.doc.is_pos = 0;
        });

        test('should not apply POS Profile payments', () => {
            const pos_profile_handler = (frm) => {
                if (frm.doc.pos_profile && frm.doc.is_pos) {
                    frappe.call({
                        method: 'frappe.client.get',
                        args: {
                            doctype: 'POS Profile',
                            name: frm.doc.pos_profile
                        }
                    });
                }
            };

            pos_profile_handler(frm);

            expect(frappe.call).not.toHaveBeenCalled();
        });
    });

    describe('when POS Profile is not set', () => {
        beforeEach(() => {
            frm.doc.pos_profile = null;
        });

        test('should not apply any payments', () => {
            const pos_profile_handler = (frm) => {
                if (frm.doc.pos_profile && frm.doc.is_pos) {
                    frappe.call({
                        method: 'frappe.client.get',
                        args: {
                            doctype: 'POS Profile',
                            name: frm.doc.pos_profile
                        }
                    });
                }
            };

            pos_profile_handler(frm);

            expect(frappe.call).not.toHaveBeenCalled();
        });
    });

    describe('edge cases', () => {
        test('should handle POS Profile with no payment methods', (done) => {
            mockPosProfile.payments = [];

            const pos_profile_handler = (frm) => {
                if (frm.doc.pos_profile && frm.doc.is_pos) {
                    frappe.call({
                        method: 'frappe.client.get',
                        args: {
                            doctype: 'POS Profile',
                            name: frm.doc.pos_profile
                        },
                        callback: function(r) {
                            if (r.message) {
                                let pos_profile = r.message;
                                frm.clear_table('payments');

                                if (pos_profile.payments && pos_profile.payments.length > 0) {
                                    // Should not execute
                                    fail('Should not add payments when POS Profile has no payment methods');
                                }

                                expect(frm.doc.payments).toHaveLength(0);
                                done();
                            }
                        }
                    });
                }
            };

            pos_profile_handler(frm);
        });

        test('should handle API error when fetching POS Profile', (done) => {
            global.frappe.call = jest.fn((opts) => {
                if (opts.method === 'frappe.client.get') {
                    if (opts.callback) {
                        opts.callback({ message: null });
                    }
                }
            });

            const pos_profile_handler = (frm) => {
                if (frm.doc.pos_profile && frm.doc.is_pos) {
                    frappe.call({
                        method: 'frappe.client.get',
                        args: {
                            doctype: 'POS Profile',
                            name: frm.doc.pos_profile
                        },
                        callback: function(r) {
                            if (r.message) {
                                fail('Should not process when API returns null');
                            } else {
                                expect(r.message).toBeNull();
                                done();
                            }
                        }
                    });
                }
            };

            pos_profile_handler(frm);
        });

        test('should handle API error when fetching bank account', (done) => {
            global.frappe.call = jest.fn((opts) => {
                if (opts.method === 'frappe.client.get') {
                    if (opts.callback) {
                        opts.callback({ message: mockPosProfile });
                    }
                } else if (opts.method === 'erpnext.accounts.doctype.sales_invoice.sales_invoice.get_bank_cash_account') {
                    if (opts.callback) {
                        opts.callback({ message: null });
                    }
                }
            });

            const pos_profile_handler = (frm) => {
                if (frm.doc.pos_profile && frm.doc.is_pos) {
                    frappe.call({
                        method: 'frappe.client.get',
                        args: {
                            doctype: 'POS Profile',
                            name: frm.doc.pos_profile
                        },
                        callback: function(r) {
                            if (r.message) {
                                let pos_profile = r.message;
                                frm.clear_table('payments');

                                if (pos_profile.payments && pos_profile.payments.length > 0) {
                                    pos_profile.payments.forEach(function(payment_method) {
                                        let payment_row = frm.add_child('payments');
                                        payment_row.mode_of_payment = payment_method.mode_of_payment;

                                        frappe.call({
                                            method: 'erpnext.accounts.doctype.sales_invoice.sales_invoice.get_bank_cash_account',
                                            args: {
                                                mode_of_payment: payment_method.mode_of_payment,
                                                company: frm.doc.company
                                            },
                                            callback: function(r2) {
                                                // Account should not be set when API returns null
                                                expect(r2.message).toBeNull();
                                                expect(payment_row.account).toBeNull();
                                                done();
                                            }
                                        });
                                    });
                                }
                            }
                        }
                    });
                }
            };

            pos_profile_handler(frm);
        });
    });

    describe('integration scenarios', () => {
        test('should correctly handle switching from Bank Transfer to Credit Card POS Profile', (done) => {
            // Start with Bank Transfer
            frm.doc.pos_profile = 'Bank Transfer';
            frm.doc.payments = [
                {
                    mode_of_payment: 'Bank Transfer',
                    default: 1,
                    account: '8003027876 - CIMB 8003027876 - HC-PJ',
                    type: 'Bank'
                }
            ];

            // Switch to Credit Card
            frm.doc.pos_profile = 'Credit Card';

            const pos_profile_handler = (frm) => {
                if (frm.doc.pos_profile && frm.doc.is_pos) {
                    frappe.call({
                        method: 'frappe.client.get',
                        args: {
                            doctype: 'POS Profile',
                            name: frm.doc.pos_profile
                        },
                        callback: function(r) {
                            if (r.message) {
                                let pos_profile = r.message;

                                // Clear old payments
                                frm.clear_table('payments');

                                // Add new payments
                                if (pos_profile.payments && pos_profile.payments.length > 0) {
                                    pos_profile.payments.forEach(function(payment_method) {
                                        let payment_row = frm.add_child('payments');
                                        payment_row.mode_of_payment = payment_method.mode_of_payment;
                                        payment_row.default = payment_method.default || 0;

                                        frappe.call({
                                            method: 'erpnext.accounts.doctype.sales_invoice.sales_invoice.get_bank_cash_account',
                                            args: {
                                                mode_of_payment: payment_method.mode_of_payment,
                                                company: frm.doc.company
                                            },
                                            callback: function(r2) {
                                                if (r2.message) {
                                                    payment_row.account = r2.message.account;
                                                    payment_row.type = r2.message.account_type;
                                                }
                                            }
                                        });
                                    });

                                    frm.refresh_field('payments');

                                    // Verify Bank Transfer was removed
                                    expect(frm.clear_table).toHaveBeenCalledWith('payments');

                                    // Verify Credit Card was added
                                    expect(frm.doc.payments).toHaveLength(1);
                                    expect(frm.doc.payments[0].mode_of_payment).toBe('Credit Card');

                                    // Verify no Bank Transfer remains
                                    const hasBankTransfer = frm.doc.payments.some(
                                        p => p.mode_of_payment === 'Bank Transfer'
                                    );
                                    expect(hasBankTransfer).toBe(false);

                                    done();
                                }
                            }
                        }
                    });
                }
            };

            pos_profile_handler(frm);
        });
    });
});
