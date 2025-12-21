"""
VAC Payment Calculator
Provides a single source of truth for calculating Value Add Card payment amounts
"""

import frappe
from frappe.utils import flt


def calculate_vac_payment_amounts(doc):
    """
    Calculate payment amounts for a Sales Invoice with VAC applied

    Args:
        doc: Sales Invoice document

    Returns:
        dict: {
            "vac_amount": float,           # Amount to charge/credit to VAC
            "other_payments": float,        # Sum of other payment methods
            "total_paid": float,            # Total amount paid
            "outstanding": float,           # Outstanding amount
            "vac_covers_full": bool        # Whether VAC covers the entire invoice
        }
    """
    if not doc.value_add_card:
        return {
            "vac_amount": 0,
            "other_payments": 0,
            "total_paid": 0,
            "outstanding": doc.grand_total,
            "vac_covers_full": False
        }

    # Get current card balance
    card = frappe.get_doc("Value Add Card", doc.value_add_card)

    # For return invoices, the amount is already negative in the payments table
    if doc.is_return:
        # Get VAC payment amount from payments table (should be negative)
        vac_amount = 0
        for payment in doc.payments:
            if payment.mode_of_payment == "Value Add Card":
                vac_amount = abs(payment.amount)  # Convert to positive for refund
                break

        # For returns, other payments should also be negative
        other_payments = sum([abs(p.amount) for p in doc.payments if p.mode_of_payment != "Value Add Card"])
        total_paid = vac_amount + other_payments

        return {
            "vac_amount": vac_amount,
            "other_payments": other_payments,
            "total_paid": total_paid,
            "outstanding": 0,  # Returns are fully credited
            "vac_covers_full": False  # Returns always have full payment info
        }

    # For regular invoices
    invoice_total = flt(doc.grand_total)
    card_balance = flt(card.current_balance)

    # Calculate amount to deduct from card (minimum of balance and invoice total)
    vac_amount = min(card_balance, invoice_total)

    # Calculate other payments (excluding VAC)
    other_payments = sum([flt(p.amount) for p in doc.payments if p.mode_of_payment != "Value Add Card"]) if doc.payments else 0

    # Calculate total paid and outstanding
    total_paid = vac_amount + other_payments
    outstanding = max(invoice_total - total_paid, 0)

    # Determine if VAC covers full amount
    vac_covers_full = card_balance >= invoice_total

    return {
        "vac_amount": vac_amount,
        "other_payments": other_payments,
        "total_paid": total_paid,
        "outstanding": outstanding,
        "vac_covers_full": vac_covers_full
    }


def get_required_payment_amount(doc):
    """
    Calculate the required payment amount for POS payments (shortfall)

    Args:
        doc: Sales Invoice document

    Returns:
        float: Amount needed from POS payments (shortfall after VAC)
    """
    if not doc.value_add_card:
        return flt(doc.grand_total)

    amounts = calculate_vac_payment_amounts(doc)
    return amounts["outstanding"]
