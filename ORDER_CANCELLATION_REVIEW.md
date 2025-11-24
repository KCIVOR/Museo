# Order Cancellation Flow Analysis

## Overview
Your order cancellation system allows **both buyers and sellers** to cancel orders, with automatic inventory restoration. However, **there is NO refund processing** - this is a critical gap.

---

## Current Cancellation Flow

### Endpoint
```
DELETE /api/marketplace/orders/:orderId
Body: { reason: "string (optional)" }
```

### Step 1: Authentication
```javascript
const auth = validateAuth(req);
if (!auth.valid) {
  return 401 Unauthorized
}
const userId = auth.userId;
```

**Security:** ✅ User must be authenticated

### Step 2: Validate Cancellation Reason (Optional)
```javascript
if (reason) {
  const reasonValidation = validateTextLength(reason, 1, 500, 'Cancellation reason');
  if (!reasonValidation.valid) {
    return 400 Bad Request
  }
}
```

**Validation:**
- ✅ Reason is optional
- ✅ If provided, must be 1-500 characters
- ✅ Prevents empty or excessively long reasons

### Step 3: Fetch Order
```javascript
const { data: order, error: orderError } = await db
  .from('orders')
  .select('*')
  .eq('orderId', orderId)
  .single();

if (orderError || !order) {
  return 404 Not Found
}
```

**Validation:** ✅ Order must exist

### Step 4: Check Authorization (Buyer OR Seller)
```javascript
// Check if user is buyer
const isBuyer = order.userId === userId;

// Check if user is seller
let isSeller = false;
const { data: sellerProfile } = await db
  .from('sellerProfiles')
  .select('sellerProfileId')
  .eq('userId', userId)
  .single();

if (sellerProfile) {
  isSeller = items.some(item => item.sellerProfileId === sellerProfile.sellerProfileId);
}

if (!isBuyer && !isSeller) {
  return 403 Forbidden
}
```

**Authorization Logic:**
- ✅ Buyer can cancel their own order
- ✅ Seller can cancel order they're selling in
- ✅ Others cannot cancel

**Example:**
- Buyer A purchases from Seller B → Buyer A OR Seller B can cancel
- Neither Buyer C nor Seller D can cancel

### Step 5: Check Order Status
```javascript
// Can't cancel if already shipped or delivered
if (order.status === 'shipped' || order.status === 'delivered') {
  return 400 Bad Request (Cannot cancel shipped/delivered order)
}
```

**Allowed Statuses for Cancellation:**
- ✅ `'pending'` - Payment not yet received
- ✅ `'processing'` - Seller is preparing to ship
- ❌ `'shipped'` - Already in transit
- ❌ `'delivered'` - Already delivered
- ❌ `'cancelled'` - Already cancelled

**Note:** No check for `'cancelled'` status - could allow double-cancellation

### Step 6: Restore Inventory
```javascript
// Get order items to restore inventory
const { data: orderItems } = await db
  .from('order_items')
  .select('marketplaceItemId, quantity')
  .eq('orderId', orderId);

// Restore inventory for each item
for (const item of orderItems) {
  const { data: marketItem } = await db
    .from('marketplace_items')
    .select('quantity')
    .eq('marketItemId', item.marketplaceItemId)
    .single();

  if (marketItem) {
    await db
      .from('marketplace_items')
      .update({ 
        quantity: marketItem.quantity + item.quantity,
        updated_at: new Date().toISOString()
      })
      .eq('marketItemId', item.marketplaceItemId);
  }
}
```

**Inventory Restoration:**
- ✅ Fetches all items in order
- ✅ For each item, adds quantity back to marketplace_items
- ✅ Updates timestamp

**Example:**
- Order had 2 units of Item A
- Item A had 5 units left
- After cancellation: Item A has 7 units

### Step 7: Update Order Status
```javascript
const { data: updatedOrder, error: updateError } = await db
  .from('orders')
  .update({ 
    status: 'cancelled',
    cancelledAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })
  .eq('orderId', orderId)
  .select()
  .single();

if (updateError) {
  return 500 Internal Server Error
}
```

**Order Update:**
- ✅ Sets status to `'cancelled'`
- ✅ Records cancellation timestamp
- ✅ Updates last modified timestamp

### Step 8: Return Response
```javascript
res.json({ 
  success: true, 
  message: 'Order cancelled successfully. Inventory has been restored.',
  data: updatedOrder
});
```

---

## Cancellation Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ BUYER/SELLER: Clicks "Cancel Order"                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ DELETE /api/marketplace/orders/:orderId                          │
│ { reason: "Changed my mind" }                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND: cancelOrder()                                          │
│ 1. Verify authentication                                        │
│ 2. Validate cancellation reason (1-500 chars)                   │
│ 3. Fetch order from database                                    │
│ 4. Check authorization (buyer OR seller)                        │
│ 5. Verify order status (not shipped/delivered)                  │
│ 6. Restore inventory for all items                              │
│ 7. Update order status to 'cancelled'                           │
│ 8. Return success response                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ DATABASE CHANGES:                                               │
│ - orders.status = 'cancelled'                                   │
│ - orders.cancelledAt = now                                      │
│ - marketplace_items.quantity += order_items.quantity            │
│ - marketplace_items.is_available = true (if qty > 0)            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ RESULT:                                                         │
│ ✅ Order marked as cancelled                                    │
│ ✅ Inventory restored to marketplace                            │
│ ❌ NO REFUND PROCESSED                                          │
│ ❌ NO XENDIT PAYMENT LINK CANCELLED                             │
│ ❌ NO NOTIFICATION SENT                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Critical Issues Found

### 🔴 ISSUE #1: No Refund Processing
**Severity:** CRITICAL

```javascript
// Current code: Just marks as cancelled, no refund
const { data: updatedOrder, error: updateError } = await db
  .from('orders')
  .update({ 
    status: 'cancelled',
    cancelledAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })
  .eq('orderId', orderId);
```

**Problem:**
- Order is marked cancelled but **payment is NOT refunded**
- Buyer's money stays with Xendit/Museo
- No refund link created
- No refund status tracking

**Impact:**
- Buyers lose money if they cancel
- Potential legal/compliance issues
- Customer complaints and chargebacks

**Solution Needed:**
```javascript
// Should call Xendit refund API
if (order.paymentStatus === 'paid') {
  try {
    const refund = await xenditService.createRefund({
      paymentLinkId: order.paymentLinkId,
      amount: order.totalAmount,
      reason: reason || 'Customer requested cancellation'
    });
    
    // Update order with refund details
    await db.from('orders').update({
      refundStatus: 'processing',
      refundId: refund.refundId,
      refundAmount: order.totalAmount
    }).eq('orderId', orderId);
  } catch (refundError) {
    return 500 error (refund failed)
  }
}
```

---

### 🔴 ISSUE #2: No Payment Link Cancellation
**Severity:** HIGH

**Problem:**
- Xendit payment link remains active
- Buyer could still complete payment after cancellation
- Order would be in inconsistent state

**Current Behavior:**
```
1. Buyer cancels order → order.status = 'cancelled'
2. Buyer accidentally pays on old link
3. Webhook marks order as paid
4. Order is both 'cancelled' AND 'paid' ❌
```

**Solution Needed:**
```javascript
// Should expire payment link before cancelling order
if (order.paymentStatus === 'pending' && order.paymentLinkId) {
  try {
    await xenditService.cancelPaymentLink(order.paymentLinkId);
  } catch (err) {
    console.error('Failed to cancel payment link:', err);
    // Don't fail the entire cancellation, but log it
  }
}
```

---

### 🟡 ISSUE #3: No Check for Already Cancelled Orders
**Severity:** MEDIUM

**Problem:**
- Can cancel the same order twice
- Inventory gets restored twice
- Causes inventory inconsistency

**Current Code:**
```javascript
// No check for order.status === 'cancelled'
if (order.status === 'shipped' || order.status === 'delivered') {
  return 400 error
}
// Missing: if (order.status === 'cancelled') { return 400 error }
```

**Example Bug:**
```
1. Order A has 2 units of Item X
2. Item X has 5 units in stock
3. Cancel Order A → Item X now has 7 units ✓
4. Cancel Order A again → Item X now has 9 units ❌ (should be 7)
```

**Solution:**
```javascript
if (order.status === 'shipped' || order.status === 'delivered' || order.status === 'cancelled') {
  return 400 Bad Request (Cannot cancel already cancelled order)
}
```

---

### 🟡 ISSUE #4: No Payment Status Check
**Severity:** MEDIUM

**Problem:**
- Can cancel orders that are already paid
- Inventory restored but payment not refunded
- Inconsistent state

**Current Code:**
```javascript
// No check for paymentStatus
// Should prevent cancellation if paid but refund fails
```

**Solution:**
```javascript
// If order is paid, must process refund
if (order.paymentStatus === 'paid') {
  // Must refund before allowing cancellation
  const refund = await xenditService.createRefund(...);
  if (!refund) {
    return 400 error (Cannot cancel paid order - refund failed)
  }
}
```

---

### 🟡 ISSUE #5: No Notification System
**Severity:** MEDIUM

**Problem:**
- Seller doesn't know order was cancelled
- Buyer doesn't get confirmation
- No audit trail

**Solution:**
```javascript
// Should send notifications
await notificationService.sendToUser(order.userId, {
  type: 'order_cancelled',
  orderId,
  amount: order.totalAmount
});

await notificationService.sendToSeller(order.sellerProfileId, {
  type: 'order_cancelled_by_buyer',
  orderId,
  reason
});
```

---

## Database Schema Issues

### Missing Fields
The `orders` table is missing:
- `cancelledAt` - ✅ Used in code but may not exist in schema
- `refundStatus` - ❌ Not tracked
- `refundId` - ❌ Not tracked
- `refundAmount` - ❌ Not tracked
- `cancellationReason` - ❌ Reason not stored

**Recommended Schema Update:**
```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelledAt TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refundStatus TEXT; -- 'pending', 'processing', 'completed', 'failed'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refundId TEXT; -- Xendit refund ID
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refundAmount NUMERIC;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellationReason TEXT;
```

---

## Comparison: Current vs. Recommended

### Current Flow (INCOMPLETE)
```
Order Cancelled
    ↓
Inventory Restored ✓
    ↓
Order Status Updated ✓
    ↓
❌ PAYMENT NOT REFUNDED
❌ PAYMENT LINK NOT CANCELLED
❌ NO NOTIFICATIONS
❌ INCONSISTENT STATE
```

### Recommended Flow (COMPLETE)
```
Order Cancellation Requested
    ↓
Verify Authorization ✓
    ↓
Check Order Status ✓
    ↓
If Paid: Process Refund ← MISSING
    ↓
Cancel Payment Link ← MISSING
    ↓
Restore Inventory ✓
    ↓
Update Order Status ✓
    ↓
Send Notifications ← MISSING
    ↓
Return Success Response ✓
```

---

## Testing Scenarios

### Scenario 1: Cancel Pending Order (Not Paid)
```
1. Create order → status='pending', paymentStatus='pending'
2. Cancel order
3. Expected: Order cancelled, inventory restored, no refund needed ✓
4. Current: Works correctly ✓
```

### Scenario 2: Cancel Paid Order
```
1. Create order → status='pending', paymentStatus='pending'
2. Complete payment → paymentStatus='paid'
3. Cancel order
4. Expected: Refund processed, inventory restored, order cancelled ✓
5. Current: ❌ NO REFUND PROCESSED
```

### Scenario 3: Cancel Shipped Order
```
1. Create order → status='pending'
2. Seller marks as shipped → status='shipped'
3. Try to cancel order
4. Expected: 400 error (cannot cancel shipped order) ✓
5. Current: Works correctly ✓
```

### Scenario 4: Double Cancellation
```
1. Create order with 2 units
2. Item has 5 units in stock
3. Cancel order → Item now has 7 units
4. Cancel order again
5. Expected: 400 error (already cancelled) ✓
6. Current: ❌ Item now has 9 units (INVENTORY BUG)
```

### Scenario 5: Seller Cancels Order
```
1. Buyer purchases from Seller A
2. Seller A cancels order
3. Expected: Seller can cancel, refund processed ✓
4. Current: Seller can cancel, but ❌ NO REFUND
```

---

## Recommended Implementation

### Phase 1: Quick Fixes (Critical)
```javascript
export const cancelOrder = async (req, res) => {
  try {
    const auth = validateAuth(req);
    if (!auth.valid) return res.status(401).json({ success: false, message: auth.error });
    const userId = auth.userId;
    const { orderId } = req.params;
    const { reason } = req.body;

    // Validate reason
    if (reason) {
      const reasonValidation = validateTextLength(reason, 1, 500, 'Cancellation reason');
      if (!reasonValidation.valid) {
        return res.status(400).json({ success: false, message: reasonValidation.error });
      }
    }

    // Fetch order
    const { data: order, error: orderError } = await db
      .from('orders')
      .select('*')
      .eq('orderId', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Check authorization
    const { data: items } = await db
      .from('order_items')
      .select('sellerProfileId')
      .eq('orderId', orderId);

    const isBuyer = order.userId === userId;
    let isSeller = false;
    const { data: sellerProfile } = await db
      .from('sellerProfiles')
      .select('sellerProfileId')
      .eq('userId', userId)
      .single();

    if (sellerProfile) {
      isSeller = items.some(item => item.sellerProfileId === sellerProfile.sellerProfileId);
    }

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ success: false, error: 'You do not have permission to cancel this order' });
    }

    // ✅ FIX #1: Check for already cancelled
    if (order.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Order is already cancelled' });
    }

    // Can't cancel if already shipped or delivered
    if (order.status === 'shipped' || order.status === 'delivered') {
      return res.status(400).json({ success: false, error: 'Cannot cancel order that has been shipped or delivered' });
    }

    // ✅ FIX #2: Cancel payment link if pending
    if (order.paymentStatus === 'pending' && order.paymentLinkId) {
      try {
        await xenditService.cancelPaymentLink(order.paymentLinkId);
        console.log(`✅ Payment link cancelled for order ${orderId}`);
      } catch (err) {
        console.error(`⚠️ Failed to cancel payment link for order ${orderId}:`, err);
        // Don't fail the entire cancellation
      }
    }

    // ✅ FIX #3: Process refund if paid
    if (order.paymentStatus === 'paid') {
      try {
        const refund = await xenditService.createRefund({
          paymentLinkId: order.paymentLinkId,
          amount: order.totalAmount,
          reason: reason || 'Customer requested cancellation'
        });

        console.log(`✅ Refund created for order ${orderId}:`, refund.refundId);

        // Update order with refund details
        await db.from('orders').update({
          refundStatus: 'processing',
          refundId: refund.refundId,
          refundAmount: order.totalAmount
        }).eq('orderId', orderId);
      } catch (refundError) {
        console.error(`❌ Refund failed for order ${orderId}:`, refundError);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to process refund. Please contact support.' 
        });
      }
    }

    // Restore inventory
    const { data: orderItems } = await db
      .from('order_items')
      .select('marketplaceItemId, quantity')
      .eq('orderId', orderId);

    for (const item of orderItems) {
      const { data: marketItem } = await db
        .from('marketplace_items')
        .select('quantity')
        .eq('marketItemId', item.marketplaceItemId)
        .single();

      if (marketItem) {
        await db
          .from('marketplace_items')
          .update({ 
            quantity: marketItem.quantity + item.quantity,
            is_available: true,
            updated_at: new Date().toISOString()
          })
          .eq('marketItemId', item.marketplaceItemId);
      }
    }

    // Update order status
    const { data: updatedOrder, error: updateError } = await db
      .from('orders')
      .update({ 
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancellationReason: reason || null,
        updatedAt: new Date().toISOString()
      })
      .eq('orderId', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Error cancelling order:', updateError);
      return res.status(500).json({ success: false, error: updateError.message });
    }

    // ✅ FIX #4: Send notifications
    try {
      // Notify buyer
      await notificationService.sendToUser(order.userId, {
        type: 'order_cancelled',
        orderId,
        amount: order.totalAmount,
        refunded: order.paymentStatus === 'paid'
      });

      // Notify seller
      await notificationService.sendToSeller(order.sellerProfileId, {
        type: 'order_cancelled',
        orderId,
        reason,
        cancelledBy: isBuyer ? 'buyer' : 'seller'
      });
    } catch (notifError) {
      console.error('Failed to send notifications:', notifError);
      // Don't fail the cancellation
    }

    res.json({ 
      success: true, 
      message: 'Order cancelled successfully. Inventory has been restored.' + 
               (order.paymentStatus === 'paid' ? ' Refund is being processed.' : ''),
      data: updatedOrder
    });

  } catch (error) {
    console.error('Error in cancelOrder:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
```

---

## Summary

### Current State: ⚠️ INCOMPLETE
- ✅ Inventory restoration works
- ✅ Order status update works
- ✅ Authorization checks work
- ❌ **NO REFUND PROCESSING**
- ❌ **NO PAYMENT LINK CANCELLATION**
- ❌ **NO DUPLICATE CANCELLATION CHECK**
- ❌ **NO NOTIFICATIONS**

### Critical Issues
1. **Buyers lose money** when cancelling paid orders (no refund)
2. **Payment link stays active** - buyers could pay after cancellation
3. **Inventory can be restored twice** - causes inconsistency
4. **No audit trail** - no notifications or reason tracking

### Recommended Action
**URGENT:** Implement Phase 1 fixes before going to production:
1. Add duplicate cancellation check
2. Implement Xendit refund processing
3. Cancel payment links for pending orders
4. Add notification system
5. Update database schema with refund fields

**Estimated Effort:** 4-6 hours

**Risk if Not Fixed:** Customer complaints, chargebacks, data inconsistency
