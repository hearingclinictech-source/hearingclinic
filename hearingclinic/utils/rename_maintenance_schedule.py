import frappe

def rename_maintenance_schedule_direct(old_name, new_name):
    """
    Rename a Maintenance Schedule by directly updating the database.
    WARNING: This bypasses ERPNext workflows. Use with caution.
    
    Args:
        old_name: Current name of the Maintenance Schedule
        new_name: New name for the Maintenance Schedule
    
    Returns:
        bool: True if successful, False otherwise
    """
    frappe.set_user("Administrator")
    
    print("=" * 60)
    print("MAINTENANCE SCHEDULE DIRECT DATABASE RENAME")
    print("WARNING: This bypasses ERPNext workflows!")
    print("=" * 60)
    print(f"Old Name: {old_name}")
    print(f"New Name: {new_name}")
    print("=" * 60)
    
    try:
        # Check if old document exists
        if not frappe.db.exists("Maintenance Schedule", old_name):
            print(f"✗ Error: Maintenance Schedule '{old_name}' does not exist!")
            return False
        
        # Check if new name already exists
        if frappe.db.exists("Maintenance Schedule", new_name):
            print(f"✗ Error: Maintenance Schedule '{new_name}' already exists!")
            return False
        
        print("\n[1/3] Updating main document...")
        frappe.db.sql("""
            UPDATE `tabMaintenance Schedule`
            SET name = %s, modified = NOW()
            WHERE name = %s
        """, (new_name, old_name))
        print("  ✓ Main document updated")
        
        print("\n[2/3] Updating child table: Maintenance Schedule Item...")
        frappe.db.sql("""
            UPDATE `tabMaintenance Schedule Item`
            SET parent = %s, modified = NOW()
            WHERE parent = %s
        """, (new_name, old_name))
        items_updated = frappe.db.sql("SELECT ROW_COUNT()")[0][0]
        print(f"  ✓ Updated {items_updated} item(s)")
        
        print("\n[3/3] Updating child table: Maintenance Schedule Detail...")
        frappe.db.sql("""
            UPDATE `tabMaintenance Schedule Detail`
            SET parent = %s, modified = NOW()
            WHERE parent = %s
        """, (new_name, old_name))
        details_updated = frappe.db.sql("SELECT ROW_COUNT()")[0][0]
        print(f"  ✓ Updated {details_updated} detail(s)")
        
        frappe.db.commit()
        
        # Verify
        print("\nVerifying rename...")
        if frappe.db.exists("Maintenance Schedule", new_name):
            print(f"  ✓ New document exists: {new_name}")
        else:
            print("  ✗ New document not found!")
            return False
        
        if not frappe.db.exists("Maintenance Schedule", old_name):
            print(f"  ✓ Old document removed: {old_name}")
        else:
            print("  ✗ Old document still exists!")
            return False
        
        print("\n" + "=" * 60)
        print("✓ DIRECT RENAME SUCCESSFUL!")
        print("=" * 60)
        return True
        
    except Exception as e:
        print(f"\n✗ Error during rename: {str(e)}")
        frappe.log_error(frappe.get_traceback(), "Maintenance Schedule Direct Rename Error")
        frappe.db.rollback()
        return False

# Usage:
# rename_maintenance_schedule_direct("CHAN SIM PENG-Signia - Legacy - ITC-2025-00003-1", "CHAN SIM PENG-Resound - Legacy - ITC-2025-00003")