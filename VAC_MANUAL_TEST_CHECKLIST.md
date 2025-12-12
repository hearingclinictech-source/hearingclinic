# Value Add Card Sales Invoice - Manual Test Checklist

## Prerequisites
- Hearing Clinic app installed and set up
- At least one test customer
- At least one test item
- "Value Add Card" Mode of Payment exists
- POS Profile configured (for partial payment tests)

## Test Scenarios

### ✅ Test 1: Full Payment with Sufficient VAC Balance
**Setup:**
1. Create a Value Add Card with $1000 paid (balance will be $1600)
2. Create a Sales Invoice for $500

**Steps:**
1. Open the Sales Invoice
2. Click "Apply Value Add Card" button
3. Select the card
4. Submit the invoice

**Expected Results:**
- ✅ Invoice status = "Paid"
- ✅ Outstanding amount = $0
- ✅ VAC balance reduces to $1100
- ✅ Card status changes to "Partially Used"
- ✅ Card Transaction created
- ✅ Payment history shows "Value Add Card" (yellow badge)
- ✅ Print format shows VAC card number and balance details

---

### ✅ Test 2: Partial Payment with Insufficient VAC Balance
**Setup:**
1. Create a Value Add Card with $1000 paid (balance will be $1600)
2. Create a Sales Invoice for $2000

**Steps:**
1. Open the Sales Invoice
2. Click "Apply Value Add Card" button
3. Select the card
4. System should show message: "Additional Payment Required" with shortfall amount
5. Select a POS Profile
6. System should pre-fill the shortfall amount ($400) in the payment field
7. Submit the invoice

**Expected Results:**
- ✅ Invoice status = "Paid"
- ✅ Outstanding amount = $0
- ✅ VAC balance = $0
- ✅ Card status = "Fully Used"
- ✅ Two payment entries:
  - Value Add Card: $1600 (yellow badge)
  - Cash/Bank: $400 (blue badge)
- ✅ Print format shows both payment methods

---

### ✅ Test 3: POS Mode Auto-Management (Sufficient Balance)
**Setup:**
1. Create a Value Add Card with $1000 paid
2. Create a Sales Invoice for $500 with POS mode enabled

**Steps:**
1. Apply Value Add Card
2. Observe the form

**Expected Results:**
- ✅ Green message: "Card balance is sufficient. POS payment mode has been disabled."
- ✅ POS mode automatically disabled
- ✅ Payments table cleared

---

### ✅ Test 4: POS Mode Auto-Management (Insufficient Balance)
**Setup:**
1. Create a Value Add Card with $1000 paid
2. Create a Sales Invoice for $2000 without POS mode

**Steps:**
1. Apply Value Add Card
2. Observe the form

**Expected Results:**
- ✅ Orange message showing shortfall amount ($400)
- ✅ POS mode automatically enabled
- ✅ User prompted to select POS Profile
- ✅ After selecting POS Profile, payment amount pre-filled with $400 (not $2000)

---

### ✅ Test 5: Invoice Cancellation Restores Balance
**Setup:**
1. Create a Value Add Card with $1000 paid
2. Create and submit a Sales Invoice for $800 using the VAC

**Steps:**
1. Verify VAC balance is $800 ($1600 - $800)
2. Cancel the Sales Invoice
3. Check the VAC

**Expected Results:**
- ✅ VAC balance restored to $1600
- ✅ Card status returns to "Active"
- ✅ Card Transaction cancelled (docstatus = 2)
- ✅ VAC payment removed from invoice payments table

---

### ✅ Test 6: Payment History Display
**Setup:**
1. Create two invoices:
   - Invoice 1: $500 (VAC only)
   - Invoice 2: $2000 (VAC $1100 + Cash $900)

**Steps:**
1. Open each invoice
2. Check the Payment History section

**Expected Results:**
- ✅ Invoice 1 shows:
  - One payment entry
  - Type: "Value Add Card" with **yellow badge**
  - Amount: $500
- ✅ Invoice 2 shows:
  - Two payment entries
  - Entry 1: "Value Add Card" with **yellow badge**, $1100
  - Entry 2: "POS Payment" (Cash) with **blue badge**, $900

---

### ✅ Test 7: Print Format Display
**Setup:**
1. Create a Sales Invoice with VAC payment

**Steps:**
1. Submit the invoice
2. View Print Preview

**Expected Results for Full Payment:**
- ✅ Shows "Payment received by:"
- ✅ Lists "Value Add Card (CARD-XXXXX)"
- ✅ Shows amount
- ✅ Shows card balance: Before → After
- ✅ Shows "Total Paid"

**Expected Results for Partial Payment:**
- ✅ Shows "Invoice Total"
- ✅ Shows VAC payment section with:
  - Card Number
  - Balance Before
  - Amount Used
  - Balance After
- ✅ Shows other payment method (if any)
- ✅ Shows "Outstanding Balance" (if applicable)

---

### ✅ Test 8: Zero Balance Card
**Setup:**
1. Create a Value Add Card with $100 paid (balance $160)
2. Use it on invoice for $160
3. Try to use the same card on a new invoice for $50

**Expected Results:**
- ✅ System allows card selection but deducts $0
- ✅ Invoice remains "Unpaid" with full outstanding
- ✅ Card balance stays at $0

---

### ✅ Test 9: Multiple Invoices Sequential
**Setup:**
1. Create a Value Add Card with $1000 paid (balance $1600)
2. Create three invoices: $500, $700, $300

**Steps:**
1. Apply card to first invoice → Submit
2. Apply card to second invoice → Submit
3. Apply card to third invoice → Submit
4. Check card balance after each

**Expected Results:**
- ✅ After Invoice 1: Balance = $1100
- ✅ After Invoice 2: Balance = $400
- ✅ After Invoice 3: Balance = $100
- ✅ All three Card Transactions exist
- ✅ Card status = "Partially Used"

---

### ✅ Test 10: Payment Entry Integration
**Setup:**
1. Create Sales Invoice for $2000
2. Apply VAC ($1600) and submit (outstanding $400)

**Steps:**
1. Create Payment Entry for remaining $400
2. Submit Payment Entry
3. Check invoice

**Expected Results:**
- ✅ Invoice status = "Paid"
- ✅ Payment history shows:
  - Initial payment: Value Add Card ($1600) - yellow badge
  - Final payment: Payment Entry ($400) - green badge
- ✅ Print format shows complete payment history

---

## Files Modified - Quick Reference

**Client-Side (JavaScript):**
1. `/hearingclinic/public/js/Sales_Invoice/apply_value_add_card.js`
   - Lines 75-82: Auto-disable POS when VAC sufficient
   - Lines 90-141: Handle insufficient balance + shortfall calculation

2. `/hearingclinic/public/js/Sales_Invoice/fix_pos_profile_payment.js`
   - Lines 9-62: Set payment amount to shortfall (not full total)

3. `/hearingclinic/public/js/Sales_Invoice/sales_invoice_partial_payment.js`
   - Lines 218-224: Badge colors for payment types

**Server-Side (Python):**
1. `/hearingclinic/hearingclinic/doc_events/handle_vac_sales_invoice.py`
   - Lines 40-41: Always add VAC to payments table
   - Lines 76-80: Remove VAC payment on cancellation

2. `/hearingclinic/hearingclinic/doc_events/sales_invoice_partial_payment.py`
   - Lines 126-127: Identify VAC payment type

**Templates:**
1. `/hearingclinic/utils/print_format_payment_summary.html`
   - Fixed Jinja syntax (missing `{% endif %}`)
   - Display VAC payments (not filter them out)
   - Show card balance details

---

## Regression Tests

Make sure these still work:
- ✅ Regular Sales Invoice without VAC
- ✅ POS Invoice without VAC
- ✅ Cash/Bank Transfer payments
- ✅ Partial payments without VAC
- ✅ Invoice amendments
- ✅ Print formats for non-VAC invoices
