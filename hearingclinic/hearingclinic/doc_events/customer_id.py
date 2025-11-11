import frappe
from frappe import _

def before_save(doc, method):
    """Main hook - called before Customer is saved"""
    if not doc.custom_customer_id:
        doc.custom_customer_id = generate_customer_id(doc)
    else:
        validate_customer_id_matches_gender(doc)


def generate_customer_id(doc):
    """Generate new customer ID based on gender"""
    if not doc.gender:
        frappe.throw(_("Please select Gender before saving the Customer."))
    
    prefix = get_gender_prefix(doc.gender)
    next_number = get_next_id_number(prefix)
    
    return f"{prefix}{next_number:04d}"


def get_gender_prefix(gender):
    """Get ID prefix based on gender"""
    gender_lower = gender.lower()
    
    if gender_lower.startswith("f"):
        return "F-"
    elif gender_lower.startswith("m"):
        return "M-"
    else:
        frappe.throw(_("Gender must be 'Male' or 'Female'."))


def get_next_id_number(prefix):
    """Get next sequential number for given prefix"""
    result = frappe.db.sql("""
        SELECT MAX(CAST(SUBSTRING(custom_customer_id, 3) AS UNSIGNED)) as max_num
        FROM `tabCustomer`
        WHERE custom_customer_id LIKE %s
    """, (prefix + "%",))
    
    return (result[0][0] or 0) + 1


def validate_customer_id_matches_gender(doc):
    """Validate that customer ID prefix matches gender"""
    if not doc.gender or not doc.custom_customer_id:
        return
    
    gender_lower = doc.gender.lower()
    expected_prefix = "F-" if gender_lower.startswith("f") else "M-"
    
    if not doc.custom_customer_id.startswith(expected_prefix):
        gender_name = "Female" if expected_prefix == "F-" else "Male"
        frappe.throw(
            _("{0} customer IDs must start with '{1}'.").format(
                gender_name, 
                expected_prefix
            )
        )