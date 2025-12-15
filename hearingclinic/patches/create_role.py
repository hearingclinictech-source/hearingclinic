import frappe

def execute():
    role = "Hearing Clinic"

    # Create Role if missing
    if not frappe.db.exists("Role", role):
        frappe.get_doc({
            "doctype": "Role",
            "role_name": role,
            "desk_access": 1,  # Set to 0 if this should be a website-only role
            "disabled": 0
        }).insert(ignore_permissions=True, ignore_if_duplicate=True)
        frappe.db.commit()