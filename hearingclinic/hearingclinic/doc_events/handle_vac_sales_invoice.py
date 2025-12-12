import frappe
from frappe.utils import flt

def on_submit(doc, method):
    """Handle Value Add Card payment on invoice submission"""
    if not doc.value_add_card:
        return
    
    try:
        card = frappe.get_doc("Value Add Card", doc.value_add_card)
        
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
        
        # Calculate payments
        other_payments = sum([flt(p.amount) for p in doc.payments]) if doc.payments else 0
        total_paid = amount_to_deduct + other_payments
        outstanding = doc.grand_total - total_paid
        
        # Update invoice status
        if outstanding <= 0:
            doc.db_set("status", "Paid", update_modified=False)
            doc.db_set("outstanding_amount", 0, update_modified=False)
        else:
            doc.db_set("status", "Partly Paid", update_modified=False)
            doc.db_set("outstanding_amount", outstanding, update_modified=False)

        # Always add VAC payment to payments table (regardless of is_pos status)
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