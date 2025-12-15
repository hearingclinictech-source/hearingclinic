# Value Add Card Sales Invoice Integration - Test Summary

## Overview
Comprehensive test suite for Value Add Card (VAC) payment integration with Sales Invoice.
Tests cover all functionality added/modified in the VAC payment flow improvements.

## Test File
`hearingclinic/hearingclinic/doc_events/test_vac_sales_invoice.py`

## Test Coverage

### 1. Full Payment Scenarios

#### `test_vac_full_payment_sufficient_balance`
- **Purpose**: Verify VAC payment when balance is sufficient to cover full invoice
- **Test Scenario**:
  - Invoice: $500
  - VAC Balance: $1600
- **Assertions**:
  - Invoice status = "Paid"
  - Outstanding amount = 0
  - Card amount used = $500
  - VAC balance after = $1100
  - VAC status = "Partially Used"
  - Card Transaction created with correct amounts
  - VAC payment added to payments table

### 2. Partial Payment Scenarios

#### `test_vac_partial_payment_insufficient_balance`
- **Purpose**: Test VAC payment when balance is insufficient - requires additional payment
- **Test Scenario**:
  - Invoice: $2000
  - VAC Balance: $1600
  - Additional Cash: $400
- **Assertions**:
  - Invoice status = "Paid"
  - Outstanding = 0
  - Card amount used = $1600
  - VAC balance = 0
  - VAC status = "Fully Used"
  - Both VAC and Cash payments recorded
  - Amounts split correctly ($1600 + $400)

#### `test_vac_uses_full_balance_when_insufficient`
- **Purpose**: Verify VAC uses entire balance when insufficient for full payment
- **Test Scenario**:
  - Invoice: $2000
  - VAC Balance: $1600
  - No additional payment
- **Assertions**:
  - Card amount used = $1600 (full balance)
  - VAC balance = 0
  - Invoice status = "Partly Paid"
  - Outstanding = $400

### 3. Cancellation & Reversal

#### `test_vac_cancellation_restores_balance`
- **Purpose**: Test that cancelling invoice restores VAC balance
- **Test Scenario**:
  - Create and submit invoice for $800
  - Cancel the invoice
- **Assertions**:
  - Balance deducted on submission ($1600 → $800)
  - Balance restored on cancellation ($800 → $1600)
  - VAC status returns to "Active"
  - Card Transaction cancelled (docstatus = 2)
  - VAC payment removed from payments table

### 4. POS Mode Integration

#### `test_vac_payment_added_regardless_of_pos_mode`
- **Purpose**: Verify VAC payment is added to payments table even without POS mode
- **Test Scenario**:
  - Create invoice with is_pos = 0
  - Apply VAC payment
- **Assertions**:
  - VAC payment entry exists in payments table
  - Amount recorded correctly

### 5. Payment History & Reporting

#### `test_payment_history_shows_vac_type`
- **Purpose**: Verify payment history API correctly identifies VAC payments
- **Test Scenario**:
  - Create invoice with VAC payment
  - Call get_payment_history()
- **Assertions**:
  - Payment type = "Value Add Card" (not "POS Payment")
  - Mode of payment = "Value Add Card"
  - Amount recorded correctly

#### `test_payment_history_distinguishes_vac_from_pos`
- **Purpose**: Ensure VAC payments are not labeled as generic POS Payment
- **Test Scenario**:
  - Invoice with both VAC and Cash payments
  - Call get_payment_history()
- **Assertions**:
  - Two distinct payment entries
  - VAC entry has type "Value Add Card"
  - Cash entry has type "POS Payment"
  - Correct modes and amounts for each

### 6. Edge Cases

#### `test_vac_payment_with_zero_balance_card`
- **Purpose**: Test using a card with zero balance
- **Test Scenario**:
  - Deplete card completely (balance = 0)
  - Try to use card on new invoice
- **Assertions**:
  - Invoice status = "Unpaid"
  - Outstanding = full amount
  - Card amount used = 0

#### `test_multiple_invoices_deplete_vac_correctly`
- **Purpose**: Verify multiple invoices correctly track VAC balance
- **Test Scenario**:
  - Submit 3 invoices sequentially ($500, $700, $300)
- **Assertions**:
  - Balance after invoice 1: $1100 (1600-500)
  - Balance after invoice 2: $400 (1100-700)
  - Balance after invoice 3: $100 (400-300)
  - All 3 Card Transactions created

### 7. Print Format Support

#### `test_print_format_data_available`
- **Purpose**: Verify all required data for print format is available
- **Test Scenario**:
  - Create and submit invoice with VAC
  - Check all print format fields
- **Assertions**:
  - value_add_card field populated
  - card_amount_used field populated
  - Card Transaction exists with balance_before/after/amount
  - VAC payment exists in payments table

## Changes Tested

### 1. JavaScript Client-Side ([apply_value_add_card.js](hearingclinic/public/js/Sales_Invoice/apply_value_add_card.js))
- **Lines 75-82**: Auto-disable POS mode when VAC balance is sufficient
- **Lines 90-141**: Smart handling of insufficient balance scenario
  - Enable POS mode
  - Store shortfall in `frm._vac_shortfall`
  - Pre-populate payment amount with shortfall
  - Guide user to select POS Profile

### 2. JavaScript Client-Side ([fix_pos_profile_payment.js](hearingclinic/public/js/Sales_Invoice/fix_pos_profile_payment.js))
- **Lines 9-62**: Handle VAC with shortfall - set payment to shortfall amount
- **Lines 65-68**: Skip POS Profile override when VAC has sufficient balance
- **Line 34**: Set payment amount to shortfall (not full invoice total)

### 3. Python Server-Side ([handle_vac_sales_invoice.py](hearingclinic/hearingclinic/doc_events/handle_vac_sales_invoice.py))
- **Lines 40-41**: Always add VAC payment to payments table (regardless of is_pos status)
- **Lines 32-38**: Proper status handling for partial vs full payment
- **Lines 76-80**: Remove VAC payment entry on cancellation (regardless of is_pos status)

### 4. Payment History API ([sales_invoice_partial_payment.py](hearingclinic/hearingclinic/doc_events/sales_invoice_partial_payment.py))
- **Lines 126-127**: Detect VAC payments and assign type "Value Add Card"
- Distinguishes VAC from generic "POS Payment" type

### 5. Payment History UI ([sales_invoice_partial_payment.js](hearingclinic/public/js/Sales_Invoice/sales_invoice_partial_payment.js))
- **Lines 218-224**: Badge color logic for payment types
  - Blue (primary): POS Payment
  - Green (success): Payment Entry
  - Yellow/Orange (warning): Value Add Card

### 6. Print Format Template ([print_format_payment_summary.html](hearingclinic/utils/print_format_payment_summary.html))
- **Fixed**: Missing `{% endif %}` causing Jinja syntax error
- **Enhanced**: Display ALL payment methods including VAC
- **Added**: Card balance details (before/after) for VAC payments
- **Supports**: Both partial and full payment scenarios

## Running the Tests

```bash
# Run all VAC Sales Invoice tests
cd /workspace/frappe-bench
bench --site development.localhost run-tests --app hearingclinic --module hearingclinic.hearingclinic.doc_events.test_vac_sales_invoice

# Run specific test
bench --site development.localhost run-tests --app hearingclinic --module hearingclinic.hearingclinic.doc_events.test_vac_sales_invoice --test test_vac_full_payment_sufficient_balance
```

## Test Dependencies

The test suite creates its own fixtures:
- Test Customer: "_Test VAC Customer"
- Test Item: "_Test VAC Item"
- Test Mode of Payment: "Value Add Card", "Cash"
- Test Value Add Card: Created fresh for each test with $1600 balance

## Configuration Notes

Tests respect property setters from `hearingclinic/fixtures/property_setter.json`:
- **Default is_pos**: 1 (POS mode enabled by default)
- **Default currency**: MYR
- **Default selling_price_list**: Hearing Clinic Products
- **Hidden fields**: Many standard ERPNext fields are hidden per customization

## Coverage Summary

✅ Full payment with sufficient balance
✅ Partial payment with insufficient balance
✅ Mixed payment (VAC + other payment method)
✅ Cancellation and balance restoration
✅ POS mode auto-management
✅ Payment history tracking and badging
✅ Print format data availability
✅ Edge cases (zero balance, multiple invoices)
✅ Server-side payment entry creation
✅ Client-side UX improvements

## Future Enhancements

Consider adding tests for:
- Refund scenarios with VAC
- VAC expiration handling
- Concurrent usage of same VAC
- Permission-based access control
- Integration with Payment Entry
