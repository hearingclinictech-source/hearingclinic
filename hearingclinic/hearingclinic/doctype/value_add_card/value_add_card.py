import frappe
from frappe.model.document import Document

class ValueAddCard(Document):
    def validate(self):
        """Validate and calculate values"""
        # Auto-calculate card value when amount paid is entered
        if self.amount_paid:
            # Explicit float conversion and assignment
            self.card_value = float(self.amount_paid) * 1.6
        
        # Set initial balance - ensure card_value exists first
        if self.card_value and not self.current_balance:
            self.current_balance = float(self.card_value)
        
        # Set status
        if not self.status:
            self.status = "Active"
    
    def update_balance(self, amount, transaction_type="Purchase"):
        """Update card balance after a transaction
        
        Args:
            amount: Amount to add/deduct
            transaction_type: 'Purchase' or 'Refund'
            
        Returns:
            tuple: (balance_before, balance_after)
        """
        balance_before = self.current_balance
        
        if transaction_type == "Purchase":
            self.current_balance = float(self.current_balance) - float(amount)
        elif transaction_type == "Refund":
            self.current_balance = float(self.current_balance) + float(amount)
        
        # Update status based on balance
        if self.current_balance <= 0:
            self.status = "Depleted"
            self.current_balance = 0
        elif self.current_balance < self.card_value:
            self.status = "Partially Used"
        else:
            self.status = "Active"
        
        self.save()
        
        return balance_before, self.current_balance
    
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