app_name = "hearingclinic"
app_title = "Hearingclinic"
app_publisher = "Thomas Roch"
app_description = "All customizations for the Hearing Clinic ERPNext Implementation"
app_email = "thomas@dierochs.de"
app_license = "mit"

app_include_js = [
    "/assets/hearingclinic/js/Maintenance_Visit/get_items_from_dn.js",
    "/assets/hearingclinic/js/Customer/customer_quick_entry.js",
]


doctype_js = {
       "Customer": [
           "public/js/Customer/format_customer_id.js",
           "public/js/Customer/format_sales_button.js",
           "public/js/Customer/customer_info_devices.js",
           "public/js/Customer/customer_info_maintenance.js",
       ],
       "Sales Invoice": [
           "public/js/Sales_Invoice/clear_default_pos_profile.js",
           "public/js/Sales_Invoice/auto_expand_packages.js",
           "public/js/Sales_Invoice/create_delivery_note.js",
           "public/js/Sales_Invoice/apply_value_add_card.js",
           "public/js/Sales_Invoice/sales_invoice_partial_payment.js",
       ], 
       "Maintenance Schedule": [
           "public/js/Maintenance_Schedule/extend_warranty_button.js",
       ],
       "Maintenance Visit": [
           "public/js/Maintenance_Visit/get_items_from_dn.js",
       ],
}

doc_events = {
    "Customer": {
        "before_save": "hearingclinic.hearingclinic.doc_events.customer_id.before_save",
        "before_insert": "hearingclinic.hearingclinic.doc_events.customer_duplicate_check.before_insert",
        "validate": "hearingclinic.hearingclinic.doc_events.customer_duplicate_check.validate",
        "after_insert": "hearingclinic.hearingclinic.doc_events.customer_primary_contacts.after_insert",
    },
    "Delivery Note": {
        "on_submit": "hearingclinic.hearingclinic.doc_events.create_maintenance_schedule.create_hearing_aid_maintenance_schedule"
    },
    "Sales Invoice": {
        "onload": "hearingclinic.hearingclinic.doc_events.clear_default_pos_profile.onload",
        "validate": [
            "hearingclinic.hearingclinic.doc_events.sales_invoice_partial_payment.override_pos_payment_amount",
            "hearingclinic.hearingclinic.doc_events.handle_vac_sales_invoice.validate",
        ],
        "on_submit": [
            "hearingclinic.hearingclinic.doc_events.create_warranty_extension.create_maintenance_schedule_from_sales_invoice",
            "hearingclinic.hearingclinic.doc_events.handle_vac_sales_invoice.on_submit",
        ],
        "on_cancel": "hearingclinic.hearingclinic.doc_events.handle_vac_sales_invoice.on_cancel",
    },
}

fixtures = [
    "Item Group",
    "UOM",
    "Bank Account",
    "Warehouse",
    "Manufacturer",
    "Gender",
    "Color",
    "POS Profile",
    "Brand",
    "State",
    "Terms and Conditions",
    "Relationship",
    {"doctype": "Website Settings"},
    {"doctype": "Website Script"},
    {
        "dt": "Role",
        "filters": [
            ["name", "in", ["Hearing Clinic User", "Hearing Clinic Manager"]]  # Add your custom roles
        ]
    },
    # Role permissions on DocTypes - THIS IS WHAT YOU'RE MISSING
    {
        "dt": "Custom DocPerm",
        "filters": [
            ["role", "in", ["Hearing Clinic User", "Hearing Clinic Manager"]]
        ]
    },
    {
        "doctype": "Custom HTML Block",
        "filters": [["name", "in", ["Tutorials"]]],
    },
    {
    "dt": "Mode of Payment",
    "filters": [["name", "in", ["Value Add Card"]]]
    },
    {
        "doctype": "Letter Head",
        "filters": [["name", "in", ["Hearing Clinic"]]],
    },
    {
        "doctype": "Sales Taxes and Charges Template",
        "filters": [["title", "in", ["Malaysia GST 6%"]]],
    },
    {
        "doctype": "Website Theme",
        "filters": [["name", "in", ["Hearing Clinic Standard"]]],
    },
    {
        "doctype": "Sales Taxes and Charges",
        "filters": [["parent", "in", ["Malaysia GST 6% - HC", "Malaysia GST 6% - HC-PJ"]]],
    },
    {
        "doctype": "Stock Settings",
        "filters": [["name", "=", "Stock Settings"]]
    },
    {
        "doctype": "Selling Settings",
        "filters": [["name", "=", "Selling Settings"]]
    },
    {
        "doctype": "System Settings",
        "filters": [["name", "=", "System Settings"]]
    },
    {
        "doctype": "Global Defaults",
        "filters": [["name", "=", "Global Defaults"]]
    },
    {
        "dt": "Print Format",
        "filters": [
            ["name", "in", ["HC Sales Invoice", "HC POS Invoice"]]
        ]
    },
    {
        "dt": "Custom Field",
        "filters": [
            ["name", "in", [
                # Address (4 custom fields)
                "Address-custom_stateprovince",  # State/Province
                "Address-tax_category",  # Tax Category
                "Address-custom_cleansing_info",  # Cleansing Info
                "Address-is_your_company_address",  # Is Your Company Address

                # Communication (1 custom field)
                "Communication-company",  # Company

                # Contact (1 custom field)
                "Contact-is_billing_contact",  # Is Billing Contact

                # Contact Phone (2 custom fields)
                "Contact Phone-custom_contact_name",  # Contact Name
                "Contact Phone-custom_customer_relationship",  # Customer Relationship

                # Customer (14 custom fields)
                "Customer-custom_customer_id",  # Customer Id
                "Customer-custom_new_sales_invoice",  # New Sales Invoice
                "Customer-custom_customer_since",  # Customer Since
                "Customer-custom_nricpassport",  # NRIC/Passport
                "Customer-custom_ethinicity",  # Ethnicity
                "Customer-custom_date_of_birth",  # Date of Birth
                "Customer-custom_last_pta",  # Last PTA
                "Customer-custom_devices",  # Devices
                "Customer-custom_customer_info",  # Customer Info
                "Customer-custom_maintenance",  # Maintenance
                "Customer-custom_devices_and_sales",  # Devices and Sales
                "Customer-custom_items_purchased",  # Items Purchased
                "Customer-custom_maintenance_information",  # Maintenance Information
                "Customer-custom_maintenance_info",  # Maintenance Info

                # Delivery Note Item (2 custom fields)
                "Delivery Note Item-custom_device_serial_number",  # Device Serial Number
                "Delivery Note Item-custom_for_ear",  # For Ear

                # Email Account (1 custom field)
                "Email Account-company",  # Company

                # Item (3 custom fields)
                "Item-custom_hearing_aid_type",  # Hearing Aid Type
                "Item-custom_manufacturer",  # Manufacturer
                "Item-custom_warranty",  # Warranty

                # Lead (2 custom fields)
                "Lead-custom_hc_request_type",  # HC Request Type
                "Lead-custom_stateprovince",  # State/Province

                # Maintenance Schedule (1 custom field)
                "Maintenance Schedule-custom_device_serial_number",  # Device Serial Number

                # Print Settings (3 custom fields)
                "Print Settings-compact_item_print",  # Compact Item Print
                "Print Settings-print_uom_after_quantity",  # Print UOM after Quantity
                "Print Settings-print_taxes_with_zero_amount",  # Print taxes with zero amount

                # Sales Invoice (10 custom fields)
                "Sales Invoice-custom_sales_person",  # Sales Person
                "Sales Invoice-custom_partial_payment_section",  # Partial Payment Section
                "Sales Invoice-custom_partial_payment_amount",  # Partial Payment Amount
                "Sales Invoice-custom_column_break_bwhw7",  # 
                "Sales Invoice-custom_amount_paid_this_transaction",  # Amount Paid This Transaction
                "Sales Invoice-custom_payment_overview",  # 
                "Sales Invoice-custom_payment_history_html",  # Payment History HTML
                "Sales Invoice-value_add_card_section",  # Value Add Card
                "Sales Invoice-value_add_card",  # Value Add Card
                "Sales Invoice-card_amount_used",  # Card Amount Used

                # Sales Invoice Item (2 custom fields)
                "Sales Invoice Item-custom_warranty_serial_number",  # Warranty Serial Number
                "Sales Invoice Item-custom_extension_start_date",  # Extension Start Date

                # Value Add Card (1 custom field)
                "Value Add Card-custom_transactions",  # Transactions

            ]]
        ]
    },
    {
        "dt": "Property Setter",
        "filters": [
            ["doc_type", "in", [
                "Item",
                "Customer",
                "Sales Invoice",
                "Delivery Note",
                "Address",
                "Contact",
                "Contact Phone",
                "Lead",
                "Maintenance Schedule",
                "Maintenance Visit",
                "Maintenance Visit Purpose",
                "Delivery Note Item",
                "Value Add Card",
                "Print Format",
            ]]
        ]
    },
]

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "hearingclinic",
# 		"logo": "/assets/hearingclinic/logo.png",
# 		"title": "Hearingclinic",
# 		"route": "/hearingclinic",
# 		"has_permission": "hearingclinic.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/hearingclinic/css/hearingclinic.css"
# app_include_js = "/assets/hearingclinic/js/hearingclinic.js"

# include js, css files in header of web template
# web_include_css = "/assets/hearingclinic/css/hearingclinic.css"
# web_include_js = "/assets/hearingclinic/js/hearingclinic.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "hearingclinic/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "hearingclinic/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "hearingclinic.utils.jinja_methods",
# 	"filters": "hearingclinic.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "hearingclinic.install.before_install"
# after_install = "hearingclinic.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "hearingclinic.uninstall.before_uninstall"
# after_uninstall = "hearingclinic.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "hearingclinic.utils.before_app_install"
# after_app_install = "hearingclinic.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "hearingclinic.utils.before_app_uninstall"
# after_app_uninstall = "hearingclinic.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "hearingclinic.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"hearingclinic.tasks.all"
# 	],
# 	"daily": [
# 		"hearingclinic.tasks.daily"
# 	],
# 	"hourly": [
# 		"hearingclinic.tasks.hourly"
# 	],
# 	"weekly": [
# 		"hearingclinic.tasks.weekly"
# 	],
# 	"monthly": [
# 		"hearingclinic.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "hearingclinic.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "hearingclinic.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "hearingclinic.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["hearingclinic.utils.before_request"]
# after_request = ["hearingclinic.utils.after_request"]

# Job Events
# ----------
# before_job = ["hearingclinic.utils.before_job"]
# after_job = ["hearingclinic.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"hearingclinic.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

