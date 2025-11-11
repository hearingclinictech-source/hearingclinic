"""
Sales Invoice on_submit hook for creating extension maintenance schedules.
Place this in: your_app/your_app/custom_hooks/sales_invoice_hooks.py
"""

import frappe
from frappe import _
from frappe.utils import add_months, getdate

# Configuration Constants
RECURRING_INTERVAL_MONTHS = 6  # Interval for recurring maintenance visits


def create_maintenance_schedule_from_sales_invoice(doc, method=None):
    """
    Hook function for Sales Invoice on_submit event.
    
    Automatically creates a Maintenance Schedule if this is a warranty extension SI.
    
    Detection Logic:
    - Has warranty extension item(s) (item_group = "Warranty Extension")
    - Warranty extension item has serial numbers in custom_warranty_serial_number field
    → This is an EXTENSION, create MS with only recurring visits
    
    Args:
        doc: Sales Invoice document
        method: Hook method (not used)
    
    Returns:
        str: Name of created Maintenance Schedule, or None
    """
    frappe.log_error("SI on_submit hook triggered", "Extension Hook")
    
    try:
        # Look for warranty extension items
        warranty_extension_items = []
        
        for item in doc.items:
            item_doc = frappe.get_doc("Item", item.item_code)
            
            # Check for warranty extension item
            if item_doc.item_group == "Warranty Extension":
                # Check if it has serial numbers
                serial_numbers = item.get("custom_warranty_serial_number")
                if serial_numbers:
                    warranty_extension_items.append({
                        "item": item,
                        "item_doc": item_doc,
                        "serial_numbers": serial_numbers,
                        "start_date": item.get("custom_extension_start_date")
                    })
        
        if not warranty_extension_items:
            frappe.log_error("No warranty extension items with serial numbers found - skipping", "Extension Hook")
            return None
        
        frappe.log_error(f"Found {len(warranty_extension_items)} warranty extension item(s)", "Extension Hook")
        
        # Process each warranty extension item (usually just one)
        created_schedules = []
        
        for ext_item in warranty_extension_items:
            # Get warranty duration from item
            warranty_months = ext_item["item_doc"].get("custom_warranty")
            if not warranty_months:
                frappe.log_error(f"Warranty extension item {ext_item['item'].item_code} has no custom_warranty value - skipping", "Extension Hook")
                continue
            
            warranty_months = int(warranty_months)
            serial_numbers = ext_item["serial_numbers"]
            
            # Determine start date: use item's custom field or SI posting date
            start_date = ext_item["start_date"] or doc.posting_date
            
            frappe.log_error(
                f"Creating extension for: Warranty: {warranty_months} months, Serials: {serial_numbers}, Start: {start_date}",
                "Extension Hook"
            )
            
            # Create the extension maintenance schedule
            maintenance_schedule = create_extension_maintenance_schedule(
                sales_invoice=doc,
                warranty_months=warranty_months,
                start_date=start_date,
                serial_numbers=serial_numbers,
                warranty_item=ext_item["item"]
            )
            
            created_schedules.append(maintenance_schedule.name)
        
        # Show success message
        if created_schedules:
            if len(created_schedules) == 1:
                frappe.msgprint(
                    _("✓ Maintenance Schedule Created: <a href='/app/maintenance-schedule/{0}'>{0}</a>").format(
                        created_schedules[0]
                    ),
                    indicator="green",
                    alert=True,
                    title=_("Extension Schedule Created")
                )
            else:
                schedule_links = "<br>".join([f"<a href='/app/maintenance-schedule/{s}'>{s}</a>" for s in created_schedules])
                frappe.msgprint(
                    _("✓ Maintenance Schedules Created:<br>{0}").format(schedule_links),
                    indicator="green",
                    alert=True,
                    title=_("Extension Schedules Created")
                )
        
        return created_schedules[0] if created_schedules else None
        
    except Exception as e:
        error_msg = str(e)
        frappe.log_error(
            f"Failed to create MS from extension SI:\n{frappe.get_traceback()}\n\nError: {error_msg}",
            "Extension Hook Error"
        )
        frappe.msgprint(
            _("Warning: Sales Invoice submitted but Maintenance Schedule creation failed. Error: {0}").format(error_msg),
            indicator="orange"
        )
        return None


def create_extension_maintenance_schedule(sales_invoice, warranty_months, start_date,
                                          serial_numbers, warranty_item):
    """
    Create a Maintenance Schedule for the extension with ONLY recurring visits.
    
    Business Logic:
    - No 1-month or 4-month visits (extension only has recurring visits)
    - Visits at: 6, 12, 18, 24... months from start date
    - Final visit at warranty expiry if not on recurring interval
    
    Args:
        sales_invoice: Sales Invoice document
        warranty_months: Warranty duration in months
        start_date: Start date for the schedule
        serial_numbers: Device serial numbers (concatenated)
        warranty_item: Warranty Item from SI
    
    Returns:
        Maintenance Schedule document
    """
    customer_doc = frappe.get_doc("Customer", sales_invoice.customer)
    
    # Calculate number of visits (only recurring, no initial 1 and 4 month visits)
    recurring_visits = calculate_extension_recurring_visits(warranty_months)
    
    frappe.log_error(
        f"Creating extension schedule - Duration: {warranty_months} months, Visits: {recurring_visits}",
        "Extension Schedule Creation"
    )
    
    # Create Maintenance Schedule
    ms = frappe.new_doc("Maintenance Schedule")
    ms.customer = sales_invoice.customer
    ms.customer_name = customer_doc.customer_name
    ms.transaction_date = start_date
    ms.company = sales_invoice.company
    ms.custom_device_serial_number = serial_numbers  # Store serial numbers
    ms.naming_series = f'{customer_doc.customer_name}-Extension-.YYYY.'
    
    # Add maintenance schedule item
    ms.append("items", {
        "item_code": warranty_item.item_code,
        "item_name": f'{sales_invoice.customer} - {warranty_item.item_code} Extension',
        "start_date": start_date,
        "end_date": add_months(start_date, warranty_months),
        "periodicity": "Monthly",
        "no_of_visits": recurring_visits,
        "sales_person": getattr(sales_invoice, 'sales_person', None)
    })
    
    # Save and generate schedule
    ms.insert(ignore_permissions=True)
    ms.generate_schedule()
    
    # Set visit dates (only recurring visits for extensions)
    set_extension_visit_dates(ms, start_date, warranty_months)
    
    # Save and submit
    ms.save(ignore_permissions=True)
    ms.submit()
    
    frappe.log_error(f"Extension Maintenance Schedule created: {ms.name}", "Extension Creation")
    
    return ms


def calculate_extension_recurring_visits(warranty_months):
    """
    Calculate number of recurring visits for extension (no initial 1 and 4 month visits).
    
    Business Logic:
    - First visit at 6 months, then every 6 months
    - Final visit at warranty expiry if not on recurring interval
    
    Args:
        warranty_months: Total warranty duration in months
    
    Returns:
        int: Number of visits
    """
    # Count visits at 6-month intervals starting from month 6
    recurring_visits = 0
    current_month = RECURRING_INTERVAL_MONTHS
    last_visit_month = 0
    
    while current_month <= warranty_months:
        recurring_visits += 1
        last_visit_month = current_month
        current_month += RECURRING_INTERVAL_MONTHS
    
    # Add final visit at warranty expiry if needed
    if last_visit_month < warranty_months:
        recurring_visits += 1
        frappe.log_error(
            f"Adding final extension visit at month {warranty_months} (last recurring was month {last_visit_month})",
            "Extension Visit Calculation"
        )
    
    return recurring_visits


def set_extension_visit_dates(maintenance_schedule, start_date, warranty_months):
    """
    Set visit dates for extension schedule (only recurring visits, no 1 and 4 month visits).
    
    Visit Schedule:
    - Recurring: 6, 12, 18, 24... months from start date
    - Final: warranty_months (if not already scheduled on recurring interval)
    
    Args:
        maintenance_schedule: The maintenance schedule document
        start_date: Start date for schedule
        warranty_months: Total warranty duration in months
    """
    schedules = maintenance_schedule.schedules
    schedule_index = 0
    
    # Only recurring visits: 6, 12, 18, 24... (no 1 and 4 month visits)
    current_month = RECURRING_INTERVAL_MONTHS
    last_scheduled_month = 0
    
    while schedule_index < len(schedules) and current_month <= warranty_months:
        schedules[schedule_index].scheduled_date = add_months(start_date, current_month)
        schedules[schedule_index].description = f"{current_month} Month Check (Extension)"
        last_scheduled_month = current_month
        current_month += RECURRING_INTERVAL_MONTHS
        schedule_index += 1
    
    # Final visit at warranty expiry (if not already scheduled)
    if schedule_index < len(schedules) and last_scheduled_month < warranty_months:
        schedules[schedule_index].scheduled_date = add_months(start_date, warranty_months)
        schedules[schedule_index].description = f"{warranty_months} Month Check (Warranty Expiry)"
        schedule_index += 1
        frappe.log_error(f"Added final extension visit at month {warranty_months}", "Extension Visit Dates Set")
    
    frappe.log_error(f"Set {schedule_index} extension visit dates", "Extension Visit Dates Set")