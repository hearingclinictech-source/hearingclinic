"""
Diagnostic script to check Value Add Card list view configuration
Run with: bench --site <site-name> execute hearingclinic.utils.diagnose_vac_list_view.diagnose
"""
import frappe
import json

def diagnose():
    """Diagnose Value Add Card list view configuration issues"""

    print("\n" + "="*80)
    print("VALUE ADD CARD LIST VIEW DIAGNOSTICS")
    print("="*80)

    # 1. Check DocType JSON configuration
    print("\n1. DOCTYPE FIELDS WITH in_list_view:")
    print("-" * 80)
    doctype = frappe.get_meta("Value Add Card")
    list_view_fields = [f for f in doctype.fields if f.in_list_view]
    if list_view_fields:
        for field in list_view_fields:
            print(f"  ✓ {field.fieldname} ({field.label}) - in_list_view: {field.in_list_view}")
    else:
        print("  ✗ No fields have in_list_view set in DocType JSON!")

    # 2. Check Property Setters
    print("\n2. PROPERTY SETTERS FOR VALUE ADD CARD:")
    print("-" * 80)
    property_setters = frappe.db.sql("""
        SELECT name, field_name, property, value
        FROM `tabProperty Setter`
        WHERE doc_type = 'Value Add Card'
        ORDER BY field_name, property
    """, as_dict=True)

    if property_setters:
        for ps in property_setters:
            print(f"  • {ps.name}")
            print(f"    Field: {ps.field_name or 'N/A'}")
            print(f"    Property: {ps.property}")
            print(f"    Value: {ps.value}")
    else:
        print("  ✓ No Property Setters found (good - using DocType JSON)")

    # 3. Check List View Settings
    print("\n3. LIST VIEW SETTINGS:")
    print("-" * 80)
    list_view_settings = frappe.db.sql("""
        SELECT name, fields
        FROM `tabList View Settings`
        WHERE name LIKE '%Value Add Card%'
    """, as_dict=True)

    if list_view_settings:
        for lvs in list_view_settings:
            print(f"  • {lvs.name}")
            if lvs.fields:
                try:
                    fields = json.loads(lvs.fields)
                    print(f"    Custom fields: {', '.join(fields)}")
                except:
                    print(f"    Fields (raw): {lvs.fields}")
    else:
        print("  ✓ No List View Settings found (good - using DocType defaults)")

    # 4. Check actual DocType document
    print("\n4. VALUE ADD CARD DOCTYPE DOCUMENT:")
    print("-" * 80)
    vac_doctype = frappe.get_doc("DocType", "Value Add Card")
    print(f"  Modified: {vac_doctype.modified}")
    print(f"  Modified by: {vac_doctype.modified_by}")

    # 5. Summary
    print("\n" + "="*80)
    print("EXPECTED CONFIGURATION:")
    print("="*80)
    expected_fields = ["customer", "issue_date", "card_value", "current_balance", "status"]
    print(f"  Fields with in_list_view: {', '.join(expected_fields)}")
    print(f"\n  Standard filters: customer, status")

    print("\n" + "="*80)
    print("RECOMMENDATION:")
    print("="*80)
    if property_setters:
        print("  ⚠ Property Setters found - run fix_value_add_card_list_view.py patch")
    elif list_view_settings:
        print("  ⚠ Custom List View Settings found - delete them or run patch")
    elif not list_view_fields or len(list_view_fields) < 5:
        print("  ⚠ DocType JSON missing in_list_view fields - update may not have been applied")
        print("  → Run: bench --site <site> migrate")
        print("  → Or: bench --site <site> reload-doctype 'Value Add Card' --force")
    else:
        print("  ✓ Configuration looks correct!")
        print("  → Clear browser cache (Ctrl+Shift+R)")
        print("  → Or: bench --site <site> clear-cache")

    print("="*80 + "\n")
