import frappe
from frappe.utils import flt
from hearingclinic.hearingclinic.doc_events.vac_payment_calculator import calculate_vac_payment_amounts

def validate(doc, method):
    """Add VAC payment entry during validation (before submit)

    This ensures the payment entry exists when ERPNext validates that POS invoices
    have at least one payment method.

    For return invoices, validates that VAC payment was properly copied from original.
    """
    if not doc.value_add_card:
        return

    # Only validate for draft documents
    if doc.docstatus != 0:
        return

    try:
        # Validate return invoices
        if doc.is_return:
            # Force update_outstanding_for_self to 0 for VAC returns
            # This prevents ERPNext from trying to update the original invoice's outstanding
            doc.update_outstanding_for_self = 0
            validate_return_vac_payment(doc)
            return

        # For regular invoices, use payment calculator
        amounts = calculate_vac_payment_amounts(doc)
        vac_amount = amounts["vac_amount"]

        # Only add payment entry if amount > 0
        if vac_amount > 0:
            # Add or update VAC payment entry in the payments table
            existing_vac_payment = None
            for payment in doc.payments:
                if payment.mode_of_payment == "Value Add Card":
                    existing_vac_payment = payment
                    break

            if existing_vac_payment:
                # Update existing entry
                existing_vac_payment.amount = vac_amount
            else:
                # Add new entry
                doc.append("payments", {
                    "mode_of_payment": "Value Add Card",
                    "amount": vac_amount,
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
        frappe.throw(f"Failed to validate VAC payment: {str(e)}")


def validate_return_vac_payment(doc):
    """Validate that VAC payment was properly copied to return invoice

    Args:
        doc: Return Sales Invoice document with is_return=True

    Raises:
        frappe.ValidationError: If VAC payment is missing or incorrect
    """
    if not doc.return_against:
        frappe.throw("Return invoice must have 'Return Against' field set")

    # Get original invoice
    try:
        original = frappe.get_doc("Sales Invoice", doc.return_against)
    except Exception:
        frappe.throw(f"Original invoice {doc.return_against} not found")

    # Check if original had VAC payment
    original_vac_payment = None
    for payment in original.payments:
        if payment.mode_of_payment == "Value Add Card":
            original_vac_payment = payment
            break

    if not original_vac_payment:
        frappe.throw(
            f"Original invoice {doc.return_against} did not use Value Add Card payment. "
            "Please remove the Value Add Card from this return invoice."
        )

    # Check if return invoice has VAC payment
    return_vac_payments = [p for p in doc.payments if p.mode_of_payment == "Value Add Card"]

    if not return_vac_payments:
        frappe.throw(
            "Value Add Card payment is missing from return invoice. "
            f"Expected refund amount: {frappe.format_value(original_vac_payment.amount, dict(fieldtype='Currency'))}. "
            "Please check that the payment was copied correctly from the original invoice."
        )

    # Validate amount matches (negated)
    return_vac_payment = return_vac_payments[0]
    expected_amount = -1 * original_vac_payment.amount

    if abs(abs(return_vac_payment.amount) - abs(expected_amount)) > 0.01:  # Allow for rounding
        frappe.throw(
            f"Value Add Card refund amount mismatch. "
            f"Expected: {frappe.format_value(expected_amount, dict(fieldtype='Currency'))}, "
            f"Got: {frappe.format_value(return_vac_payment.amount, dict(fieldtype='Currency'))}. "
            "Please check the payment amount in the return invoice."
        )

def on_submit(doc, method):
    """Handle Value Add Card payment on invoice submission"""
    if not doc.value_add_card:
        return

    try:
        card = frappe.get_doc("Value Add Card", doc.value_add_card)

        # For return invoices, credit the card
        if doc.is_return:
            process_return_refund(doc, card)
            return

        # For regular invoices, charge the card
        process_regular_payment(doc, card)

    except Exception as e:
        frappe.log_error(f"Error processing Value Add Card: {str(e)}")
        frappe.throw(f"Failed to process Value Add Card payment: {str(e)}")


def process_return_refund(doc, card):
    """Process VAC refund for return invoice

    Args:
        doc: Return Sales Invoice document
        card: Value Add Card document

    Raises:
        frappe.ValidationError: If refund cannot be processed
    """
    # Get the VAC payment amount from the return invoice (will be negative)
    vac_payment_amount = 0
    for payment in doc.payments:
        if payment.mode_of_payment == "Value Add Card":
            vac_payment_amount = abs(payment.amount)  # Convert negative to positive for refund
            break

    if vac_payment_amount == 0:
        frappe.throw(
            "Value Add Card payment amount is zero or not found in return invoice. "
            "Cannot process refund. Please check the payment details."
        )

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

    # Note: We don't call add_vac_to_pos_payments() here because the payment
    # was already copied from the original invoice by ERPNext's make_return_doc()
    # Adding it again would modify the submitted document and trigger validation errors

    frappe.msgprint(
        f"Value Add Card credited: {frappe.format_value(vac_payment_amount, dict(fieldtype='Currency'))}. "
        f"New balance: {frappe.format_value(result['balance_after'], dict(fieldtype='Currency'))}",
        indicator="blue"
    )


def process_regular_payment(doc, card):
    """Process VAC payment for regular invoice

    Args:
        doc: Sales Invoice document
        card: Value Add Card document

    Raises:
        frappe.ValidationError: If payment cannot be processed
    """
    # Use payment calculator for consistent amounts
    amounts = calculate_vac_payment_amounts(doc)
    vac_amount = amounts["vac_amount"]

    if vac_amount == 0:
        # Zero balance card - no transaction to create, just update invoice status
        doc.db_set("card_amount_used", 0, update_modified=False)
        doc.db_set("outstanding_amount", doc.grand_total, update_modified=False)
        doc.db_set("status", "Unpaid", update_modified=False)
        frappe.msgprint(
            "Value Add Card has zero balance. No payment was processed from the card.",
            indicator="orange"
        )
        return

    # Use the card's add_transaction method with "Purchase" type
    result = card.add_transaction(
        transaction_type="Purchase",
        amount=vac_amount,
        reference_doctype="Sales Invoice",
        reference_name=doc.name,
        remarks=f"Payment for invoice {doc.name}"
    )

    # Update sales invoice
    doc.db_set("card_amount_used", vac_amount, update_modified=False)

    # Calculate outstanding using calculator
    outstanding = amounts["outstanding"]

    # Update invoice status
    if outstanding <= 0:
        doc.db_set("status", "Paid", update_modified=False)
        doc.db_set("outstanding_amount", 0, update_modified=False)
    else:
        doc.db_set("status", "Partly Paid", update_modified=False)
        doc.db_set("outstanding_amount", outstanding, update_modified=False)

    # Add VAC payment to payments table
    add_vac_to_pos_payments(doc, vac_amount)

    frappe.msgprint(
        f"Value Add Card charged: {frappe.format_value(vac_amount, dict(fieldtype='Currency'))}. "
        f"Remaining balance: {frappe.format_value(result['balance_after'], dict(fieldtype='Currency'))}. "
        f"Outstanding: {frappe.format_value(outstanding if outstanding > 0 else 0, dict(fieldtype='Currency'))}",
        indicator="green"
    )


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