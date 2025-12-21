import frappe
from frappe import _

def before_insert(doc, method):
    """Check for potential duplicates before creating customer"""
    check_for_duplicates_before_insert(doc)

def check_for_duplicates_before_insert(doc):
    """Check for duplicates and provide helpful message"""

    # Check by NRIC/Passport (exact match - hard stop)
    # Only check if NRIC is provided and not empty/whitespace
    if doc.get("custom_nricpassport") and str(doc.custom_nricpassport).strip():
        nric_matches = frappe.get_all(
            "Customer",
            filters={
                "custom_nricpassport": doc.custom_nricpassport,
                "name": ["!=", doc.name]  # Exclude the current document if updating
            },
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

    all_matches = []

    # Check by Name (similar name match - soft warning)
    if doc.get("customer_name") and str(doc.customer_name).strip():
        # Search for similar names (case-insensitive, partial match)
        name_matches = frappe.get_all(
            "Customer",
            filters={
                "customer_name": ["like", f"%{doc.customer_name}%"],
                "name": ["!=", doc.name]  # Exclude the current document
            },
            fields=["name", "customer_name", "custom_nricpassport", "custom_date_of_birth"],
            limit=5
        )

        if name_matches:
            for m in name_matches:
                dob_str = frappe.format(m.custom_date_of_birth, {"fieldtype": "Date"}) if m.custom_date_of_birth else "N/A"
                nric_str = m.custom_nricpassport or "N/A"
                all_matches.append({
                    "name": m.name,
                    "type": "Similar Name",
                    "html": f"• <a href='/app/customer/{m.name}' target='_blank'>{m.customer_name}</a> "
                            f"(NRIC: {nric_str}, DOB: {dob_str})"
                })

    # Check by Date of Birth (exact match - soft warning)
    if doc.get("custom_date_of_birth"):
        dob_matches = frappe.get_all(
            "Customer",
            filters={
                "custom_date_of_birth": doc.custom_date_of_birth,
                "name": ["!=", doc.name]  # Exclude the current document
            },
            fields=["name", "customer_name", "custom_nricpassport", "custom_date_of_birth"],
            limit=5
        )

        if dob_matches:
            for m in dob_matches:
                dob_str = frappe.format(m.custom_date_of_birth, {"fieldtype": "Date"}) if m.custom_date_of_birth else "N/A"
                nric_str = m.custom_nricpassport or "N/A"
                # Check if this match is already in the list (from name matching)
                if not any(match["name"] == m.name for match in all_matches):
                    all_matches.append({
                        "name": m.name,
                        "type": "Same Date of Birth",
                        "html": f"• <a href='/app/customer/{m.name}' target='_blank'>{m.customer_name}</a> "
                                f"(NRIC: {nric_str}, DOB: {dob_str})"
                    })

    # If we found any potential duplicates, show warning (but allow creation)
    if all_matches:
        match_html = "<br>".join([match["html"] for match in all_matches])

        frappe.msgprint(
            _("Found {0} potential duplicate customer(s):<br><br>{1}<br><br>"
              "Please verify this is not a duplicate. Customer will be created anyhow - if duplicated please DELETE immediately").format(
                len(all_matches),
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