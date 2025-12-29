import frappe

def direct_update_items_in_chain(sales_invoice_name, old_item_code, new_item_code, new_item_name):
    """
    Direct database update for item code/name in Sales Invoice -> Delivery Note -> Maintenance Schedule chain
    WARNING: Bypasses ERPNext workflows. Test thoroughly before using in production.
    """
    frappe.set_user("Administrator")
    
    print("=" * 60)
    print("DIRECT DATABASE UPDATE - CHAIN ITEM MODIFICATION")
    print("=" * 60)
    print(f"Sales Invoice: {sales_invoice_name}")
    print(f"Old Item: {old_item_code}")
    print(f"New Item: {new_item_code} ({new_item_name})")
    print("=" * 60)
    
    # Track what we're updating
    updates = {
        "Sales Invoice": [],
        "Delivery Note": [],
        "Maintenance Schedule Items": [],
        "Maintenance Schedule Details": []
    }
    
    # Get customer and date from Sales Invoice first
    si_doc = frappe.get_doc("Sales Invoice", sales_invoice_name)
    
    # STEP 0: Find all linked documents BEFORE making any changes
    print("\n[0] Discovering linked documents...")
    
    # Find Delivery Notes
    dn_names = frappe.db.sql("""
        SELECT DISTINCT parent
        FROM `tabDelivery Note Item`
        WHERE against_sales_invoice = %s
    """, (sales_invoice_name,), as_dict=1)
    
    print(f"  Found {len(dn_names)} Delivery Note(s)")
    
    # Find Maintenance Schedules via Delivery Notes and customer
    maint_schedules = []
    
    if dn_names:
        for dn in dn_names:
            dn_doc = frappe.get_doc("Delivery Note", dn.parent)
            
            # Search for maintenance schedules created around the same time
            schedules = frappe.db.sql("""
                SELECT DISTINCT ms.name, ms.transaction_date, ms.customer_name
                FROM `tabMaintenance Schedule` ms
                INNER JOIN `tabMaintenance Schedule Item` msi ON msi.parent = ms.name
                WHERE ms.customer = %s 
                AND msi.item_code = %s
                AND ABS(DATEDIFF(ms.transaction_date, %s)) <= 7
                ORDER BY ms.transaction_date DESC
            """, (dn_doc.customer, old_item_code, dn_doc.posting_date), as_dict=1)
            
            if schedules:
                maint_schedules.extend(schedules)
    
    # If no schedules found via DN dates, search by Sales Invoice date
    if not maint_schedules:
        print("  No schedules found via DN dates, trying SI date...")
        schedules = frappe.db.sql("""
            SELECT DISTINCT ms.name, ms.transaction_date, ms.customer_name
            FROM `tabMaintenance Schedule` ms
            INNER JOIN `tabMaintenance Schedule Item` msi ON msi.parent = ms.name
            WHERE ms.customer = %s 
            AND msi.item_code = %s
            AND ABS(DATEDIFF(ms.transaction_date, %s)) <= 14
            ORDER BY ms.transaction_date DESC
        """, (si_doc.customer, old_item_code, si_doc.posting_date), as_dict=1)
        
        if schedules:
            maint_schedules.extend(schedules)
    
    # If still no schedules, search all schedules for this customer with the item
    if not maint_schedules:
        print("  No schedules found within date range, searching all schedules...")
        schedules = frappe.db.sql("""
            SELECT DISTINCT ms.name, ms.transaction_date, ms.customer_name
            FROM `tabMaintenance Schedule` ms
            INNER JOIN `tabMaintenance Schedule Item` msi ON msi.parent = ms.name
            WHERE ms.customer = %s 
            AND msi.item_code = %s
            ORDER BY ms.transaction_date DESC
            LIMIT 5
        """, (si_doc.customer, old_item_code), as_dict=1)
        
        if schedules:
            maint_schedules.extend(schedules)
    
    # Remove duplicates
    maint_schedules = {s['name']: s for s in maint_schedules}.values()
    
    print(f"  Found {len(maint_schedules)} Maintenance Schedule(s):")
    for ms in maint_schedules:
        print(f"    - {ms.name} ({ms.customer_name}, Date: {ms.transaction_date})")
    
    print("\n" + "=" * 60)
    
    # NOW proceed with updates
    
    # 1. Update Sales Invoice Items
    print("\n[1/4] Updating Sales Invoice Items...")
    si_items = frappe.db.sql("""
        SELECT name, item_code, item_name, idx
        FROM `tabSales Invoice Item`
        WHERE parent = %s AND item_code = %s
    """, (sales_invoice_name, old_item_code), as_dict=1)
    
    if si_items:
        print(f"  Found {len(si_items)} item(s) to update:")
        for item in si_items:
            print(f"    - Row {item.idx}: {item.item_code} -> {new_item_code}")
            updates["Sales Invoice"].append(item.name)
        
        frappe.db.sql("""
            UPDATE `tabSales Invoice Item`
            SET item_code = %s, item_name = %s, modified = NOW()
            WHERE parent = %s AND item_code = %s
        """, (new_item_code, new_item_name, sales_invoice_name, old_item_code))
        print(f"  ✓ Updated {len(si_items)} Sales Invoice item(s)")
    else:
        print(f"  No items found with code: {old_item_code}")
    
    # 2. Update Delivery Note Items
    print("\n[2/4] Updating Delivery Note Items...")
    
    for dn in dn_names:
        dn_name = dn.parent
        dn_items = frappe.db.sql("""
            SELECT name, item_code, item_name, idx
            FROM `tabDelivery Note Item`
            WHERE parent = %s AND item_code = %s
        """, (dn_name, old_item_code), as_dict=1)
        
        if dn_items:
            print(f"  Delivery Note: {dn_name}")
            print(f"  Found {len(dn_items)} item(s) to update:")
            for item in dn_items:
                print(f"    - Row {item.idx}: {item.item_code} -> {new_item_code}")
                updates["Delivery Note"].append(item.name)
            
            frappe.db.sql("""
                UPDATE `tabDelivery Note Item`
                SET item_code = %s, item_name = %s, modified = NOW()
                WHERE parent = %s AND item_code = %s
            """, (new_item_code, new_item_name, dn_name, old_item_code))
            print(f"  ✓ Updated {len(dn_items)} Delivery Note item(s)")
    
    if not dn_names:
        print("  No linked Delivery Notes found")
    
    # 3. Update Maintenance Schedule Items (the main item table)
    print("\n[3/4] Updating Maintenance Schedule Items...")
    
    if maint_schedules:
        for maint in maint_schedules:
            maint_name = maint['name']
            maint_items = frappe.db.sql("""
                SELECT name, item_code, item_name, idx
                FROM `tabMaintenance Schedule Item`
                WHERE parent = %s AND item_code = %s
            """, (maint_name, old_item_code), as_dict=1)
            
            if maint_items:
                print(f"  Maintenance Schedule: {maint_name}")
                print(f"  Found {len(maint_items)} item(s) to update:")
                for item in maint_items:
                    print(f"    - Row {item.idx}: {item.item_code} -> {new_item_code}")
                    updates["Maintenance Schedule Items"].append(item.name)
                
                frappe.db.sql("""
                    UPDATE `tabMaintenance Schedule Item`
                    SET item_code = %s, item_name = %s, modified = NOW()
                    WHERE parent = %s AND item_code = %s
                """, (new_item_code, new_item_name, maint_name, old_item_code))
                print(f"  ✓ Updated {len(maint_items)} Maintenance Schedule item(s)")
    else:
        print(f"  No Maintenance Schedules found")
    
    # 4. Update Maintenance Schedule Detail (the actual schedule/visit rows)
    print("\n[4/4] Updating Maintenance Schedule Details (Visit Schedules)...")
    
    if maint_schedules:
        for maint in maint_schedules:
            maint_name = maint['name']
            
            # Update the schedules child table (visit rows)
            schedule_details = frappe.db.sql("""
                SELECT name, item_code, item_name, idx, scheduled_date
                FROM `tabMaintenance Schedule Detail`
                WHERE parent = %s AND item_code = %s
            """, (maint_name, old_item_code), as_dict=1)
            
            if schedule_details:
                print(f"  Maintenance Schedule: {maint_name}")
                print(f"  Found {len(schedule_details)} schedule detail(s) to update:")
                for detail in schedule_details:
                    print(f"    - Row {detail.idx} (Date: {detail.scheduled_date}): {detail.item_code} -> {new_item_code}")
                    updates["Maintenance Schedule Details"].append(detail.name)
                
                frappe.db.sql("""
                    UPDATE `tabMaintenance Schedule Detail`
                    SET item_code = %s, item_name = %s, modified = NOW()
                    WHERE parent = %s AND item_code = %s
                """, (new_item_code, new_item_name, maint_name, old_item_code))
                print(f"  ✓ Updated {len(schedule_details)} Maintenance Schedule detail(s)")
            else:
                print(f"  No schedule details found for {maint_name}")
    
    # Commit all changes
    frappe.db.commit()
    
    # Summary
    print("\n" + "=" * 60)
    print("UPDATE SUMMARY")
    print("=" * 60)
    total_updates = sum(len(v) for v in updates.values())
    print(f"Total items updated: {total_updates}")
    for doctype, items in updates.items():
        if items:
            print(f"  {doctype}: {len(items)} item(s)")
    print("=" * 60)
    print("✓ Database update complete!")
    print("\nREMINDER: Verify the changes in ERPNext UI")
    print("=" * 60)
    
    return updates

# Usage in bench console:
# bench --site your-site.localhost console
# Then paste the function above and run:
# result = direct_update_items_in_chain("SINV-00123", "OLD-ITEM-001", "NEW-ITEM-001", "New Item Name")