import frappe

def execute():
    """Remove obsolete Contact Type custom fields from Contact and Contact Phone"""

    # List of custom field names to remove
    fields_to_remove = [
        "Contact-custom_contact_type",
        "Contact-contact_type",
        "Contact Phone-custom_contact_type",
        "Contact Phone-contact_type",
    ]

    for field_name in fields_to_remove:
        if frappe.db.exists("Custom Field", field_name):
            try:
                frappe.delete_doc("Custom Field", field_name, force=True, ignore_permissions=True)
                print(f"Deleted Custom Field: {field_name}")
            except Exception as e:
                print(f"Error deleting {field_name}: {e}")

    # Clear cache to ensure changes take effect
    frappe.clear_cache(doctype="Contact")
    frappe.clear_cache(doctype="Contact Phone")

    frappe.db.commit()
