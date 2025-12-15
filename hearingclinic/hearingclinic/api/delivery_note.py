import frappe
from frappe import _

@frappe.whitelist()
def create_delivery_note_from_invoice(sales_invoice_name):
    """
    Create a Delivery Note from a Sales Invoice
    
    Args:
        sales_invoice_name (str): Name of the Sales Invoice
        
    Returns:
        str: Name of the created Delivery Note
    """
    if not sales_invoice_name:
        frappe.throw(_("Sales Invoice name is required"))
    
    # Get the Sales Invoice
    sales_invoice = frappe.get_doc("Sales Invoice", sales_invoice_name)
    
    # Check if invoice is submitted
    if sales_invoice.docstatus != 1:
        frappe.throw(_("Sales Invoice must be submitted to create Delivery Note"))
    
    # Check if Delivery Note already exists for this invoice
    existing_dn = frappe.db.exists("Delivery Note Item", {
        "against_sales_invoice": sales_invoice_name
    })
    
    if existing_dn:
        frappe.msgprint(_("A Delivery Note may already exist for this invoice. Please check."))
    
    # Create new Delivery Note
    delivery_note = frappe.new_doc("Delivery Note")
    
    # Copy header fields
    delivery_note.customer = sales_invoice.customer
    delivery_note.customer_name = sales_invoice.customer_name
    delivery_note.posting_date = frappe.utils.today()
    delivery_note.posting_time = frappe.utils.nowtime()
    delivery_note.company = sales_invoice.company
    delivery_note.currency = sales_invoice.currency
    
    # Copy warehouse if available
    if sales_invoice.get('set_warehouse'):
        delivery_note.set_warehouse = sales_invoice.set_warehouse
    
    # Copy customer address and contact if available
    if sales_invoice.get('customer_address'):
        delivery_note.customer_address = sales_invoice.customer_address
    
    if sales_invoice.get('shipping_address_name'):
        delivery_note.shipping_address_name = sales_invoice.shipping_address_name
    
    if sales_invoice.get('contact_person'):
        delivery_note.contact_person = sales_invoice.contact_person
    
    # Copy items (only Hearing Aids from the item group)
    items_copied = 0
    for item in sales_invoice.items:
        # Check if this item is a Product Bundle (has a bundle configured)
        is_bundle = frappe.db.exists("Product Bundle", {"new_item_code": item.item_code})
        
        # Skip Product Bundle parent items
        if is_bundle:
            continue
        
        # Get the item's item group
        item_group = frappe.db.get_value("Item", item.item_code, "item_group")
        
        # Only copy items from "Hearing Aids" item group
        if item_group not in ["Hearing Aids", "Warranty"]:
            continue
        
        dn_item = delivery_note.append("items", {})
        dn_item.item_code = item.item_code
        dn_item.item_name = item.item_name
        dn_item.description = item.description
        dn_item.qty = item.qty
        dn_item.uom = item.uom
        dn_item.stock_uom = item.stock_uom
        
        # Set conversion factor
        if item.get('conversion_factor'):
            dn_item.conversion_factor = item.conversion_factor
        else:
            dn_item.conversion_factor = 1
        
        # Set warehouse if available
        if item.get('warehouse'):
            dn_item.warehouse = item.warehouse
        
        # Link back to Sales Invoice
        dn_item.against_sales_invoice = sales_invoice.name
        dn_item.si_detail = item.name
        
        # Copy rates (optional - since you're not tracking stock value)
        dn_item.rate = item.rate
        dn_item.amount = item.amount
        
        items_copied += 1
    
    # Check if any items were copied
    if items_copied == 0:
        frappe.throw(_("No eligible items found to create Delivery Note. Please ensure items are from 'Hearing Aids' item group."))
    
    # Insert the Delivery Note (don't submit yet - user needs to enter serial numbers)
    delivery_note.insert()
    
    # Add a comment linking the documents
    sales_invoice.add_comment(
        "Info",
        _("Delivery Note <a href='/app/delivery-note/{0}'>{0}</a> created").format(delivery_note.name)
    )
    
    frappe.msgprint(
        _("Delivery Note <a href='/app/delivery-note/{0}'>{0}</a> created successfully with {1} items").format(
            delivery_note.name, items_copied
        ),
        title=_("Success"),
        indicator="green"
    )
    
    return delivery_note.name