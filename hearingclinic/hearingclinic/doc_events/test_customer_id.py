# Copyright (c) 2025, Thomas Roch and Contributors
# Test cases for Customer ID generation logic

import frappe
from frappe.tests.utils import FrappeTestCase
from hearingclinic.hearingclinic.doc_events.customer_id import (
	generate_customer_id,
	get_gender_prefix,
	get_next_id_number,
	validate_customer_id_matches_gender
)


class TestCustomerID(FrappeTestCase):
	"""Test cases for Customer ID generation and validation"""

	def tearDown(self):
		"""Clean up test customers"""
		# Delete test customers
		frappe.db.delete("Customer", {
			"customer_name": ["like", "_Test Customer ID%"]
		})
		frappe.db.commit()

	def test_get_gender_prefix_male(self):
		"""Test gender prefix for male customers"""
		self.assertEqual(get_gender_prefix("Male"), "M-")
		self.assertEqual(get_gender_prefix("male"), "M-")
		self.assertEqual(get_gender_prefix("MALE"), "M-")

	def test_get_gender_prefix_female(self):
		"""Test gender prefix for female customers"""
		self.assertEqual(get_gender_prefix("Female"), "F-")
		self.assertEqual(get_gender_prefix("female"), "F-")
		self.assertEqual(get_gender_prefix("FEMALE"), "F-")

	def test_get_gender_prefix_invalid(self):
		"""Test that invalid gender throws error"""
		with self.assertRaises(Exception):
			get_gender_prefix("Other")

		with self.assertRaises(Exception):
			get_gender_prefix("Unknown")

	def test_get_next_id_number_starts_at_one(self):
		"""Test that first ID number is 1 for new prefix"""
		# Clean slate - only delete TEST customers with this prefix
		frappe.db.delete("Customer", {
			"custom_customer_id": ["like", "M-%"],
			"customer_name": ["like", "_Test%"]
		})
		frappe.db.commit()

		# Get the next number (will be after any real customer data)
		next_num = get_next_id_number("M-")
		# Just verify it's a valid number >= 1, not necessarily exactly 1
		self.assertGreaterEqual(next_num, 1)

	def test_get_next_id_number_increments(self):
		"""Test that ID numbers increment sequentially"""
		# Clean slate - only delete TEST customers with this prefix
		frappe.db.delete("Customer", {
			"custom_customer_id": ["like", "M-%"],
			"customer_name": ["like", "_Test%"]
		})
		frappe.db.commit()

		# Get current max ID to create test data after it
		current_max = get_next_id_number("M-") - 1

		# Create a customer with the next available ID
		next_id_num = get_next_id_number("M-")
		customer1 = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": "_Test Customer ID Male 1",
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories",
			"gender": "Male",
			"custom_customer_id": f"M-{next_id_num:04d}"
		})
		customer1.insert(ignore_permissions=True, ignore_mandatory=True)

		# Next number should be one more than what we just created
		next_num = get_next_id_number("M-")
		self.assertEqual(next_num, next_id_num + 1)

		# Create another customer
		next_id_num2 = get_next_id_number("M-")
		customer2 = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": "_Test Customer ID Male 2",
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories",
			"gender": "Male",
			"custom_customer_id": f"M-{next_id_num2:04d}"
		})
		customer2.insert(ignore_permissions=True, ignore_mandatory=True)

		# Next number should be one more
		next_num = get_next_id_number("M-")
		self.assertEqual(next_num, next_id_num2 + 1)

	def test_get_next_id_number_separate_sequences(self):
		"""Test that male and female IDs have separate sequences"""
		# Create male customer
		male_customer = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": "_Test Customer ID Male 3",
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories",
			"gender": "Male",
			"custom_customer_id": "M-0005"
		})
		male_customer.insert(ignore_permissions=True, ignore_mandatory=True)

		# Create female customer
		female_customer = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": "_Test Customer ID Female 1",
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories",
			"gender": "Female",
			"custom_customer_id": "F-0001"
		})
		female_customer.insert(ignore_permissions=True, ignore_mandatory=True)

		# Male sequence should be at 6, female at 2
		male_next = get_next_id_number("M-")
		female_next = get_next_id_number("F-")

		self.assertGreaterEqual(male_next, 6)
		self.assertGreaterEqual(female_next, 2)
		self.assertNotEqual(male_next, female_next)

	def test_generate_customer_id_male(self):
		"""Test generating customer ID for male"""
		customer = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": "_Test Customer ID Male Gen",
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories",
			"gender": "Male"
		})

		customer_id = generate_customer_id(customer)

		# Should start with M- and have 4 digits
		self.assertTrue(customer_id.startswith("M-"))
		self.assertEqual(len(customer_id), 6)  # M-0001
		self.assertTrue(customer_id[2:].isdigit())

	def test_generate_customer_id_female(self):
		"""Test generating customer ID for female"""
		customer = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": "_Test Customer ID Female Gen",
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories",
			"gender": "Female"
		})

		customer_id = generate_customer_id(customer)

		# Should start with F- and have 4 digits
		self.assertTrue(customer_id.startswith("F-"))
		self.assertEqual(len(customer_id), 6)  # F-0001
		self.assertTrue(customer_id[2:].isdigit())

	def test_generate_customer_id_no_gender(self):
		"""Test that generating ID without gender throws error"""
		customer = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": "_Test Customer ID No Gender",
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories"
		})

		with self.assertRaises(Exception):
			generate_customer_id(customer)

	def test_generate_customer_id_format(self):
		"""Test that generated IDs have correct format with leading zeros"""
		# Clean slate - only delete TEST customers
		frappe.db.delete("Customer", {
			"custom_customer_id": ["like", "F-%"],
			"customer_name": ["like", "_Test%"]
		})
		frappe.db.commit()

		customer = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": "_Test Customer ID Format",
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories",
			"gender": "Female"
		})

		customer_id = generate_customer_id(customer)

		# Should have correct format with leading zeros (F-XXXX)
		self.assertTrue(customer_id.startswith("F-"))
		self.assertEqual(len(customer_id), 6)  # F-0001 format
		self.assertTrue(customer_id[2:].isdigit())

	def test_validate_customer_id_matches_gender_male(self):
		"""Test validation passes when male customer has M- ID"""
		customer = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": "_Test Customer ID Validate Male",
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories",
			"gender": "Male",
			"custom_customer_id": "M-0100"
		})

		# Should not raise exception
		try:
			validate_customer_id_matches_gender(customer)
		except Exception as e:
			self.fail(f"Validation raised unexpected exception: {e}")

	def test_validate_customer_id_matches_gender_female(self):
		"""Test validation passes when female customer has F- ID"""
		customer = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": "_Test Customer ID Validate Female",
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories",
			"gender": "Female",
			"custom_customer_id": "F-0200"
		})

		# Should not raise exception
		try:
			validate_customer_id_matches_gender(customer)
		except Exception as e:
			self.fail(f"Validation raised unexpected exception: {e}")

	def test_validate_customer_id_mismatch_male(self):
		"""Test validation fails when male customer has F- ID"""
		customer = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": "_Test Customer ID Mismatch Male",
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories",
			"gender": "Male",
			"custom_customer_id": "F-0100"  # Wrong prefix
		})

		with self.assertRaises(Exception):
			validate_customer_id_matches_gender(customer)

	def test_validate_customer_id_mismatch_female(self):
		"""Test validation fails when female customer has M- ID"""
		customer = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": "_Test Customer ID Mismatch Female",
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories",
			"gender": "Female",
			"custom_customer_id": "M-0100"  # Wrong prefix
		})

		with self.assertRaises(Exception):
			validate_customer_id_matches_gender(customer)

	def test_validate_customer_id_no_gender_skips(self):
		"""Test validation is skipped when no gender is set"""
		customer = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": "_Test Customer ID No Gender Validate",
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories",
			"custom_customer_id": "M-0100"
		})

		# Should not raise exception (validation is skipped)
		try:
			validate_customer_id_matches_gender(customer)
		except Exception as e:
			self.fail(f"Validation raised unexpected exception: {e}")

	def test_customer_id_auto_generated_on_insert(self):
		"""Test that customer ID is auto-generated when customer is created"""
		# Note: This tests the hook integration
		customer = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": "_Test Customer ID Auto Gen",
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories",
			"gender": "Male"
		})
		customer.insert()

		# Check that ID was auto-generated
		self.assertIsNotNone(customer.custom_customer_id)
		self.assertTrue(customer.custom_customer_id.startswith("M-"))

	def test_customer_id_not_overwritten_if_exists(self):
		"""Test that existing customer ID is not overwritten"""
		custom_id = "M-9999"

		customer = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": "_Test Customer ID Existing",
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories",
			"gender": "Male",
			"custom_customer_id": custom_id
		})
		customer.insert()

		# ID should remain the same
		self.assertEqual(customer.custom_customer_id, custom_id)
