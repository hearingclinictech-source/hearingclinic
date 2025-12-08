# Copyright (c) 2025, Thomas Roch and Contributors
# Test fixtures and utilities for hearingclinic app

import frappe
from frappe.utils import nowdate, add_days, add_months, random_string


class TestDataFactory:
	"""Factory class for creating test data"""

	@staticmethod
	def create_test_customer(customer_name=None, gender="Male", **kwargs):
		"""
		Create a test customer with optional custom fields

		Args:
			customer_name: Name of customer (auto-generated if not provided)
			gender: Gender of customer (Male/Female)
			**kwargs: Additional fields to set

		Returns:
			Customer document
		"""
		if not customer_name:
			customer_name = f"_Test Customer {random_string(5)}"

		customer_data = {
			"doctype": "Customer",
			"customer_name": customer_name,
			"customer_type": "Individual",
			"customer_group": "Individual",
			"territory": "All Territories",
			"gender": gender
		}

		# Add any additional fields
		customer_data.update(kwargs)

		# Check if already exists
		if frappe.db.exists("Customer", {"customer_name": customer_name}):
			return frappe.get_doc("Customer", {"customer_name": customer_name})

		customer = frappe.get_doc(customer_data)
		customer.insert(ignore_permissions=True)
		return customer

	@staticmethod
	def create_test_value_add_card(customer, amount_paid=1000, **kwargs):
		"""
		Create a test Value Add Card

		Args:
			customer: Customer name or doc
			amount_paid: Amount paid for the card
			**kwargs: Additional fields to set

		Returns:
			Value Add Card document
		"""
		customer_name = customer if isinstance(customer, str) else customer.name

		card_data = {
			"doctype": "Value Add Card",
			"customer": customer_name,
			"issue_date": nowdate(),
			"amount_paid": amount_paid
		}

		card_data.update(kwargs)

		card = frappe.get_doc(card_data)
		card.insert(ignore_permissions=True)
		return card

	@staticmethod
	def create_test_item(item_code=None, item_name=None, **kwargs):
		"""
		Create a test item

		Args:
			item_code: Item code (auto-generated if not provided)
			item_name: Item name (uses item_code if not provided)
			**kwargs: Additional fields to set

		Returns:
			Item document
		"""
		if not item_code:
			item_code = f"_Test Item {random_string(5)}"

		if not item_name:
			item_name = item_code

		# Check if already exists
		if frappe.db.exists("Item", item_code):
			return frappe.get_doc("Item", item_code)

		item_data = {
			"doctype": "Item",
			"item_code": item_code,
			"item_name": item_name,
			"item_group": "Products",
			"stock_uom": "Nos",
			"is_stock_item": 0,
			"is_sales_item": 1
		}

		item_data.update(kwargs)

		item = frappe.get_doc(item_data)
		item.insert(ignore_permissions=True)
		return item

	@staticmethod
	def create_test_sales_invoice(customer, items, **kwargs):
		"""
		Create a test Sales Invoice

		Args:
			customer: Customer name or doc
			items: List of item dicts with item_code, qty, rate
			**kwargs: Additional fields to set

		Returns:
			Sales Invoice document (not submitted)
		"""
		customer_name = customer if isinstance(customer, str) else customer.name

		si_data = {
			"doctype": "Sales Invoice",
			"customer": customer_name,
			"posting_date": nowdate(),
			"items": items
		}

		si_data.update(kwargs)

		si = frappe.get_doc(si_data)
		# Note: Not inserting as it requires company, accounts, etc.
		return si

	@staticmethod
	def cleanup_test_data(prefix="_Test"):
		"""
		Clean up all test data

		Args:
			prefix: Prefix to identify test documents
		"""
		# Delete in reverse dependency order
		doctypes = [
			"Sales Invoice",
			"Delivery Note",
			"Maintenance Schedule",
			"Maintenance Visit",
			"Value Add Card",
			"Card Transaction",
			"Customer",
			"Item"
		]

		for doctype in doctypes:
			try:
				frappe.db.delete(doctype, {
					"name": ["like", f"{prefix}%"]
				})
			except Exception as e:
				# Some tables might not exist or have constraints
				pass

		# Also clean by customer_name field
		try:
			frappe.db.delete("Customer", {
				"customer_name": ["like", f"{prefix}%"]
			})
		except:
			pass

		frappe.db.commit()


class TestAssertions:
	"""Custom assertion helpers for tests"""

	@staticmethod
	def assert_customer_id_format(customer_id, gender):
		"""
		Assert customer ID has correct format

		Args:
			customer_id: Customer ID to validate
			gender: Expected gender (Male/Female)
		"""
		assert customer_id is not None, "Customer ID should not be None"

		if gender.lower().startswith('m'):
			assert customer_id.startswith("M-"), f"Male customer should have M- prefix, got {customer_id}"
		elif gender.lower().startswith('f'):
			assert customer_id.startswith("F-"), f"Female customer should have F- prefix, got {customer_id}"

		# Check format: X-0000
		assert len(customer_id) == 6, f"Customer ID should be 6 characters, got {len(customer_id)}"
		assert customer_id[2:].isdigit(), f"Customer ID suffix should be numeric, got {customer_id[2:]}"

	@staticmethod
	def assert_vac_balance_correct(card, expected_balance):
		"""
		Assert VAC balance is correct

		Args:
			card: Value Add Card document
			expected_balance: Expected balance
		"""
		assert card.current_balance == expected_balance, \
			f"Expected balance {expected_balance}, got {card.current_balance}"

	@staticmethod
	def assert_vac_status(card, expected_status):
		"""
		Assert VAC status is correct

		Args:
			card: Value Add Card document
			expected_status: Expected status (Active/Partially Used/Fully Used)
		"""
		assert card.status == expected_status, \
			f"Expected status '{expected_status}', got '{card.status}'"

	@staticmethod
	def assert_transaction_count(card, expected_count):
		"""
		Assert number of transactions on card

		Args:
			card: Value Add Card document
			expected_count: Expected number of transactions
		"""
		actual_count = len(card.card_transactions) if hasattr(card, 'card_transactions') else 0
		assert actual_count == expected_count, \
			f"Expected {expected_count} transactions, got {actual_count}"


class TestScenarios:
	"""Common test scenarios that can be reused"""

	@staticmethod
	def complete_vac_purchase_scenario():
		"""
		Complete VAC purchase scenario

		Returns:
			dict with customer, card, and transaction details
		"""
		# Create customer
		customer = TestDataFactory.create_test_customer(
			customer_name=f"_Test VAC Customer {random_string(5)}",
			gender="Female",
			custom_nricpassport=f"S{random_string(7)}A"
		)

		# Create VAC
		card = TestDataFactory.create_test_value_add_card(customer, amount_paid=1000)

		# Make purchases
		card.add_transaction("Purchase", 500, remarks="First purchase")
		card.add_transaction("Purchase", 300, remarks="Second purchase")

		return {
			"customer": customer,
			"card": card,
			"total_spent": 800,
			"remaining_balance": 800  # 1600 - 800
		}

	@staticmethod
	def customer_with_multiple_cards_scenario():
		"""
		Create customer with multiple cards at different stages

		Returns:
			dict with customer and list of cards
		"""
		customer = TestDataFactory.create_test_customer(
			customer_name=f"_Test Multi Card Customer {random_string(5)}",
			gender="Male"
		)

		cards = []

		# Active card
		card1 = TestDataFactory.create_test_value_add_card(customer, amount_paid=1000)
		cards.append({"card": card1, "status": "Active"})

		# Partially used card
		card2 = TestDataFactory.create_test_value_add_card(customer, amount_paid=500)
		card2.add_transaction("Purchase", 400)
		cards.append({"card": card2, "status": "Partially Used"})

		# Fully used card
		card3 = TestDataFactory.create_test_value_add_card(customer, amount_paid=200)
		card3.add_transaction("Purchase", 320)  # Use all
		cards.append({"card": card3, "status": "Fully Used"})

		return {
			"customer": customer,
			"cards": cards,
			"active_card_count": 2  # Active and Partially Used
		}


class MockData:
	"""Mock data for testing"""

	@staticmethod
	def get_sample_hearing_aid_items():
		"""Get sample hearing aid items"""
		return [
			{
				"item_code": "HA-PHONAK-AUDEO",
				"item_name": "Phonak Audeo Paradise",
				"rate": 3500,
				"custom_hearing_aid_type": "Behind-the-Ear",
				"custom_manufacturer": "Phonak"
			},
			{
				"item_code": "HA-OTICON-MORE",
				"item_name": "Oticon More",
				"rate": 4000,
				"custom_hearing_aid_type": "Receiver-in-Canal",
				"custom_manufacturer": "Oticon"
			},
			{
				"item_code": "HA-WIDEX-MOMENT",
				"item_name": "Widex Moment",
				"rate": 3800,
				"custom_hearing_aid_type": "Completely-in-Canal",
				"custom_manufacturer": "Widex"
			}
		]

	@staticmethod
	def get_sample_warranty_items():
		"""Get sample warranty items"""
		return [
			{
				"item_code": "WARRANTY-1Y",
				"item_name": "1 Year Warranty Extension",
				"rate": 300,
				"custom_warranty_period_months": 12
			},
			{
				"item_code": "WARRANTY-2Y",
				"item_name": "2 Year Warranty Extension",
				"rate": 500,
				"custom_warranty_period_months": 24
			},
			{
				"item_code": "WARRANTY-3Y",
				"item_name": "3 Year Warranty Extension",
				"rate": 700,
				"custom_warranty_period_months": 36
			}
		]

	@staticmethod
	def get_sample_customer_data():
		"""Get sample customer data"""
		return [
			{
				"customer_name": "John Doe",
				"gender": "Male",
				"custom_nricpassport": "S1234567A",
				"custom_date_of_birth": "1975-03-15"
			},
			{
				"customer_name": "Jane Smith",
				"gender": "Female",
				"custom_nricpassport": "S9876543B",
				"custom_date_of_birth": "1980-07-22"
			},
			{
				"customer_name": "Robert Johnson",
				"gender": "Male",
				"custom_nricpassport": "S5555555C",
				"custom_date_of_birth": "1968-11-30"
			}
		]


# Convenience function to get test data factory
def get_test_factory():
	"""Get test data factory instance"""
	return TestDataFactory()


# Convenience function to get test assertions
def get_test_assertions():
	"""Get test assertions instance"""
	return TestAssertions()
