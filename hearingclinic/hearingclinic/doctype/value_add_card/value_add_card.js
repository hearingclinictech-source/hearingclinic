// Copyright (c) 2025, Thomas Roch and contributors
// For license information, please see license.txt

frappe.ui.form.on("Value Add Card", {
    refresh(frm) {
        // Clear the default card_value for new cards
        if (frm.doc.__islocal && frm.doc.card_value === 1600 && !frm.doc.amount_paid) {
            frm.set_value('card_value', null);
        }
    },

    amount_paid(frm) {
        // Auto-calculate card value as 1.6 times the amount paid
        // Only calculate if:
        // 1. This is a new card (not saved yet)
        // 2. Card value is empty OR is the default 1600
        // 3. User hasn't manually edited card_value after entering amount_paid
        if (frm.doc.__islocal && frm.doc.amount_paid) {
            let calculated_value = flt(frm.doc.amount_paid) * 1.6;

            // Only update if card_value is empty, is the default 1600, or hasn't been manually changed
            if (!frm.doc.card_value || frm.doc.card_value === 1600 || !frm._card_value_manually_set) {
                frm.set_value('card_value', calculated_value);
                frm._card_value_manually_set = false;
            }
        }
    },

    card_value(frm) {
        // Track if user manually changed card_value
        if (frm.doc.__islocal && frm.doc.card_value && frm.doc.amount_paid) {
            let calculated_value = flt(frm.doc.amount_paid) * 1.6;
            // If card_value differs from calculated value, user manually changed it
            if (Math.abs(frm.doc.card_value - calculated_value) > 0.01) {
                frm._card_value_manually_set = true;
                // When user manually changes card_value, update current_balance to match
                if (frm.doc.current_balance !== frm.doc.card_value) {
                    frm.set_value('current_balance', frm.doc.card_value);
                }
            }
        }

        // Set initial balance equal to card value for new cards
        // Always sync current_balance with card_value for new cards
        if (frm.doc.__islocal && frm.doc.card_value) {
            if (!frm.doc.current_balance || frm.doc.current_balance !== frm.doc.card_value) {
                frm.set_value('current_balance', frm.doc.card_value);
            }
        }
    }
});
