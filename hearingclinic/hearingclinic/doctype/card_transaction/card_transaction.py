import frappe
from frappe.model.document import Document

class CardTransaction(Document):
    def validate(self):
        """Validate transaction before saving"""
        # Get card document
        card = frappe.get_doc("Value Add Card", self.value_add_card)
        
        # Check if card has sufficient balance for purchases
        if self.transaction_type == "Purchase":
            if card.current_balance < self.amount:
                frappe.throw(
                    f"Insufficient balance. Available: {card.current_balance}, Required: {self.amount}",
                    title="Insufficient Card Balance"
                )
        
        # Store balance before transaction
        self.balance_before = card.current_balance
    
    def on_submit(self):
        """Update card balance when transaction is submitted"""
        # Update the card balance
        card = frappe.get_doc("Value Add Card", self.value_add_card)
        balance_before, balance_after = card.update_balance(self.amount, self.transaction_type)
        
        # Update this transaction with final balances
        self.db_set("balance_after", balance_after)
        
        frappe.msgprint(
            f"Card balance updated. New balance: {frappe.format_value(balance_after, dict(fieldtype='Currency'))}",
            indicator="green"
        )
    
    def on_cancel(self):
        """Reverse the transaction when cancelled"""
        # Reverse the transaction
        card = frappe.get_doc("Value Add Card", self.value_add_card)
        reverse_type = "Refund" if self.transaction_type == "Purchase" else "Purchase"
        card.update_balance(self.amount, reverse_type)
        
        frappe.msgprint("Transaction reversed, card balance restored", indicator="blue")