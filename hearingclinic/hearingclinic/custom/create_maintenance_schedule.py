import frappe
from frappe import _
from frappe.utils import add_months, add_years
from dateutil.relativedelta import relativedelta

@frappe.whitelist()
def create_hearing_aid_maintenance_schedule(doc, method=None):
    """
    Create maintenance schedule for hearing aid items from a Sales Invoice or Delivery Note.
    
    Args:
        doc: The source document (e.g., Sales Invoice, Delivery Note) containing items
        method: Optional method parameter for hooks (not used)
    
    Returns:
        str: Name of the created maintenance schedule, or None if no schedule was created
    """
    # Configuration: Set the recurring interval and total duration in months
    RECURRING_INTERVAL_MONTHS = 6  # Change this to 5, 7, or any other number as needed
    TOTAL_DURATION_MONTHS = 120  # Total duration in months (120 = 10 years)
    
    # Get the posting date (field name differs between doctypes)
    posting_date = getattr(doc, 'posting_date', None) or getattr(doc, 'transaction_date', None)
    if not posting_date:
        frappe.msgprint(_("Could not find posting date"), indicator="red")
        return None
    
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
        frappe.log_error(f"Processing item: {first_item.item_code}", "Maintenance Schedule Debug")
        
        # Get customer details
        customer_doc = frappe.get_doc("Customer", doc.customer)
        frappe.log_error(f"Customer: {doc.customer}", "Maintenance Schedule Debug")
        
        # Create maintenance schedule
        maintenance_schedule = frappe.new_doc("Maintenance Schedule")
        maintenance_schedule.customer = doc.customer
        maintenance_schedule.customer_name = customer_doc.customer_name
        maintenance_schedule.transaction_date = posting_date
        maintenance_schedule.company = doc.company
        maintenance_schedule.naming_series = f'{customer_doc.customer_name}-{first_item.item_name}-.YYYY.'
        
        # Calculate total visits for recurring schedule
        # First visit at month 1, second at month 3
        # Recurring starts after month 3: from month 3 to end of duration
        months_for_recurring = TOTAL_DURATION_MONTHS - 3  # Subtract the first 3 months
        recurring_visits = months_for_recurring // RECURRING_INTERVAL_MONTHS
        
        frappe.log_error(
            f"Duration: {TOTAL_DURATION_MONTHS} months, Interval: {RECURRING_INTERVAL_MONTHS}, Recurring visits: {recurring_visits}",
            "Maintenance Schedule Debug"
        )
        
        # Add single item with multiple visits
        # Note: We use "Monthly" as periodicity since it's the shortest standard interval
        # The actual schedule dates will be set manually below
        maintenance_schedule.append("items", {
            "item_code": first_item.item_code,
            "item_name": f'{doc.customer} - {first_item.item_code}',
            "start_date": posting_date,
            "end_date": add_months(posting_date, TOTAL_DURATION_MONTHS),
            "periodicity": "Monthly",  # Use standard periodicity (Monthly/Quarterly/Half Yearly/Yearly)
            "no_of_visits": 2 + recurring_visits,  # 1 month + 3 month + recurring visits
            "sales_person": getattr(doc, 'sales_person', None)
        })
        
        frappe.log_error("Item appended, about to generate schedule", "Maintenance Schedule Debug")
        
        # Save first before generating schedule
        maintenance_schedule.insert(ignore_permissions=True)
        frappe.log_error(f"Maintenance schedule inserted: {maintenance_schedule.name}", "Maintenance Schedule Debug")
        
        # Generate the actual schedule
        maintenance_schedule.generate_schedule()
        frappe.log_error(f"Schedule generated with {len(maintenance_schedule.schedules)} visits", "Maintenance Schedule Debug")
        
        # Manually set the schedule dates
        # First visit: 1 month
        if len(maintenance_schedule.schedules) > 0:
            maintenance_schedule.schedules[0].scheduled_date = add_months(posting_date, 1)
            maintenance_schedule.schedules[0].description = "1 Month Check"
        
        # Second visit: 3 months
        if len(maintenance_schedule.schedules) > 1:
            maintenance_schedule.schedules[1].scheduled_date = add_months(posting_date, 3)
            maintenance_schedule.schedules[1].description = "3 Month Check"
        
        # Recurring visits: every RECURRING_INTERVAL_MONTHS from posting date
        # Starting at RECURRING_INTERVAL_MONTHS (e.g., 6, 12, 18, 24...)
        schedule_index = 2
        current_month = RECURRING_INTERVAL_MONTHS
        while schedule_index < len(maintenance_schedule.schedules) and current_month <= TOTAL_DURATION_MONTHS:
            maintenance_schedule.schedules[schedule_index].scheduled_date = add_months(posting_date, current_month)
            maintenance_schedule.schedules[schedule_index].description = f"{current_month} Month Check"
            current_month += RECURRING_INTERVAL_MONTHS
            schedule_index += 1
        
        frappe.log_error("Schedule dates set", "Maintenance Schedule Debug")
        
        # Save and submit the maintenance schedule
        maintenance_schedule.save(ignore_permissions=True)
        frappe.log_error("Maintenance schedule saved, about to submit", "Maintenance Schedule Debug")
        maintenance_schedule.submit()
        
        frappe.msgprint(
            _("SUCCESS - Maintenance Schedule Created: {0}<br>Recurring every {1} months for {2} months ({3} total visits)").format(
                maintenance_schedule.name,
                RECURRING_INTERVAL_MONTHS,
                TOTAL_DURATION_MONTHS,
                2 + recurring_visits
            ),
            indicator="green",
            alert=True
        )
        
        return maintenance_schedule.name
        
    except Exception as e:
        error_msg = _("Error creating maintenance schedule: {0}").format(str(e))
        frappe.msgprint(error_msg, indicator="red", alert=True)
        frappe.log_error(
            f"Full error details:\n{frappe.get_traceback()}\n\nError: {str(e)}", 
            "Hearing Aid Maintenance Schedule Creation"
        )
        return None


# Example usage in hooks.py:
# doc_events = {
#     "Sales Invoice": {
#         "on_submit": "your_app.module_name.create_hearing_aid_maintenance_schedule"
#     },
#     "Delivery Note": {
#         "on_submit": "your_app.module_name.create_hearing_aid_maintenance_schedule"
#     }
# }

# Or call directly in your code:
# create_hearing_aid_maintenance_schedule(sales_invoice_doc)
# create_hearing_aid_maintenance_schedule(delivery_note_doc)