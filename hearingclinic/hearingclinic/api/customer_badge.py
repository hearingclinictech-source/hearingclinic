import frappe
from frappe import _

@frappe.whitelist()
def get_customer_badge_info(customer):
    """Get customer since badge information"""
    customer_doc = frappe.get_doc('Customer', customer)
    
    if not customer_doc.custom_customer_since:
        return {}
    
    # Check for hearing aids sales invoices
    # First get all submitted sales invoices for this customer
    sales_invoices = frappe.get_all('Sales Invoice', 
        filters={'customer': customer, 'docstatus': 1}, 
        pluck='name')
    
    has_hearing_aid = False
    has_purchases = False
    if sales_invoices:
        has_purchases = True
        # Check if any invoice item has Hearing Aids item group
        hearing_aid_items = frappe.db.count('Sales Invoice Item', {
            'parent': ['in', sales_invoices],
            'item_group': 'Hearing Aids'
        })
        has_hearing_aid = hearing_aid_items > 0

    return {
        'customer_since': customer_doc.custom_customer_since,
        'has_hearing_aid': has_hearing_aid,
        'purchase_status': 'P' if has_purchases else 'NP'
    }