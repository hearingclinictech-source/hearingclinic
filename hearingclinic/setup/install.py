# hearingclinic/hearingclinic/setup/install.py

import frappe
from frappe import _
from frappe.utils import cint
from erpnext.setup.doctype.company.company import install_country_fixtures

def after_install():
    """Complete setup automatically after app installation"""
    
    if cint(frappe.db.get_single_value("System Settings", "setup_complete")):
        return
    
    try:
        # 1. Create foundational data (must be done programmatically)
        setup_administrator()
        setup_company()
        
        # 2. Install country fixtures
        install_country_fixtures("Malaysia")
        
        # 3. Fixtures will handle the rest:
        #    - Settings configuration
        #    - Custom fields
        #    - Property setters
        #    - Master data
        
        # 4. Mark setup as complete
        frappe.db.set_single_value("System Settings", "setup_complete", 1)
        frappe.db.set_default("desktop:home_page", "workspace")
        
        frappe.db.commit()
        
        print("Hearing Clinic setup completed successfully!")
        print("Settings and customizations will be imported from fixtures...")
        
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
        administrator.email = "thomas@dierochs.de"
        administrator.save(ignore_permissions=True)
    
    # Set password
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    update_password("Administrator", admin_password, logout_all_sessions=False)


def setup_company():
    """Create company with chart of accounts"""
    
    if frappe.db.exists("Company", "Hearing Clinic"):
        return
    
    from erpnext.setup.doctype.company.company import create_default_company_accounts
    
    company_doc = frappe.get_doc({
        "doctype": "Company",
        "company_name": "Hearing Clinic",
        "abbr": "HC",
        "default_currency": "MYR",
        "country": "Malaysia",
        "domain": "Healthcare",
    })
    
    company_doc.insert(ignore_permissions=True)
    create_default_company_accounts(company_doc.name, company_doc.abbr, company_doc.country)
    
    frappe.db.commit()