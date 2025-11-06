# 🛍️ Marketplace Testing Guide

Complete step-by-step guide to test the Museo Marketplace cart and checkout system.

## 📋 Prerequisites

- ✅ Server is running (`npm run dev` in backend)
- ✅ Frontend is running (`npm start` in frontend)
- ✅ You're logged in as a user
- ✅ PayMongo test API keys are configured in `.env`

---

## 🧪 Phase 1: Create Test Items

### Step 1: Create Test Marketplace Items

**Using Postman/Thunder Client:**

```http
POST http://localhost:3001/api/marketplace/items/test
Content-Type: application/json
Cookie: [your session cookie]

# No body needed - it will create 3 test items automatically
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Created 3 test items",
  "data": [
    {
      "marketItemId": "...",
      "title": "Sunset Over Mountains",
      "price": 2500,
      "quantity": 3,
      "status": "active"
    },
    // ... 2 more items
  ]
}
```

### Step 2: Verify Items Were Created

```http
GET http://localhost:3001/api/marketplace/items
```

**Expected Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 3
}
```

---

## 🛒 Phase 2: Test Cart System

### Step 1: Add Item to Cart

```http
POST http://localhost:3001/api/marketplace/cart/add
Content-Type: application/json
Cookie: [your session cookie]

{
  "marketplace_item_id": "paste-marketItemId-here",
  "quantity": 1
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Item added to cart",
  "data": {
    "cartItemId": "...",
    "userId": "...",
    "marketItemId": "...",
    "quantity": 1
  }
}
```

### Step 2: View Cart

```http
GET http://localhost:3001/api/marketplace/cart
Cookie: [your session cookie]
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "cartItemId": "...",
        "quantity": 1,
        "marketplace_items": {
          "marketItemId": "...",
          "title": "Sunset Over Mountains",
          "price": 2500,
          "images": [],
          "medium": "Oil on Canvas"
        }
      }
    ],
    "total": 2500,
    "itemCount": 1
  }
}
```

### Step 3: Update Cart Quantity

```http
PUT http://localhost:3001/api/marketplace/cart/[cartItemId]
Content-Type: application/json
Cookie: [your session cookie]

{
  "quantity": 2
}
```

### Step 4: Add More Items

Repeat Step 1 with different `marketplace_item_id` to add multiple items to cart.

---

## 💳 Phase 3: Test Checkout & Payment

### Step 1: Create Order from Cart

```http
POST http://localhost:3001/api/marketplace/orders/create
Content-Type: application/json
Cookie: [your session cookie]

{
  "shipping_address": {
    "street": "123 Test Street",
    "barangay": "Test Barangay",
    "city": "Manila",
    "province": "Metro Manila",
    "postal_code": "1000",
    "country": "Philippines"
  },
  "contact_info": {
    "full_name": "Test User",
    "phone": "+639123456789",
    "email": "test@example.com"
  },
  "payment_method": "card"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Order created successfully. Please complete payment.",
  "data": {
    "order": {
      "orderId": "...",
      "userId": "...",
      "subtotal": 5000,
      "platformFee": 500,
      "totalAmount": 5000,
      "status": "pending",
      "paymentStatus": "pending",
      "paymentLinkId": "...",
      "paymentReference": "..."
    },
    "payment": {
      "paymentUrl": "https://links.paymongo.com/...",
      "paymentLinkId": "link_...",
      "referenceNumber": "...",
      "expiresAt": "2025-11-07T00:00:00.000Z"
    },
    "summary": {
      "orderId": "...",
      "itemCount": 2,
      "sellerCount": 1,
      "subtotal": 5000,
      "platformFee": 500,
      "artistEarnings": 4500,
      "total": 5000
    }
  }
}
```

### Step 2: Test Payment Link

1. **Copy the `paymentUrl`** from the response
2. **Open it in a browser** - you'll see the PayMongo payment page
3. **Use PayMongo test cards:**

**Test Card Numbers:**
```
✅ SUCCESS: 4343 4343 4343 4345
❌ FAILED:  4571 7360 0000 0002
⏳ PENDING: 4571 7360 0000 0010

Expiry: Any future date (e.g., 12/25)
CVC: Any 3 digits (e.g., 123)
```

4. **Complete the payment** on PayMongo's page

### Step 3: Verify Webhook Processing

After payment, check your server console. You should see:

```
📥 Received PayMongo webhook: { type: 'link.payment.paid', id: '...' }
💰 Payment successful: { paymentId: '...', amount: 500000, paymentMethod: 'card' }
✅ Order updated successfully: [orderId]
🗑️ Cart cleared for user: [userId]
```

### Step 4: Check Order Status

```http
GET http://localhost:3001/api/marketplace/orders/buyer
Cookie: [your session cookie]
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "orderId": "...",
      "paymentStatus": "paid",
      "status": "pending",
      "paidAt": "2025-11-06T14:11:40.000Z",
      "items": [...],
      "itemCount": 2,
      "sellerCount": 1
    }
  ],
  "count": 1
}
```

### Step 5: Verify Cart is Cleared

```http
GET http://localhost:3001/api/marketplace/cart
Cookie: [your session cookie]
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "items": [],
    "total": 0,
    "itemCount": 0
  }
}
```

---

## 🎨 Phase 4: Test Seller Dashboard

### Step 1: Check Seller Orders

```http
GET http://localhost:3001/api/marketplace/orders/seller
Cookie: [your session cookie]
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "orderItemId": "...",
      "orderId": "...",
      "sellerId": "[your-user-id]",
      "title": "Sunset Over Mountains",
      "priceAtPurchase": 2500,
      "quantity": 1,
      "itemTotal": 2500,
      "platformFeeAmount": 250,
      "artistEarnings": 2250,
      "createdAt": "..."
    }
  ],
  "count": 1
}
```

---

## 🧪 Test Scenarios

### ✅ Happy Path
1. ✅ Create test items
2. ✅ Add items to cart
3. ✅ Update quantities
4. ✅ Create order
5. ✅ Complete payment
6. ✅ Verify order status
7. ✅ Check seller earnings

### ⚠️ Edge Cases to Test

**1. Stock Validation:**
```http
POST /api/marketplace/cart/add
{
  "marketplace_item_id": "...",
  "quantity": 999  // More than available
}
```
Expected: `400 - "Only X items available in stock"`

**2. Empty Cart Checkout:**
```http
POST /api/marketplace/orders/create
# With empty cart
```
Expected: `400 - "Cart is empty"`

**3. Payment Failure:**
- Use test card: `4571 7360 0000 0002`
- Order should be marked as `paymentStatus: "failed"`

**4. Duplicate Cart Items:**
- Add same item twice
- Should update quantity instead of creating duplicate

---

## 🐛 Troubleshooting

### Issue: "Unauthorized" Error
**Solution:** Make sure you're logged in and include the session cookie in requests.

### Issue: "Item not found"
**Solution:** Run the test items endpoint first to create items.

### Issue: Webhook not received
**Solution:** 
1. Check if webhook URL is configured in PayMongo dashboard
2. Use ngrok to expose localhost: `ngrok http 3001`
3. Update webhook URL to: `https://your-ngrok-url.ngrok.io/api/webhooks/paymongo`

### Issue: Payment link expired
**Solution:** Payment links expire after 24 hours. Create a new order.

---

## 📊 Database Verification

Check the database tables directly:

```sql
-- Check marketplace items
SELECT * FROM marketplace_items;

-- Check cart items
SELECT * FROM cart_items WHERE "userId" = 'your-user-id';

-- Check orders
SELECT * FROM orders WHERE "userId" = 'your-user-id';

-- Check order items
SELECT * FROM order_items WHERE "orderId" = 'your-order-id';

-- Check earnings breakdown
SELECT 
  "sellerId",
  SUM("artistEarnings") as total_earnings,
  COUNT(*) as total_sales
FROM order_items
GROUP BY "sellerId";
```

---

## 🎯 Success Criteria

✅ **Cart System:**
- Can add items to cart
- Can update quantities
- Can remove items
- Can view cart with totals

✅ **Checkout System:**
- Creates order with correct totals
- Generates PayMongo payment link
- Calculates platform fee (10%)
- Calculates artist earnings (90%)

✅ **Payment System:**
- Payment link works
- Webhook receives payment confirmation
- Order status updates to "paid"
- Cart is cleared after payment

✅ **Order Management:**
- Buyers can view their orders
- Sellers can view their sales
- Earnings are calculated correctly

---

## 🚀 Next Steps

After successful testing:

1. **Remove test route** - Delete `/items/test` endpoint before production
2. **Add frontend integration** - Connect Marketplace.jsx to these APIs
3. **Add email notifications** - Implement order confirmation emails
4. **Add order tracking** - Implement shipping status updates
5. **Add reviews system** - Allow buyers to review purchases

---

## 📝 Notes

- **Test Mode:** All PayMongo transactions are in test mode
- **Platform Fee:** Currently set to 10% (configurable)
- **Shipping:** Currently set to 0 (to be implemented)
- **Cart Persistence:** Cart is cleared only after successful payment
- **Inventory:** Stock is reduced when order is created (not when paid)

---

**Happy Testing! 🎉**
