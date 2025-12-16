"""
Sales Invoice Partial Payment and Payment History API
Version: 2024-11-29 Final
File: hearingclinic/api/sales_invoice.py
"""

import frappe
from frappe import _
from frappe.utils import flt, nowdate, get_link_to_form, formatdate
from erpnext.accounts.doctype.payment_entry.payment_entry import get_payment_entry


@frappe.whitelist()
def record_final_payment(invoice_name, payment_amount, mode_of_payment, 
                        posting_date=None, reference_no=None, reference_date=None, remarks=None):
    """
    Record final payment for a Sales Invoice with partial payment
    
    Args:
        invoice_name: Name of the Sales Invoice
        payment_amount: Amount being paid
        mode_of_payment: Mode of Payment to use
        posting_date: Date of payment (defaults to today)
        reference_no: Cheque/reference number (optional)
        reference_date: Reference date (optional)
        remarks: Payment remarks (optional)
    
    Returns:
        str: Name of created Payment Entry
    """
    # Validate invoice exists and is submitted
    if not frappe.db.exists("Sales Invoice", invoice_name):
        frappe.throw(_("Sales Invoice {0} not found").format(invoice_name))
    
    invoice = frappe.get_doc("Sales Invoice", invoice_name)
    
    if invoice.docstatus != 1:
        frappe.throw(_("Sales Invoice must be submitted"))
    
    # Validate payment amount
    payment_amount = flt(payment_amount)
    outstanding_amount = flt(invoice.outstanding_amount)
    
    frappe.logger().debug(f"Recording payment: {payment_amount} for invoice {invoice_name}, outstanding: {outstanding_amount}")
    
    if payment_amount <= 0:
        frappe.throw(_("Payment amount must be greater than zero"))
    
    if payment_amount > outstanding_amount:
        frappe.throw(_("Payment amount cannot exceed outstanding amount of {0}").format(outstanding_amount))
    
    # Create Payment Entry using ERPNext's standard function
    pe = get_payment_entry("Sales Invoice", invoice_name, bank_amount=payment_amount)
    
    # Update payment entry with provided details
    pe.mode_of_payment = mode_of_payment
    pe.posting_date = posting_date or nowdate()
    pe.paid_amount = payment_amount
    pe.received_amount = payment_amount
    
    if reference_no:
        pe.reference_no = reference_no
    if reference_date:
        pe.reference_date = reference_date
    if remarks:
        pe.remarks = remarks
    
    # Update the references table with correct allocated amount
    for ref in pe.references:
        if ref.reference_doctype == "Sales Invoice" and ref.reference_name == invoice_name:
            ref.allocated_amount = payment_amount
            frappe.logger().debug(f"Set allocated amount to {payment_amount} for reference {ref.idx}")
    
    # Save and submit the payment entry
    pe.insert(ignore_permissions=True)
    frappe.logger().debug(f"Payment Entry {pe.name} inserted")
    
    pe.submit()
    frappe.logger().debug(f"Payment Entry {pe.name} submitted")
    
    # Update the Sales Invoice's custom field for printing
    frappe.db.set_value("Sales Invoice", invoice_name, 
                       "custom_amount_paid_this_transaction", payment_amount,
                       update_modified=False)
    
    # Commit the transaction to ensure all changes are saved
    frappe.db.commit()
    
    # Reload the invoice to get updated outstanding amount
    invoice.reload()
    
    frappe.logger().debug(f"After payment - Invoice outstanding: {invoice.outstanding_amount}, status: {invoice.status}")
    
    # Add a comment to the invoice
    invoice.add_comment("Comment", 
        _("Final payment of {0} recorded via {1}").format(
            frappe.format_value(payment_amount, {'fieldtype': 'Currency'}),
            get_link_to_form("Payment Entry", pe.name)
        )
    )
    
    return pe.name


@frappe.whitelist()
def get_payment_history(invoice_name):
    """
    Get complete payment history for a Sales Invoice
    Returns both POS payments and Payment Entries
    
    Args:
        invoice_name: Name of the Sales Invoice
    
    Returns:
        dict: Payment history with total paid
    """
    if not frappe.db.exists("Sales Invoice", invoice_name):
        return {"payments": [], "total_paid": 0}
    
    invoice = frappe.get_doc("Sales Invoice", invoice_name)
    payments = []
    
    # 1. Get POS payments (from the invoice itself)
    if invoice.payments:
        for payment in invoice.payments:
            # Determine payment type - special handling for Value Add Card
            payment_type = "Value Add Card" if payment.mode_of_payment == "Value Add Card" else "POS Payment"

            payments.append({
                "date": formatdate(invoice.posting_date),
                "reference": invoice.name,
                "mode_of_payment": payment.mode_of_payment,
                "amount": flt(payment.amount),
                "type": payment_type
            })
    
    # 2. Get Payment Entries linked to this invoice
    payment_entries = frappe.get_all(
        "Payment Entry Reference",
        filters={
            "reference_doctype": "Sales Invoice",
            "reference_name": invoice_name,
            "docstatus": 1
        },
        fields=["parent", "allocated_amount"]
    )
    
    for pe_ref in payment_entries:
        pe = frappe.get_doc("Payment Entry", pe_ref.parent)
        payments.append({
            "date": formatdate(pe.posting_date),
            "reference": pe.name,
            "mode_of_payment": pe.mode_of_payment,
            "amount": flt(pe_ref.allocated_amount),
            "type": "Payment Entry"
        })
    
    # Sort by date
    payments.sort(key=lambda x: x["date"])
    
    # Calculate total paid
    total_paid = sum([p["amount"] for p in payments])
    
    return {
        "payments": payments,
        "total_paid": total_paid,
        "currency": invoice.currency
    }


def override_pos_payment_amount(doc, method=None):
    """
    Hook function to override POS payment amount when partial payment is specified
    Called via validate hook

    Args:
        doc: Sales Invoice document
        method: Hook method name (unused)
    """
    if not doc.is_pos:
        return

    # Only process for unsaved/unsubmitted documents
    if doc.docstatus != 0:
        return

    # Skip for return invoices - ERPNext handles payment copying correctly
    if doc.is_return:
        return

    # Check if partial payment amount is specified
    partial_amount = flt(doc.get("custom_partial_payment_amount"))
    grand_total = flt(doc.grand_total)
    
    frappe.logger().debug(f"POS Payment Override - Partial: {partial_amount}, Grand Total: {grand_total}")
    
    if partial_amount > 0 and partial_amount < grand_total:
        # Validate partial amount
        if partial_amount > grand_total:
            frappe.throw(_("Partial payment amount cannot exceed invoice total"))
        
        # Override the payment amount in POS payments
        total_payment = 0
        for payment in doc.payments:
            # Set the payment amount to the partial amount
            payment.amount = partial_amount
            payment.base_amount = partial_amount
            total_payment += partial_amount
            frappe.logger().debug(f"Set payment {payment.idx} to {partial_amount}")
        
        # Update paid amount and change amount
        doc.paid_amount = partial_amount
        doc.base_paid_amount = partial_amount
        
        # Calculate change amount (should be 0 for partial payments normally)
        doc.change_amount = 0
        doc.base_change_amount = 0
        
        # Explicitly set outstanding amount
        doc.outstanding_amount = grand_total - partial_amount
        
        # Set the is_partial_payment flag
        doc.is_partial_payment = 1
        
        # Set status to indicate partial payment
        # ERPNext will calculate this in set_status() but we can hint it
        if hasattr(doc, 'status'):
            doc.status = 'Partly Paid'
        
        # Store this amount for printing
        doc.custom_amount_paid_this_transaction = partial_amount
        
        frappe.logger().debug(f"Final paid_amount: {doc.paid_amount}, outstanding: {doc.outstanding_amount}, is_partial_payment: 1, status: {doc.status}")
    else:
        # Full payment - ensure is_partial_payment is cleared
        doc.is_partial_payment = 0
        doc.custom_amount_paid_this_transaction = grand_total
        frappe.logger().debug(f"Full payment: {grand_total}, is_partial_payment: 0")


def ensure_partial_payment_flag(doc, method=None):
    """
    Hook to ensure is_partial_payment flag is correctly set after submission
    Called via on_submit hook
    """
    if not doc.is_pos:
        return

    # Skip for return invoices
    if doc.is_return:
        return

    # Check if there's an outstanding amount
    if flt(doc.outstanding_amount) > 0 and flt(doc.paid_amount) > 0:
        # There's both payment and outstanding - this is partial payment
        if not doc.is_partial_payment:
            frappe.logger().debug(f"Setting is_partial_payment flag on {doc.name}")
            frappe.db.set_value("Sales Invoice", doc.name, "is_partial_payment", 1, update_modified=False)
    else:
        # Full payment or no payment
        if doc.is_partial_payment:
            frappe.logger().debug(f"Clearing is_partial_payment flag on {doc.name}")
            frappe.db.set_value("Sales Invoice", doc.name, "is_partial_payment", 0, update_modified=False)