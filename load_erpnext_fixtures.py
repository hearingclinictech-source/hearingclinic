#!/usr/bin/env python3
"""
Load ERPNext test fixtures required for HearingClinic tests
This creates the missing test records that Customer depends on
"""

import frappe
from frappe.test_runner import make_test_records

def load_fixtures():
    """Load required ERPNext test fixtures"""

    print("Loading ERPNext test fixtures...")

    # Required fixtures for Customer DocType
    fixtures = [
        "Customer Group",
        "Territory",
        "Lead",
        "Sales Partner",
        "Sales Person",
    ]

    for doctype in fixtures:
        try:
            print(f"  Loading {doctype}...")
            make_test_records(doctype, force=True, commit=True)
            print(f"  ✓ {doctype} loaded")
        except Exception as e:
            print(f"  ⚠ {doctype} - {str(e)}")

    frappe.db.commit()
    print("\n✓ Fixtures loaded successfully!")

if __name__ == "__main__":
    frappe.init(site="development.localhost")
    frappe.connect()

    try:
        load_fixtures()
    finally:
        frappe.destroy()
