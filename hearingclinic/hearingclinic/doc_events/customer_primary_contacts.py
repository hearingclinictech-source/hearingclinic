import frappe
from frappe import _

def create_primary_address(customer_doc, address_data):
    """
    Create primary address for a customer with custom fields

    Args:
        customer_doc: Customer document
        address_data: Dict containing address fields from quick entry form
    """
    if not address_data:
        return None

    # Check if we have at least one required address field
    has_address_data = any([
        address_data.get('address_line1'),
        address_data.get('city'),
        address_data.get('pincode'),
        address_data.get('country')
    ])

    if not has_address_data:
        return None

    try:
        # Create new Address document
        address = frappe.get_doc({
            "doctype": "Address",
            "address_title": customer_doc.customer_name,
            "address_type": "Billing",
            "address_line1": address_data.get('address_line1') or '',
            "address_line2": address_data.get('address_line2') or '',
            "city": address_data.get('city') or '',
            "pincode": address_data.get('pincode') or '',
            "country": address_data.get('country') or '',
            # Custom field for State/Province (Link field)
            "custom_stateprovince": address_data.get('custom_stateprovince') or '',
        })

        # Link address to customer
        address.append("links", {
            "link_doctype": "Customer",
            "link_name": customer_doc.name
        })

        address.insert(ignore_permissions=True)

        frappe.logger().info(f"Created primary address {address.name} for customer {customer_doc.name}")
        return address.name

    except Exception as e:
        frappe.logger().error(f"Error creating primary address for customer {customer_doc.name}: {str(e)}")
        # Don't fail customer creation if address creation fails
        frappe.log_error(message=str(e), title=f"Failed to create address for {customer_doc.name}")
        return None


def create_primary_contact(customer_doc, contact_data):
    """
    Create primary contact for a customer with phone numbers in child table

    Args:
        customer_doc: Customer document
        contact_data: Dict containing contact fields from quick entry form
    """
    if not contact_data:
        return None

    # Check if we have at least one contact field
    has_contact_data = any([
        contact_data.get('email_address'),
        contact_data.get('mobile_number')
    ])

    if not has_contact_data:
        return None

    try:
        # Determine contact name
        contact_name = contact_data.get('custom_contact_name') or customer_doc.customer_name

        # Create new Contact document
        contact = frappe.get_doc({
            "doctype": "Contact",
            "first_name": contact_name,
            "email_id": contact_data.get('email_address') or '',
            "is_primary_contact": 1,
        })

        # Add email to email_ids child table if provided
        if contact_data.get('email_address'):
            contact.append("email_ids", {
                "email_id": contact_data.get('email_address'),
                "is_primary": 1
            })

        # Add mobile number to phone_nos child table if provided
        if contact_data.get('mobile_number'):
            phone_entry = {
                "phone": contact_data.get('mobile_number'),
                "is_primary_mobile_no": 1
            }

            # Add custom fields to Contact Phone child table
            if contact_data.get('custom_contact_name'):
                phone_entry['custom_contact_name'] = contact_data.get('custom_contact_name')

            # Add customer relationship to Contact Phone child table
            if contact_data.get('custom_contact_relationship'):
                phone_entry['custom_customer_relationship'] = contact_data.get('custom_contact_relationship')

            contact.append("phone_nos", phone_entry)

        # Link contact to customer
        contact.append("links", {
            "link_doctype": "Customer",
            "link_name": customer_doc.name
        })

        contact.insert(ignore_permissions=True)

        frappe.logger().info(f"Created primary contact {contact.name} for customer {customer_doc.name}")
        return contact.name

    except Exception as e:
        frappe.logger().error(f"Error creating primary contact for customer {customer_doc.name}: {str(e)}")
        # Don't fail customer creation if contact creation fails
        frappe.log_error(message=str(e), title=f"Failed to create contact for {customer_doc.name}")
        return None


def after_insert(doc, method):
    """
    Hook called after customer is inserted
    Create primary address and contact from quick entry form data
    """
    # Get the form data passed from client side
    # These fields are set on the customer doc but not saved to database
    # They're used to create separate Address and Contact documents

    address_data = {
        'address_line1': doc.get('address_line1'),
        'address_line2': doc.get('address_line2'),
        'city': doc.get('city'),
        'pincode': doc.get('pincode'),
        'country': doc.get('country'),
        'custom_stateprovince': doc.get('custom_stateprovince'),
    }

    contact_data = {
        'email_address': doc.get('email_address'),
        'mobile_number': doc.get('mobile_number'),
        'custom_contact_name': doc.get('custom_contact_name'),
        'custom_contact_relationship': doc.get('custom_contact_relationship'),
    }

    # Create primary address
    address_name = create_primary_address(doc, address_data)

    # Create primary contact
    contact_name = create_primary_contact(doc, contact_data)

    # Update customer with primary address and contact if created
    if address_name or contact_name:
        try:
            if address_name:
                doc.customer_primary_address = address_name
            if contact_name:
                doc.customer_primary_contact = contact_name

            # Save without triggering events to avoid recursion
            doc.save(ignore_permissions=True)

        except Exception as e:
            frappe.logger().error(f"Error updating customer {doc.name} with primary address/contact: {str(e)}")
            frappe.log_error(message=str(e), title=f"Failed to update customer {doc.name}")
