import frappe

def execute():
    """Fix Value Add Card list view by clearing caches and list view settings"""

    print("Fixing Value Add Card list view configuration...")

    # Delete any user-specific list view settings for Value Add Card
    # These can override the DocType's default in_list_view settings
    deleted_count = frappe.db.sql("""
        DELETE FROM `tabList View Settings`
        WHERE name LIKE '%Value Add Card%'
    """)
    print(f"Deleted {deleted_count} List View Settings")

    # Remove ALL Property Setters for Value Add Card
    # We want the DocType JSON to be the source of truth
    property_setters_to_remove = frappe.db.sql("""
        SELECT name, field_name, property FROM `tabProperty Setter`
        WHERE doc_type = 'Value Add Card'
    """, as_dict=True)

    for ps in property_setters_to_remove:
        try:
            frappe.delete_doc("Property Setter", ps.name, force=True, ignore_permissions=True)
            print(f"Removed Property Setter: {ps.name} (field: {ps.field_name}, property: {ps.property})")
        except Exception as e:
            print(f"Error removing Property Setter {ps.name}: {e}")

    # Clear all caches for Value Add Card
    frappe.clear_cache(doctype="Value Add Card")

    # Clear the entire cache to be sure
    frappe.clear_cache()

    # Force reload the DocType to ensure latest JSON is applied
    frappe.reload_doctype("Value Add Card", force=True)

    frappe.db.commit()

    print("\nValue Add Card list view has been reset!")
    print("Expected fields in list view: customer, issue_date, card_value, current_balance, status")
    print("Please hard-refresh your browser (Ctrl+Shift+R) to see changes.")
