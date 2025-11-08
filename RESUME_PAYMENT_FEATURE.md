# Resume Payment Feature

## 💳 How to Pay Your Recent Pending Order

### Problem Solved:
When duplicate order prevention blocks you from creating a new order, you can now easily pay your existing pending order.

---

## ✅ Solution: "Pay Now" Button

### **Frontend: MyOrders Page**

**Location:** `frontend/src/pages/Marketplace/MyOrders.jsx`

**New Features:**
1. **"Pay Now" button** appears on pending orders
2. Retrieves payment link from backend
3. Opens payment link in new tab
4. User completes payment

**UI:**
```
┌─────────────────────────────────────┐
│ Order #abc123    [Awaiting Payment] │
│ Jan 8, 2025 8:00 PM                 │
├─────────────────────────────────────┤
│ Total: ₱5,000.00                    │
│ Payment: PayMongo                   │
├─────────────────────────────────────┤
│ [View Details] [💳 Pay Now] [Cancel]│  ← NEW!
└─────────────────────────────────────┘
```

---

### **Backend: Payment Link Retrieval**

**Location:** `backend/routes/marketplaceRoutes.js`

**New Endpoint:**
```
GET /api/marketplace/orders/:orderId/payment-link
```

**Logic:**
```javascript
1. Verify user owns the order
2. Check order has pending payment
3. Retrieve payment link from PayMongo
4. Return checkout URL
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentUrl": "https://pm.link/museo/test/abc123",
    "referenceNumber": "REF123",
    "amount": 5000,
    "expiresAt": "2025-01-08T21:00:00Z"
  }
}
```

---

## 🔄 Complete User Flow

### **Scenario 1: User Tries to Create Duplicate Order**

```
8:00 PM - User clicks "Place Order"
          └── Order created (pending)
          └── Payment link opens
          └── User closes tab (abandons payment)

8:01 PM - User goes back to checkout
          └── Clicks "Place Order" again
          └── Backend: "You already have a pending order"
          └── Frontend: Shows dialog
              "You already have a pending order created 60 seconds ago.
               Would you like to view your pending orders?"
          └── User clicks "Yes"
          └── Redirected to /marketplace/myorders

8:02 PM - User sees pending order
          └── Clicks "💳 Pay Now" button
          └── Payment link opens in new tab
          └── User completes payment ✅
```

---

### **Scenario 2: User Remembers Unpaid Order Later**

```
8:00 PM - User creates order, abandons payment

8:30 PM - User remembers unpaid order
          └── Goes to /marketplace/myorders
          └── Sees pending order with "Pay Now" button
          └── Clicks "💳 Pay Now"
          └── Payment link opens
          └── Completes payment ✅
```

---

## 🎯 Button States

### **Pending Payment (Unpaid)**
```jsx
<button className="btn btn-primary">
  💳 Pay Now
</button>
<button className="btn btn-danger">
  Cancel Order
</button>
```

### **Processing (Paid, Not Shipped)**
```jsx
<button className="btn btn-secondary">
  View Details
</button>
// No action buttons - waiting for seller
```

### **Shipped**
```jsx
<button className="btn btn-primary">
  Mark as Received
</button>
```

### **Delivered**
```jsx
<button className="btn btn-secondary">
  View Details
</button>
// Order complete
```

### **Cancelled/Expired**
```jsx
<button className="btn btn-secondary">
  View Details
</button>
// No actions available
```

---

## 🔒 Security Features

### **1. User Verification**
```javascript
// Only order owner can get payment link
const order = await db
  .from('orders')
  .select('*')
  .eq('orderId', orderId)
  .eq('userId', userId)  // ← Must match logged-in user
  .single();
```

### **2. Status Validation**
```javascript
// Only pending orders can be paid
if (order.paymentStatus !== 'pending') {
  return error: 'Order payment is already completed or expired'
}
```

### **3. Payment Link Expiration**
```javascript
// PayMongo links expire after set time
// If expired, user must create new order
if (!paymentLink || !paymentLink.checkoutUrl) {
  return error: 'Payment link not found or expired'
}
```

---

## 📊 Database Flow

### **Order States:**

```
┌─────────────────────────────────────┐
│ Order Created                       │
│ paymentStatus: 'pending'            │
│ status: 'pending'                   │
│ paymentReference: 'REF123'          │
└──────────────┬──────────────────────┘
               │
               ├─→ User clicks "Pay Now"
               │   └─→ Retrieve payment link
               │       └─→ Open in new tab
               │
               ├─→ User completes payment
               │   └─→ Webhook updates:
               │       paymentStatus: 'paid'
               │       status: 'processing'
               │
               └─→ User cancels or expires
                   └─→ Auto-cleanup:
                       paymentStatus: 'expired'
                       status: 'cancelled'
```

---

## 🧪 Testing

### **Test 1: Pay Now Button Appears**
```bash
1. Create order, abandon payment
2. Go to /marketplace/myorders
3. Verify "Pay Now" button shows on pending order
```

### **Test 2: Payment Link Opens**
```bash
1. Click "Pay Now" on pending order
2. Verify payment link opens in new tab
3. Verify correct amount shown
```

### **Test 3: Payment Completion**
```bash
1. Click "Pay Now"
2. Complete payment in PayMongo
3. Verify order status updates to "Processing"
4. Verify "Pay Now" button disappears
```

### **Test 4: Expired Payment Link**
```bash
1. Create order
2. Wait for payment link to expire (varies by PayMongo settings)
3. Click "Pay Now"
4. Verify error: "Payment link expired"
5. User must create new order
```

### **Test 5: Already Paid Order**
```bash
1. Pay for order
2. Try to get payment link again
3. Verify error: "Order payment is already completed"
```

---

## 💡 User Experience Improvements

### **Before:**
```
User: *creates order, abandons payment*
User: *tries to checkout again*
System: "You already have a pending order"
User: "How do I pay for it??" 😕
User: *confused, creates support ticket*
```

### **After:**
```
User: *creates order, abandons payment*
User: *tries to checkout again*
System: "You already have a pending order. View it?"
User: *clicks Yes*
System: *shows My Orders page*
User: *clicks "Pay Now"*
System: *opens payment link*
User: *completes payment* ✅
```

---

## 🎨 UI/UX Details

### **Button Styling:**
```css
/* Pay Now button - Primary action */
.btn-primary {
  background: var(--gold);
  color: white;
  font-weight: 600;
}

/* Cancel button - Destructive action */
.btn-danger {
  background: var(--red);
  color: white;
}

/* View Details - Secondary action */
.btn-secondary {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-primary);
}
```

### **Button Order:**
```
[View Details] [💳 Pay Now] [Cancel Order]
     ↑              ↑              ↑
  Secondary     Primary       Destructive
```

---

## 📝 API Documentation

### **GET /api/marketplace/orders/:orderId/payment-link**

**Description:** Retrieve payment link for pending order

**Authentication:** Required (JWT)

**Parameters:**
- `orderId` (path) - Order ID

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "paymentUrl": "https://pm.link/museo/test/abc123",
    "referenceNumber": "REF123",
    "amount": 5000,
    "expiresAt": "2025-01-08T21:00:00Z"
  }
}
```

**Error Responses:**

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Order not found"
}
```

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Order payment is already completed or expired"
}
```

**404 Payment Link Expired:**
```json
{
  "success": false,
  "error": "Payment link not found or expired"
}
```

---

## ✅ Summary

**Problem:** User blocked from creating new order due to existing pending order

**Solution:** 
1. ✅ "Pay Now" button on pending orders
2. ✅ Retrieves existing payment link
3. ✅ Opens payment in new tab
4. ✅ User completes payment
5. ✅ Order status updates automatically

**Benefits:**
- ✅ No duplicate orders
- ✅ Easy payment resumption
- ✅ Better user experience
- ✅ Reduced support tickets
- ✅ Higher conversion rate

**Your users can now easily pay for their pending orders!** 💳
