#!/usr/bin/env python3
"""
Setup Test Users for E2E Testing

Creates test users with different permission levels for E2E testing.
Run this script in your development/staging environment.

Usage:
    bench execute hearingclinic.scripts.setup_test_users.setup_all_test_users
"""

import frappe
from frappe import _


def setup_all_test_users():
    """Create all test users for E2E testing"""
    frappe.init(site='development.localhost')
    frappe.connect()

    try:
        # System Manager
        create_test_user(
            email='test.manager@hearingclinic.local',
            first_name='Test',
            last_name='Manager',
            roles=['System Manager', 'Sales User', 'Accounts User']
        )

        # Sales User
        create_test_user(
            email='test.sales@hearingclinic.local',
            first_name='Test',
            last_name='Sales',
            roles=['Sales User', 'Stock User']
        )

        # Accountant
        create_test_user(
            email='test.accountant@hearingclinic.local',
            first_name='Test',
            last_name='Accountant',
            roles=['Accounts User', 'Accounts Manager']
        )

        frappe.db.commit()
        print("✅ All test users created successfully!")

    except Exception as e:
        frappe.db.rollback()
        print(f"❌ Error creating test users: {str(e)}")
        raise

    finally:
        frappe.destroy()


def create_test_user(email, first_name, last_name, roles, password='test123'):
    """
    Create a test user with specified roles

    Args:
        email (str): User email (username)
        first_name (str): First name
        last_name (str): Last name
        roles (list): List of role names
        password (str): User password (default: test123)
    """
    if frappe.db.exists('User', email):
        print(f"ℹ️  User {email} already exists, updating...")
        user = frappe.get_doc('User', email)
    else:
        print(f"✨ Creating user {email}...")
        user = frappe.new_doc('User')
        user.email = email
        user.first_name = first_name
        user.last_name = last_name
        user.send_welcome_email = 0
        user.new_password = password

    # Update roles
    user.roles = []
    for role in roles:
        user.append('roles', {'role': role})

    # Enable user
    user.enabled = 1

    user.save(ignore_permissions=True)

    # Set password (in case user already existed)
    if frappe.db.exists('User', email):
        from frappe.utils.password import update_password
        update_password(email, password)

    print(f"✅ User {email} ready with roles: {', '.join(roles)}")
    return user


if __name__ == '__main__':
    setup_all_test_users()
