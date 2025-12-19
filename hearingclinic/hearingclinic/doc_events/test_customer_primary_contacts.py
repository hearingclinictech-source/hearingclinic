# Copyright (c) 2025, Thomas Roch and Contributors
# Test cases for Customer primary address and contact creation logic
# @S Customer Management

import frappe
from frappe.tests.utils import FrappeTestCase
from hearingclinic.hearingclinic.doc_events.customer_primary_contacts import (
    create_primary_address,
    create_primary_contact,
    after_insert
)


class TestCustomerPrimaryContacts(FrappeTestCase):
    """Test cases for Customer primary address and contact creation"""

    def setUp(self):
        """Set up test data"""
        # Clean up any existing test data
        self.cleanup_test_data()

    def tearDown(self):
        """Clean up test data"""
        self.cleanup_test_data()

    def cleanup_test_data(self):
        """Remove all test customers, addresses, and contacts"""
        # Delete test customers
        frappe.db.delete("Customer", {
            "customer_name": ["like", "_Test%"]
        })
        # Delete test addresses
        frappe.db.delete("Address", {
            "address_title": ["like", "_Test%"]
        })
        # Delete test contacts
        frappe.db.delete("Contact", {
            "first_name": ["like", "_Test%"]
        })
        frappe.db.commit()

    def test_create_primary_address_with_all_fields(self):
        """Test creating primary address with all fields populated"""
        # Create a test customer
        customer = frappe.get_doc({
            "doctype": "Customer",
            "customer_name": "_Test Customer Address",
            "customer_type": "Individual",
            "customer_group": "Individual",
            "territory": "All Territories"
        })
        customer.insert(ignore_permissions=True)

        # Address data from quick entry form
        address_data = {
            'address_line1': '123 Test Street',
            'address_line2': 'Unit 45',
            'city': 'Test City',
            'pincode': '12345',
            'country': 'Malaysia',
            'custom_stateprovince': 'Selangor'
        }

        # Create address
        address_name = create_primary_address(customer, address_data)

        # Verify address was created
        self.assertIsNotNone(address_name)
        self.assertTrue(frappe.db.exists("Address", address_name))

        # Verify address fields
        address = frappe.get_doc("Address", address_name)
        self.assertEqual(address.address_line1, '123 Test Street')
        self.assertEqual(address.address_line2, 'Unit 45')
        self.assertEqual(address.city, 'Test City')
        self.assertEqual(address.pincode, '12345')
        self.assertEqual(address.country, 'Malaysia')
        self.assertEqual(address.custom_stateprovince, 'Selangor')

        # Verify address is linked to customer
        links = [link.link_name for link in address.links if link.link_doctype == "Customer"]
        self.assertIn(customer.name, links)

    def test_create_primary_contact_with_all_fields(self):
        """Test creating primary contact with all fields populated"""
        customer = frappe.get_doc({
            "doctype": "Customer",
            "customer_name": "_Test Customer Contact",
            "customer_type": "Individual",
            "customer_group": "Individual",
            "territory": "All Territories"
        })
        customer.insert(ignore_permissions=True)

        # Contact data from quick entry form
        contact_data = {
            'email_address': 'test@example.com',
            'mobile_number': '+60123456789',
            'custom_contact_name': 'John Doe',
            'custom_contact_relationship': 'Son'
        }

        contact_name = create_primary_contact(customer, contact_data)

        # Verify contact was created
        self.assertIsNotNone(contact_name)
        self.assertTrue(frappe.db.exists("Contact", contact_name))

        # Verify contact fields
        contact = frappe.get_doc("Contact", contact_name)
        self.assertEqual(contact.first_name, 'John Doe')
        self.assertEqual(contact.email_id, 'test@example.com')
        self.assertTrue(contact.is_primary_contact)

        # Verify email in child table
        email_ids = [e.email_id for e in contact.email_ids]
        self.assertIn('test@example.com', email_ids)

        # Verify phone in child table
        phone_nos = [p.phone for p in contact.phone_nos]
        self.assertIn('+60123456789', phone_nos)

        # Verify contact is linked to customer
        links = [link.link_name for link in contact.links if link.link_doctype == "Customer"]
        self.assertIn(customer.name, links)

    def test_after_insert_creates_both_address_and_contact(self):
        """Test that after_insert hook creates both address and contact"""
        # Create customer doc with all fields (simulating quick entry)
        customer = frappe.get_doc({
            "doctype": "Customer",
            "customer_name": "_Test Customer Full Integration",
            "customer_type": "Individual",
            "customer_group": "Individual",
            "territory": "All Territories",
            # Address fields (these would come from quick entry form)
            "address_line1": "789 Integration Ave",
            "city": "Integration City",
            "country": "Malaysia",
            "custom_stateprovince": "Selangor",
            # Contact fields
            "email_address": "integration@example.com",
            "mobile_number": "+60123456789"
        })

        # Don't call insert() - just simulate the doc being inserted
        customer.insert(ignore_permissions=True)

        # Now call the after_insert hook
        after_insert(customer, None)

        # Reload customer to get updated fields
        customer.reload()

        # Verify primary address was set
        self.assertTrue(customer.customer_primary_address)
        address = frappe.get_doc("Address", customer.customer_primary_address)
        self.assertEqual(address.address_line1, "789 Integration Ave")

        # Verify primary contact was set
        self.assertTrue(customer.customer_primary_contact)
        contact = frappe.get_doc("Contact", customer.customer_primary_contact)
        self.assertEqual(contact.email_id, "integration@example.com")
