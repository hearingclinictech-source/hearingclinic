import frappe
from frappe.utils import now_datetime, flt


"""Auto-create Value Add Card if invoice contains card item"""

frappe.log_error(f"after_submit called for invoice {doc.name}", "VAC Debug")

print("=" * 60)
print("AFTER_SUBMIT CALLED")
print(f"Invoice: {doc.name}")
print(f"Items count: {len(doc.items)}")

# Check if invoice contains Value Add Card item
for item in doc.items:
    print(f"Checking item: {item.item_code}")
    
    if item.item_code == "ACC-025":  # Match your item code
        print(f"FOUND VALUE-ADD-CARD! Qty: {item.qty}, Amount: {item.amount}")
        
        # Create Value Add Card for each quantity
        for i in range(int(item.qty)):
            amount_per_card = item.amount / item.qty
            print(f"Creating card {i+1} with amount {amount_per_card}")
            card_name = create_value_add_card(doc, amount_per_card)
            print(f"Created card: {card_name}")
        
        break  # Only process once even if multiple VAC items

print("=" * 60)

def create_value_add_card(sales_invoice, amount_paid):
    """Create a Value Add Card document
    
    Args:
        sales_invoice: Sales Invoice document
        amount_paid: Amount customer paid for the card
    """
    try:
        # Create Value Add Card
        card = frappe.get_doc({
            "doctype": "Value Add Card",
            "customer": sales_invoice.customer,
            "issue_date": sales_invoice.posting_date,
            "amount_paid": amount_paid,
            "sales_invoice": sales_invoice.name
        })
        card.insert()
        
        # Show message with card number
        frappe.msgprint(
            f"<strong>Value Add Card Created:</strong> {card.name}<br>"
            f"Amount Paid: {frappe.format_value(amount_paid, dict(fieldtype='Currency'))}<br>"
            f"Card Value: {frappe.format_value(card.card_value, dict(fieldtype='Currency'))}<br>"
            f"<br><strong>Please provide this card number to the customer.</strong>",
            indicator="green",
            title="Card Created"
        )
        
        return card.name
        
    except Exception as e:
        frappe.log_error(f"Error creating Value Add Card: {str(e)}")
        frappe.msgprint(f"Error creating Value Add Card: {str(e)}", indicator="red")
        return None
