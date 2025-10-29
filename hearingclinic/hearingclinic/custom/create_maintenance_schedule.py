import frappe
from frappe import _
from frappe.utils import add_months, add_years

@frappe.whitelist()
def create_hearing_aid_maintenance_schedule(doc, method=None):
    """
    Create maintenance schedule for hearing aid items from a Sales Invoice or similar document.
    
    Args:
        doc: The source document (e.g., Sales Invoice) containing items
        method: Optional method parameter for hooks (not used)
    
    Returns:
        str: Name of the created maintenance schedule, or None if no schedule was created
    """
    # Collect all hearing aid items first
    hearing_aid_items = []
    
    for item in doc.items:
        try:
            item_doc = frappe.get_doc("Item", item.item_code)
            
            if item_doc.item_group and item_doc.item_group == "Hearing Aids":
                device_serial = item.get("custom_device_serial_number")
                if device_serial:
                    hearing_aid_items.append(item)
        except Exception as e:
            frappe.log_error(
                f"Error checking item {item.item_code}: {str(e)}", 
                "Hearing Aid Item Check"
            )
            continue
    
    # Only create maintenance schedule if there are hearing aid items
    if not hearing_aid_items:
        frappe.msgprint(
            _("No hearing aid items with serial numbers found"), 
            indicator="orange"
        )
        return None
    
    # Use only the FIRST hearing aid item
    try:
        first_item = hearing_aid_items[0]
        
        # Get customer details
        customer_doc = frappe.get_doc("Customer", doc.customer)
        
        # Create maintenance schedule
        maintenance_schedule = frappe.new_doc("Maintenance Schedule")
        maintenance_schedule.customer = doc.customer
        maintenance_schedule.customer_name = customer_doc.customer_name
        maintenance_schedule.transaction_date = doc.posting_date
        maintenance_schedule.company = doc.company
        maintenance_schedule.naming_series = f'{customer_doc.customer_name}-{first_item.item_name}-.YYYY.'
        
        # Add 1 month check
        maintenance_schedule.append("items", {
            "item_code": first_item.item_code,
            "item_name": f'{doc.customer} - {first_item.item_code} - 1month',
            "start_date": doc.posting_date,
            "end_date": add_months(doc.posting_date, 1),
            "periodicity": "Monthly",
            "no_of_visits": 1
        })
        
        # Add 3 month check
        maintenance_schedule.append("items", {
            "item_code": first_item.item_code,
            "item_name": f'{doc.customer} - {first_item.item_code} - 3month',
            "start_date": doc.posting_date,
            "end_date": add_months(doc.posting_date, 3),
            "periodicity": "Quarterly",
            "no_of_visits": 1
        })
        
        # Add 6 month recurring check (10 years = 20 visits)
        maintenance_schedule.append("items", {
            "item_code": first_item.item_code,
            "item_name": f'{doc.customer} - {first_item.item_code} - Recurring',
            "start_date": doc.posting_date,
            "end_date": add_years(doc.posting_date, 10),
            "periodicity": "Half Yearly",
            "no_of_visits": 20
        })
        
        # Save and submit the maintenance schedule
        maintenance_schedule.insert(ignore_permissions=True)
        maintenance_schedule.submit()
        
        frappe.msgprint(
            _("SUCCESS - Maintenance Schedule Created: {0}").format(maintenance_schedule.name),
            indicator="green",
            alert=True
        )
        
        return maintenance_schedule.name
        
    except Exception as e:
        error_msg = _("Error creating maintenance schedule: {0}").format(str(e))
        frappe.msgprint(error_msg, indicator="red", alert=True)
        frappe.log_error(str(e), "Hearing Aid Maintenance Schedule Creation")
        return None


# Example usage in hooks.py:
# doc_events = {
#     "Sales Invoice": {
#         "on_submit": "your_app.module_name.create_hearing_aid_maintenance_schedule"
#     }
# }

# Or call directly in your code:
# create_hearing_aid_maintenance_schedule(sales_invoice_doc)