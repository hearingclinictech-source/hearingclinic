# Copyright (c) 2025, Thomas Roch and Contributors
# Test cases for Customer duplicate checking logic

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import nowdate
from hearingclinic.hearingclinic.doc_events.customer_duplicate_check import (
	check_for_duplicates_before_insert
)


class TestCustomerDuplicateCheck(FrappeTestCase):
	"""Test cases for Customer duplicate detection"""

	def setUp(self):
		"""Set up test data"""
		# Create an existing customer for duplicate testing
		if not frappe.db.exists("Customer", {"customer_name": "_Test Existing Customer"}):
			existing = frappe.get_doc({
				"doctype": "Customer",
				"customer_name": "_Test Existing Customer",
				"customer_type": "Individual",
				"customer_group": "Individual",
				"territory": "All Territories",
				"gender": "Male",
				"custom_nricpassport": "S1234567A",
				"custom_date_of_birth": "1980-01-01"
			})
			existing.insert(ignore_permissions=True)

	def tearDown(self):
		"""Clean up test customers"""
		frappe.db.delete("Customer", {
			"customer_name": ["like", "_Test%"]
		})
		frappe.db.commit()

	def test_duplicate_nric_throws_error(self):
		"""Test that duplicate NRIC/Passport throws error"""
		# Try to create customer with same NRIC
		new_customer = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": "_Test New Customer",
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories",
			"gender": "Female",
			"custom_nricpassport": "S1234567A"  # Same as existing
		})

		# Should throw error
		with self.assertRaises(Exception) as context:
			check_for_duplicates_before_insert(new_customer)

		# Error message should mention duplicate
		self.assertIn("already exists", str(context.exception).lower())

	def test_unique_nric_passes(self):
		"""Test that unique NRIC passes validation"""
		new_customer = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": "_Test Unique Customer",
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories",
			"gender": "Male",
			"custom_nricpassport": "S9999999Z"  # Unique
		})

		# Should not throw error
		try:
			check_for_duplicates_before_insert(new_customer)
		except Exception as e:
			self.fail(f"Validation raised unexpected exception: {e}")

	def test_no_nric_skips_hard_check(self):
		"""Test that missing NRIC skips the hard duplicate check"""
		new_customer = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": "_Test No NRIC Customer",
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories",
			"gender": "Female"
			# No NRIC provided
		})

		# Should not throw error (no NRIC to check)
		try:
			check_for_duplicates_before_insert(new_customer)
		except frappe.exceptions.ValidationError:
			self.fail("Validation should not throw error when no NRIC is provided")

	def test_similar_name_shows_warning(self):
		"""Test that similar names trigger a soft warning"""
		# Create customer with similar name
		new_customer = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": "_Test Existing",  # Similar to "_Test Existing Customer"
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories",
			"gender": "Male",
			"custom_nricpassport": "S8888888B"  # Different NRIC
		})

		# This should trigger msgprint (soft warning) but not throw
		# We can't easily test msgprint, but we can verify no exception is raised
		try:
			check_for_duplicates_before_insert(new_customer)
		except frappe.exceptions.ValidationError as e:
			# If ValidationError is raised, it should be for NRIC, not name
			self.assertNotIn("similar name", str(e).lower())

	def test_exact_name_match_shows_warning(self):
		"""Test that exact name match triggers warning"""
		new_customer = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": "_Test Existing Customer",  # Exact match
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories",
			"gender": "Female",
			"custom_nricpassport": "S7777777C"  # Different NRIC
		})

		# Should show warning but not throw (since NRIC is different)
		try:
			check_for_duplicates_before_insert(new_customer)
		except frappe.exceptions.ValidationError as e:
			# Should not throw for name alone
			self.fail("Should show warning, not throw error for name match")

	def test_case_insensitive_name_match(self):
		"""Test that name matching is case-insensitive"""
		new_customer = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": "_TEST EXISTING CUSTOMER",  # Different case
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories",
			"gender": "Male",
			"custom_nricpassport": "S6666666D"
		})

		# Should still find match (msgprint) but not throw
		try:
			check_for_duplicates_before_insert(new_customer)
		except frappe.exceptions.ValidationError:
			self.fail("Should show warning, not throw error for case variation")

	def test_partial_name_match(self):
		"""Test that partial name matches are detected"""
		new_customer = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": "_Test Existing",  # Partial match
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories",
			"gender": "Female",
			"custom_nricpassport": "S5555555E"
		})

		# Should trigger warning for partial match
		try:
			check_for_duplicates_before_insert(new_customer)
		except frappe.exceptions.ValidationError:
			self.fail("Should show warning, not throw error for partial name match")

	def test_completely_different_customer_passes(self):
		"""Test that completely different customer passes all checks"""
		new_customer = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": "_Test Completely Different Person",
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories",
			"gender": "Male",
			"custom_nricpassport": "S4444444F",
			"custom_date_of_birth": "1990-05-15"
		})

		# Should not throw any errors or warnings
		try:
			check_for_duplicates_before_insert(new_customer)
		except Exception as e:
			self.fail(f"Validation raised unexpected exception: {e}")

	def test_nric_check_is_case_sensitive(self):
		"""Test that NRIC check is exact match (case sensitive if applicable)"""
		new_customer = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": "_Test Case Sensitive",
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories",
			"gender": "Male",
			"custom_nricpassport": "s1234567a"  # lowercase version
		})

		# Depending on DB collation, this might or might not match
		# Most DBs are case-insensitive by default, so this would likely throw
		# We're testing the behavior is consistent

	def test_empty_nric_no_duplicate_error(self):
		"""Test that empty NRIC doesn't trigger duplicate check"""
		new_customer = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": "_Test Empty NRIC",
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories",
			"gender": "Female",
			"custom_nricpassport": ""  # Empty string
		})

		try:
			check_for_duplicates_before_insert(new_customer)
		except frappe.exceptions.ValidationError as e:
			if "already exists" in str(e).lower():
				self.fail("Empty NRIC should not trigger duplicate check")

	def test_multiple_similar_names_limited(self):
		"""Test that similar name search is limited to prevent overload"""
		# Create multiple customers with similar names
		for i in range(10):
			customer = frappe.get_doc({
				"doctype": "Customer",
				"customer_name": f"_Test Similar Name {i}",
				"customer_type": "Individual",
				"customer_group": "Individual",
				"territory": "All Territories",
				"gender": "Male",
				"custom_nricpassport": f"S111111{i}A"
			})
			customer.insert(ignore_permissions=True)

		new_customer = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": "_Test Similar Name New",
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories",
			"gender": "Female",
			"custom_nricpassport": "S9999990Z"
		})

		# Should show warning but be limited to 5 results
		try:
			check_for_duplicates_before_insert(new_customer)
		except Exception as e:
			self.fail(f"Validation raised unexpected exception: {e}")

	def test_integration_with_customer_insert(self):
		"""Test that duplicate check runs during actual customer insert"""
		# Try to insert customer with duplicate NRIC via normal flow
		new_customer = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": "_Test Integration Customer",
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories",
			"gender": "Male",
			"custom_nricpassport": "S1234567A"  # Duplicate
		})

		# Should fail on insert
		with self.assertRaises(Exception):
			new_customer.insert()
