import frappe
from frappe import _

@frappe.whitelist()
def get_items_from_delivery_note(delivery_note):
    """
    Fetch items from a Delivery Note for Maintenance Visit
    """
    if not delivery_note:
        frappe.throw(_("Please select a Delivery Note"))
    
    # Get items from the delivery note
    items = frappe.db.sql("""
        SELECT 
            dni.item_code,
            dni.item_name,
            dni.description,
            dni.serial_no,
            dni.qty,
            dni.uom
        FROM `tabDelivery Note Item` dni
        WHERE dni.parent = %s
        ORDER BY dni.idx
    """, delivery_note, as_dict=1)
    
    return items