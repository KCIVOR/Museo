# Quick Test Guide - Cart & Checkout System

## 🚀 Prerequisites

### **1. Database Setup**
```sql
-- Run this migration first
-- File: database/migrations/add_sellerProfileId_to_order_items.sql
```

### **2. Test Users Needed**
- **User 1:** Artist + Seller (to create items)
- **User 2:** Regular user (buyer)
- **Admin:** To approve seller applications

---

## 📋 Test Flow

```
Step 1: Setup Seller → Step 2: Create Items → Step 3: Add to Cart
                                                        ↓
Step 7: View Order ← Step 6: Checkout ← Step 5: View Cart ← Step 4: Update Cart
```

---

## 🧪 STEP 1: Setup Seller Account

### **1.1 Login as Artist**
```http
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "artist@test.com",
  "password": "password123"
}
```

**Save the cookie!** All subsequent requests need this.

---

### **1.2 Check Seller Status**
```http
GET http://localhost:5000/api/marketplace/seller/status
```

**Expected Response (if not seller yet):**
```json
{
  "success": true,
  "isSeller": false,
  "sellerProfile": null
}
```

---

### **1.3 Submit Seller Application (if needed)**
```http
POST http://localhost:5000/api/marketplace/seller/apply
Content-Type: multipart/form-data

Form Data:
- shopName: "Test Art Shop"
- shopDescription: "Selling amazing artworks"
- fullName: "John Artist"
- email: "artist@test.com"
- phoneNumber: "+639123456789"
- street: "123 Art Street"
- landmark: "Near Museum"
- region: "NCR"
- province: "Metro Manila"
- city: "Manila"
- barangay: "Barangay 1"
- postalCode: "1000"
- idDocument: [Upload any image file]
```

---

### **1.4 Admin Approves Application**
```http
# Login as admin first
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "admin@test.com",
  "password": "admin123"
}

# Then approve
PUT http://localhost:5000/api/marketplace/seller/applications/{applicationId}/approve
```

---

### **1.5 Verify Seller Status**
```http
# Login back as artist
GET http://localhost:5000/api/marketplace/seller/status
```

**Expected Response:**
```json
{
  "success": true,
  "isSeller": true,
  "sellerProfile": {
    "sellerProfileId": "uuid-here",
    "shopName": "Test Art Shop",
    "city": "Manila",
    "province": "Metro Manila"
  }
}
```

✅ **Checkpoint:** User is now a verified seller!

---

## 🎨 STEP 2: Create Marketplace Items

### **2.1 Create Item 1**
```http
POST http://localhost:5000/api/marketplace/items
Content-Type: application/json

{
  "title": "Sunset Painting",
  "description": "Beautiful sunset over mountains",
  "price": 2500,
  "medium": "Oil on Canvas",
  "dimensions": "24x36 inches",
  "year_created": 2024,
  "weight_kg": 2.5,
  "is_original": true,
  "is_framed": false,
  "condition": "excellent",
  "images": ["https://picsum.photos/400/300"],
  "primary_image": "https://picsum.photos/400/300",
  "quantity": 5,
  "categories": ["landscape", "painting"],
  "tags": ["sunset", "mountains", "nature"]
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Marketplace item created successfully",
  "data": {
    "marketItemId": "item-uuid-1",
    "sellerProfileId": "seller-uuid",
    "title": "Sunset Painting",
    "price": 2500,
    "status": "active"
  }
}
```

**Save `marketItemId`!** You'll need it for cart.

---

### **2.2 Create Item 2**
```http
POST http://localhost:5000/api/marketplace/items
Content-Type: application/json

{
  "title": "Abstract Art",
  "description": "Modern abstract painting",
  "price": 1800,
  "medium": "Acrylic on Canvas",
  "dimensions": "30x40 inches",
  "year_created": 2024,
  "is_original": true,
  "quantity": 3,
  "categories": ["abstract"],
  "tags": ["modern", "colorful"]
}
```

**Save this `marketItemId` too!**

---

### **2.3 Verify Items Created**
```http
GET http://localhost:5000/api/marketplace/items
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "marketItemId": "item-uuid-1",
      "title": "Sunset Painting",
      "price": 2500,
      "sellerProfiles": {
        "shopName": "Test Art Shop",
        "city": "Manila"
      },
      "seller": {
        "shopName": "Test Art Shop",
        "location": "Manila, Metro Manila"
      }
    },
    {
      "marketItemId": "item-uuid-2",
      "title": "Abstract Art",
      "price": 1800,
      "seller": {
        "shopName": "Test Art Shop",
        "location": "Manila, Metro Manila"
      }
    }
  ]
}
```

✅ **Checkpoint:** Items created with seller info!

---

## 🛒 STEP 3: Add Items to Cart (Login as Buyer)

### **3.1 Login as Buyer**
```http
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "buyer@test.com",
  "password": "password123"
}
```

**Save buyer's cookie!**

---

### **3.2 Add Item 1 to Cart**
```http
POST http://localhost:5000/api/marketplace/cart
Content-Type: application/json

{
  "marketplace_item_id": "item-uuid-1",
  "quantity": 2
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Item added to cart",
  "data": {
    "cartItemId": "cart-item-uuid-1",
    "marketItemId": "item-uuid-1",
    "quantity": 2
  }
}
```

---

### **3.3 Add Item 2 to Cart**
```http
POST http://localhost:5000/api/marketplace/cart
Content-Type: application/json

{
  "marketplace_item_id": "item-uuid-2",
  "quantity": 1
}
```

✅ **Checkpoint:** 2 items in cart!

---

## 📦 STEP 4: View & Update Cart

### **4.1 View Cart**
```http
GET http://localhost:5000/api/marketplace/cart
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "cartItemId": "cart-item-uuid-1",
        "quantity": 2,
        "marketplace_items": {
          "marketItemId": "item-uuid-1",
          "title": "Sunset Painting",
          "price": 2500,
          "images": ["https://picsum.photos/400/300"],
          "sellerProfiles": {
            "shopName": "Test Art Shop",
            "city": "Manila"
          }
        }
      },
      {
        "cartItemId": "cart-item-uuid-2",
        "quantity": 1,
        "marketplace_items": {
          "title": "Abstract Art",
          "price": 1800,
          "sellerProfiles": {
            "shopName": "Test Art Shop"
          }
        }
      }
    ],
    "total": 6800,
    "itemCount": 2
  }
}
```

**Verify:**
- ✅ Seller info shows (shopName, city)
- ✅ Total = (2500 × 2) + (1800 × 1) = 6800
- ✅ 2 items in cart

---

### **4.2 Update Quantity**
```http
PUT http://localhost:5000/api/marketplace/cart/{cart-item-uuid-1}
Content-Type: application/json

{
  "quantity": 3
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Cart item updated",
  "data": {
    "quantity": 3
  }
}
```

---

### **4.3 Verify Updated Cart**
```http
GET http://localhost:5000/api/marketplace/cart
```

**New total should be:** (2500 × 3) + (1800 × 1) = 9300

✅ **Checkpoint:** Cart updates work!

---

## 💳 STEP 5: Checkout & Create Order

### **5.1 Create Order from Cart**
```http
POST http://localhost:5000/api/marketplace/orders
Content-Type: application/json

{
  "shipping_address": {
    "fullName": "John Buyer",
    "phoneNumber": "+639987654321",
    "street": "456 Buyer St",
    "landmark": "Near Mall",
    "region": "NCR",
    "province": "Metro Manila",
    "city": "Quezon City",
    "barangay": "Barangay 2",
    "postalCode": "1100"
  },
  "contact_info": {
    "email": "buyer@test.com",
    "phone": "+639987654321"
  },
  "payment_method": "cash_on_delivery"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Order created successfully. Please complete payment.",
  "data": {
    "order": {
      "orderId": "order-uuid",
      "orderNumber": "ORD-20240108-001",
      "userId": "buyer-uuid",
      "totalAmount": 9300,
      "platformFeeTotal": 930,
      "artistEarningsTotal": 8370,
      "status": "pending",
      "paymentStatus": "pending",
      "paymentMethod": "cash_on_delivery",
      "shippingAddress": { ... },
      "createdAt": "2024-01-08T..."
    },
    "orderItems": [
      {
        "orderItemId": "order-item-uuid-1",
        "marketplaceItemId": "item-uuid-1",
        "sellerProfileId": "seller-uuid",
        "title": "Sunset Painting",
        "priceAtPurchase": 2500,
        "quantity": 3,
        "itemTotal": 7500,
        "platformFeeAmount": 750,
        "artistEarnings": 6750
      },
      {
        "orderItemId": "order-item-uuid-2",
        "marketplaceItemId": "item-uuid-2",
        "sellerProfileId": "seller-uuid",
        "title": "Abstract Art",
        "priceAtPurchase": 1800,
        "quantity": 1,
        "itemTotal": 1800,
        "platformFeeAmount": 180,
        "artistEarnings": 1620
      }
    ],
    "itemsBySeller": {
      "seller-uuid": [ /* all items */ ]
    }
  }
}
```

**Verify:**
- ✅ Order created with unique order number
- ✅ Each item has `sellerProfileId`
- ✅ Prices locked at purchase time
- ✅ Platform fee = 10% (930)
- ✅ Artist earnings = 90% (8370)

**Save `orderId`!**

---

### **5.2 Verify Cart is Empty**
```http
GET http://localhost:5000/api/marketplace/cart
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

✅ **Checkpoint:** Cart cleared after order!

---

## 📋 STEP 6: View Orders

### **6.1 Buyer Views Their Orders**
```http
GET http://localhost:5000/api/marketplace/orders/buyer
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "orderId": "order-uuid",
      "orderNumber": "ORD-20240108-001",
      "totalAmount": 9300,
      "status": "pending",
      "paymentStatus": "pending",
      "createdAt": "2024-01-08T...",
      "items": [ /* 2 items */ ],
      "itemsBySeller": {
        "seller-uuid": [ /* grouped by seller */ ]
      },
      "itemCount": 2,
      "sellerCount": 1
    }
  ],
  "count": 1
}
```

---

### **6.2 Seller Views Their Orders (Login as Seller)**
```http
# Login as artist/seller first
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "artist@test.com",
  "password": "password123"
}

# Then get orders
GET http://localhost:5000/api/marketplace/orders/seller
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "orderItemId": "order-item-uuid-1",
      "orderId": "order-uuid",
      "sellerProfileId": "seller-uuid",
      "title": "Sunset Painting",
      "priceAtPurchase": 2500,
      "quantity": 3,
      "itemTotal": 7500,
      "artistEarnings": 6750
    },
    {
      "orderItemId": "order-item-uuid-2",
      "orderId": "order-uuid",
      "sellerProfileId": "seller-uuid",
      "title": "Abstract Art",
      "priceAtPurchase": 1800,
      "quantity": 1,
      "itemTotal": 1800,
      "artistEarnings": 1620
    }
  ],
  "count": 2
}
```

✅ **Checkpoint:** Both buyer and seller can view orders!

---

### **6.3 Get Order Details**
```http
GET http://localhost:5000/api/marketplace/orders/{order-uuid}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order-uuid",
    "orderNumber": "ORD-20240108-001",
    "userId": "buyer-uuid",
    "totalAmount": 9300,
    "status": "pending",
    "paymentMethod": "cash_on_delivery",
    "shippingAddress": {
      "fullName": "John Buyer",
      "street": "456 Buyer St",
      "city": "Quezon City"
    },
    "items": [ /* all items with seller info */ ],
    "itemsBySeller": {
      "seller-uuid": [ /* grouped */ ]
    },
    "itemCount": 2,
    "sellerCount": 1
  }
}
```

---

## 🚚 STEP 7: Order Fulfillment

### **7.1 Seller Marks as Shipped**
```http
# Login as seller
PUT http://localhost:5000/api/marketplace/orders/{order-uuid}/ship
Content-Type: application/json

{
  "tracking_number": "TRACK123456"
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
    "shippedAt": "2024-01-08T..."
  }
}
```

---

### **7.2 Buyer Marks as Delivered**
```http
# Login as buyer
PUT http://localhost:5000/api/marketplace/orders/{order-uuid}/deliver
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Order marked as delivered",
  "data": {
    "orderId": "order-uuid",
    "status": "delivered",
    "paymentStatus": "completed",
    "deliveredAt": "2024-01-08T..."
  }
}
```

✅ **Checkpoint:** Complete order flow works!

---

## ✅ Success Criteria

### **Cart System:**
- [x] Add items to cart
- [x] View cart with seller info
- [x] Update cart quantities
- [x] Remove items from cart
- [x] Cart shows correct totals

### **Checkout System:**
- [x] Create order from cart
- [x] Cart clears after order
- [x] Order stores `sellerProfileId`
- [x] Prices locked at purchase
- [x] Platform fee calculated (10%)
- [x] Artist earnings calculated (90%)

### **Order Management:**
- [x] Buyer can view orders
- [x] Seller can view their orders
- [x] Order details show seller info
- [x] Seller can mark as shipped
- [x] Buyer can mark as delivered
- [x] Payment status updates

### **Seller Profile Integration:**
- [x] Items show seller shop name
- [x] Cart shows seller info
- [x] Orders linked to seller profiles
- [x] Only active sellers can fulfill orders

---

## 🚨 Common Issues & Solutions

### Issue 1: "You must be an approved seller"
**Solution:** Make sure seller application is approved by admin

### Issue 2: "Cart is empty"
**Solution:** Add items to cart before creating order

### Issue 3: "Seller for [item] is no longer active"
**Solution:** Check seller profile `isActive` and `!isSuspended`

### Issue 4: Seller info not showing
**Solution:** Verify `sellerProfileId` is stored in marketplace_items

### Issue 5: "Only sellers can mark orders as shipped"
**Solution:** Login as the seller who owns the items

---

## 🎯 Complete Flow Summary

```
1. Artist becomes Seller ✅
2. Seller creates items ✅
3. Buyer adds to cart ✅
4. Buyer views cart (with seller info) ✅
5. Buyer checks out ✅
6. Order created (with sellerProfileId) ✅
7. Cart cleared ✅
8. Seller views order ✅
9. Seller ships order ✅
10. Buyer confirms delivery ✅
11. Payment completed ✅
```

**All systems working! 🎉**
