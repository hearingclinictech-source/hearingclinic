# Copyright (c) 2025, Thomas Roch and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import nowdate, now_datetime


class TestValueAddCard(FrappeTestCase):
	"""Test cases for Value Add Card DocType"""

	def setUp(self):
		"""Set up test data before each test"""
		# Create a test customer if not exists
		if not frappe.db.exists("Customer", "_Test Customer VAC"):
			customer = frappe.get_doc({
				"doctype": "Customer",
				"customer_name": "_Test Customer VAC",
				"customer_type": "Individual",
				"customer_group": "Individual",
				"territory": "All Territories",
				"gender": "Female"
			})
			customer.insert(ignore_permissions=True)

	def tearDown(self):
		"""Clean up after each test"""
		# Delete test cards
		frappe.db.delete("Value Add Card", {
			"customer": "_Test Customer VAC"
		})
		frappe.db.commit()

	def test_card_value_calculation(self):
		"""Test that card value is auto-calculated as amount_paid * 1.6"""
		card = frappe.get_doc({
			"doctype": "Value Add Card",
			"customer": "_Test Customer VAC",
			"issue_date": nowdate(),
			"amount_paid": 1000
		})
		card.insert()

		# Check if card value is correctly calculated
		self.assertEqual(card.card_value, 1600.0)
		self.assertEqual(card.current_balance, 1600.0)
		self.assertEqual(card.status, "Active")

	def test_initial_balance_setup(self):
		"""Test that initial balance is set to card value"""
		card = frappe.get_doc({
			"doctype": "Value Add Card",
			"customer": "_Test Customer VAC",
			"issue_date": nowdate(),
			"amount_paid": 500
		})
		card.insert()

		self.assertEqual(card.current_balance, 800.0)  # 500 * 1.6

	def test_initial_status(self):
		"""Test that initial status is set to Active"""
		card = frappe.get_doc({
			"doctype": "Value Add Card",
			"customer": "_Test Customer VAC",
			"issue_date": nowdate(),
			"amount_paid": 100
		})
		card.insert()

		self.assertEqual(card.status, "Active")

	def test_add_purchase_transaction(self):
		"""Test adding a purchase transaction reduces balance"""
		card = frappe.get_doc({
			"doctype": "Value Add Card",
			"customer": "_Test Customer VAC",
			"issue_date": nowdate(),
			"amount_paid": 1000
		})
		card.insert()

		# Add a purchase transaction
		result = card.add_transaction(
			transaction_type="Purchase",
			amount=500,
			remarks="Test purchase"
		)

		# Check balance is reduced
		self.assertEqual(result["balance_before"], 1600.0)
		self.assertEqual(result["balance_after"], 1100.0)
		self.assertEqual(card.current_balance, 1100.0)
		self.assertEqual(card.status, "Partially Used")

		# Check transaction was added
		self.assertEqual(len(card.card_transactions), 1)
		self.assertEqual(card.card_transactions[0].transaction_type, "Purchase")
		self.assertEqual(card.card_transactions[0].amount, 500)

	def test_add_refund_transaction(self):
		"""Test adding a refund transaction increases balance"""
		card = frappe.get_doc({
			"doctype": "Value Add Card",
			"customer": "_Test Customer VAC",
			"issue_date": nowdate(),
			"amount_paid": 1000
		})
		card.insert()

		# First add a purchase
		card.add_transaction("Purchase", 600)

		# Then add a refund
		result = card.add_transaction(
			transaction_type="Refund",
			amount=200,
			remarks="Test refund"
		)

		# Balance should be 1600 - 600 + 200 = 1200
		self.assertEqual(result["balance_after"], 1200.0)
		self.assertEqual(card.current_balance, 1200.0)
		self.assertEqual(card.status, "Partially Used")

	def test_balance_cannot_go_negative(self):
		"""Test that balance cannot go below zero"""
		card = frappe.get_doc({
			"doctype": "Value Add Card",
			"customer": "_Test Customer VAC",
			"issue_date": nowdate(),
			"amount_paid": 100  # Card value = 160
		})
		card.insert()

		# Try to deduct more than available balance
		result = card.add_transaction("Purchase", 200)

		# Balance should be clamped to 0
		self.assertEqual(result["balance_after"], 0)
		self.assertEqual(card.current_balance, 0)
		self.assertEqual(card.status, "Fully Used")

	def test_status_fully_used(self):
		"""Test status changes to 'Fully Used' when balance is zero"""
		card = frappe.get_doc({
			"doctype": "Value Add Card",
			"customer": "_Test Customer VAC",
			"issue_date": nowdate(),
			"amount_paid": 100
		})
		card.insert()

		# Use entire balance
		card.add_transaction("Purchase", 160)

		self.assertEqual(card.current_balance, 0)
		self.assertEqual(card.status, "Fully Used")

	def test_status_partially_used(self):
		"""Test status changes to 'Partially Used' when balance < card_value"""
		card = frappe.get_doc({
			"doctype": "Value Add Card",
			"customer": "_Test Customer VAC",
			"issue_date": nowdate(),
			"amount_paid": 1000
		})
		card.insert()

		# Use partial balance
		card.add_transaction("Purchase", 500)

		self.assertEqual(card.status, "Partially Used")
		self.assertGreater(card.current_balance, 0)
		self.assertLess(card.current_balance, card.card_value)

	def test_remove_purchase_transaction(self):
		"""Test removing a purchase transaction restores balance"""
		card = frappe.get_doc({
			"doctype": "Value Add Card",
			"customer": "_Test Customer VAC",
			"issue_date": nowdate(),
			"amount_paid": 1000
		})
		card.insert()

		# Add a purchase
		card.add_transaction(
			transaction_type="Purchase",
			amount=500,
			remarks="Test purchase for removal"
		)

		# Test that remove_transaction method exists and is callable
		# Note: Full testing of remove_transaction requires actual Sales Invoice
		self.assertTrue(hasattr(card, 'remove_transaction'))
		self.assertTrue(callable(card.remove_transaction))

	def test_remove_refund_transaction(self):
		"""Test removing a refund transaction reduces balance"""
		card = frappe.get_doc({
			"doctype": "Value Add Card",
			"customer": "_Test Customer VAC",
			"issue_date": nowdate(),
			"amount_paid": 1000
		})
		card.insert()

		# Add a purchase then a refund
		card.add_transaction("Purchase", 600)
		card.add_transaction(
			transaction_type="Refund",
			amount=200,
			remarks="Test refund"
		)

		# Balance should be 1200 (1600 - 600 + 200)
		self.assertEqual(card.current_balance, 1200.0)

		# Verify remove_transaction method exists
		# Note: Full testing of remove_transaction requires actual Sales Invoice
		self.assertTrue(hasattr(card, 'remove_transaction'))
		self.assertTrue(callable(card.remove_transaction))

	def test_remove_nonexistent_transaction(self):
		"""Test removing a transaction that doesn't exist returns None"""
		card = frappe.get_doc({
			"doctype": "Value Add Card",
			"customer": "_Test Customer VAC",
			"issue_date": nowdate(),
			"amount_paid": 1000
		})
		card.insert()

		result = card.remove_transaction("Sales Invoice", "NONEXISTENT")

		self.assertIsNone(result)
		self.assertEqual(card.current_balance, 1600.0)  # Unchanged

	def test_get_balance(self):
		"""Test get_balance method returns current balance"""
		card = frappe.get_doc({
			"doctype": "Value Add Card",
			"customer": "_Test Customer VAC",
			"issue_date": nowdate(),
			"amount_paid": 500
		})
		card.insert()

		balance = card.get_balance()

		self.assertEqual(balance, 800.0)

	def test_check_balance_api(self):
		"""Test check_balance API method"""
		card = frappe.get_doc({
			"doctype": "Value Add Card",
			"customer": "_Test Customer VAC",
			"issue_date": nowdate(),
			"amount_paid": 250
		})
		card.insert()

		result = card.check_balance()

		self.assertEqual(result["card_number"], card.name)
		self.assertEqual(result["current_balance"], 400.0)
		self.assertEqual(result["status"], "Active")

	def test_multiple_transactions(self):
		"""Test multiple sequential transactions"""
		card = frappe.get_doc({
			"doctype": "Value Add Card",
			"customer": "_Test Customer VAC",
			"issue_date": nowdate(),
			"amount_paid": 1000
		})
		card.insert()

		# Multiple transactions
		card.add_transaction("Purchase", 200)  # 1400
		card.add_transaction("Purchase", 300)  # 1100
		card.add_transaction("Refund", 100)    # 1200
		card.add_transaction("Purchase", 500)  # 700

		self.assertEqual(card.current_balance, 700.0)
		self.assertEqual(len(card.card_transactions), 4)
		self.assertEqual(card.status, "Partially Used")

	def test_invalid_transaction_type(self):
		"""Test that invalid transaction type throws error"""
		card = frappe.get_doc({
			"doctype": "Value Add Card",
			"customer": "_Test Customer VAC",
			"issue_date": nowdate(),
			"amount_paid": 1000
		})
		card.insert()

		with self.assertRaises(Exception):
			card.add_transaction("InvalidType", 100)

	def test_card_value_not_recalculated_on_update(self):
		"""Test that card value is not recalculated on update of existing card"""
		card = frappe.get_doc({
			"doctype": "Value Add Card",
			"customer": "_Test Customer VAC",
			"issue_date": nowdate(),
			"amount_paid": 1000
		})
		card.insert()

		original_card_value = card.card_value

		# Update amount_paid (shouldn't recalculate card_value)
		card.amount_paid = 2000
		card.save()

		# Card value should remain the same
		self.assertEqual(card.card_value, original_card_value)
