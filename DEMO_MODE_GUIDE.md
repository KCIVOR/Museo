# 🎮 DEMO MODE Guide - Payout System

## Overview
Your payout system now runs in **DEMO MODE** by default - perfect for development, testing, and capstone defense!

---

## ✅ What's Working in Demo Mode:

### **1. Complete Payout Flow**
```javascript
Order Delivered → Payout Created → Escrow Period → Ready Status → Withdrawal → Marked as Paid
```
- Everything is tracked in database ✅
- All calculations work correctly ✅
- All statuses update properly ✅

### **2. Simulated Payments**
- When seller withdraws: System simulates successful payment
- Reference numbers generated with "DEMO" prefix
- 1-second delay to simulate processing
- Console shows demo messages

### **3. No External Dependencies**
- ❌ No Xendit account needed
- ❌ No API keys needed
- ❌ No real money needed
- ❌ No internet for payment processing

---

## 🎯 How to Use Demo Mode:

### **Step 1: Keep Default Settings**
```javascript
// No need to change anything!
// Demo mode is ON by default
```

### **Step 2: Test the Full Flow**

#### **2.1 Create a Test Order**
```javascript
// Use PayMongo test cards
Card Number: 4343 4343 4343 4345
CVV: 123
Expiry: 12/25
```

#### **2.2 Mark Order as Delivered**
- Seller ships order
- Buyer confirms delivery
- Payout created automatically

#### **2.3 Check Console Output**
```
Payout created for order xyz: ₱960 ready on Dec 11
```

#### **2.4 Wait for Escrow (or fast-forward)**
- Normal: Wait 24 hours
- Testing: Manually update readyDate in database
- Or run: `await payoutService.processReadyPayouts()`

#### **2.5 Seller Withdraws**
- Click "Withdraw" button
- See console output:
```
🎮 DEMO MODE: Simulating payout...
🎮 DEMO: Simulated payout of ₱960 to gcash
🎮 Withdrawal processed: ₱960 to gcash (Ref: DEMO_WD1234567)
```

#### **2.6 Check Database**
- Payout status: "paid"
- Reference: "DEMO_WD1234567"
- Notes: "DEMO: Simulated payout via gcash"

---

## 🔄 Switching Between Modes:

### **Demo Mode (DEFAULT):**
```javascript
// .env file (or leave empty)
PAYOUT_MODE=demo
```

### **Production Mode:**
```javascript
// .env file
PAYOUT_MODE=production
XENDIT_SECRET_KEY=xnd_production_xxxxx
```

---

## 📊 What to Show in Your Defense:

### **1. Start with Order Creation**
- Show buyer purchasing artwork
- Use PayMongo test card
- Order created successfully

### **2. Show Seller Dashboard**
- Order appears in "To Ship"
- Seller marks as shipped
- Status changes to "Shipping"

### **3. Show Buyer Confirmation**
- Buyer receives order
- Clicks "Mark as Delivered"
- Order status: "Delivered"

### **4. Show Payout Creation**
```sql
-- In Supabase, show seller_payouts table
SELECT * FROM "seller_payouts" WHERE "orderId" = 'xxx';
-- Status: pending, readyDate: tomorrow
```

### **5. Simulate Time Passing**
```sql
-- Update to make payout ready NOW
UPDATE "seller_payouts" 
SET "readyDate" = NOW() - INTERVAL '1 hour'
WHERE "payoutId" = 'xxx';
```

### **6. Run Daily Processing**
```javascript
// Or manually trigger in console
await payoutService.processReadyPayouts();
// Shows: "Processed 1 payouts"
```

### **7. Show Seller Balance**
- Available: ₱960
- Pending: ₱0
- Can withdraw: Yes

### **8. Demonstrate Withdrawal**
- Click "Withdraw"
- Show console output (demo messages)
- Show database update (status: paid)
- Show success message to seller

### **9. Explain to Panel**
> "The system is running in demo mode for this presentation. In production, this would integrate with Xendit API to actually transfer money to the seller's GCash or bank account. The demo mode allows us to test the complete flow without needing real payment infrastructure."

---

## 💡 Demo Mode Features:

### **Console Messages:**
```javascript
// You'll see these in console:
🎮 DEMO MODE: Simulating payout...
🎮 DEMO: Simulated payout of ₱960 to gcash
🎮 Withdrawal processed: ₱960 to gcash (Ref: DEMO_WD123)
```

### **Database Records:**
```javascript
// All records properly created:
- payoutId: real UUID
- status: paid
- payoutReference: DEMO_WD123
- notes: "DEMO: Simulated payout via gcash"
```

### **Response to Frontend:**
```json
{
  "success": true,
  "amount": 960,
  "reference": "DEMO_WD123",
  "paymentMethod": "gcash",
  "gatewayStatus": "COMPLETED",
  "mode": "demo"  // Shows it's demo mode
}
```

---

## ✨ Benefits of Demo Mode:

1. **No Setup Required** - Works immediately
2. **No Costs** - No transaction fees
3. **Always Works** - No API failures
4. **Fast Testing** - No waiting for real transfers
5. **Safe** - Can't accidentally send real money
6. **Complete** - Full flow demonstration

---

## 🚀 When Ready for Production:

### **Step 1: Get Real Accounts**
- PayMongo production account
- Xendit business account

### **Step 2: Update .env**
```env
PAYOUT_MODE=production
XENDIT_SECRET_KEY=xnd_production_xxxxx
PAYMONGO_SECRET_KEY=sk_live_xxxxx
```

### **Step 3: Fund Accounts**
- Add money to Xendit for payouts
- Test with small amounts first

### **Step 4: Go Live!**
- Real payments from buyers
- Real payouts to sellers
- Real money flowing!

---

## 🎉 You're All Set!

Your demo mode payout system:
- ✅ Looks completely real
- ✅ Functions perfectly
- ✅ Ready for defense
- ✅ Easy to switch to production

Perfect for capstone presentation! 🎓
