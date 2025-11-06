# Marketplace API Guide

Complete documentation for the Museo Marketplace System - A full-featured e-commerce platform for buying and selling artworks.

---

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [Complete User Flow](#complete-user-flow)
5. [Testing Guide](#testing-guide)
6. [Error Handling](#error-handling)

---

## Overview

The Museo Marketplace is a complete e-commerce system that allows artists to sell their artworks and buyers to purchase them. It includes:

- ✅ Marketplace Items CRUD
- ✅ Shopping Cart Management
- ✅ Order Creation & Checkout
- ✅ Order Status Tracking
- ✅ Inventory Management
- ✅ Platform Fee Calculation (10%)
- ✅ Multi-Seller Support

---

## Database Schema

### 1. `marketplace_items`

Stores artwork listings.

```sql
CREATE TABLE marketplace_items (
  "marketItemId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  medium VARCHAR(100),
  dimensions VARCHAR(100),
  year_created INTEGER,
  weight_kg NUMERIC(5,2),
  is_original BOOLEAN DEFAULT true,
  is_framed BOOLEAN DEFAULT false,
  condition VARCHAR(50),
  images JSONB,
  primary_image TEXT,
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  quantity INTEGER DEFAULT 1,
  categories JSONB,
  tags JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. `cart_items`

Temporary storage for items in user's cart.

```sql
CREATE TABLE cart_items (
  "cartItemId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id),
  "marketItemId" UUID NOT NULL REFERENCES marketplace_items("marketItemId"),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  added_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. `orders`

Main order records (one per checkout).

```sql
CREATE TABLE orders (
  "orderId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id),
  subtotal NUMERIC(10,2) NOT NULL,
  "platformFee" NUMERIC(10,2) NOT NULL,
  "shippingCost" NUMERIC(10,2) DEFAULT 0,
  "totalAmount" NUMERIC(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  "paymentStatus" VARCHAR(50) DEFAULT 'pending',
  "shippingAddress" JSONB,
  "contactInfo" JSONB,
  "paymentMethod" VARCHAR(50),
  "trackingNumber" VARCHAR(100),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  "shippedAt" TIMESTAMPTZ,
  "deliveredAt" TIMESTAMPTZ,
  "paidAt" TIMESTAMPTZ,
  "cancelledAt" TIMESTAMPTZ
);
```

### 4. `order_items`

Individual items in each order.

```sql
CREATE TABLE order_items (
  "orderItemId" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId" UUID REFERENCES orders("orderId") ON DELETE CASCADE,
  "marketplaceItemId" UUID REFERENCES marketplace_items("marketItemId"),
  "userId" UUID NOT NULL REFERENCES auth.users(id), -- buyer
  "sellerId" UUID NOT NULL REFERENCES auth.users(id), -- artist
  title VARCHAR(255) NOT NULL,
  "priceAtPurchase" NUMERIC(10,2) NOT NULL,
  quantity INTEGER NOT NULL,
  "itemTotal" NUMERIC(10,2) NOT NULL,
  "platformFeeAmount" NUMERIC(10,2) NOT NULL,
  "artistEarnings" NUMERIC(10,2) NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API Endpoints

Base URL: `http://localhost:3000/api/marketplace`

All endpoints require authentication via Bearer token.

---

### **MARKETPLACE ITEMS**

#### 1. Create Marketplace Item

**POST** `/items`

Create a new artwork listing.

**Request Body:**
```json
{
  "title": "Beautiful Sunset Painting",
  "description": "A stunning oil painting of a sunset",
  "price": 2500,
  "medium": "Oil on Canvas",
  "dimensions": "24x36 inches",
  "year_created": 2024,
  "weight_kg": 2.5,
  "is_original": true,
  "is_framed": true,
  "condition": "excellent",
  "images": ["https://example.com/image.jpg"],
  "primary_image": "https://example.com/image.jpg",
  "quantity": 10,
  "categories": ["painting", "landscape"],
  "tags": ["sunset", "oil painting"],
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "marketItemId": "uuid",
    "title": "Beautiful Sunset Painting",
    "price": 2500,
    "quantity": 10,
    "status": "active",
    "createdAt": "2025-11-06T08:00:00.000Z"
  }
}
```

---

#### 2. Get All Marketplace Items

**GET** `/items`

Get all active marketplace items.

**Query Parameters:**
- `status` (optional) - Filter by status (active, pending, sold)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "marketItemId": "uuid",
      "title": "Beautiful Sunset Painting",
      "price": 2500,
      "quantity": 10,
      "status": "active"
    }
  ],
  "count": 1
}
```

---

#### 3. Get Single Marketplace Item

**GET** `/items/:id`

Get details of a specific item.

**Response:**
```json
{
  "success": true,
  "data": {
    "marketItemId": "uuid",
    "title": "Beautiful Sunset Painting",
    "description": "A stunning oil painting",
    "price": 2500,
    "quantity": 10,
    "images": ["https://example.com/image.jpg"]
  }
}
```

---

#### 4. Update Marketplace Item

**PUT** `/items/:id`

Update an existing item (owner only).

**Request Body:**
```json
{
  "price": 3000,
  "quantity": 15,
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Item updated successfully",
  "data": {
    "marketItemId": "uuid",
    "price": 3000,
    "quantity": 15
  }
}
```

---

#### 5. Delete Marketplace Item

**DELETE** `/items/:id`

Delete an item (owner only).

**Response:**
```json
{
  "success": true,
  "message": "Item deleted successfully"
}
```

---

### **SHOPPING CART**

#### 6. Get Cart

**GET** `/cart`

View current user's cart.

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "cartItemId": "uuid",
        "marketItemId": "uuid",
        "quantity": 2,
        "marketplace_items": {
          "title": "Sunset Painting",
          "price": 2500
        }
      }
    ],
    "total": 5000,
    "itemCount": 1
  }
}
```

---

#### 7. Add to Cart

**POST** `/cart/add`

Add an item to cart.

**Request Body:**
```json
{
  "marketplace_item_id": "uuid",
  "quantity": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "Item added to cart",
  "data": {
    "cartItemId": "uuid",
    "marketItemId": "uuid",
    "quantity": 2
  }
}
```

---

#### 8. Update Cart Quantity

**PUT** `/cart/:itemId`

Update quantity of item in cart.

**Request Body:**
```json
{
  "quantity": 3
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cart updated",
  "data": {
    "cartItemId": "uuid",
    "quantity": 3
  }
}
```

---

#### 9. Remove from Cart

**DELETE** `/cart/:itemId`

Remove an item from cart.

**Response:**
```json
{
  "success": true,
  "message": "Item removed from cart"
}
```

---

#### 10. Clear Cart

**DELETE** `/cart/clear`

Remove all items from cart.

**Response:**
```json
{
  "success": true,
  "message": "Cart cleared"
}
```

---

### **ORDERS & CHECKOUT**

#### 11. Create Order (Checkout)

**POST** `/orders/create`

Create order from cart items.

**Request Body:**
```json
{
  "shipping_address": {
    "street": "123 Main Street",
    "barangay": "Barangay 1",
    "city": "Quezon City",
    "province": "Metro Manila",
    "postal_code": "1100",
    "country": "Philippines"
  },
  "contact_info": {
    "name": "Juan Dela Cruz",
    "phone": "+63 912 345 6789",
    "email": "juan@example.com"
  },
  "payment_method": "credit_card"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": {
      "orderId": "uuid",
      "userId": "uuid",
      "subtotal": 5000,
      "platformFee": 500,
      "totalAmount": 5000,
      "status": "pending",
      "shippingAddress": {...},
      "createdAt": "2025-11-06T08:00:00.000Z"
    },
    "orderItems": [...],
    "itemsBySeller": {
      "seller-uuid": [...]
    },
    "summary": {
      "orderId": "uuid",
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

**What Happens:**
1. Validates all cart items are available
2. Creates main order record
3. Creates order_items for each cart item
4. Calculates platform fee (10%) and artist earnings (90%)
5. Reduces inventory quantities
6. Clears cart
7. Groups items by seller

---

#### 12. Get Buyer Orders

**GET** `/orders/buyer`

Get all orders for current user (as buyer).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "orderId": "uuid",
      "subtotal": 5000,
      "status": "pending",
      "items": [...],
      "itemsBySeller": {...},
      "itemCount": 2,
      "sellerCount": 1,
      "createdAt": "2025-11-06T08:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

#### 13. Get Seller Orders

**GET** `/orders/seller`

Get all orders containing items from current user (as seller).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "orderId": "uuid",
      "subtotal": 5000,
      "status": "pending",
      "items": [...],
      "itemsBySeller": {...},
      "createdAt": "2025-11-06T08:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

#### 14. Get Order Details

**GET** `/orders/:orderId`

Get full details of a specific order.

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "userId": "uuid",
    "subtotal": 5000,
    "platformFee": 500,
    "status": "shipped",
    "trackingNumber": "SPX123456789",
    "shippingAddress": {...},
    "items": [...],
    "itemsBySeller": {...},
    "itemCount": 2,
    "sellerCount": 1,
    "createdAt": "2025-11-06T08:00:00.000Z",
    "shippedAt": "2025-11-06T09:00:00.000Z"
  }
}
```

---

### **ORDER STATUS UPDATES**

#### 15. Mark Order as Shipped

**PUT** `/orders/:orderId/ship`

Mark order as shipped (seller only).

**Request Body:**
```json
{
  "tracking_number": "SPX123456789"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order marked as shipped",
  "data": {
    "orderId": "uuid",
    "status": "shipped",
    "trackingNumber": "SPX123456789",
    "shippedAt": "2025-11-06T09:00:00.000Z"
  }
}
```

---

#### 16. Mark Order as Delivered

**PUT** `/orders/:orderId/deliver`

Confirm order delivery (buyer only).

**Response:**
```json
{
  "success": true,
  "message": "Order marked as delivered",
  "data": {
    "orderId": "uuid",
    "status": "delivered",
    "deliveredAt": "2025-11-06T10:00:00.000Z"
  }
}
```

---

#### 17. Cancel Order

**PUT** `/orders/:orderId/cancel`

Cancel an order (buyer or seller, only if not shipped).

**Request Body:**
```json
{
  "reason": "Changed my mind"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order cancelled successfully. Inventory has been restored.",
  "data": {
    "orderId": "uuid",
    "status": "cancelled",
    "cancelledAt": "2025-11-06T08:30:00.000Z"
  }
}
```

**What Happens:**
1. Validates order is not shipped/delivered
2. Restores inventory for all items
3. Updates order status to "cancelled"

---

## Complete User Flow

### **Buyer Journey**

```
1. Browse Items
   └─ GET /api/marketplace/items

2. View Item Details
   └─ GET /api/marketplace/items/:id

3. Add to Cart
   └─ POST /api/marketplace/cart/add

4. View Cart
   └─ GET /api/marketplace/cart

5. Update Quantities (optional)
   └─ PUT /api/marketplace/cart/:itemId

6. Checkout
   └─ POST /api/marketplace/orders/create
   
7. View Orders
   └─ GET /api/marketplace/orders/buyer

8. Track Order
   └─ GET /api/marketplace/orders/:orderId

9. Confirm Delivery
   └─ PUT /api/marketplace/orders/:orderId/deliver
```

### **Seller Journey**

```
1. Create Listing
   └─ POST /api/marketplace/items

2. View My Listings
   └─ GET /api/marketplace/items

3. Update Listing
   └─ PUT /api/marketplace/items/:id

4. View Sales
   └─ GET /api/marketplace/orders/seller

5. Mark as Shipped
   └─ PUT /api/marketplace/orders/:orderId/ship

6. View Order Details
   └─ GET /api/marketplace/orders/:orderId
```

---

## Testing Guide

### **Prerequisites**

1. Server running on `http://localhost:3000`
2. Valid authentication token
3. Thunder Client or Postman

### **Complete Test Flow**

#### **Step 1: Create Item**

```http
POST http://localhost:3000/api/marketplace/items
Authorization: Bearer your-token

Body:
{
  "title": "Test Painting",
  "description": "A test painting",
  "price": 1500,
  "medium": "Oil on Canvas",
  "dimensions": "24x36 inches",
  "year_created": 2024,
  "weight_kg": 2,
  "is_original": true,
  "is_framed": true,
  "condition": "excellent",
  "images": ["https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5"],
  "primary_image": "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5",
  "quantity": 10,
  "categories": ["painting"],
  "tags": ["art"],
  "status": "active"
}
```

**✅ Copy the `marketItemId`**

---

#### **Step 2: Add to Cart**

```http
POST http://localhost:3000/api/marketplace/cart/add
Authorization: Bearer your-token

Body:
{
  "marketplace_item_id": "PASTE-marketItemId-HERE",
  "quantity": 2
}
```

---

#### **Step 3: View Cart**

```http
GET http://localhost:3000/api/marketplace/cart
Authorization: Bearer your-token
```

**Expected:** 2 items, total: ₱3000

---

#### **Step 4: Checkout**

```http
POST http://localhost:3000/api/marketplace/orders/create
Authorization: Bearer your-token

Body:
{
  "shipping_address": {
    "street": "123 Main St",
    "city": "Quezon City",
    "province": "Metro Manila",
    "postal_code": "1100"
  },
  "contact_info": {
    "name": "Juan Dela Cruz",
    "phone": "+63 912 345 6789"
  },
  "payment_method": "credit_card"
}
```

**✅ Copy the `orderId`**

---

#### **Step 5: Mark as Shipped**

```http
PUT http://localhost:3000/api/marketplace/orders/PASTE-orderId-HERE/ship
Authorization: Bearer your-token

Body:
{
  "tracking_number": "SPX123456789"
}
```

---

#### **Step 6: Mark as Delivered**

```http
PUT http://localhost:3000/api/marketplace/orders/PASTE-orderId-HERE/deliver
Authorization: Bearer your-token
```

---

## Error Handling

### **Common Errors**

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized"
}
```
**Solution:** Include valid Bearer token in Authorization header

---

#### 404 Not Found
```json
{
  "success": false,
  "error": "Item not found"
}
```
**Solution:** Check if the ID exists in database

---

#### 400 Bad Request
```json
{
  "success": false,
  "error": "marketplace_item_id is required"
}
```
**Solution:** Include all required fields in request body

---

#### 403 Forbidden
```json
{
  "success": false,
  "error": "You do not have permission to update this item"
}
```
**Solution:** Only item owner can update/delete

---

#### 400 Validation Error
```json
{
  "success": false,
  "error": "Only 5 items available in stock"
}
```
**Solution:** Reduce quantity or check item availability

---

## Order Status Flow

```
pending → shipped → delivered
   ↓
cancelled (only if not shipped)
```

### **Status Descriptions**

- **pending** - Order created, awaiting shipment
- **shipped** - Order shipped by seller
- **delivered** - Order delivered and confirmed by buyer
- **cancelled** - Order cancelled, inventory restored

---

## Platform Fees

- **Platform Fee:** 10% of item total
- **Artist Earnings:** 90% of item total

**Example:**
- Item Price: ₱2,500
- Quantity: 2
- Item Total: ₱5,000
- Platform Fee: ₱500 (10%)
- Artist Earnings: ₱4,500 (90%)

---

## Multi-Seller Support

When a buyer purchases items from multiple sellers in one checkout:

1. One main `order` is created
2. Multiple `order_items` are created (one per item)
3. Items are grouped by `sellerId` in response
4. Each seller sees only their items in `/orders/seller`
5. Buyer sees all items in `/orders/buyer`

---

## Best Practices

### **For Sellers**

1. Always set accurate `quantity` values
2. Update inventory when items are sold elsewhere
3. Mark orders as shipped promptly
4. Include tracking numbers for transparency

### **For Buyers**

1. Check item availability before adding to cart
2. Confirm delivery after receiving items
3. Cancel orders early if needed (before shipping)

### **For Developers**

1. Always validate user authentication
2. Check item ownership before updates
3. Validate inventory before checkout
4. Handle errors gracefully
5. Log important operations

---

## Future Enhancements

### **Planned Features**

- [ ] Payment gateway integration (PayMongo, Stripe)
- [ ] Email notifications
- [ ] Reviews & ratings
- [ ] Shipping cost calculator
- [ ] Order filtering & search
- [ ] Analytics dashboard
- [ ] Refund system
- [ ] Buyer-seller chat
- [ ] Wishlist
- [ ] Promotions & discounts

---

## Support

For issues or questions:
- Check error messages carefully
- Verify authentication tokens
- Ensure all required fields are included
- Check database schema matches documentation

---

**Last Updated:** November 6, 2025
**Version:** 1.0.0
**Status:** Production Ready ✅
