# hearingclinic/hearingclinic/setup/install.py

import frappe
from frappe.utils import cint

def after_migrate():
    """Run after migrations and fixtures are complete"""
    
    if cint(frappe.db.get_single_value("System Settings", "setup_complete")):
        return
    
    try:
        # Now it's safe to create company - all fixtures are loaded
        if not frappe.db.exists("Company", "Hearing Clinic"):
            setup_company()
        
        # Mark setup complete
        frappe.db.set_single_value("System Settings", "setup_complete", 1)
        frappe.db.commit()
        
        print("✓ Hearing Clinic setup completed!")
        
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Hearing Clinic Setup Error")
        print(f"⊙ Setup error: {str(e)}")


def setup_company():
    """Create company with chart of accounts"""
    
    company_doc = frappe.get_doc({
        "doctype": "Company",
        "company_name": "Hearing Clinic",
        "abbr": "HC",
        "default_currency": "MYR",
        "country": "Malaysia",
        "domain": "Healthcare",
    })
    
    company_doc.insert(ignore_permissions=True, ignore_mandatory=True)
    frappe.db.set_single_value("Global Defaults", "default_company", company_doc.name)
    frappe.db.commit()
    
    print(f"✓ Company '{company_doc.name}' created")