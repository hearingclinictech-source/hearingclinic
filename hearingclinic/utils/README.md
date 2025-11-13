# Custom Field Fixtures Generator for ERPNext

This utility helps you generate properly formatted custom field lists for your ERPNext app's `hooks.py` file, making it easy to use with `export-fixtures`.

## Files Included

1. **generate_custom_fields.py** - Standalone console script
2. **generate_fixtures.py** - App-integrated utility module
3. **README.md** - This file

---

## Method 1: Standalone Console Script

### Setup
Copy `generate_custom_fields.py` to your ERPNext instance.

### Usage

#### Option A: Pipe to bench console
```bash
bench console < generate_custom_fields.py
```

#### Option B: Run in bench console
```bash
bench console
```
Then in the console:
```python
exec(open('generate_custom_fields.py').read())
```

### Output
- Prints formatted fixtures to console
- Saves to `/tmp/custom_fields_hooks.txt`

---

## Method 2: App-Integrated Module (Recommended)

### Setup
1. Create directory structure in your custom app:
   ```bash
   mkdir -p /path/to/your_custom_app/your_custom_app/utils
   ```

2. Copy `generate_fixtures.py` to:
   ```
   your_custom_app/your_custom_app/utils/generate_fixtures.py
   ```

3. Create `__init__.py` if it doesn't exist:
   ```bash
   touch your_custom_app/your_custom_app/utils/__init__.py
   ```

### Usage

#### Generate ALL Custom Fields
```bash
bench execute your_custom_app.utils.generate_fixtures.generate_custom_field_fixtures
```

#### Generate for Specific DocTypes
```bash
bench execute your_custom_app.utils.generate_fixtures.generate_for_doctypes --args "['Customer', 'Sales Invoice', 'Item']"
```

#### List All DocTypes with Custom Fields
```bash
bench execute your_custom_app.utils.generate_fixtures.list_all_doctypes_with_custom_fields
```

#### Export as JSON
```bash
bench execute your_custom_app.utils.generate_fixtures.export_to_json_file
```

---

## Adding to hooks.py

### Step 1: Generate the fixtures
Run one of the commands above to generate your custom field list.

### Step 2: Copy to hooks.py
Open your app's `hooks.py` file:
```python
# your_custom_app/hooks.py

fixtures = [
    {
        "dt": "Custom Field",
        "filters": [
            ["name", "in", [
                # Address (3 custom fields)
                "Address-custom_stateprovince",  # State/Province
                "Address-tax_category",  # Tax Category
                "Address-is_your_company_address",  # Is Your Company Address

                # Communication (1 custom field)
                "Communication-company",  # Company

                # ... (paste generated content here)
            ]]
        ]
    },
]
```

### Step 3: Export the fixtures
```bash
cd /path/to/your_custom_app
bench --site your-site export-fixtures
```

This will create/update JSON files in:
```
your_custom_app/your_custom_app/fixtures/custom_field.json
```

---

## Using the Fixtures

### Import fixtures to a new site
```bash
bench --site new-site install-app your_custom_app
```

The custom fields will be automatically installed!

### Manually import fixtures
```bash
bench --site your-site import-fixtures your_custom_app/your_custom_app/fixtures
```

---

## Features

✅ **Automatic Grouping** - Groups custom fields by DocType  
✅ **Field Comments** - Includes field labels as comments  
✅ **Field Count** - Shows count per DocType  
✅ **Sorted Output** - Alphabetically sorted DocTypes  
✅ **Multiple Formats** - Console output + File output  
✅ **Filtering Options** - Filter by DocType or module  

---

## Example Output

```python
fixtures = [
    {
        "dt": "Custom Field",
        "filters": [
            ["name", "in", [
                # Address (3 custom fields)
                "Address-custom_stateprovince",  # State/Province
                "Address-tax_category",  # Tax Category
                "Address-is_your_company_address",  # Is Your Company Address

                # Customer (9 custom fields)
                "Customer-custom_customer_id",  # Customer Id
                "Customer-custom_nricpassport",  # NRIC/Passport
                "Customer-custom_ethinicity",  # Ethinicity
                "Customer-custom_date_of_birth",  # Date of Birth
                "Customer-custom_customer_info",  # Customer Info
                "Customer-custom_devices",  # Devices
                "Customer-custom_items_purchased",  # Items Purchased
                "Customer-custom_maintenance",  # Maintenance
                "Customer-custom_maintenance_info",  # Maintenance Info

                # ... more fields
            ]]
        ]
    },
]
```

---

## Advanced Usage

### Programmatic Generation in Python Script

```python
import frappe
from your_custom_app.utils.generate_fixtures import generate_custom_field_fixtures

# In a custom script or migration
def after_install():
    output = generate_custom_field_fixtures()
    # Do something with the output
```

### Filter by Module/App

Edit `generate_fixtures.py` and use:

```python
custom_fields = frappe.get_all(
    "Custom Field",
    filters={"module": "Your Custom App"},
    fields=["name", "dt", "label", "fieldname"],
    order_by="dt, idx"
)
```

### Scheduled Generation

Add to your app's hooks.py:

```python
scheduler_events = {
    "weekly": [
        "your_custom_app.utils.generate_fixtures.generate_custom_field_fixtures"
    ]
}
```

---

## Troubleshooting

### "No custom fields found"
- Check if custom fields exist: `bench console` → `frappe.db.count('Custom Field')`
- Verify you're on the correct site: `bench use your-site`

### Permission Errors
- Ensure you have write permissions to the output directory
- Run with appropriate user: `sudo -u frappe bench execute ...`

### Import/Module Errors
- Verify the file path matches your app structure
- Check `__init__.py` exists in utils directory
- Try: `bench restart`

---

## Tips

1. **Version Control**: Commit the generated fixtures to Git
2. **Regular Updates**: Re-run the script when you add new custom fields
3. **Selective Export**: Use the filtered version for app-specific fields only
4. **Backup**: Always backup before importing fixtures to production

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `bench console < generate_custom_fields.py` | Run standalone script |
| `bench execute your_app.utils.generate_fixtures.generate_custom_field_fixtures` | Generate all fields |
| `bench execute your_app.utils.generate_fixtures.list_all_doctypes_with_custom_fields` | List DocTypes |
| `bench --site site-name export-fixtures` | Export to JSON |
| `bench --site site-name import-fixtures path/to/fixtures` | Import from JSON |

---

## License

Use freely in your ERPNext projects!

## Support

For issues with ERPNext: https://discuss.frappe.io/  
For Frappe Framework: https://frappeframework.com/docs