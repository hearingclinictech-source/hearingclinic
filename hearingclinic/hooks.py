app_name = "hearingclinic"
app_title = "Hearingclinic"
app_publisher = "Thomas Roch"
app_description = "All customizations for the Hearing Clinic ERPNext Implementation"
app_email = "thomas@dierochs.de"
app_license = "mit"

doctype_js = {
       "Customer": [
           "public/js/Customer/format_customer_id.js",
           "public/js/Customer/format_sales_button.js",                 
           "public/js/Customer/customer_info_devices.js",                 
           "public/js/Customer/customer_info_maintenance.js",                 
       ],
       "Sales Invoice": [
           "public/js/Sales_Invoice/auto_expand_packages.js",
           "public/js/Sales_Invoice/create_delivery_note.js",
       ], 
}

doc_events = {
    "Customer": {
        "before_save": "hearingclinic.hearingclinic.custom.customer_id.before_save",
    },
    "Delivery Note": {
        "on_submit": "hearingclinic.hearingclinic.custom.create_maintenance_schedule.create_hearing_aid_maintenance_schedule"
    }
}

fixtures = [
    {"dt": "Custom DocPerm",
             "filters": [
            ["role", "in", ["Hearing Clinic"]]
        ]
    },
    {
        "dt": "Custom Field",
        "filters": [
            ["name", "in", [
                # Address (3 custom fields)
                "Address-custom_stateprovince",  # State/Province
                "Address-tax_category",  # Tax Category
                "Address-is_your_company_address",  # Is Your Company Address

                # Communication (1 custom fields)
                "Communication-company",  # Company

                # Contact (1 custom fields)
                "Contact-is_billing_contact",  # Is Billing Contact

                # Customer (9 custom fields)
                "Customer-custom_customer_id",  # Customer Id
                "Customer-custom_nricpassport",  # NRIC/Passport
                "Customer-custom_ethinicity",  # Ethinicity
                "Customer-custom_date_of_birth",  # Date of Birth
                "Customer-custom_customer_info",  # Customer Info
                "Customer-custom_devices",  # Devices
                "Customer-custom_items_purchased",  # Items Purchased
                "Customer-custom_maintenance",  # Maintenance
                "Customer-custom_maintenance_info",  # Maintenance InfoERPNext
                "Customer-custom_new_sales_invoice",  # New Sales Invoice button

                # Delivery Note Item (2 custom fields)
                "Delivery Note Item-custom_for_ear",  # For Ear
                "Delivery Note Item-custom_device_serial_number",  # Device Serial Number

                # Email Account (1 custom fields)
                "Email Account-company",  # Company

                # Item (2 custom fields)
                "Item-custom_manufacturer",  # Manufacturer
                "Item-custom_hearing_aid_type",  # Hearing Aid Type

                # Lead (2 custom fields)
                "Lead-custom_hc_request_type",  # HC Request Type
                "Lead-custom_stateprovince",  # State/Province

                # Print Settings (3 custom fields)
                "Print Settings-compact_item_print",  # Compact Item Print
                "Print Settings-print_uom_after_quantity",  # Print UOM after Quantity
                "Print Settings-print_taxes_with_zero_amount",  # Print taxes with zero amount
            ]]
        ]
    },
    # Export all Property Setters for specific doctypes
    {
        "dt": "Property Setter",
        "filters": [
            ["doc_type", "in", [
                "Item",
                "Customer",
                "Sales Invoice",
                "Delivery Note",
                "Address",
                "Lead",
                "Maintenance Schedule",
                "Maintenance Visit Purpose",
                "Delivery Note Item"
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

