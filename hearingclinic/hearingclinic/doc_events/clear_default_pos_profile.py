"""
Clear Default POS Profile
Prevents automatic selection of POS Profile and forces user selection
"""

import frappe


def before_load(doc, method=None):
    """
    Set flag to prevent ERPNext from auto-selecting POS Profile
    """
    if doc.is_new() and doc.is_pos:
        # Set flag to prevent auto-population of POS Profile
        doc.flags.ignore_pos_profile = True


def onload(doc, method=None):
    """
    Clear auto-populated POS Profile on new Sales Invoices
    Forces users to manually select a POS Profile

    Special handling for return invoices:
    - Always clear POS Profile to prevent payment recalculation
    - Preserve payments copied from original invoice
    """
    # For return invoices, always clear POS Profile to prevent payment consolidation
    if doc.is_return:
        # Clear POS Profile but DON'T clear payments (they were correctly copied)
        if doc.pos_profile:
            frappe.logger().info(f"Return invoice {doc.name}: Clearing POS Profile '{doc.pos_profile}' to prevent payment recalculation")
            doc.pos_profile = None
        return

    # Only clear on new documents that haven't been saved yet
    if doc.is_new() and doc.is_pos:
        # Clear the POS Profile if it was auto-populated
        if doc.pos_profile:
            doc.pos_profile = None
        # Also clear the payments table since it was populated based on the auto-selected profile
        doc.payments = []
        # Ensure the flag persists
        doc.flags.ignore_pos_profile = True
