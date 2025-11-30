import frappe
from frappe.utils import now_datetime, flt

def on_submit(doc, method):
    """Handle Value Add Card payment on invoice submission"""
    if not doc.value_add_card:
        return
    
    try:
        card = frappe.get_doc("Value Add Card", doc.value_add_card)
        
        # Determine amount to deduct from card
        amount_to_deduct = min(card.current_balance, doc.grand_total)
        
        # Create Card Transaction
        card_transaction = frappe.get_doc({
            "doctype": "Card Transaction",
            "card_number": doc.value_add_card,  # ← FIXED: use card_number field
            "transaction_type": "Purchase",
            "transaction_date": now_datetime(),
            "amount": amount_to_deduct,
            "sales_invoice": doc.name,
            "remarks": f"Payment for invoice {doc.name}"
        })
        card_transaction.insert()
        card_transaction.submit()
        
        # Update sales invoice with amount used
        doc.db_set("card_amount_used", amount_to_deduct, update_modified=False)
        
        # Calculate how much was paid via other methods
        other_payments = sum([flt(p.amount) for p in doc.payments]) if doc.payments else 0
        
        # Total paid = VAC + other payments
        total_paid = amount_to_deduct + other_payments
        
        # Calculate outstanding
        outstanding = doc.grand_total - total_paid
        
        # Update status and outstanding
        if outstanding <= 0:
            doc.db_set("status", "Paid", update_modified=False)
            doc.db_set("outstanding_amount", 0, update_modified=False)
        else:
            doc.db_set("status", "Partly Paid", update_modified=False)
            doc.db_set("outstanding_amount", outstanding, update_modified=False)
        
        # If POS invoice, add to payments table for display
        if doc.is_pos:
            add_vac_to_pos_payments(doc, amount_to_deduct)
        
        frappe.msgprint(
            f"Value Add Card {doc.value_add_card} charged: {frappe.format_value(amount_to_deduct, dict(fieldtype='Currency'))}. "
            f"Card remaining balance: {frappe.format_value(card.current_balance, dict(fieldtype='Currency'))}. "
            f"Invoice outstanding: {frappe.format_value(outstanding if outstanding > 0 else 0, dict(fieldtype='Currency'))}",
            indicator="green"
        )
        
    except Exception as e:
        frappe.log_error(f"Error processing Value Add Card: {str(e)}")
        frappe.throw(f"Failed to process Value Add Card payment: {str(e)}")


def add_vac_to_pos_payments(doc, amount):
    """Add Value Add Card to POS payments table after submit"""
    # Check if already exists
    existing = frappe.db.exists("Sales Invoice Payment", {
        "parent": doc.name,
        "mode_of_payment": "Value Add Card"
    })
    
    if existing:
        frappe.db.set_value("Sales Invoice Payment", existing, "amount", amount)
    else:
        # Add new row
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
    """Get default cash account for company"""
    company_doc = frappe.get_cached_doc("Company", company)
    return company_doc.default_cash_account


def on_cancel(doc, method):
    """Reverse Value Add Card transaction on invoice cancellation"""
    if not doc.value_add_card:
        return
    
    try:
        # Find and cancel the related card transaction
        transactions = frappe.get_all(
            "Card Transaction",
            filters={
                "sales_invoice": doc.name,
                "docstatus": 1
            },
            pluck="name"
        )
        
        for transaction_name in transactions:
            transaction = frappe.get_doc("Card Transaction", transaction_name)
            transaction.cancel()
            frappe.msgprint(f"Card transaction {transaction_name} cancelled", indicator="blue")
        
        # Remove from POS payments if exists
        if doc.is_pos:
            frappe.db.delete("Sales Invoice Payment", {
                "parent": doc.name,
                "mode_of_payment": "Value Add Card"
            })
            
    except Exception as e:
        frappe.log_error(f"Error cancelling Value Add Card transaction: {str(e)}")
        frappe.throw(f"Failed to cancel Value Add Card transaction: {str(e)}")
    try:
        # Cancel Card Transaction
        transactions = frappe.get_all(
            "Card Transaction",
            filters={
                "sales_invoice": doc.name,
                "docstatus": 1
            },
            pluck="name"
        )
        
        for transaction_name in transactions:
            transaction = frappe.get_doc("Card Transaction", transaction_name)
            transaction.cancel()
            frappe.msgprint(f"Card transaction {transaction_name} cancelled", indicator="blue")
        
        # Remove from POS payments if exists
        if doc.is_pos:
            frappe.db.delete("Sales Invoice Payment", {
                "parent": doc.name,
                "mode_of_payment": "Value Add Card"
            })
            
    except Exception as e:
        frappe.log_error(f"Error cancelling Value Add Card transaction: {str(e)}")
        frappe.throw(f"Failed to cancel Value Add Card transaction: {str(e)}")

    # Handle card creation cancellation
    # Find any VACs created by this invoice
    created_cards = frappe.get_all(
        "Value Add Card",
        filters={
            "sales_invoice": doc.name
        },
        pluck="name"
    )
    
    for card_name in created_cards:
        card = frappe.get_doc("Value Add Card", card_name)
        
        # Only delete if card hasn't been used
        if card.current_balance == card.card_value:
            card.delete()
            frappe.msgprint(f"Unused Value Add Card {card_name} deleted", indicator="blue")
        else:
            frappe.msgprint(
                f"Warning: Value Add Card {card_name} has been used and cannot be deleted. "
                f"Please handle manually.",
                indicator="orange"
            )