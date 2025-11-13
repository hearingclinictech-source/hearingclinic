"""
Custom Field Generator for ERPNext Export Fixtures
Add this to your custom app at: your_custom_app/your_custom_app/utils/generate_fixtures.py

Run with:
    bench execute your_custom_app.utils.generate_fixtures.generate_custom_field_fixtures
"""

import frappe


def generate_custom_field_fixtures():
    """
    Generate formatted custom field list for hooks.py
    Can be run from bench console or as a scheduled command
    """
    
    # Fetch all custom fields
    custom_fields = frappe.get_all(
        "Custom Field",
        fields=["name", "dt", "label", "fieldname"],
        order_by="dt, idx"
    )
    
    if not custom_fields:
        frappe.msgprint("No custom fields found in the system.")
        return
    
    # Group by DocType
    grouped = {}
    for cf in custom_fields:
        dt = cf.get("dt")
        if dt not in grouped:
            grouped[dt] = []
        grouped[dt].append(cf)
    
    # Build output
    output_lines = [
        'fixtures = [',
        '    {',
        '        "dt": "Custom Field",',
        '        "filters": [',
        '            ["name", "in", ['
    ]
    
    for dt in sorted(grouped.keys()):
        fields = grouped[dt]
        output_lines.append(f'                # {dt} ({len(fields)} custom field{"s" if len(fields) > 1 else ""})')
        
        for field in fields:
            field_name = field.get("name")
            label = field.get("label", "")
            output_lines.append(f'                "{field_name}",  # {label}')
        
        output_lines.append('')
    
    output_lines.extend([
        '            ]]',
        '        ]',
        '    },',
        ']'
    ])
    
    output = '\n'.join(output_lines)
    
    # Print to console
    print("\n" + "="*80)
    print("COPY THIS INTO YOUR hooks.py FILE")
    print("="*80 + "\n")
    print(output)
    print("\n" + "="*80)
    print(f"Total: {len(custom_fields)} custom fields across {len(grouped)} DocTypes")
    print("="*80 + "\n")
    
    # Save to site directory
    site_path = frappe.utils.get_site_path()
    output_file = f"{site_path}/custom_fields_fixtures.txt"
    
    with open(output_file, "w") as f:
        f.write(output)
    
    print(f"Output saved to: {output_file}")
    frappe.msgprint(f"Custom field fixtures generated! Saved to: {output_file}")
    
    return output


def generate_for_doctypes(doctype_list):
    """
    Generate custom field fixtures for specific DocTypes only
    
    Usage:
        bench execute your_custom_app.utils.generate_fixtures.generate_for_doctypes --args "['Customer', 'Sales Invoice', 'Item']"
    
    Args:
        doctype_list (list): List of DocType names
    """
    
    if isinstance(doctype_list, str):
        import ast
        doctype_list = ast.literal_eval(doctype_list)
    
    custom_fields = frappe.get_all(
        "Custom Field",
        filters={"dt": ["in", doctype_list]},
        fields=["name", "dt", "label", "fieldname"],
        order_by="dt, idx"
    )
    
    if not custom_fields:
        print(f"No custom fields found for DocTypes: {', '.join(doctype_list)}")
        return
    
    # Group by DocType
    grouped = {}
    for cf in custom_fields:
        dt = cf.get("dt")
        if dt not in grouped:
            grouped[dt] = []
        grouped[dt].append(cf)
    
    # Build output
    output_lines = [
        'fixtures = [',
        '    {',
        '        "dt": "Custom Field",',
        '        "filters": [',
        '            ["name", "in", ['
    ]
    
    for dt in sorted(grouped.keys()):
        fields = grouped[dt]
        output_lines.append(f'                # {dt} ({len(fields)} custom field{"s" if len(fields) > 1 else ""})')
        
        for field in fields:
            field_name = field.get("name")
            label = field.get("label", "")
            output_lines.append(f'                "{field_name}",  # {label}')
        
        output_lines.append('')
    
    output_lines.extend([
        '            ]]',
        '        ]',
        '    },',
        ']'
    ])
    
    output = '\n'.join(output_lines)
    
    print("\n" + "="*80)
    print(f"CUSTOM FIELDS FOR: {', '.join(doctype_list)}")
    print("="*80 + "\n")
    print(output)
    print("\n" + "="*80)
    print(f"Total: {len(custom_fields)} custom fields")
    print("="*80 + "\n")
    
    return output


def list_all_doctypes_with_custom_fields():
    """
    List all DocTypes that have custom fields
    Useful for seeing what's available before filtering
    
    Usage:
        bench execute your_custom_app.utils.generate_fixtures.list_all_doctypes_with_custom_fields
    """
    
    doctypes = frappe.get_all(
        "Custom Field",
        fields=["dt"],
        group_by="dt",
        order_by="dt"
    )
    
    print("\n" + "="*80)
    print("DOCTYPES WITH CUSTOM FIELDS")
    print("="*80 + "\n")
    
    for dt_dict in doctypes:
        dt = dt_dict.get("dt")
        count = frappe.db.count("Custom Field", {"dt": dt})
        print(f"  • {dt} ({count} custom field{'s' if count > 1 else ''})")
    
    print("\n" + "="*80)
    print(f"Total: {len(doctypes)} DocTypes with custom fields")
    print("="*80 + "\n")
    
    return [dt_dict.get("dt") for dt_dict in doctypes]


def export_to_json_file(filename="custom_fields_fixtures.json"):
    """
    Export custom fields as JSON file
    
    Usage:
        bench execute your_custom_app.utils.generate_fixtures.export_to_json_file
    """
    import json
    
    custom_fields = frappe.get_all(
        "Custom Field",
        fields=["name"],
        order_by="dt, idx"
    )
    
    field_names = [cf.get("name") for cf in custom_fields]
    
    fixtures = [{
        "dt": "Custom Field",
        "filters": [
            ["name", "in", field_names]
        ]
    }]
    
    site_path = frappe.utils.get_site_path()
    output_file = f"{site_path}/{filename}"
    
    with open(output_file, "w") as f:
        json.dump(fixtures, f, indent=4)
    
    print(f"\nCustom field fixtures exported to: {output_file}")
    frappe.msgprint(f"Exported to: {output_file}")
    
    return output_file