import re
import frappe
from frappe import _
from frappe.utils import add_months, getdate, today

# Configuration Constants
RECURRING_INTERVAL_MONTHS = 6  # Interval for recurring maintenance visits


@frappe.whitelist()
def create_hearing_aid_maintenance_schedule(doc, method=None):
    """
    Create maintenance schedule for NEW hearing aid sales from a Delivery Note.
    
    Business Logic:
    - Only processes Delivery Notes with Hearing Aid items
    - Collects serial numbers from ALL hearing aids (typically 2 devices)
    - Gets warranty duration from Warranty item
    - Creates single maintenance schedule covering all devices
    - Schedule includes: 1 month, 4 months, then recurring visits every 6 months
    
    Args:
        doc: The Delivery Note document containing items
        method: Optional method parameter for hooks (not used)
    
    Returns:
        str: Name of the created maintenance schedule, or None if no schedule was created
    """
    # Only process Delivery Notes
    if doc.doctype != "Delivery Note":
        frappe.msgprint(_("This function only works with Delivery Notes"), indicator="red")
        return None
    
    posting_date = doc.posting_date
    if not posting_date:
        frappe.msgprint(_("Could not find posting date"), indicator="red")
        return None
    
    # Step 1: Extract warranty information and serial numbers
    sale_info = extract_sale_information(doc)
    if not sale_info:
        return None
    
    warranty_months = sale_info["warranty_months"]
    serial_numbers = sale_info["serial_numbers"]  # Concatenated with " | "
    reference_item = sale_info["reference_item"]
    
    # Step 2: Create the maintenance schedule
    try:
        maintenance_schedule = create_maintenance_schedule_doc(
            doc=doc,
            serial_numbers=serial_numbers,
            warranty_months=warranty_months,
            start_date=posting_date,
            reference_item=reference_item
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


def extract_sale_information(doc):
    """
    Extract warranty duration and serial numbers from Delivery Note items.
    
    Business Logic:
    - Finds warranty item to get warranty duration
    - Collects ALL hearing aid items and their serial numbers
    - Concatenates multiple serial numbers with " | " separator
    - Only processes if BOTH warranty AND hearing aids with serials are found
    
    Args:
        doc: Delivery Note document
    
    Returns:
        dict: Contains warranty_months, serial_numbers (concatenated), reference_item
        None: If no warranty item or no hearing aids with serials found
    """
    warranty_item = None
    warranty_months = None
    hearing_aid_items = []
    serial_numbers_list = []
    
    # Scan all items in the Delivery Note
    for item in doc.items:
        try:
            item_doc = frappe.get_doc("Item", item.item_code)
            
            # Check for warranty item
            if item_doc.item_group == "Warranty":
                warranty_months = item_doc.get("custom_warranty")
                if warranty_months:
                    warranty_months = int(warranty_months)
                    warranty_item = item
                    frappe.log_error(
                        f"Found warranty item: {item.item_code}, Duration: {warranty_months} months", 
                        "Maintenance Schedule Debug"
                    )
            
            # Check for hearing aid items - collect ALL with serial numbers
            if item_doc.item_group == "Hearing Aids":
                device_serial = item.get("custom_device_serial_number")
                if device_serial:
                    hearing_aid_items.append(item)
                    serial_numbers_list.append(device_serial)
                    frappe.log_error(
                        f"Found hearing aid: {item.item_code}, Serial: {device_serial}", 
                        "Maintenance Schedule Debug"
                    )
                
        except Exception as e:
            frappe.log_error(f"Error checking item {item.item_code}: {str(e)}", "Item Check Error")
            continue
    
    # Validate we have all required information
    if not warranty_months:
        frappe.msgprint(
            _("No warranty item with custom_warranty field found in Delivery Note"), 
            indicator="orange"
        )
        return None
    
    if not serial_numbers_list:
        frappe.msgprint(
            _("No hearing aid items with serial numbers found in Delivery Note"),
            indicator="orange"
        )
        return None
    
    # Concatenate all serial numbers with " | " separator
    serial_numbers = " | ".join(serial_numbers_list)
    
    frappe.log_error(
        f"Sale info extracted - Warranty: {warranty_months} months, Serials: {serial_numbers}", 
        "Maintenance Schedule Debug"
    )
    
    return {
        "warranty_months": warranty_months,
        "serial_numbers": serial_numbers,
        "reference_item": hearing_aid_items[0]  # Use first hearing aid as reference
    }


def sanitize_naming_series_text(text):
    """
    Sanitize text for use in naming series.

    Frappe naming series only allows: - # . / { }
    All other special characters are removed or replaced.

    Args:
        text: The text to sanitize

    Returns:
        str: Sanitized text safe for naming series
    """
    # Remove any character that is not alphanumeric, space, or allowed special chars (- # . / { })
    # Replace spaces with hyphens for readability
    sanitized = re.sub(r"[^a-zA-Z0-9\s\-#.\/{}]", "", text)
    sanitized = sanitized.replace(" ", "-")
    # Remove consecutive hyphens
    sanitized = re.sub(r"-+", "-", sanitized)
    # Remove leading/trailing hyphens
    sanitized = sanitized.strip("-")
    return sanitized


def create_maintenance_schedule_doc(doc, serial_numbers, warranty_months, start_date, reference_item):
    """
    Create and submit the maintenance schedule document for initial sale.

    Business Logic:
    - Creates schedule with visits at: 1 month, 4 months, then recurring (6, 12, 18...)
    - Stores concatenated serial numbers for future reference
    - End date is warranty_months from start date

    Args:
        doc: Source Delivery Note
        serial_numbers: Device serial numbers (concatenated with " | ")
        warranty_months: Duration of warranty in months
        start_date: Start date for schedule (posting date)
        reference_item: The first hearing aid item (for naming/reference)

    Returns:
        Maintenance Schedule document
    """
    customer_doc = frappe.get_doc("Customer", doc.customer)

    # Calculate number of visits
    # Initial visits: 1 month, 4 months (2 visits)
    # Recurring visits: starting at 6 months, every 6 months thereafter
    recurring_visits = calculate_recurring_visits(warranty_months, 4)
    total_visits = 2 + recurring_visits

    frappe.log_error(
        f"Creating schedule - Duration: {warranty_months} months, Total visits: {total_visits}",
        "Schedule Creation"
    )

    # Sanitize names for naming series (only allow: - # . / { })
    sanitized_customer_name = sanitize_naming_series_text(customer_doc.customer_name)
    sanitized_item_name = sanitize_naming_series_text(reference_item.item_name)

    # Create maintenance schedule document
    maintenance_schedule = frappe.new_doc("Maintenance Schedule")
    maintenance_schedule.customer = doc.customer
    maintenance_schedule.customer_name = customer_doc.customer_name
    maintenance_schedule.transaction_date = start_date
    maintenance_schedule.company = doc.company
    maintenance_schedule.custom_device_serial_number = serial_numbers  # Store serial numbers
    maintenance_schedule.naming_series = f'{sanitized_customer_name}-{sanitized_item_name}-.YYYY.'
    
    # Add maintenance schedule item
    maintenance_schedule.append("items", {
        "item_code": reference_item.item_code,
        "item_name": f'{doc.customer} - {reference_item.item_code}',
        "start_date": start_date,
        "end_date": add_months(start_date, warranty_months),
        "periodicity": "Monthly",
        "no_of_visits": total_visits,
        "sales_person": getattr(doc, 'sales_person', None)
    })
    
    # Save and generate schedule
    maintenance_schedule.insert(ignore_permissions=True)
    maintenance_schedule.generate_schedule()
    
    # Set visit dates
    set_initial_visit_dates(maintenance_schedule, start_date, warranty_months)
    
    # Save and submit
    maintenance_schedule.save(ignore_permissions=True)
    maintenance_schedule.submit()
    
    # Success message
    frappe.msgprint(
        _("SUCCESS - Maintenance Schedule Created: {0}<br>Serial Number(s): {1}<br>Warranty: {2} months<br>Total visits: {3}").format(
            maintenance_schedule.name,
            serial_numbers,
            warranty_months,
            total_visits
        ),
        indicator="green",
        alert=True
    )
    
    return maintenance_schedule


def calculate_recurring_visits(warranty_months, start_after_months):
    """
    Calculate number of recurring visits after initial visits.
    
    Business Logic:
    - Recurring visits start after initial visits (1 and 4 months)
    - First recurring visit at 6 months, then every 6 months
    - Continues until warranty_months is reached
    - ALWAYS adds a final visit at warranty expiry if not already scheduled
    
    Args:
        warranty_months: Total warranty duration in months
        start_after_months: Start recurring visits after this many months (4 for initial sale)
    
    Returns:
        int: Number of recurring visits (including final expiry visit if needed)
    """
    months_for_recurring = warranty_months - start_after_months
    if months_for_recurring <= 0:
        return 0
    
    # Count visits at 6-month intervals (6, 12, 18, 24...)
    recurring_visits = 0
    current_month = RECURRING_INTERVAL_MONTHS
    last_visit_month = 0
    
    while current_month <= warranty_months:
        recurring_visits += 1
        last_visit_month = current_month
        current_month += RECURRING_INTERVAL_MONTHS
    
    # Check if we need a final visit at warranty expiry
    # Add one if the warranty doesn't end on a recurring interval
    if last_visit_month < warranty_months:
        recurring_visits += 1  # Add final visit at warranty expiry
        frappe.log_error(
            f"Adding final visit at month {warranty_months} (last recurring was month {last_visit_month})",
            "Visit Calculation"
        )
    
    return recurring_visits


def set_initial_visit_dates(maintenance_schedule, start_date, warranty_months):
    """
    Set visit dates for initial sale schedule.
    
    Visit Schedule:
    - Visit 1: 1 month after start
    - Visit 2: 4 months after start
    - Recurring: 6, 12, 18, 24... months after start (every 6 months)
    - Final: warranty_months (if not already scheduled on recurring interval)
    
    Args:
        maintenance_schedule: The maintenance schedule document
        start_date: Start date for schedule
        warranty_months: Total warranty duration in months
    """
    schedules = maintenance_schedule.schedules
    schedule_index = 0
    
    # Visit 1: 1 month
    if schedule_index < len(schedules):
        schedules[schedule_index].scheduled_date = add_months(start_date, 1)
        schedules[schedule_index].description = "1 Month Check"
        schedule_index += 1
    
    # Visit 2: 4 months
    if schedule_index < len(schedules):
        schedules[schedule_index].scheduled_date = add_months(start_date, 4)
        schedules[schedule_index].description = "4 Month Check"
        schedule_index += 1
    
    # Recurring visits: 6, 12, 18, 24... months (every 6 months until warranty ends)
    current_month = RECURRING_INTERVAL_MONTHS
    last_scheduled_month = 4
    
    while schedule_index < len(schedules) and current_month <= warranty_months:
        schedules[schedule_index].scheduled_date = add_months(start_date, current_month)
        schedules[schedule_index].description = f"{current_month} Month Check"
        last_scheduled_month = current_month
        current_month += RECURRING_INTERVAL_MONTHS
        schedule_index += 1
    
    # Final visit at warranty expiry (if not already scheduled)
    if schedule_index < len(schedules) and last_scheduled_month < warranty_months:
        schedules[schedule_index].scheduled_date = add_months(start_date, warranty_months)
        schedules[schedule_index].description = f"{warranty_months} Month Check (Warranty Expiry)"
        schedule_index += 1
        frappe.log_error(f"Added final visit at month {warranty_months}", "Visit Dates Set")
    
    frappe.log_error(f"Set {schedule_index} visit dates", "Visit Dates Set")


# Hook configuration for hooks.py:
# doc_events = {
#     "Delivery Note": {
#         "on_submit": "your_app.module_name.create_hearing_aid_maintenance_schedule"
#     }
# }

# Direct call example:
# create_hearing_aid_maintenance_schedule(delivery_note_doc)