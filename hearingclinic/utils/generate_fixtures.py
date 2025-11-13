#!/usr/bin/env python3
"""
Frappe/ERPNext Console Script to Generate Custom Field List for hooks.py
Usage: bench console < generate_custom_fields.py
Or: bench execute your_app.scripts.generate_custom_fields.generate_custom_field_list
"""

import frappe
import json


def generate_custom_field_list():
    """
    Generates a formatted custom field list for hooks.py export-fixtures
    Fetches all custom fields from the database and formats them for hooks.py
    """
    
    # Fetch all custom fields from the database
    custom_fields = frappe.get_all(
        "Custom Field",
        fields=["name", "dt", "label", "fieldname"],
        order_by="dt, idx"
    )
    
    if not custom_fields:
        print("No custom fields found in the system.")
        return
    
    # Group custom fields by DocType
    grouped_fields = {}
    for field in custom_fields:
        dt = field.get("dt")
        if dt not in grouped_fields:
            grouped_fields[dt] = []
        grouped_fields[dt].append(field)
    
    # Generate the formatted output
    print("\n" + "="*80)
    print("COPY THIS INTO YOUR hooks.py FILE")
    print("="*80 + "\n")
    
    print('fixtures = [')
    print('    {')
    print('        "dt": "Custom Field",')
    print('        "filters": [')
    print('            ["name", "in", [')
    
    # Generate field entries grouped by DocType
    for dt in sorted(grouped_fields.keys()):
        fields = grouped_fields[dt]
        print(f'                # {dt} ({len(fields)} custom field{"s" if len(fields) > 1 else ""})')
        
        for field in fields:
            field_name = field.get("name")
            label = field.get("label", "")
            print(f'                "{field_name}",  # {label}')
        
        print()
    
    # Remove the last newline and add closing brackets
    print('            ]]')
    print('        ]')
    print('    },')
    print(']')
    
    print("\n" + "="*80)
    print(f"Total Custom Fields: {len(custom_fields)}")
    print(f"Across {len(grouped_fields)} DocTypes")
    print("="*80 + "\n")
    
    # Also save to a file
    output_file = "/tmp/custom_fields_hooks.txt"
    with open(output_file, "w") as f:
        f.write('fixtures = [\n')
        f.write('    {\n')
        f.write('        "dt": "Custom Field",\n')
        f.write('        "filters": [\n')
        f.write('            ["name", "in", [\n')
        
        for dt in sorted(grouped_fields.keys()):
            fields = grouped_fields[dt]
            f.write(f'                # {dt} ({len(fields)} custom field{"s" if len(fields) > 1 else ""})\n')
            
            for field in fields:
                field_name = field.get("name")
                label = field.get("label", "")
                f.write(f'                "{field_name}",  # {label}\n')
            
            f.write('\n')
        
        f.write('            ]]\n')
        f.write('        ]\n')
        f.write('    },\n')
        f.write(']\n')
    
    print(f"Output also saved to: {output_file}\n")


def generate_filtered_custom_field_list(doctype_list=None, app_name=None):
    """
    Generates a filtered custom field list based on specific DocTypes or app module
    
    Args:
        doctype_list (list): List of DocTypes to filter by
        app_name (str): App/module name to filter by
    """
    
    filters = {}
    
    if doctype_list:
        filters["dt"] = ["in", doctype_list]
    
    if app_name:
        filters["module"] = app_name
    
    custom_fields = frappe.get_all(
        "Custom Field",
        filters=filters,
        fields=["name", "dt", "label", "fieldname", "module"],
        order_by="dt, idx"
    )
    
    if not custom_fields:
        print(f"No custom fields found matching the criteria.")
        return
    
    # Group custom fields by DocType
    grouped_fields = {}
    for field in custom_fields:
        dt = field.get("dt")
        if dt not in grouped_fields:
            grouped_fields[dt] = []
        grouped_fields[dt].append(field)
    
    # Generate the formatted output
    print("\n" + "="*80)
    print("FILTERED CUSTOM FIELD LIST FOR hooks.py")
    print("="*80 + "\n")
    
    print('fixtures = [')
    print('    {')
    print('        "dt": "Custom Field",')
    print('        "filters": [')
    print('            ["name", "in", [')
    
    for dt in sorted(grouped_fields.keys()):
        fields = grouped_fields[dt]
        print(f'                # {dt} ({len(fields)} custom field{"s" if len(fields) > 1 else ""})')
        
        for field in fields:
            field_name = field.get("name")
            label = field.get("label", "")
            print(f'                "{field_name}",  # {label}')
        
        print()
    
    print('            ]]')
    print('        ]')
    print('    },')
    print(']')
    
    print("\n" + "="*80)
    print(f"Total Custom Fields: {len(custom_fields)}")
    print(f"Across {len(grouped_fields)} DocTypes")
    print("="*80 + "\n")


def generate_json_format():
    """
    Alternative format: Generate custom fields in JSON format for direct export
    """
    
    custom_fields = frappe.get_all(
        "Custom Field",
        fields=["name"],
        order_by="dt, idx"
    )
    
    field_names = [field.get("name") for field in custom_fields]
    
    fixtures = [{
        "dt": "Custom Field",
        "filters": [
            ["name", "in", field_names]
        ]
    }]
    
    print("\n" + "="*80)
    print("JSON FORMAT (Alternative)")
    print("="*80 + "\n")
    print(json.dumps(fixtures, indent=4))
    print("\n")


# Main execution
if __name__ == "__main__":
    print("\n" + "="*80)
    print("CUSTOM FIELD GENERATOR FOR ERPNEXT")
    print("="*80 + "\n")
    
    # Generate all custom fields
    generate_custom_field_list()
    
    # Uncomment below for filtered lists:
    
    # Example: Generate for specific DocTypes
    # generate_filtered_custom_field_list(
    #     doctype_list=["Customer", "Sales Invoice", "Item"]
    # )
    
    # Example: Generate for specific app/module
    # generate_filtered_custom_field_list(app_name="Your Custom App")
    
    # Example: Generate JSON format
    # generate_json_format()