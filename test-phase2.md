# Phase 2 Testing Checklist

## Test 1: Normal Order Creation ✅

### Before Order:
- [ ] Item inventory: _____ (note the number)
- [ ] Cart items count: _____ (should have items)
- [ ] User logged in: ✅

### During Order:
1. [ ] Click "Place Order"
2. [ ] See success message
3. [ ] Payment link opens in new tab
4. [ ] Redirected to "My Orders" page

### After Order (IMMEDIATELY - Don't pay yet):
- [ ] **Cart is EMPTY** ← CRITICAL! (Phase 2 fix)
- [ ] **Inventory reduced** ← CRITICAL! (Phase 2 fix)
- [ ] Order appears in "My Orders" with status "Pending"
- [ ] Cannot click "Place Order" again (cart is empty)

### Database Checks (Supabase):
```sql
-- Check inventory was reduced
SELECT marketItemId, title, quantity 
FROM marketplace_items 
WHERE marketItemId = 'YOUR_ITEM_ID';

-- Check cart is empty
SELECT * FROM cart_items WHERE userId = 'YOUR_USER_ID';
-- Should return 0 rows!

-- Check order exists
SELECT orderId, paymentStatus, status, totalAmount
FROM orders 
WHERE userId = 'YOUR_USER_ID'
ORDER BY createdAt DESC
LIMIT 1;
-- Should show paymentStatus = 'pending'
```

---

## Test 2: Webhook Doesn't Double-Reduce ✅

### After Payment:
1. [ ] Complete payment in PayMongo
2. [ ] Wait for webhook to process
3. [ ] Check inventory again

### Expected:
- [ ] Inventory stays the same (NOT reduced again)
- [ ] Order status changes to 'paid'
- [ ] Cart still empty (not cleared again)

### Backend Logs Should Show:
```
📦 Inventory was already reserved during order creation
🗑️ Cart was already cleared during order creation
```

---

## Test 3: Rollback Test (Optional - Advanced)

### Simulate Failure:
To test rollback, we'd need to temporarily break something (like payment link creation).

**Skip this for now** - we can test it later if needed.

---

## Test 4: No Duplicate Orders ✅

### Steps:
1. [ ] Add item to cart
2. [ ] Place order (cart clears)
3. [ ] Try to place order again
4. [ ] Should see "Cart is empty" error

### Expected:
- [ ] Cannot create duplicate orders
- [ ] Cart is empty after first order

---

## 📊 Test Results Summary

| Test | Status | Notes |
|------|--------|-------|
| Inventory reduced immediately | ⏳ | Check after order creation |
| Cart cleared immediately | ⏳ | Check after order creation |
| Webhook doesn't double-reduce | ⏳ | Check after payment |
| No duplicate orders | ⏳ | Check cart after order |
| Rollback works | ⏸️ | Skip for now |

---

## 🎯 What to Look For

### ✅ SUCCESS Indicators:
- Cart is empty RIGHT AFTER order (before payment)
- Inventory reduced RIGHT AFTER order (before payment)
- Cannot create duplicate orders
- Webhook logs show "already reserved/cleared"

### ❌ FAILURE Indicators:
- Cart still has items after order
- Inventory not reduced until payment
- Can click "Place Order" multiple times
- Inventory reduced twice (order + webhook)

---

## 📝 Notes Section

Write your observations here:

**Before Order:**
- Item: _______________________
- Inventory: _______
- Cart items: _______

**After Order (Before Payment):**
- Inventory: _______ (should be reduced!)
- Cart items: _______ (should be 0!)
- Order ID: _______

**After Payment:**
- Inventory: _______ (should be same as above!)
- Order status: _______ (should be 'paid')

**Issues Found:**
- _______________________
- _______________________
