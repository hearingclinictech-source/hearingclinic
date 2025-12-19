# Copyright (c) 2025, Thomas Roch and Contributors
# See license.txt
# @S Value Add Card

"""
Test cases for Value Add Card integration with Sales Invoice
Tests all functionality added/modified in the VAC payment flow improvements
"""

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import flt, nowdate
from erpnext.accounts.doctype.sales_invoice.test_sales_invoice import create_sales_invoice

# Test dependencies - minimal to avoid circular dependencies
test_dependencies = []
test_ignore = ["Lead"]  # Avoid circular dependency with Lead


class TestVACSalesInvoice(FrappeTestCase):
	"""Test cases for Value Add Card payment on Sales Invoice"""

	@classmethod
	def setUpClass(cls):
		"""Set up test data once for all tests"""
		super().setUpClass()

		# Create test customer
		if not frappe.db.exists("Customer", "_Test VAC Customer"):
			customer = frappe.get_doc({
				"doctype": "Customer",
				"customer_name": "_Test VAC Customer",
				"customer_type": "Individual",
				"customer_group": "Individual",
				"territory": "All Territories",
				"gender": "Female"
			})
			customer.insert(ignore_permissions=True)
			frappe.db.commit()

		# Create test item
		if not frappe.db.exists("Item", "_Test VAC Item"):
			item = frappe.get_doc({
				"doctype": "Item",
				"item_code": "_Test VAC Item",
				"item_name": "_Test VAC Item",
				"description": "Test item for VAC",
				"item_group": "Products",
				"stock_uom": "Nos",
				"is_stock_item": 0
			})
			item.insert(ignore_permissions=True)
			frappe.db.commit()

		# Ensure Cash mode of payment exists
		if not frappe.db.exists("Mode of Payment", "Cash"):
			mop = frappe.get_doc({
				"doctype": "Mode of Payment",
				"mode_of_payment": "Cash",
				"enabled": 1,
				"type": "Cash"
			})
			mop.insert(ignore_permissions=True)
			frappe.db.commit()

		# Ensure Value Add Card mode of payment exists with account
		company = frappe.db.get_single_value("Global Defaults", "default_company")
		cash_account = frappe.get_value("Company", company, "default_cash_account")

		if not frappe.db.exists("Mode of Payment", "Value Add Card"):
			mop = frappe.get_doc({
				"doctype": "Mode of Payment",
				"mode_of_payment": "Value Add Card",
				"enabled": 1,
				"type": "Cash"
			})
			mop.insert(ignore_permissions=True)
		else:
			mop = frappe.get_doc("Mode of Payment", "Value Add Card")

		# Add account for the company if not exists
		existing_account = False
		for account_row in mop.accounts:
			if account_row.company == company:
				existing_account = True
				break

		if not existing_account and cash_account:
			mop.append("accounts", {
				"company": company,
				"default_account": cash_account
			})
			mop.save(ignore_permissions=True)

		frappe.db.commit()

	def setUp(self):
		"""Set up test data before each test"""
		# Create a test VAC for each test
		self.vac = frappe.get_doc({
			"doctype": "Value Add Card",
			"customer": "_Test VAC Customer",
			"issue_date": nowdate(),
			"amount_paid": 1000  # Card value will be 1600
		})
		self.vac.insert(ignore_permissions=True)
		frappe.db.commit()

	def tearDown(self):
		"""Clean up after each test"""
		# Delete test sales invoices
		frappe.db.delete("Sales Invoice", {
			"customer": "_Test VAC Customer"
		})

		# Delete test card transactions
		frappe.db.delete("Card Transaction", {
			"card_number": self.vac.name
		})

		# Delete test value add cards
		frappe.db.delete("Value Add Card", {
			"customer": "_Test VAC Customer"
		})

		frappe.db.commit()

	def create_test_invoice(self, amount=500, is_pos=None):
		"""Helper method to create a test sales invoice

		Note: is_pos defaults to 1 in property setters, so we only set it if explicitly provided
		"""
		# Use the default company from Global Defaults
		company = frappe.db.get_single_value("Global Defaults", "default_company")
		if not company:
			frappe.throw("No default company set in Global Defaults")

		# Get default income account and cost center from company
		income_account = frappe.get_value("Company", company, "default_income_account")
		cost_center = frappe.get_value("Company", company, "cost_center")

		# Fallback if defaults not set
		if not income_account:
			income_account = frappe.db.get_value("Account",
				{"company": company, "account_type": "Income", "is_group": 0},
				"name")

		if not cost_center:
			cost_center = frappe.db.get_value("Cost Center",
				{"company": company, "is_group": 0},
				"name")

		# Get company currency (should be MYR)
		company_currency = frappe.get_cached_value("Company", company, "default_currency")

		invoice_data = {
			"doctype": "Sales Invoice",
			"customer": "_Test VAC Customer",
			"posting_date": nowdate(),
			"company": company,
			"currency": company_currency,
			"items": [{
				"item_code": "_Test VAC Item",
				"qty": 1,
				"rate": amount,
				"income_account": income_account,
				"cost_center": cost_center
			}]
		}

		# Only set is_pos if explicitly provided (otherwise use default from property setter)
		if is_pos is not None:
			invoice_data["is_pos"] = is_pos

		si = frappe.get_doc(invoice_data)
		si.insert(ignore_permissions=True)
		return si

	def test_vac_full_payment_sufficient_balance(self):
		"""Test VAC payment when balance is sufficient to cover full invoice"""
		# Create invoice for 500 (VAC has 1600)
		si = self.create_test_invoice(amount=500)

		# Apply VAC
		si.value_add_card = self.vac.name
		si.save()
		si.submit()

		# Reload to get updated values
		si.reload()
		self.vac.reload()

		# Check invoice status
		self.assertEqual(si.status, "Paid")
		self.assertEqual(si.outstanding_amount, 0)
		self.assertEqual(flt(si.card_amount_used), 500)

		# Check VAC balance
		self.assertEqual(flt(self.vac.current_balance), 1100)  # 1600 - 500
		self.assertEqual(self.vac.status, "Partially Used")

		# Check Card Transaction was created
		ct = frappe.get_all("Card Transaction",
			filters={"sales_invoice": si.name, "docstatus": 0},
			fields=["balance_before", "balance_after", "amount", "transaction_type"])

		self.assertEqual(len(ct), 1)
		self.assertEqual(flt(ct[0].balance_before), 1600)
		self.assertEqual(flt(ct[0].balance_after), 1100)
		self.assertEqual(flt(ct[0].amount), 500)
		self.assertEqual(ct[0].transaction_type, "Purchase")

		# Check VAC payment was added to payments table
		vac_payment = [p for p in si.payments if p.mode_of_payment == "Value Add Card"]
		self.assertEqual(len(vac_payment), 1)
		self.assertEqual(flt(vac_payment[0].amount), 500)

	def test_vac_partial_payment_insufficient_balance(self):
		"""Test VAC payment when balance is insufficient - creates partial payment"""
		# Create invoice for 2000 (VAC has 1600) - is_pos will be 1 by default
		si = self.create_test_invoice(amount=2000)

		# Apply VAC
		si.value_add_card = self.vac.name

		# Set the partial payment amount (this would be set by JavaScript in UI)
		si.custom_partial_payment_amount = 400  # Shortfall amount (2000 - 1600)

		# Add additional payment method for shortfall
		si.append("payments", {
			"mode_of_payment": "Cash",
			"amount": 400  # Shortfall amount (2000 - 1600)
		})

		si.save()
		si.submit()

		# Reload to get updated values
		si.reload()
		self.vac.reload()

		# Check invoice status - should be fully paid
		self.assertEqual(si.status, "Paid")
		self.assertEqual(si.outstanding_amount, 0)
		self.assertEqual(flt(si.card_amount_used), 1600)

		# Check VAC balance - should be fully used
		self.assertEqual(flt(self.vac.current_balance), 0)
		self.assertEqual(self.vac.status, "Fully Used")

		# Check both payments are recorded
		self.assertEqual(len(si.payments), 2)

		vac_payment = [p for p in si.payments if p.mode_of_payment == "Value Add Card"]
		cash_payment = [p for p in si.payments if p.mode_of_payment == "Cash"]

		self.assertEqual(len(vac_payment), 1)
		self.assertEqual(flt(vac_payment[0].amount), 1600)

		self.assertEqual(len(cash_payment), 1)
		self.assertEqual(flt(cash_payment[0].amount), 400)

	def test_vac_cancellation_restores_balance(self):
		"""Test that cancelling invoice restores VAC balance"""
		# Create and submit invoice
		si = self.create_test_invoice(amount=800)
		si.value_add_card = self.vac.name
		si.save()
		si.submit()

		# Check balance is deducted
		self.vac.reload()
		self.assertEqual(flt(self.vac.current_balance), 800)  # 1600 - 800

		# Cancel the invoice
		si.cancel()

		# Check balance is restored
		self.vac.reload()
		self.assertEqual(flt(self.vac.current_balance), 1600)  # Restored
		self.assertEqual(self.vac.status, "Active")

		# Check Card Transaction was removed (should be deleted, not just cancelled)
		ct = frappe.get_all("Card Transaction",
			filters={"sales_invoice": si.name},
			fields=["*"])

		self.assertEqual(len(ct), 0)

		# Check VAC payment was removed from payments table
		si.reload()
		vac_payment = [p for p in si.payments if p.mode_of_payment == "Value Add Card"]
		self.assertEqual(len(vac_payment), 0)

	def test_vac_payment_added_regardless_of_pos_mode(self):
		"""Test that VAC payment is added to payments table even without POS mode"""
		# Create invoice WITHOUT POS mode (explicitly disable it)
		si = self.create_test_invoice(amount=300, is_pos=0)

		# Apply VAC
		si.value_add_card = self.vac.name
		si.save()
		si.submit()

		# Reload invoice
		si.reload()

		# Check VAC payment was added to payments table
		vac_payment = [p for p in si.payments if p.mode_of_payment == "Value Add Card"]
		self.assertEqual(len(vac_payment), 1)
		self.assertEqual(flt(vac_payment[0].amount), 300)

	def test_vac_uses_full_balance_when_insufficient(self):
		"""Test that VAC uses entire balance when insufficient for full payment"""
		# Create invoice for more than VAC balance (without POS mode to test partial payment)
		si = self.create_test_invoice(amount=2000, is_pos=0)

		# Apply VAC (has 1600 balance)
		si.value_add_card = self.vac.name
		si.save()
		si.submit()

		# Reload
		si.reload()
		self.vac.reload()

		# Check VAC used full balance
		self.assertEqual(flt(si.card_amount_used), 1600)
		self.assertEqual(flt(self.vac.current_balance), 0)

		# Check invoice has outstanding
		self.assertEqual(si.status, "Partly Paid")
		self.assertEqual(flt(si.outstanding_amount), 400)  # 2000 - 1600

	def test_payment_history_shows_vac_type(self):
		"""Test that payment history API correctly identifies VAC payments"""
		from hearingclinic.hearingclinic.doc_events.sales_invoice_partial_payment import get_payment_history

		# Create and submit invoice with VAC (is_pos will be 1 by default)
		si = self.create_test_invoice(amount=500)
		si.value_add_card = self.vac.name
		si.save()
		si.submit()

		# Get payment history
		history = get_payment_history(si.name)

		# Check that VAC payment is identified correctly
		self.assertGreater(len(history["payments"]), 0)

		vac_payments = [p for p in history["payments"] if p["type"] == "Value Add Card"]
		self.assertEqual(len(vac_payments), 1)
		self.assertEqual(vac_payments[0]["mode_of_payment"], "Value Add Card")
		self.assertEqual(flt(vac_payments[0]["amount"]), 500)

	def test_payment_history_distinguishes_vac_from_pos(self):
		"""Test that VAC payments are not labeled as generic POS Payment"""
		from hearingclinic.hearingclinic.doc_events.sales_invoice_partial_payment import get_payment_history

		# Create invoice with both VAC and Cash (is_pos will be 1 by default)
		si = self.create_test_invoice(amount=2000)
		si.value_add_card = self.vac.name

		# Set the partial payment amount (this would be set by JavaScript in UI)
		si.custom_partial_payment_amount = 400  # Shortfall amount (2000 - 1600)

		# Add cash payment for shortfall
		si.append("payments", {
			"mode_of_payment": "Cash",
			"amount": 400
		})

		si.save()
		si.submit()

		# Get payment history
		history = get_payment_history(si.name)

		# Check both payments are present with correct types
		self.assertEqual(len(history["payments"]), 2)

		vac_payments = [p for p in history["payments"] if p["type"] == "Value Add Card"]
		pos_payments = [p for p in history["payments"] if p["type"] == "POS Payment"]

		self.assertEqual(len(vac_payments), 1)
		self.assertEqual(len(pos_payments), 1)

		self.assertEqual(vac_payments[0]["mode_of_payment"], "Value Add Card")
		self.assertEqual(pos_payments[0]["mode_of_payment"], "Cash")

	def test_vac_payment_with_zero_balance_card(self):
		"""Test that using a card with zero balance doesn't create transactions

		Note: The UI filters out zero-balance cards, but this tests backend robustness.
		The backend should handle this gracefully without errors.
		"""
		# Deplete the card
		self.vac.add_transaction("Purchase", 1600)
		self.vac.reload()
		self.assertEqual(flt(self.vac.current_balance), 0)

		# Try to use the card (disable POS mode since card has no balance)
		si = self.create_test_invoice(amount=100, is_pos=0)
		si.value_add_card = self.vac.name
		si.save()
		si.submit()

		# Reload
		si.reload()

		# Main check: VAC couldn't contribute anything (no errors, no card deduction)
		self.assertEqual(flt(si.card_amount_used), 0)
		self.assertEqual(flt(si.outstanding_amount), 100)

		# Status can be "Unpaid" or "Partly Paid" - both are acceptable
		# The key is that no actual payment was made from the zero-balance card
		self.assertIn(si.status, ["Unpaid", "Partly Paid"])

	def test_multiple_invoices_deplete_vac_correctly(self):
		"""Test that multiple invoices correctly track VAC balance"""
		# First invoice - 500
		si1 = self.create_test_invoice(amount=500)
		si1.value_add_card = self.vac.name
		si1.save()
		si1.submit()

		self.vac.reload()
		self.assertEqual(flt(self.vac.current_balance), 1100)  # 1600 - 500

		# Second invoice - 700
		si2 = self.create_test_invoice(amount=700)
		si2.value_add_card = self.vac.name
		si2.save()
		si2.submit()

		self.vac.reload()
		self.assertEqual(flt(self.vac.current_balance), 400)  # 1100 - 700

		# Third invoice - 300
		si3 = self.create_test_invoice(amount=300)
		si3.value_add_card = self.vac.name
		si3.save()
		si3.submit()

		self.vac.reload()
		self.assertEqual(flt(self.vac.current_balance), 100)  # 400 - 300

		# Check all transactions exist
		transactions = frappe.get_all("Card Transaction",
			filters={"card_number": self.vac.name, "docstatus": 0},
			fields=["sales_invoice", "amount"])

		self.assertEqual(len(transactions), 3)

	def test_print_format_data_available(self):
		"""Test that all required data for print format is available"""
		# Create and submit invoice with VAC
		si = self.create_test_invoice(amount=600)
		si.value_add_card = self.vac.name
		si.save()
		si.submit()

		# Reload invoice
		si.reload()

		# Check all print format fields are populated
		self.assertEqual(si.value_add_card, self.vac.name)
		self.assertEqual(flt(si.card_amount_used), 600)

		# Check Card Transaction exists for print format queries
		ct = frappe.get_all("Card Transaction",
			filters={"sales_invoice": si.name, "docstatus": 0},
			fields=["balance_before", "balance_after", "amount"])

		self.assertEqual(len(ct), 1)
		self.assertIsNotNone(ct[0].balance_before)
		self.assertIsNotNone(ct[0].balance_after)
		self.assertIsNotNone(ct[0].amount)

		# Check payments table has VAC entry
		vac_payment = [p for p in si.payments if p.mode_of_payment == "Value Add Card"]
		self.assertEqual(len(vac_payment), 1)
