"""
API endpoints for Value Add Card functionality
"""
import frappe

@frappe.whitelist(allow_guest=True)
def check_card_balance(card_name):
    """Check Value Add Card balance
    
    Can be used by external systems or web forms
    
    Args:
        card_name: The Value Add Card document name (e.g., VAC-2025-00001)
        
    Returns:
        dict: Success status, card number, balance, and status
    """
    try:
        card = frappe.get_doc("Value Add Card", card_name)
        return {
            "success": True,
            "card_number": card.name,
            "current_balance": card.current_balance,
            "card_value": card.card_value,
            "status": card.status,
            "customer": card.customer
        }
    except frappe.DoesNotExistError:
        return {
            "success": False,
            "message": f"Card {card_name} not found"
        }
    except Exception as e:
        frappe.log_error(f"Error checking card balance: {str(e)}")
        return {
            "success": False,
            "message": str(e)
        }


@frappe.whitelist()
def get_active_cards(customer=None):
    """Get list of active Value Add Cards
    
    Args:
        customer: Optional customer name to filter by
        
    Returns:
        list: List of active cards with details
    """
    filters = {
        "status": ["in", ["Active", "Partially Used"]],
        "current_balance": [">", 0]
    }
    
    if customer:
        filters["customer"] = customer
    
    cards = frappe.get_all(
        "Value Add Card",
        filters=filters,
        fields=["name", "customer", "current_balance", "card_value", "status", "issue_date"],
        order_by="issue_date desc"
    )
    
    return cards