import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime

class ValueAddCard(Document):
    def validate(self):
        """Validate and calculate values - only for NEW cards"""
        # Only auto-calculate for new cards
        if self.is_new():
            # Auto-suggest card value when amount paid is entered
            # Only auto-calculate if card_value is not manually set
            if self.amount_paid and not self.card_value:
                calculated_value = float(self.amount_paid) * 1.6
                self.card_value = calculated_value

            # Set initial balance
            if self.card_value and not self.current_balance:
                self.current_balance = float(self.card_value)

            # Set initial status
            if not self.status:
                self.status = "Active"
    
    def add_transaction(self, transaction_type, amount, reference_doctype=None, reference_name=None, remarks=None):
        """Add a transaction to the card and update balance

        Args:
            transaction_type: 'Purchase' or 'Refund'
            amount: Amount to deduct (Purchase) or add (Refund)
            reference_doctype: DocType of reference document (e.g., 'Sales Invoice')
            reference_name: Name of reference document
            remarks: Transaction remarks

        Returns:
            dict: balance_before, balance_after, transaction details
        """
        # Lock the card document to prevent concurrent modifications
        # Use SELECT FOR UPDATE to ensure we have the latest balance
        frappe.db.sql(
            "SELECT current_balance FROM `tabValue Add Card` WHERE name=%s FOR UPDATE",
            self.name
        )

        # Reload to get latest balance from database
        self.reload()

        balance_before = self.current_balance

        # Calculate new balance
        if transaction_type == "Purchase":
            new_balance = float(self.current_balance) - float(amount)
        elif transaction_type == "Refund":
            new_balance = float(self.current_balance) + float(amount)
        else:
            frappe.throw(f"Invalid transaction type: {transaction_type}")

        # Prevent balance from going negative (overdraft protection)
        # This allows the transaction but clamps the balance to 0
        if new_balance < 0:
            new_balance = 0
        
        # Add transaction to child table
        self.append('card_transactions', {
            "card_number": self.name,
            "transaction_type": transaction_type,
            "transaction_date": now_datetime(),
            "amount": amount,
            "sales_invoice": reference_name if reference_doctype == "Sales Invoice" else None,
            "balance_before": balance_before,
            "balance_after": new_balance,
            "remarks": remarks or f"{transaction_type} transaction"
        })
        
        # Update balance
        self.current_balance = new_balance
        
        # Update status based on balance
        if self.current_balance <= 0:
            self.status = "Fully Used"
        elif self.current_balance < self.card_value:
            self.status = "Partially Used"
        else:
            self.status = "Active"
        
        # Save the card with transactions
        self.save(ignore_permissions=True)

        return {
            "balance_before": balance_before,
            "balance_after": self.current_balance,
            "amount": amount,
            "transaction_type": transaction_type
        }
    
    def remove_transaction(self, reference_doctype, reference_name):
        """Remove a transaction and restore balance (used for cancellations)
        
        Args:
            reference_doctype: DocType of reference document
            reference_name: Name of reference document
            
        Returns:
            dict: amount_restored, new_balance
        """
        transaction_to_remove = None
        amount_to_restore = 0
        
        # Find the transaction
        for idx, txn in enumerate(self.card_transactions):
            if reference_doctype == "Sales Invoice" and txn.sales_invoice == reference_name:
                transaction_to_remove = idx
                # For Purchase, we restore (add back), for Refund we remove (subtract)
                if txn.transaction_type == "Purchase":
                    amount_to_restore = txn.amount
                elif txn.transaction_type == "Refund":
                    amount_to_restore = -txn.amount
                break
        
        if transaction_to_remove is not None:
            # Get transaction name before removing
            transaction_name = self.card_transactions[transaction_to_remove].name

            # Remove the transaction
            self.remove(self.card_transactions[transaction_to_remove])

            # Restore balance
            self.current_balance = float(self.current_balance) + amount_to_restore

            # Update status
            if self.current_balance >= self.card_value:
                self.status = "Active"
            elif self.current_balance > 0:
                self.status = "Partially Used"
            else:
                self.status = "Fully Used"

            self.save(ignore_permissions=True)

            return {
                "amount_restored": amount_to_restore,
                "new_balance": self.current_balance
            }
        
        return None
    
    def get_balance(self):
        """Get current balance"""
        return self.current_balance
    
    @frappe.whitelist()
    def check_balance(self):
        """API method to check balance
        
        Returns:
            dict: Card number, balance, and status
        """
        return {
            "card_number": self.name,
            "current_balance": self.current_balance,
            "status": self.status
        }