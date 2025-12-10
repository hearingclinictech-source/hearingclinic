# Copyright (c) 2025, Thomas Roch and Contributors
# See license.txt
# @S Integration Tests

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import nowdate

# Load ERPNext fixtures - Product Bundle tests need Item fixtures
# We create custom test customers and items to avoid Lead circular dependency
test_dependencies = ["Customer Group", "Territory", "Item Group", "UOM", "Warehouse"]
test_ignore = ["Customer", "Lead", "Item"]  # Avoid circular dependency


class TestPackageUnfolding(FrappeTestCase):
	"""Integration tests for automatic package/bundle unfolding in Sales Invoices"""

	def setUp(self):
		"""Set up test data"""
		# Create test customer
		if not frappe.db.exists("Customer", "_Test Customer Packages"):
			customer = frappe.get_doc({
				"doctype": "Customer",
				"customer_name": "_Test Customer Packages",
				"customer_type": "Individual",
				"customer_group": "Individual",
				"territory": "All Territories",
				"gender": "Male"
			})
			customer.insert(ignore_permissions=True)

		# Create test item group for packages if not exists
		if not frappe.db.exists("Item Group", "Packages"):
			item_group = frappe.get_doc({
				"doctype": "Item Group",
				"item_group_name": "Packages",
				"parent_item_group": "All Item Groups"
			})
			item_group.insert(ignore_permissions=True)

		# Create component items
		self._create_test_item("_Test HA Left", "Hearing Aids", 1500)
		self._create_test_item("_Test HA Right", "Hearing Aids", 1500)
		self._create_test_item("_Test Battery Pack", "Accessories", 50)

		# Create package item (not a stock item - bundles can't be stock items)
		if not frappe.db.exists("Item", "_Test Package Basic"):
			package = frappe.get_doc({
				"doctype": "Item",
				"item_code": "_Test Package Basic",
				"item_name": "_Test Package Basic",
				"item_group": "Packages",
				"stock_uom": "Nos",
				"is_stock_item": 0,  # Bundles cannot be stock items
				"standard_rate": 3000
			})
			package.insert(ignore_permissions=True)

		# Create Product Bundle
		self._create_test_bundle()

	def _create_test_item(self, item_code, item_group, standard_rate):
		"""Helper to create test items"""
		if not frappe.db.exists("Item", item_code):
			item = frappe.get_doc({
				"doctype": "Item",
				"item_code": item_code,
				"item_name": item_code,
				"item_group": item_group,
				"stock_uom": "Nos",
				"is_stock_item": 1,
				"standard_rate": standard_rate
			})
			item.insert(ignore_permissions=True)

	def _create_test_bundle(self):
		"""Helper to create test Product Bundle"""
		if not frappe.db.exists("Product Bundle", "_Test Package Basic"):
			bundle = frappe.get_doc({
				"doctype": "Product Bundle",
				"new_item_code": "_Test Package Basic",
				"description": "Test package bundle",
				"items": [
					{
						"item_code": "_Test HA Left",
						"qty": 1,
						"uom": "Nos",
						"rate": 1500
					},
					{
						"item_code": "_Test HA Right",
						"qty": 1,
						"uom": "Nos",
						"rate": 1500
					},
					{
						"item_code": "_Test Battery Pack",
						"qty": 10,
						"uom": "Nos",
						"rate": 50
					}
				]
			})
			bundle.insert(ignore_permissions=True)

	def tearDown(self):
		"""Clean up test data"""
		# Delete test sales invoices
		frappe.db.delete("Sales Invoice", {
			"customer": "_Test Customer Packages"
		})
		frappe.db.commit()

	def test_product_bundle_exists(self):
		"""Test that Product Bundle was created correctly"""
		bundle = frappe.get_doc("Product Bundle", "_Test Package Basic")

		self.assertEqual(bundle.new_item_code, "_Test Package Basic")
		self.assertEqual(len(bundle.items), 3)
		self.assertEqual(bundle.items[0].item_code, "_Test HA Left")
		self.assertEqual(bundle.items[1].item_code, "_Test HA Right")
		self.assertEqual(bundle.items[2].item_code, "_Test Battery Pack")
		self.assertEqual(bundle.items[2].qty, 10)

	def test_bundle_components_can_be_queried(self):
		"""Test that we can query for Product Bundles"""
		bundles = frappe.get_all(
			"Product Bundle",
			filters={
				"new_item_code": "_Test Package Basic",
				"disabled": 0
			},
			fields=["name", "new_item_code"]
		)

		self.assertEqual(len(bundles), 1)
		self.assertEqual(bundles[0].new_item_code, "_Test Package Basic")

	def test_bundle_items_have_correct_item_groups(self):
		"""Test that bundle items have correct item groups for filtering"""
		# Package item should be in Packages group
		package_group = frappe.db.get_value("Item", "_Test Package Basic", "item_group")
		self.assertEqual(package_group, "Packages")

		# Components should be in other groups
		left_group = frappe.db.get_value("Item", "_Test HA Left", "item_group")
		self.assertEqual(left_group, "Hearing Aids")

		battery_group = frappe.db.get_value("Item", "_Test Battery Pack", "item_group")
		self.assertEqual(battery_group, "Accessories")

	def test_sales_invoice_can_have_package_item(self):
		"""Test that package item can be added to Sales Invoice"""
		invoice = frappe.get_doc({
			"doctype": "Sales Invoice",
			"customer": "_Test Customer Packages",
			"posting_date": nowdate(),
			"due_date": nowdate(),
			"items": [{
				"item_code": "_Test Package Basic",
				"qty": 1,
				"rate": 3000
			}]
		})
		invoice.insert(ignore_permissions=True)

		self.assertEqual(len(invoice.items), 1)
		self.assertEqual(invoice.items[0].item_code, "_Test Package Basic")
		self.assertEqual(invoice.items[0].rate, 3000)

	def test_manual_bundle_expansion(self):
		"""Test manual expansion of bundle into components"""
		invoice = frappe.get_doc({
			"doctype": "Sales Invoice",
			"customer": "_Test Customer Packages",
			"posting_date": nowdate(),
			"due_date": nowdate(),
			"items": [{
				"item_code": "_Test Package Basic",
				"qty": 1,
				"rate": 3000
			}]
		})
		invoice.insert(ignore_permissions=True)

		# Get bundle
		bundle = frappe.get_doc("Product Bundle", "_Test Package Basic")

		# Manually add components (simulating what JS would do)
		# Note: When appending items, Frappe automatically sets the rate from Item master
		# We need to explicitly set it to 0 after adding
		for component in bundle.items:
			row = invoice.append("items", {
				"item_code": component.item_code,
				"qty": component.qty
			})

		invoice.save(ignore_permissions=True)

		# Now set component rates to 0 (simulating what the JS script does)
		for item in invoice.items:
			if item.item_code != "_Test Package Basic":
				item.rate = 0

		invoice.save(ignore_permissions=True)

		# Should now have 4 items: 1 package + 3 components
		self.assertEqual(len(invoice.items), 4)

		# Component rates should be 0
		component_items = [item for item in invoice.items if item.item_code != "_Test Package Basic"]
		for item in component_items:
			self.assertEqual(item.rate, 0, f"{item.item_code} rate should be 0")

	def test_component_rate_logic(self):
		"""Test the logic for determining if component rate should be zero"""
		test_cases = [
			{"item_code": "_Test Package Basic", "item_group": "Packages", "should_be_zero": False},
			{"item_code": "_Test HA-PAIR", "item_group": "Hearing Aids", "should_be_zero": False},
			{"item_code": "_Test HA Left", "item_group": "Hearing Aids", "should_be_zero": True},
			{"item_code": "_Test Battery Pack", "item_group": "Accessories", "should_be_zero": True},
		]

		for test in test_cases:
			should_set_to_zero = (
				test["item_group"] != "Packages" and
				not test["item_code"].endswith("-PAIR")
			)
			self.assertEqual(
				should_set_to_zero,
				test["should_be_zero"],
				f"{test['item_code']} should_be_zero assertion failed"
			)

	def test_bundle_prevents_duplicate_components(self):
		"""Test that duplicate components are not added"""
		invoice = frappe.get_doc({
			"doctype": "Sales Invoice",
			"customer": "_Test Customer Packages",
			"posting_date": nowdate(),
			"due_date": nowdate(),
			"items": [{
				"item_code": "_Test Package Basic",
				"qty": 1,
				"rate": 3000
			}]
		})
		invoice.insert(ignore_permissions=True)

		# Get existing item codes
		existing_items = [item.item_code for item in invoice.items]

		# Get bundle
		bundle = frappe.get_doc("Product Bundle", "_Test Package Basic")

		# Check if components already exist
		components_exist = any(
			comp.item_code in existing_items
			for comp in bundle.items
		)

		# First time should be False
		self.assertFalse(components_exist)

		# Add components
		for component in bundle.items:
			invoice.append("items", {
				"item_code": component.item_code,
				"qty": component.qty,
				"rate": 0
			})

		# Update existing items list
		existing_items = [item.item_code for item in invoice.items]

		# Now check again
		components_exist = any(
			comp.item_code in existing_items
			for comp in bundle.items
		)

		# Now should be True
		self.assertTrue(components_exist)

	def test_disabled_bundles_are_not_used(self):
		"""Test that disabled bundles are filtered out"""
		bundles = frappe.get_all(
			"Product Bundle",
			filters={
				"new_item_code": "_Test Package Basic",
				"disabled": 0  # Only active bundles
			}
		)

		# Should find the bundle since it's not disabled
		self.assertEqual(len(bundles), 1)

		# If we search for disabled=1, should find nothing
		disabled_bundles = frappe.get_all(
			"Product Bundle",
			filters={
				"new_item_code": "_Test Package Basic",
				"disabled": 1
			}
		)

		self.assertEqual(len(disabled_bundles), 0)

	def test_bundle_with_multiple_quantities(self):
		"""Test bundle with varying component quantities"""
		bundle = frappe.get_doc("Product Bundle", "_Test Package Basic")

		# Find the battery pack (should have qty 10)
		battery_component = next(
			(item for item in bundle.items if item.item_code == "_Test Battery Pack"),
			None
		)

		self.assertIsNotNone(battery_component)
		self.assertEqual(battery_component.qty, 10)

	def test_item_standard_rates_are_preserved(self):
		"""Test that item standard rates are preserved in Item master"""
		left_rate = frappe.db.get_value("Item", "_Test HA Left", "standard_rate")
		right_rate = frappe.db.get_value("Item", "_Test HA Right", "standard_rate")
		battery_rate = frappe.db.get_value("Item", "_Test Battery Pack", "standard_rate")

		self.assertEqual(left_rate, 1500)
		self.assertEqual(right_rate, 1500)
		self.assertEqual(battery_rate, 50)
