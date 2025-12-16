import frappe
from frappe.utils import flt

def validate(doc, method):
    """Add VAC payment entry during validation (before submit) for POS invoices

    This ensures the payment entry exists when ERPNext validates that POS invoices
    have at least one payment method.
    """
    if not doc.value_add_card:
        return

    # Only pre-populate for draft documents
    if doc.docstatus != 0:
        return

    # For return invoices, don't recalculate - ERPNext copies the payment entries
    # from the original invoice with negative amounts, which is correct
    if doc.is_return:
        return

    try:
        card = frappe.get_doc("Value Add Card", doc.value_add_card)

        # Calculate amount that will be deducted
        amount_to_deduct = min(card.current_balance, doc.grand_total)

        # Only add payment entry if amount > 0
        if amount_to_deduct > 0:
            # Add or update VAC payment entry in the payments table
            existing_vac_payment = None
            for payment in doc.payments:
                if payment.mode_of_payment == "Value Add Card":
                    existing_vac_payment = payment
                    break

            if existing_vac_payment:
                # Update existing entry
                existing_vac_payment.amount = amount_to_deduct
            else:
                # Add new entry
                doc.append("payments", {
                    "mode_of_payment": "Value Add Card",
                    "amount": amount_to_deduct,
                    "account": get_default_cash_account(doc.company),
                    "type": "Cash"
                })
        else:
            # Remove any existing VAC payment entry if amount is 0
            for payment in list(doc.payments):
                if payment.mode_of_payment == "Value Add Card":
                    doc.remove(payment)

    except Exception as e:
        frappe.log_error(f"Error in VAC validate hook: {str(e)}")
        # Don't throw here - let on_submit handle the actual transaction

def on_submit(doc, method):
    """Handle Value Add Card payment on invoice submission"""
    if not doc.value_add_card:
        return

    try:
        card = frappe.get_doc("Value Add Card", doc.value_add_card)

        # For return invoices, we need to credit back the card
        if doc.is_return:
            # Get the VAC payment amount from the return invoice (will be negative)
            vac_payment_amount = 0
            for payment in doc.payments:
                if payment.mode_of_payment == "Value Add Card":
                    vac_payment_amount = abs(payment.amount)  # Convert negative to positive for refund
                    break

            if vac_payment_amount > 0:
                # Add refund transaction to the card
                result = card.add_transaction(
                    transaction_type="Refund",
                    amount=vac_payment_amount,
                    reference_doctype="Sales Invoice",
                    reference_name=doc.name,
                    remarks=f"Refund for return invoice {doc.name} (against {doc.return_against})"
                )

                # Update sales invoice
                doc.db_set("card_amount_used", -vac_payment_amount, update_modified=False)

                # Ensure VAC payment entry exists with negative amount
                add_vac_to_pos_payments(doc, -vac_payment_amount)

                frappe.msgprint(
                    f"Value Add Card credited: {frappe.format_value(vac_payment_amount, dict(fieldtype='Currency'))}. "
                    f"New balance: {frappe.format_value(result['balance_after'], dict(fieldtype='Currency'))}",
                    indicator="blue"
                )
            return

        # For regular invoices (not returns)
        # Determine amount to deduct from card
        amount_to_deduct = min(card.current_balance, doc.grand_total)

        # Use the card's add_transaction method with "Purchase" type
        result = card.add_transaction(
            transaction_type="Purchase",  # Changed from "Debit"
            amount=amount_to_deduct,
            reference_doctype="Sales Invoice",
            reference_name=doc.name,
            remarks=f"Payment for invoice {doc.name}"
        )

        # Update sales invoice
        doc.db_set("card_amount_used", amount_to_deduct, update_modified=False)

        # Calculate payments (exclude VAC payment to avoid double-counting)
        other_payments = sum([flt(p.amount) for p in doc.payments if p.mode_of_payment != "Value Add Card"]) if doc.payments else 0
        total_paid = amount_to_deduct + other_payments
        outstanding = doc.grand_total - total_paid

        # Update invoice status
        if outstanding <= 0:
            doc.db_set("status", "Paid", update_modified=False)
            doc.db_set("outstanding_amount", 0, update_modified=False)
        else:
            doc.db_set("status", "Partly Paid", update_modified=False)
            doc.db_set("outstanding_amount", outstanding, update_modified=False)

        # Add VAC payment to payments table only if amount > 0 (regardless of is_pos status)
        if amount_to_deduct > 0:
            add_vac_to_pos_payments(doc, amount_to_deduct)

        frappe.msgprint(
            f"Value Add Card charged: {frappe.format_value(amount_to_deduct, dict(fieldtype='Currency'))}. "
            f"Remaining balance: {frappe.format_value(result['balance_after'], dict(fieldtype='Currency'))}. "
            f"Outstanding: {frappe.format_value(outstanding if outstanding > 0 else 0, dict(fieldtype='Currency'))}",
            indicator="green"
        )

    except Exception as e:
        frappe.log_error(f"Error processing Value Add Card: {str(e)}")
        frappe.throw(f"Failed to process Value Add Card payment: {str(e)}")


def on_cancel(doc, method):
    """Reverse Value Add Card transaction on invoice cancellation"""
    if not doc.value_add_card:
        return

    try:
        card = frappe.get_doc("Value Add Card", doc.value_add_card)

        # Use the card's remove_transaction method
        result = card.remove_transaction(
            reference_doctype="Sales Invoice",
            reference_name=doc.name
        )

        if result:
            # For return invoices, cancellation means we remove the credit (deduct from card)
            # For regular invoices, cancellation means we restore the amount (credit to card)
            if doc.is_return:
                frappe.msgprint(
                    f"Return cancelled: Amount {frappe.format_value(result['amount_restored'], dict(fieldtype='Currency'))} deducted from card. "
                    f"New balance: {frappe.format_value(result['new_balance'], dict(fieldtype='Currency'))}",
                    indicator="orange"
                )
            else:
                frappe.msgprint(
                    f"Amount {frappe.format_value(result['amount_restored'], dict(fieldtype='Currency'))} restored. "
                    f"New balance: {frappe.format_value(result['new_balance'], dict(fieldtype='Currency'))}",
                    indicator="blue"
                )

        # Always remove VAC payment entry (regardless of is_pos status)
        frappe.db.delete("Sales Invoice Payment", {
            "parent": doc.name,
            "mode_of_payment": "Value Add Card"
        })

    except Exception as e:
        frappe.log_error(f"Error cancelling transaction: {str(e)}")
        frappe.throw(f"Failed to cancel transaction: {str(e)}")


def add_vac_to_pos_payments(doc, amount):
    existing = frappe.db.exists("Sales Invoice Payment", {
        "parent": doc.name,
        "mode_of_payment": "Value Add Card"
    })
    
    if existing:
        frappe.db.set_value("Sales Invoice Payment", existing, "amount", amount)
    else:
        frappe.get_doc({
            "doctype": "Sales Invoice Payment",
            "parent": doc.name,
            "parenttype": "Sales Invoice",
            "parentfield": "payments",
            "mode_of_payment": "Value Add Card",
            "amount": amount,
            "account": get_default_cash_account(doc.company),
            "type": "Cash"
        }).insert(ignore_permissions=True)


def get_default_cash_account(company):
    company_doc = frappe.get_cached_doc("Company", company)
    return company_doc.default_cash_account