import frappe
for ms in frappe.get_all('Maintenance Schedule', fields=['name']):
    doc = frappe.get_doc('Maintenance Schedule', ms.name)
    doc.schedules = []
    doc.flags.ignore_validate = True
    doc.save(ignore_permissions=True)
    doc.reload()
frappe.db.commit()
print("Done! Refresh your browser.")