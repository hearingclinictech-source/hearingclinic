import frappe
from frappe import _

def before_insert(doc, method):
    """Check for potential duplicates before creating customer"""
    check_for_duplicates_before_insert(doc)
    
def check_for_duplicates_before_insert(doc):
    """Check for duplicates and provide helpful message"""
    
    # Check by NRIC/Passport (exact match - hard stop)
    if doc.get("custom_nricpassport"):
        nric_matches = frappe.get_all(
            "Customer",
            filters={"custom_nricpassport": doc.custom_nricpassport},
            fields=["name", "customer_name", "custom_date_of_birth", "custom_nricpassport"]
        )
        
        if nric_matches:
            existing = nric_matches[0]
            frappe.throw(
                _("Customer already exists with NRIC/Passport: <b>{0}</b><br><br>"
                  "Existing Customer: <a href='/app/customer/{1}'>{2}</a><br>"
                  "DOB: {3}").format(
                    doc.custom_nricpassport,
                    existing.name,
                    existing.customer_name,
                    frappe.format(existing.custom_date_of_birth, {"fieldtype": "Date"}) if existing.custom_date_of_birth else "Not set"
                ),
                title=_("Duplicate Customer Found")
            )
    
    # Check by Name (similar name match - soft warning)
    if doc.get("customer_name"):
        # Search for similar names (case-insensitive, partial match)
        name_matches = frappe.get_all(
            "Customer",
            filters={
                "customer_name": ["like", f"%{doc.customer_name}%"]
            },
            fields=["name", "customer_name", "custom_nricpassport", "custom_date_of_birth"],
            limit=5
        )
        
        if name_matches:
            match_list = []
            for m in name_matches:
                dob_str = frappe.format(m.custom_date_of_birth, {"fieldtype": "Date"}) if m.custom_date_of_birth else "N/A"
                nric_str = m.custom_nricpassport or "N/A"
                match_list.append(
                    f"• <a href='/app/customer/{m.name}' target='_blank'>{m.customer_name}</a> "
                    f"(NRIC: {nric_str}, DOB: {dob_str})"
                )
            
            match_html = "<br>".join(match_list)
            
            frappe.msgprint(
                _("Found {0} customer(s) with similar names:<br><br>{1}<br><br>"
                  "Please verify this is not a duplicate before continuing.").format(
                    len(name_matches),
                    match_html
                ),
                title=_("Possible Duplicate Customers"),
                indicator="orange"
            )

def validate(doc, method):
    """Additional validation on save (for updates)"""
    # Only check duplicates on new records, not on updates
    if not doc.is_new():
        return
    
    # You can add additional validations here if needed
    pass