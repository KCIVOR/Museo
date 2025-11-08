# Postman Testing Guide - Marketplace Transactions

## 🛒 Complete Transaction Flow Testing

### **Prerequisites:**
1. ✅ At least 2 users logged in (Buyer & Seller)
2. ✅ Seller has created marketplace items
3. ✅ Items are active and available

---

## 📋 Test Flow Overview

```
1. Browse Items → 2. Add to Cart → 3. Update Cart → 4. Checkout
                                                        ↓
5. View Orders ← 6. Seller Ships ← 7. Buyer Confirms ← Create Order
```

---

## 🧪 Phase 1: Cart Management

### **1.1 Get Empty Cart**
```http
GET /marketplace/cart
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "items": [],
    "totalItems": 0,
    "totalPrice": 0
  }
}
```

**✅ Check:** Empty cart returns successfully

---

### **1.2 Add Item to Cart**
```http
POST /marketplace/cart
Content-Type: application/json

{
  "marketplace_item_id": "item-uuid-here",
  "quantity": 2
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Item added to cart",
  "data": {
    "cartItemId": "cart-item-uuid",
    "userId": "user-uuid",
    "marketplaceItemId": "item-uuid",
    "quantity": 2,
    "addedAt": "2024-01-01T00:00:00Z"
  }
}
```

**✅ Check:** 
- Item added successfully
- Quantity is correct
- `cartItemId` returned

---

### **1.3 Add Same Item Again (Should Update Quantity)**
```http
POST /marketplace/cart
Content-Type: application/json

{
  "marketplace_item_id": "same-item-uuid",
  "quantity": 1
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Cart item quantity updated",
  "data": {
    "cartItemId": "same-cart-item-uuid",
    "quantity": 3
  }
}
```

**✅ Check:** Quantity increased (2 + 1 = 3)

---

### **1.4 Get Cart with Items**
```http
GET /marketplace/cart
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "cartItemId": "cart-item-uuid",
        "quantity": 3,
        "addedAt": "2024-01-01T00:00:00Z",
        "marketplace_items": {
          "marketItemId": "item-uuid",
          "title": "Sunset Over Mountains",
          "price": 2500,
          "images": ["url1", "url2"],
          "primary_image": "url1",
          "is_available": true,
          "quantity": 10,
          "sellerProfiles": {
            "shopName": "John's Art Shop",
            "city": "Manila"
          }
        }
      }
    ],
    "totalItems": 3,
    "totalPrice": 7500
  }
}
```

**✅ Check:**
- Items include full marketplace item details
- Seller info included
- Total price calculated correctly (2500 × 3 = 7500)

---

### **1.5 Update Cart Item Quantity**
```http
PUT /marketplace/cart/{cartItemId}
Content-Type: application/json

{
  "quantity": 1
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Cart item updated",
  "data": {
    "cartItemId": "cart-item-uuid",
    "quantity": 1
  }
}
```

**✅ Check:** Quantity updated from 3 to 1

---

### **1.6 Update to Quantity 0 (Should Remove)**
```http
PUT /marketplace/cart/{cartItemId}
Content-Type: application/json

{
  "quantity": 0
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Item removed from cart"
}
```

**✅ Check:** Item removed when quantity = 0

---

### **1.7 Add Multiple Items**
```http
POST /marketplace/cart
Content-Type: application/json

{
  "marketplace_item_id": "item-1-uuid",
  "quantity": 2
}
```

Then add another:
```http
POST /marketplace/cart
Content-Type: application/json

{
  "marketplace_item_id": "item-2-uuid",
  "quantity": 1
}
```

**✅ Check:** Cart now has 2 different items

---

### **1.8 Remove Specific Item**
```http
DELETE /marketplace/cart/{cartItemId}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Item removed from cart"
}
```

**✅ Check:** Specific item removed, other items remain

---

### **1.9 Clear Entire Cart**
```http
DELETE /marketplace/cart
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Cart cleared"
}
```

**✅ Check:** All items removed from cart

---

## 🛍️ Phase 2: Checkout & Order Creation

### **Setup: Add Items to Cart**
First, add some items to cart (repeat 1.2 for multiple items)

---

### **2.1 Create Order from Cart**
```http
POST /marketplace/orders
Content-Type: application/json

{
  "shippingAddress": {
    "fullName": "John Buyer",
    "phoneNumber": "+1234567890",
    "street": "456 Buyer St",
    "landmark": "Near Mall",
    "region": "NCR",
    "province": "Metro Manila",
    "city": "Quezon City",
    "barangay": "Barangay 2",
    "postalCode": "1100"
  },
  "paymentMethod": "cash_on_delivery",
  "notes": "Please deliver in the morning"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "orderId": "order-uuid",
    "orderNumber": "ORD-20240101-001",
    "buyerId": "buyer-uuid",
    "totalAmount": 7500,
    "status": "pending",
    "paymentMethod": "cash_on_delivery",
    "paymentStatus": "pending",
    "shippingAddress": {
      "fullName": "John Buyer",
      "street": "456 Buyer St",
      "city": "Quezon City"
    },
    "items": [
      {
        "orderItemId": "order-item-uuid",
        "marketplaceItemId": "item-uuid",
        "sellerId": "seller-uuid",
        "quantity": 2,
        "priceAtPurchase": 2500,
        "subtotal": 5000
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**✅ Check:**
- Order created with unique order number
- Cart cleared after order creation
- Order items have `priceAtPurchase` (locked price)
- Total amount calculated correctly
- Status is "pending"

---

### **2.2 Create Order with Empty Cart - Should Fail**
```http
POST /marketplace/orders
Content-Type: application/json

{
  "shippingAddress": { ... },
  "paymentMethod": "cash_on_delivery"
}
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Cart is empty"
}
```

**✅ Check:** Cannot create order with empty cart

---

### **2.3 Create Order with Unavailable Item - Should Fail**
```http
# First, add an unavailable item to cart (if possible)
# Then try to create order

POST /marketplace/orders
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Some items in your cart are no longer available"
}
```

**✅ Check:** Order creation fails if items unavailable

---

## 📦 Phase 3: Order Management

### **3.1 Get Buyer's Orders**
```http
GET /marketplace/orders/buyer
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "orderId": "order-uuid",
      "orderNumber": "ORD-20240101-001",
      "totalAmount": 7500,
      "status": "pending",
      "paymentStatus": "pending",
      "createdAt": "2024-01-01T00:00:00Z",
      "itemCount": 2,
      "sellers": [
        {
          "shopName": "John's Art Shop"
        }
      ]
    }
  ],
  "count": 1
}
```

**✅ Check:**
- Shows all orders placed by buyer
- Includes order summary
- Shows seller info

---

### **3.2 Get Seller's Orders (Login as Seller)**
```http
GET /marketplace/orders/seller
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "orderId": "order-uuid",
      "orderNumber": "ORD-20240101-001",
      "buyerId": "buyer-uuid",
      "totalAmount": 5000,
      "status": "pending",
      "createdAt": "2024-01-01T00:00:00Z",
      "buyer": {
        "fullName": "John Buyer",
        "email": "buyer@example.com"
      },
      "items": [
        {
          "title": "Sunset Over Mountains",
          "quantity": 2,
          "priceAtPurchase": 2500
        }
      ]
    }
  ],
  "count": 1
}
```

**✅ Check:**
- Shows only orders containing seller's items
- Includes buyer info
- Shows items from this seller only

---

### **3.3 Get Order Details**
```http
GET /marketplace/orders/{orderId}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order-uuid",
    "orderNumber": "ORD-20240101-001",
    "buyerId": "buyer-uuid",
    "totalAmount": 7500,
    "status": "pending",
    "paymentMethod": "cash_on_delivery",
    "paymentStatus": "pending",
    "shippingAddress": {
      "fullName": "John Buyer",
      "phoneNumber": "+1234567890",
      "street": "456 Buyer St",
      "city": "Quezon City",
      "province": "Metro Manila"
    },
    "notes": "Please deliver in the morning",
    "items": [
      {
        "orderItemId": "order-item-uuid",
        "marketplaceItemId": "item-uuid",
        "title": "Sunset Over Mountains",
        "quantity": 2,
        "priceAtPurchase": 2500,
        "subtotal": 5000,
        "seller": {
          "shopName": "John's Art Shop",
          "phoneNumber": "+1234567890"
        }
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**✅ Check:**
- Full order details
- All items with seller info
- Shipping address included
- Payment info included

---

### **3.4 Get Someone Else's Order - Should Fail**
```http
GET /marketplace/orders/{other-user-order-id}
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Order not found or access denied"
}
```

**✅ Check:** Cannot view other users' orders

---

## 🚚 Phase 4: Order Fulfillment

### **4.1 Seller Marks Order as Shipped**
```http
PUT /marketplace/orders/{orderId}/ship
Content-Type: application/json

{
  "trackingNumber": "TRACK123456",
  "carrier": "LBC Express",
  "notes": "Package shipped via LBC"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Order marked as shipped",
  "data": {
    "orderId": "order-uuid",
    "status": "shipped",
    "trackingNumber": "TRACK123456",
    "carrier": "LBC Express",
    "shippedAt": "2024-01-02T00:00:00Z"
  }
}
```

**✅ Check:**
- Status changed to "shipped"
- Tracking info saved
- `shippedAt` timestamp set

---

### **4.2 Non-Seller Tries to Ship - Should Fail**
```http
PUT /marketplace/orders/{orderId}/ship
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Only the seller can mark this order as shipped"
}
```

**✅ Check:** Only seller can ship their orders

---

### **4.3 Buyer Marks Order as Delivered**
```http
PUT /marketplace/orders/{orderId}/deliver
Content-Type: application/json

{
  "rating": 5,
  "review": "Great product, fast shipping!"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Order marked as delivered",
  "data": {
    "orderId": "order-uuid",
    "status": "delivered",
    "deliveredAt": "2024-01-05T00:00:00Z",
    "paymentStatus": "completed"
  }
}
```

**✅ Check:**
- Status changed to "delivered"
- Payment status changed to "completed"
- `deliveredAt` timestamp set

---

### **4.4 Mark Unshipped Order as Delivered - Should Fail**
```http
PUT /marketplace/orders/{pending-order-id}/deliver
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Order must be shipped before it can be marked as delivered"
}
```

**✅ Check:** Cannot skip "shipped" status

---

## ❌ Phase 5: Order Cancellation

### **5.1 Buyer Cancels Pending Order**
```http
PUT /marketplace/orders/{orderId}/cancel
Content-Type: application/json

{
  "reason": "Changed my mind"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "orderId": "order-uuid",
    "status": "cancelled",
    "cancelledAt": "2024-01-01T12:00:00Z",
    "cancelledBy": "buyer",
    "cancellationReason": "Changed my mind"
  }
}
```

**✅ Check:**
- Status changed to "cancelled"
- Cancellation reason saved
- `cancelledBy` indicates who cancelled

---

### **5.2 Seller Cancels Order**
```http
PUT /marketplace/orders/{orderId}/cancel
Content-Type: application/json

{
  "reason": "Item out of stock"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "orderId": "order-uuid",
    "status": "cancelled",
    "cancelledBy": "seller"
  }
}
```

**✅ Check:** Seller can also cancel orders

---

### **5.3 Cancel Delivered Order - Should Fail**
```http
PUT /marketplace/orders/{delivered-order-id}/cancel
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Cannot cancel order with status: delivered"
}
```

**✅ Check:** Cannot cancel completed orders

---

## 🧪 Complete Test Checklist

### **Cart Management:**
- [ ] Get empty cart
- [ ] Add item to cart
- [ ] Add same item (quantity increases)
- [ ] Get cart with items
- [ ] Update cart item quantity
- [ ] Set quantity to 0 (removes item)
- [ ] Add multiple different items
- [ ] Remove specific item
- [ ] Clear entire cart

### **Order Creation:**
- [ ] Create order from cart (success)
- [ ] Cart cleared after order
- [ ] Create order with empty cart (fail)
- [ ] Create order with unavailable item (fail)
- [ ] Order number generated
- [ ] Price locked at purchase time

### **Order Viewing:**
- [ ] Buyer views their orders
- [ ] Seller views their orders
- [ ] View order details (full info)
- [ ] Cannot view other users' orders

### **Order Fulfillment:**
- [ ] Seller marks as shipped
- [ ] Non-seller cannot ship (fail)
- [ ] Buyer marks as delivered
- [ ] Cannot deliver unshipped order (fail)
- [ ] Payment status updates on delivery

### **Order Cancellation:**
- [ ] Buyer cancels pending order
- [ ] Seller cancels order
- [ ] Cannot cancel delivered order (fail)
- [ ] Cancellation reason saved

### **Edge Cases:**
- [ ] Add out-of-stock item to cart
- [ ] Order with multiple sellers
- [ ] Partial order fulfillment
- [ ] Invalid shipping address
- [ ] Invalid payment method

---

## 📊 Expected Database State

### After Complete Transaction:

**`cart` table:**
```sql
-- Should be empty after order creation
SELECT * FROM cart WHERE "userId" = 'buyer-uuid';
```

**`orders` table:**
```sql
SELECT * FROM orders WHERE "buyerId" = 'buyer-uuid';
-- Should show order with status progression
```

**`order_items` table:**
```sql
SELECT * FROM order_items WHERE "orderId" = 'order-uuid';
-- Should show all items with locked prices
```

**`marketplace_items` table:**
```sql
-- Quantity should decrease after order
SELECT quantity FROM marketplace_items WHERE "marketItemId" = 'item-uuid';
```

---

## 🎯 Success Criteria

✅ Complete transaction flow works end-to-end
✅ Cart management (add, update, remove, clear)
✅ Order creation from cart
✅ Price locked at purchase time
✅ Order status progression (pending → shipped → delivered)
✅ Buyer and seller can view their orders
✅ Only authorized users can update orders
✅ Cancellation works with proper restrictions
✅ Payment status updates correctly

---

## 🚨 Common Issues

### Issue 1: "Cart is empty"
**Solution:** Add items to cart before creating order

### Issue 2: "Item no longer available"
**Solution:** Check item `is_available` status and `quantity`

### Issue 3: "Only seller can ship"
**Solution:** Login as the seller who owns the item

### Issue 4: "Cannot cancel delivered order"
**Solution:** This is correct behavior - delivered orders can't be cancelled

### Issue 5: Price mismatch
**Solution:** Orders use `priceAtPurchase` (locked), not current price

---

**Ready to test the complete transaction flow! 🛒→📦→✅**
