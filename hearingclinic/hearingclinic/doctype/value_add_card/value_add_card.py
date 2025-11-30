import frappe
from frappe.model.document import Document

class ValueAddCard(Document):
    def validate(self):
        """Validate and calculate values - only for NEW cards"""
        # Only auto-calculate for new cards
        if self.is_new():
            # Auto-calculate card value when amount paid is entered
            if self.amount_paid:
                calculated_value = float(self.amount_paid) * 1.6
                self.card_value = calculated_value
            
            # Set initial balance
            if self.card_value and not self.current_balance:
                self.current_balance = float(self.card_value)
            
            # Set initial status
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
        
        # Use db_set to update without triggering validate
        self.db_set("current_balance", self.current_balance, update_modified=False)
        self.db_set("status", self.status, update_modified=False)
        
        # Reload to get updated values
        self.reload()
        
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