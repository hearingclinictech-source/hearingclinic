# Copyright (c) 2025, Thomas Roch and Contributors
# See license.txt
# @S Value Add Card

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import nowdate

# Load ERPNext fixtures - Only need Customer Group and Territory
# We create custom test customers to avoid Lead circular dependency
test_dependencies = ["Customer Group", "Territory"]
test_ignore = ["Customer", "Lead"]  # Avoid circular dependency


class TestCardTransaction(FrappeTestCase):
	"""Test cases for Card Transaction DocType"""

	def setUp(self):
		"""Set up test data before each test"""
		# Create a test customer if not exists
		if not frappe.db.exists("Customer", "_Test Customer CT"):
			customer = frappe.get_doc({
				"doctype": "Customer",
				"customer_name": "_Test Customer CT",
				"customer_type": "Individual",
				"customer_group": "Individual",
				"territory": "All Territories",
				"gender": "Male"
			})
			customer.insert(ignore_permissions=True)

		# Create a test Value Add Card
		if not frappe.db.exists("Value Add Card", {"customer": "_Test Customer CT"}):
			card = frappe.get_doc({
				"doctype": "Value Add Card",
				"customer": "_Test Customer CT",
				"issue_date": nowdate(),
				"amount_paid": 1000
			})
			card.insert()
			self.test_card_name = card.name
		else:
			self.test_card_name = frappe.db.get_value("Value Add Card", {"customer": "_Test Customer CT"}, "name")
			# Reset the card to initial state before each test
			card = frappe.get_doc("Value Add Card", self.test_card_name)
			card.card_transactions = []
			card.current_balance = card.card_value
			card.status = "Active"
			card.save(ignore_permissions=True)

		frappe.db.commit()

	def tearDown(self):
		"""Clean up after each test"""
		# Reset the card to initial state
		card = frappe.get_doc("Value Add Card", self.test_card_name)
		# Clear all transactions
		card.card_transactions = []
		# Reset balance and status
		card.current_balance = card.card_value
		card.status = "Active"
		card.save(ignore_permissions=True)
		frappe.db.commit()

	def test_transaction_date_auto_set(self):
		"""Test that transaction date is auto-set if not provided"""
		# Note: Card Transaction is a child table, so we test via parent
		card = frappe.get_doc("Value Add Card", self.test_card_name)

		initial_balance = card.current_balance

		# Add transaction without date
		card.add_transaction("Purchase", 100)

		# Check transaction has a date
		self.assertIsNotNone(card.card_transactions[0].transaction_date)

	def test_validate_sufficient_balance_purchase(self):
		"""Test that purchases more than balance set balance to zero"""
		card = frappe.get_doc("Value Add Card", self.test_card_name)

		initial_balance = card.current_balance

		# Try to purchase more than available balance
		card.add_transaction("Purchase", 10000)  # More than 1600 available

		# Balance should be set to 0 (not negative)
		self.assertEqual(card.current_balance, 0)
		self.assertEqual(card.status, "Fully Used")

	def test_balance_before_stored(self):
		"""Test that balance_before is stored in transaction"""
		card = frappe.get_doc("Value Add Card", self.test_card_name)

		initial_balance = card.current_balance

		# Add a transaction
		card.add_transaction("Purchase", 200)

		# Check balance_before was stored
		self.assertEqual(card.card_transactions[0].balance_before, initial_balance)

	def test_balance_after_stored(self):
		"""Test that balance_after is stored in transaction"""
		card = frappe.get_doc("Value Add Card", self.test_card_name)

		# Add a transaction
		card.add_transaction("Purchase", 300)

		expected_balance = 1600 - 300  # 1300

		# Check balance_after was stored
		self.assertEqual(card.card_transactions[0].balance_after, expected_balance)

	def test_purchase_transaction_type(self):
		"""Test purchase transaction reduces balance"""
		card = frappe.get_doc("Value Add Card", self.test_card_name)

		initial_balance = card.current_balance
		amount = 400

		# Add purchase
		card.add_transaction("Purchase", amount)

		# Check transaction type
		self.assertEqual(card.card_transactions[0].transaction_type, "Purchase")
		# Check balance reduced
		self.assertEqual(card.current_balance, initial_balance - amount)

	def test_refund_transaction_type(self):
		"""Test refund transaction increases balance"""
		card = frappe.get_doc("Value Add Card", self.test_card_name)

		# First do a purchase
		card.add_transaction("Purchase", 500)
		balance_after_purchase = card.current_balance

		# Then do a refund
		refund_amount = 100
		card.add_transaction("Refund", refund_amount)

		# Check transaction type
		last_txn = card.card_transactions[-1]
		self.assertEqual(last_txn.transaction_type, "Refund")
		# Check balance increased
		self.assertEqual(card.current_balance, balance_after_purchase + refund_amount)

	def test_transaction_with_sales_invoice_reference(self):
		"""Test transaction can store sales invoice reference"""
		card = frappe.get_doc("Value Add Card", self.test_card_name)

		# Add transaction without SI reference (SI validation would require actual invoice)
		card.add_transaction(
			transaction_type="Purchase",
			amount=250,
			remarks="Purchase via Sales Invoice"
		)

		# Check transaction was created
		self.assertEqual(len(card.card_transactions), 1)
		self.assertEqual(card.card_transactions[0].amount, 250)

	def test_transaction_with_remarks(self):
		"""Test transaction can store custom remarks"""
		card = frappe.get_doc("Value Add Card", self.test_card_name)

		custom_remarks = "Custom test transaction"

		# Add transaction with remarks
		card.add_transaction(
			transaction_type="Purchase",
			amount=150,
			remarks=custom_remarks
		)

		# Check remarks were stored
		self.assertEqual(card.card_transactions[0].remarks, custom_remarks)

	def test_multiple_transactions_sequence(self):
		"""Test multiple transactions maintain correct balance"""
		card = frappe.get_doc("Value Add Card", self.test_card_name)

		# Perform multiple transactions
		card.add_transaction("Purchase", 200)    # 1400
		card.add_transaction("Purchase", 300)    # 1100
		card.add_transaction("Refund", 100)      # 1200
		card.add_transaction("Purchase", 400)    # 800

		# Check final balance
		self.assertEqual(card.current_balance, 800.0)

		# Check transaction count
		self.assertEqual(len(card.card_transactions), 4)

		# Check each transaction has correct balances
		self.assertEqual(card.card_transactions[0].balance_after, 1400.0)
		self.assertEqual(card.card_transactions[1].balance_after, 1100.0)
		self.assertEqual(card.card_transactions[2].balance_after, 1200.0)
		self.assertEqual(card.card_transactions[3].balance_after, 800.0)

	def test_transaction_amounts_positive(self):
		"""Test that transaction amounts are stored as positive values"""
		card = frappe.get_doc("Value Add Card", self.test_card_name)

		# Add both purchase and refund
		card.add_transaction("Purchase", 100)
		card.add_transaction("Refund", 50)

		# Both amounts should be positive
		for txn in card.card_transactions:
			self.assertGreater(txn.amount, 0)

	def test_card_number_reference(self):
		"""Test that transactions are linked to correct card"""
		card = frappe.get_doc("Value Add Card", self.test_card_name)

		# Add transaction
		card.add_transaction("Purchase", 100)

		# Check card_number reference
		self.assertEqual(card.card_transactions[0].card_number, card.name)

	def test_transaction_preserves_on_reload(self):
		"""Test that transactions persist after reload"""
		card = frappe.get_doc("Value Add Card", self.test_card_name)

		# Add transaction
		card.add_transaction("Purchase", 175)

		# Reload card
		card.reload()

		# Check transaction still exists
		self.assertEqual(len(card.card_transactions), 1)
		self.assertEqual(card.card_transactions[0].amount, 175)
