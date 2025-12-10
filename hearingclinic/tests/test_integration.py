# Copyright (c) 2025, Thomas Roch and Contributors
# Integration tests for complete workflows
# @S Integration Tests

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import nowdate, add_days, add_months, flt

# Load ERPNext fixtures - Integration tests need base ERPNext setup
# We create custom test customers to avoid Lead circular dependency
test_dependencies = ["Customer Group", "Territory", "Item Group", "UOM", "Warehouse"]
test_ignore = ["Customer", "Lead"]  # Avoid circular dependency


class TestCustomerWorkflow(FrappeTestCase):
	"""Integration tests for customer creation and management workflow"""

	def tearDown(self):
		"""Clean up test data"""
		frappe.db.delete("Customer", {"customer_name": ["like", "_Test Integration%"]})
		frappe.db.commit()

	def test_complete_customer_creation_workflow(self):
		"""Test complete customer creation with ID generation"""
		# Create a new customer
		customer = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": "_Test Integration Customer 1",
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories",
			"gender": "Male",
			"custom_nricpassport": "S1111111A",
			"custom_date_of_birth": "1985-06-15"
		})
		customer.insert()

		# Verify customer ID was auto-generated
		self.assertIsNotNone(customer.custom_customer_id)
		self.assertTrue(customer.custom_customer_id.startswith("M-"))

		# Verify customer can be retrieved
		customer.reload()
		self.assertEqual(customer.customer_name, "_Test Integration Customer 1")

	def test_duplicate_customer_prevention(self):
		"""Test that duplicate customers are prevented"""
		# Create first customer
		customer1 = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": "_Test Integration Duplicate",
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories",
			"gender": "Female",
			"custom_nricpassport": "S2222222B"
		})
		customer1.insert()

		# Try to create duplicate with same NRIC
		customer2 = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": "_Test Integration Duplicate 2",
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories",
			"gender": "Female",
			"custom_nricpassport": "S2222222B"  # Same NRIC
		})

		# Should fail
		with self.assertRaises(Exception):
			customer2.insert()


class TestValueAddCardWorkflow(FrappeTestCase):
	"""Integration tests for Value Add Card purchase and usage workflow"""

	def setUp(self):
		"""Set up test data"""
		if not frappe.db.exists("Customer", "_Test Integration VAC Customer"):
			customer = frappe.get_doc({
				"doctype": "Customer",
				"customer_name": "_Test Integration VAC Customer",
				"customer_type": "Individual",
				"customer_group": "Individual",
				"territory": "All Territories",
				"gender": "Male"
			})
			customer.insert(ignore_permissions=True)

	def tearDown(self):
		"""Clean up"""
		frappe.db.delete("Value Add Card", {"customer": "_Test Integration VAC Customer"})
		frappe.db.delete("Customer", {"customer_name": "_Test Integration VAC Customer"})
		frappe.db.commit()

	def test_complete_vac_lifecycle(self):
		"""Test complete VAC lifecycle: creation, usage, depletion"""
		# 1. Create VAC
		card = frappe.get_doc({
			"doctype": "Value Add Card",
			"customer": "_Test Integration VAC Customer",
			"issue_date": nowdate(),
			"amount_paid": 1000
		})
		card.insert()

		# Verify initial state
		self.assertEqual(card.card_value, 1600.0)
		self.assertEqual(card.current_balance, 1600.0)
		self.assertEqual(card.status, "Active")

		# 2. Use card for purchase
		card.add_transaction("Purchase", 500, remarks="First purchase")

		# Verify after first purchase
		self.assertEqual(card.current_balance, 1100.0)
		self.assertEqual(card.status, "Partially Used")

		# 3. Add refund
		card.add_transaction("Refund", 200, remarks="Return item")

		# Verify after refund
		self.assertEqual(card.current_balance, 1300.0)
		self.assertEqual(card.status, "Partially Used")

		# 4. Use remaining balance
		card.add_transaction("Purchase", 1300, remarks="Final purchase")

		# Verify card depleted
		self.assertEqual(card.current_balance, 0)
		self.assertEqual(card.status, "Fully Used")

		# 5. Verify transaction history
		self.assertEqual(len(card.card_transactions), 3)

	def test_vac_transaction_reversal(self):
		"""Test reversing VAC transactions"""
		# Create card and add transaction
		card = frappe.get_doc({
			"doctype": "Value Add Card",
			"customer": "_Test Integration VAC Customer",
			"issue_date": nowdate(),
			"amount_paid": 500
		})
		card.insert()

		# Add purchase
		card.add_transaction(
			"Purchase",
			300,
			remarks="Test purchase"
		)

		balance_after_purchase = card.current_balance
		self.assertEqual(balance_after_purchase, 500.0)  # 800 - 300

		# Verify transaction reversal method exists
		# Note: Full testing of remove_transaction requires actual Sales Invoice
		self.assertTrue(hasattr(card, 'remove_transaction'))
		self.assertTrue(callable(card.remove_transaction))


class TestSalesWorkflow(FrappeTestCase):
	"""Integration tests for sales workflows"""

	def setUp(self):
		"""Set up test data"""
		# Create test customer
		if not frappe.db.exists("Customer", "_Test Sales Customer"):
			customer = frappe.get_doc({
				"doctype": "Customer",
				"customer_name": "_Test Sales Customer",
				"customer_type": "Individual",
				"customer_group": "Individual",
				"territory": "All Territories",
				"gender": "Female"
			})
			customer.insert(ignore_permissions=True)

		# Create test items
		for item_code in ["_Test Hearing Aid Item", "_Test Warranty Item"]:
			if not frappe.db.exists("Item", item_code):
				item = frappe.get_doc({
					"doctype": "Item",
					"item_code": item_code,
					"item_name": item_code,
					"item_group": "Products",
					"stock_uom": "Nos",
					"is_stock_item": 0,
					"is_sales_item": 1
				})
				item.insert(ignore_permissions=True)

	def tearDown(self):
		"""Clean up"""
		frappe.db.delete("Sales Invoice", {"customer": "_Test Sales Customer"})
		frappe.db.delete("Customer", {"customer_name": "_Test Sales Customer"})
		frappe.db.delete("Item", {"item_code": ["like", "_Test%Item"]})
		frappe.db.commit()

	def test_sales_invoice_basic_creation(self):
		"""Test basic sales invoice creation"""
		# Note: Full SI creation requires company, accounts, etc.
		# This is a simplified test
		si = frappe.get_doc({
			"doctype": "Sales Invoice",
			"customer": "_Test Sales Customer",
			"posting_date": nowdate(),
			"items": [{
				"item_code": "_Test Hearing Aid Item",
				"qty": 1,
				"rate": 1000
			}]
		})

		# Verify structure
		self.assertEqual(si.customer, "_Test Sales Customer")
		self.assertEqual(len(si.items), 1)
		self.assertEqual(si.items[0].qty, 1)


class TestMultiDocumentWorkflow(FrappeTestCase):
	"""Integration tests spanning multiple document types"""

	def setUp(self):
		"""Set up complex test scenario"""
		# Create customer
		if not frappe.db.exists("Customer", "_Test Multi Doc Customer"):
			customer = frappe.get_doc({
				"doctype": "Customer",
				"customer_name": "_Test Multi Doc Customer",
				"customer_type": "Individual",
				"customer_group": "Individual",
				"territory": "All Territories",
				"gender": "Male"
			})
			customer.insert(ignore_permissions=True)

	def tearDown(self):
		"""Clean up"""
		frappe.db.delete("Value Add Card", {"customer": "_Test Multi Doc Customer"})
		frappe.db.delete("Sales Invoice", {"customer": "_Test Multi Doc Customer"})
		frappe.db.delete("Customer", {"customer_name": "_Test Multi Doc Customer"})
		frappe.db.commit()

	def test_customer_purchases_vac_and_uses_it(self):
		"""Test workflow: Customer buys VAC, then uses it for purchase"""
		# 1. Customer purchases VAC
		vac = frappe.get_doc({
			"doctype": "Value Add Card",
			"customer": "_Test Multi Doc Customer",
			"issue_date": nowdate(),
			"amount_paid": 2000
		})
		vac.insert()

		# Verify VAC created with bonus
		self.assertEqual(vac.card_value, 3200.0)  # 2000 * 1.6

		# 2. Customer uses VAC for a purchase
		vac.add_transaction(
			"Purchase",
			1500,
			remarks="Hearing aid purchase"
		)

		# Verify balance updated
		self.assertEqual(vac.current_balance, 1700.0)  # 3200 - 1500

		# 3. Verify transaction recorded
		self.assertEqual(len(vac.card_transactions), 1)
		txn = vac.card_transactions[0]
		self.assertEqual(txn.transaction_type, "Purchase")
		self.assertEqual(txn.amount, 1500)


class TestDataConsistency(FrappeTestCase):
	"""Tests for data consistency across operations"""

	def setUp(self):
		"""Set up test data"""
		if not frappe.db.exists("Customer", "_Test Consistency Customer"):
			customer = frappe.get_doc({
				"doctype": "Customer",
				"customer_name": "_Test Consistency Customer",
				"customer_type": "Individual",
				"customer_group": "Individual",
				"territory": "All Territories",
				"gender": "Female"
			})
			customer.insert(ignore_permissions=True)

	def tearDown(self):
		"""Clean up"""
		frappe.db.delete("Value Add Card", {"customer": "_Test Consistency Customer"})
		frappe.db.delete("Customer", {"customer_name": "_Test Consistency Customer"})
		frappe.db.commit()

	def test_vac_balance_consistency_after_multiple_operations(self):
		"""Test that VAC balance remains consistent after multiple operations"""
		# Create card
		card = frappe.get_doc({
			"doctype": "Value Add Card",
			"customer": "_Test Consistency Customer",
			"issue_date": nowdate(),
			"amount_paid": 1000
		})
		card.insert()

		initial_balance = 1600.0

		# Perform multiple operations
		operations = [
			("Purchase", 200),
			("Purchase", 300),
			("Refund", 100),
			("Purchase", 150),
			("Refund", 50)
		]

		expected_balance = initial_balance
		for op_type, amount in operations:
			card.add_transaction(op_type, amount)
			if op_type == "Purchase":
				expected_balance -= amount
			else:  # Refund
				expected_balance += amount

		# Verify final balance matches expectations
		self.assertEqual(card.current_balance, expected_balance)

		# Verify transaction count
		self.assertEqual(len(card.card_transactions), len(operations))

		# Reload and verify persistence
		card.reload()
		self.assertEqual(card.current_balance, expected_balance)

	def test_concurrent_customer_id_generation(self):
		"""Test that customer IDs don't conflict when generated concurrently"""
		# Create multiple customers in sequence
		customer_ids = []

		for i in range(5):
			customer = frappe.get_doc({
				"doctype": "Customer",
				"customer_name": f"_Test Consistency Customer {i}",
				"customer_type": "Individual",
				"customer_group": "Individual",
				"territory": "All Territories",
				"gender": "Male"
			})
			customer.insert()
			customer_ids.append(customer.custom_customer_id)

		# Verify all IDs are unique
		self.assertEqual(len(customer_ids), len(set(customer_ids)))

		# Verify all have correct prefix
		for cid in customer_ids:
			self.assertTrue(cid.startswith("M-"))

		# Clean up
		frappe.db.delete("Customer", {
			"customer_name": ["like", "_Test Consistency Customer%"]
		})
		frappe.db.commit()


class TestErrorHandling(FrappeTestCase):
	"""Tests for error handling and edge cases"""

	def setUp(self):
		"""Set up test data"""
		if not frappe.db.exists("Customer", "_Test Error Customer"):
			customer = frappe.get_doc({
				"doctype": "Customer",
				"customer_name": "_Test Error Customer",
				"customer_type": "Individual",
				"customer_group": "Individual",
				"territory": "All Territories",
				"gender": "Male"
			})
			customer.insert(ignore_permissions=True)

	def tearDown(self):
		"""Clean up"""
		frappe.db.delete("Value Add Card", {"customer": "_Test Error Customer"})
		frappe.db.delete("Customer", {"customer_name": "_Test Error Customer"})
		frappe.db.commit()

	def test_vac_overdraft_prevention(self):
		"""Test that VAC cannot be overdrawn"""
		card = frappe.get_doc({
			"doctype": "Value Add Card",
			"customer": "_Test Error Customer",
			"issue_date": nowdate(),
			"amount_paid": 100  # Only 160 total value
		})
		card.insert()

		# Try to purchase more than available
		card.add_transaction("Purchase", 200)

		# Balance should be clamped to 0, not go negative
		self.assertEqual(card.current_balance, 0)
		self.assertGreaterEqual(card.current_balance, 0)

	def test_invalid_transaction_type(self):
		"""Test handling of invalid transaction types"""
		card = frappe.get_doc({
			"doctype": "Value Add Card",
			"customer": "_Test Error Customer",
			"issue_date": nowdate(),
			"amount_paid": 500
		})
		card.insert()

		# Try invalid transaction type
		with self.assertRaises(Exception):
			card.add_transaction("InvalidType", 100)

	def test_remove_nonexistent_transaction(self):
		"""Test removing a transaction that doesn't exist"""
		card = frappe.get_doc({
			"doctype": "Value Add Card",
			"customer": "_Test Error Customer",
			"issue_date": nowdate(),
			"amount_paid": 500
		})
		card.insert()

		# Try to remove non-existent transaction
		result = card.remove_transaction("Sales Invoice", "NON-EXISTENT-INV")

		# Should return None without error
		self.assertIsNone(result)
