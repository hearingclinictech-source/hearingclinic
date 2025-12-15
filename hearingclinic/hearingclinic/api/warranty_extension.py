"""
API endpoints for warranty extension functionality.
Place this in: your_app/your_app/api/warranty_extension.py
"""

import frappe
from frappe import _
from frappe.utils import getdate, today, nowdate

@frappe.whitelist()
def create_extension_sales_invoice(maintenance_schedule, warranty_months, start_from_today,
                                   create_draft, last_scheduled_date, serial_numbers, customer):
    """
    Create a Sales Invoice for warranty extension.
    
    This only creates the Sales Invoice with warranty item.
    The Maintenance Schedule will be created automatically when the Sales Invoice 
    is submitted (via the SI on_submit hook that detects warranty-only invoices).
    
    Args:
        maintenance_schedule: Name of the existing maintenance schedule
        warranty_months: Duration of new warranty in months (as string)
        start_from_today: Boolean (as string '0' or '1') - start immediately or after last visit
        create_draft: Boolean (as string '0' or '1') - create as draft or submitted
        last_scheduled_date: Last scheduled date from existing schedule
        serial_numbers: Device serial numbers (concatenated with " | ")
        customer: Customer ID
    
    Returns:
        dict: Success status and created Sales Invoice name, or error message
    """
    try:
        # Convert parameters
        warranty_months = int(warranty_months)
        start_from_today = int(start_from_today) == 1
        create_draft = int(create_draft) == 1
        
        frappe.log_error(
            f"Creating extension SI - Warranty: {warranty_months} months, Start from today: {start_from_today}, Draft: {create_draft}",
            "Extension SI Creation"
        )
        
        # Find warranty item for the specified duration
        warranty_item = find_warranty_item(warranty_months)
        if not warranty_item:
            return {
                'success': False,
                'error': _('No warranty item found for {0} months. Please create a warranty item with custom_warranty = {0}').format(warranty_months)
            }
        
        # Determine start date for future maintenance schedule
        if start_from_today:
            start_date = today()
        else:
            # Start after last scheduled date, or today if last date is in the past
            if getdate(last_scheduled_date) < getdate(today()):
                start_date = today()
            else:
                start_date = last_scheduled_date
        
        frappe.log_error(f"Future MS start date will be: {start_date}", "Extension SI Creation")
        
        # Create Sales Invoice
        sales_invoice = create_warranty_sales_invoice(
            customer=customer,
            warranty_item=warranty_item,
            serial_numbers=serial_numbers,
            start_date=start_date,
            create_draft=create_draft
        )
        
        frappe.db.commit()
        
        return {
            'success': True,
            'sales_invoice': sales_invoice.name,
            'warranty_months': warranty_months,
            'is_draft': create_draft
        }
        
    except Exception as e:
        frappe.db.rollback()
        error_msg = str(e)
        frappe.log_error(
            f"Extension SI creation failed:\n{frappe.get_traceback()}\n\nError: {error_msg}",
            "Maintenance Extension SI Error"
        )
        return {
            'success': False,
            'error': _('Error creating Sales Invoice: {0}').format(error_msg)
        }


def find_warranty_item(warranty_months):
    """
    Find a warranty item with the specified duration.
    
    Args:
        warranty_months: Warranty duration in months
    
    Returns:
        Item document or None
    """
    items = frappe.get_all(
        "Item",
        filters={
            "item_group": "Warranty Extension",
            "custom_warranty": str(warranty_months),
            "disabled": 0
        },
        limit=1
    )
    
    if items:
        return frappe.get_doc("Item", items[0].name)
    
    return None


def create_warranty_sales_invoice(customer, warranty_item, serial_numbers, start_date, create_draft):
    """
    Create a Sales Invoice for the warranty extension.
    
    Stores serial numbers and start date in the item's custom fields.
    
    Args:
        customer: Customer ID
        warranty_item: Warranty Item document
        serial_numbers: Device serial numbers (concatenated)
        start_date: Start date for future maintenance schedule
        create_draft: Boolean - create as draft or submit immediately
    
    Returns:
        Sales Invoice document
    """
    customer_doc = frappe.get_doc("Customer", customer)
    
    # Create Sales Invoice
    si = frappe.new_doc("Sales Invoice")
    si.customer = customer
    si.posting_date = nowdate()
    si.set_posting_time = 1
    
    # Get default company
    company = frappe.defaults.get_user_default("Company")
    si.company = company
    
    # Add warranty extension item with serial numbers in the item row
    si.append("items", {
        "item_code": warranty_item.item_code,
        "item_name": warranty_item.item_name,
        "description": warranty_item.description,
        "qty": 1,
        "rate": warranty_item.standard_rate or 0,
        "custom_warranty_serial_number": serial_numbers,  # Serial numbers on item
        "custom_extension_start_date": start_date  # Start date on item
    })
    
    # Insert (and optionally submit)
    si.insert(ignore_permissions=True)
    
    if not create_draft:
        si.submit()
        frappe.log_error(f"Sales Invoice created and submitted: {si.name}", "Extension SI Creation")
    else:
        frappe.log_error(f"Sales Invoice created as draft: {si.name}", "Extension SI Creation")
    
    return si