"""
Sales Invoice event handlers for Value Add Card functionality
"""
import frappe

def on_submit(doc, method):
    """Handle Value Add Card payment on invoice submission
    
    Args:
        doc: Sales Invoice document
        method: Event method name (not used but required by Frappe)
    """
    if not doc.value_add_card:
        return
    
    try:
        card = frappe.get_doc("Value Add Card", doc.value_add_card)
        
        # Determine amount to deduct from card
        amount_to_deduct = min(card.current_balance, doc.grand_total)
        
        # Create Card Transaction
        card_transaction = frappe.get_doc({
            "doctype": "Card Transaction",
            "value_add_card": doc.value_add_card,
            "transaction_type": "Purchase",
            "amount": amount_to_deduct,
            "sales_invoice": doc.name,
            "remarks": f"Payment for invoice {doc.name}"
        })
        card_transaction.insert()
        card_transaction.submit()
        
        # Update sales invoice with amount used
        doc.db_set("card_amount_used", amount_to_deduct)
        
        frappe.msgprint(
            f"Value Add Card {doc.value_add_card} charged: {frappe.format_value(amount_to_deduct, dict(fieldtype='Currency'))}. "
            f"Remaining balance: {frappe.format_value(card.current_balance, dict(fieldtype='Currency'))}",
            indicator="green"
        )
    except Exception as e:
        frappe.log_error(f"Error processing Value Add Card: {str(e)}")
        frappe.throw(f"Failed to process Value Add Card payment: {str(e)}")


def on_cancel(doc, method):
    """Reverse Value Add Card transaction on invoice cancellation
    
    Args:
        doc: Sales Invoice document
        method: Event method name (not used but required by Frappe)
    """
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
    except Exception as e:
        frappe.log_error(f"Error cancelling Value Add Card transaction: {str(e)}")
        frappe.throw(f"Failed to cancel Value Add Card transaction: {str(e)}")