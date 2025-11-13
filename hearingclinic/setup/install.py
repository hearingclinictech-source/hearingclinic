# hearingclinic/hearingclinic/setup/install.py

import frappe
from frappe import _
from frappe.utils import cint

def after_install():
    """Complete setup automatically after app installation"""
    
    if cint(frappe.db.get_single_value("System Settings", "setup_complete")):
        return
    
    try:
        # 1. Setup administrator
        # setup_administrator()
        
        # 2. Setup company (this will create chart of accounts automatically)
        setup_company()
        
        
        # 4. Mark setup as complete
        frappe.db.set_single_value("System Settings", "setup_complete", 1)
        frappe.db.set_default("desktop:home_page", "workspace")
        
        frappe.db.commit()
        
        print("✓ Hearing Clinic setup completed successfully!")
        print("✓ Company created with Chart of Accounts")
        print("✓ Fixtures will be imported next...")
        
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Hearing Clinic Installation Error")
        raise


def setup_administrator():
    """Setup administrator user"""
    from frappe.utils.password import update_password
    import os
    
    administrator = frappe.get_doc("User", "Administrator")
    
    if not administrator.first_name:
        administrator.first_name = "System"
        administrator.last_name = "Administrator"
        administrator.email = "admin@hearingclinic.local"
        administrator.save(ignore_permissions=True)
        print("✓ Administrator user configured")


def setup_company():
    """Create company with chart of accounts"""
    
    # Check if company already exists
    if frappe.db.exists("Company", "Hearing Clinic"):
        print("⊙ Company 'Hearing Clinic' already exists")
        return "Hearing Clinic"
    
    # Create the company - ERPNext will automatically create Chart of Accounts
    company_doc = frappe.get_doc({
        "doctype": "Company",
        "company_name": "Hearing Clinic",
        "abbr": "HC",
        "default_currency": "MYR",
        "country": "Malaysia",
        "domain": "Healthcare",
        # Chart of Accounts will be created automatically on insert
    })
    
    # Insert will trigger the creation of default accounts
    company_doc.insert(ignore_permissions=True, ignore_mandatory=True)
    
    # Set as default company
    frappe.db.set_single_value("Global Defaults", "default_company", company_doc.name)
    
    frappe.db.commit()
    
    print(f"✓ Company '{company_doc.name}' created with Chart of Accounts")
    
    return company_doc.name
