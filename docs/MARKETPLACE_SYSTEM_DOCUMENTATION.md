# MUSEO MARKETPLACE E-COMMERCE SYSTEM
## Complete Implementation Guide & Security Documentation

**Project:** Museo - Digital Art Marketplace  
**Author:** Capstone Project  
**Date:** November 2025  
**Version:** 1.0

---

## TABLE OF CONTENTS

1. [System Overview](#1-system-overview)
2. [Architecture & Flow](#2-architecture--flow)
3. [Database Schema](#3-database-schema)
4. [Implementation Guide](#4-implementation-guide)
5. [Security & Protection Systems](#5-security--protection-systems)
6. [Problem Scenarios & Solutions](#6-problem-scenarios--solutions)
7. [API Documentation](#7-api-documentation)
8. [Testing & Validation](#8-testing--validation)
9. [Deployment Checklist](#9-deployment-checklist)

---

## 1. SYSTEM OVERVIEW

### 1.1 Purpose
The Museo Marketplace is a secure e-commerce platform for buying and selling digital artworks with built-in protection for both buyers and sellers.

### 1.2 Key Features
- **Dual Marketplace**: Buy Now (fixed price) and Blind Auctions
- **Shopping Cart**: Multi-item cart with quantity management
- **Secure Payments**: Escrow system holding funds until delivery confirmation
- **Order Tracking**: Integration with J&T Express, LBC, and other Philippine couriers
- **Dispute Resolution**: Photo-based evidence system with admin review
- **Seller Ratings**: Trust score based on completed orders and scam reports
- **Auto-Complete**: Smart system preventing indefinite order waiting

### 1.3 Technology Stack
- **Frontend**: React.js with Museo Design System
- **Backend**: Node.js + Express
- **Database**: PostgreSQL (Supabase)
- **Email**: Nodemailer
- **File Upload**: Multer / Supabase Storage
- **Shipping**: Manual tracking (J&T Express, LBC)

---

## 2. ARCHITECTURE & FLOW

### 2.1 Complete User Journey

```
┌─────────────────────────────────────────────────────────────┐
│                    BUYER JOURNEY                             │
└─────────────────────────────────────────────────────────────┘

1. Browse Marketplace
   ↓
2. Add Items to Cart
   ↓
3. Checkout (Enter Shipping Address)
   ↓
4. Payment (Money goes to ESCROW - not seller!)
   ↓
5. Order Created (Status: "To Ship")
   ↓
6. Wait for Seller to Ship
   ↓
7. Receive Tracking Number
   ↓
8. Track Package
   ↓
9. Package Delivered
   ↓
10. Verify Item (Answer Questions + Photos if needed)
    ↓
    ├─→ Item OK → Confirm Receipt → Seller Gets Paid
    └─→ Item Wrong/Fake → File Dispute → Admin Review → Refund

┌─────────────────────────────────────────────────────────────┐
│                    SELLER JOURNEY                            │
└─────────────────────────────────────────────────────────────┘

1. List Artwork for Sale
   ↓
2. Receive Order Notification
   ↓
3. Pack Item
   ↓
4. Ship via J&T/LBC
   ↓
5. Enter Tracking Number
   ↓
6. Wait for Delivery (7-10 days)
   ↓
7. Customer Confirms Receipt
   ↓
8. Payment Released to Seller Wallet
```

### 2.2 Order Status Flow

```
┌──────────────┐
│ Order Placed │ ← Customer pays (money in escrow)
└──────┬───────┘
       ↓
┌──────────────┐
│   To Ship    │ ← Seller sees order, prepares item
└──────┬───────┘
       ↓
┌──────────────┐
│   Shipped    │ ← Seller enters tracking number
└──────┬───────┘
       ↓
┌──────────────┐
│  Delivered   │ ← Tracking shows delivered
└──────┬───────┘
       ↓
       ├─→ Customer Confirms → ┌───────────┐
       │                       │ Completed │ → Payment released
       │                       └───────────┘
       │
       ├─→ 7 Days No Action → Auto-Complete (with validation)
       │
       └─→ Customer Disputes → ┌──────────┐
                               │ Disputed │ → Admin reviews
                               └──────────┘
                                     ↓
                               ┌─────┴─────┐
                               ↓           ↓
                          ┌─────────┐  ┌──────────┐
                          │ Refunded│  │Completed │
                          └─────────┘  └──────────┘
```

### 2.3 Payment Flow (Escrow System)

```
CUSTOMER                  PLATFORM (ESCROW)              SELLER
   │                            │                          │
   │──[Pay ₱1,000]─────────────→│                          │
   │                            │                          │
   │                      [Money Held]                     │
   │                            │                          │
   │                            │←──[Ship Item]────────────│
   │                            │                          │
   │←──[Tracking #]─────────────│──[Tracking #]───────────→│
   │                            │                          │
   │──[Receive Package]────────→│                          │
   │                            │                          │
   │──[Confirm Receipt]────────→│                          │
   │                            │                          │
   │                            │──[Release ₱1,000]───────→│
   │                            │                          │
```

---

## 3. DATABASE SCHEMA

### 3.1 Core Tables

```sql
-- Users table (existing)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user', -- 'user', 'artist', 'admin'
  wallet_balance DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Marketplace items
CREATE TABLE marketplace_items (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2), -- For discounts
  image TEXT, -- URL or JSONB array
  medium VARCHAR(100),
  dimensions VARCHAR(100),
  year INTEGER,
  is_original BOOLEAN DEFAULT true,
  stock INTEGER DEFAULT 1,
  listing_type VARCHAR(20) DEFAULT 'buy_now', -- 'buy_now' or 'auction'
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'sold', 'inactive'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Shopping cart
CREATE TABLE cart_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  item_id INTEGER REFERENCES marketplace_items(id),
  quantity INTEGER DEFAULT 1,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

-- Orders
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  buyer_id INTEGER REFERENCES users(id),
  seller_id INTEGER REFERENCES users(id),
  item_id INTEGER REFERENCES marketplace_items(id),
  quantity INTEGER DEFAULT 1,
  total_price DECIMAL(10,2) NOT NULL,
  shipping_fee DECIMAL(10,2) DEFAULT 0,
  
  -- Shipping info
  shipping_address TEXT NOT NULL,
  shipping_city VARCHAR(100),
  shipping_province VARCHAR(100),
  shipping_postal_code VARCHAR(20),
  contact_phone VARCHAR(50),
  
  -- Tracking
  tracking_number VARCHAR(100),
  shipping_carrier VARCHAR(50), -- 'jnt', 'lbc', 'lalamove'
  tracking_verified BOOLEAN DEFAULT false,
  
  -- Status
  status VARCHAR(50) DEFAULT 'to_ship',
  -- 'to_ship', 'shipped', 'delivered', 'completed', 'disputed', 'refunded', 'flagged'
  
  -- Payment
  payment_status VARCHAR(50) DEFAULT 'held_in_escrow',
  -- 'held_in_escrow', 'pending_release', 'released_to_seller', 'refunded_to_buyer'
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  completed_at TIMESTAMP,
  auto_complete_at TIMESTAMP,
  payment_release_date TIMESTAMP,
  
  -- Verification
  completion_type VARCHAR(20), -- 'manual' or 'auto'
  receipt_verification JSONB, -- Customer's confirmation answers
  delivery_proof TEXT, -- Photo URL from seller
  
  -- Flags
  flagged_reason TEXT,
  flagged_at TIMESTAMP
);

-- Escrow transactions
CREATE TABLE escrow_transactions (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'held',
  -- 'held', 'released', 'refunded'
  held_at TIMESTAMP DEFAULT NOW(),
  released_at TIMESTAMP,
  released_to VARCHAR(20), -- 'seller' or 'buyer'
  refund_reason TEXT
);

-- Disputes
CREATE TABLE disputes (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  filed_by INTEGER REFERENCES users(id),
  dispute_type VARCHAR(50) NOT NULL,
  -- 'not_received', 'item_not_as_described', 'damaged', 'fake_tracking'
  reason TEXT,
  evidence_photos JSONB, -- Array of photo URLs
  customer_comments TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  -- 'pending', 'investigating', 'resolved_refund', 'resolved_no_refund'
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- Seller statistics
CREATE TABLE seller_stats (
  seller_id INTEGER PRIMARY KEY REFERENCES users(id),
  total_orders INTEGER DEFAULT 0,
  completed_orders INTEGER DEFAULT 0,
  cancelled_orders INTEGER DEFAULT 0,
  scam_reports INTEGER DEFAULT 0,
  fake_tracking_reports INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 5.00,
  account_status VARCHAR(20) DEFAULT 'active',
  -- 'active', 'warning', 'suspended', 'banned'
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Fake tracking reports
CREATE TABLE fake_tracking_reports (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  reported_by INTEGER REFERENCES users(id),
  reason TEXT,
  evidence TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
```

### 3.2 Indexes for Performance

```sql
-- Speed up common queries
CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_seller ON orders(seller_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_auto_complete ON orders(auto_complete_at) WHERE status = 'shipped';
CREATE INDEX idx_cart_user ON cart_items(user_id);
CREATE INDEX idx_marketplace_seller ON marketplace_items(seller_id);
CREATE INDEX idx_marketplace_status ON marketplace_items(status);
CREATE INDEX idx_disputes_order ON disputes(order_id);
CREATE INDEX idx_disputes_status ON disputes(status);
```

---

## 4. IMPLEMENTATION GUIDE

### 4.1 Phase 1: Shopping Cart (Week 1)

**Backend Routes:**
```javascript
// backend/routes/cartRoutes.js
router.get('/api/cart', getCart);
router.post('/api/cart/add', addToCart);
router.put('/api/cart/:itemId', updateQuantity);
router.delete('/api/cart/:itemId', removeFromCart);
router.delete('/api/cart/clear', clearCart);
```

**Frontend Components:**
- CartIcon with item count badge
- CartModal showing all items
- Quantity selectors
- Remove buttons
- Total price calculation

### 4.2 Phase 2: Checkout & Orders (Week 2)

**Backend Routes:**
```javascript
// backend/routes/orderRoutes.js
router.post('/api/orders/create', createOrder);
router.get('/api/orders/buyer', getBuyerOrders);
router.get('/api/orders/seller', getSellerOrders);
router.get('/api/orders/:orderId', getOrderDetails);
```

**Frontend Components:**
- Checkout page with address form
- Order confirmation page
- Order history page
- Order details modal

### 4.3 Phase 3: Shipping & Tracking (Week 3)

**Backend Routes:**
```javascript
router.put('/api/orders/:orderId/ship', markAsShipped);
router.put('/api/orders/:orderId/mark-delivered', markAsDelivered);
router.get('/api/orders/:orderId/tracking', getTrackingInfo);
```

**Frontend Components:**
- Seller dashboard with orders to ship
- Tracking number input form
- Tracking display with carrier links
- Email notifications

### 4.4 Phase 4: Verification & Completion (Week 4)

**Backend Routes:**
```javascript
router.put('/api/orders/:orderId/confirm-receipt', confirmReceipt);
router.post('/api/orders/:orderId/dispute', fileDispute);
router.get('/api/admin/disputes', getDisputes);
router.post('/api/admin/disputes/:id/resolve', resolveDispute);
```

**Frontend Components:**
- Receipt confirmation modal with questions
- Photo upload for disputes
- Admin dispute review panel
- Refund processing

### 4.5 Phase 5: Auto-Complete & Cron Jobs (Week 5)

**Backend Cron Jobs:**
```javascript
// Run daily at midnight
cron.schedule('0 0 * * *', () => {
  autoCompleteOrders();
  releasePayments();
  flagSuspiciousOrders();
});
```

---

## 5. SECURITY & PROTECTION SYSTEMS

### 5.1 Escrow System (Money Protection)

**How It Works:**
1. Customer pays → Money goes to platform (NOT seller)
2. Platform holds money in `escrow_transactions` table
3. Seller ships item
4. Customer confirms receipt
5. Platform releases money to seller

**Implementation:**
```javascript
async function createOrder(req, res) {
  const { items, shippingAddress, totalPrice } = req.body;
  
  // Start transaction
  const client = await db.getClient();
  await client.query('BEGIN');
  
  try {
    // Create order
    const order = await client.query(`
      INSERT INTO orders (buyer_id, seller_id, total_price, payment_status)
      VALUES ($1, $2, $3, 'held_in_escrow')
      RETURNING *
    `, [buyerId, sellerId, totalPrice]);
    
    // Create escrow record
    await client.query(`
      INSERT INTO escrow_transactions (order_id, amount, status)
      VALUES ($1, $2, 'held')
    `, [order.rows[0].id, totalPrice]);
    
    await client.query('COMMIT');
    res.json({ success: true, order: order.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
}
```

### 5.2 Tracking Verification

**Protection Against Fake Tracking:**
```javascript
function validateTrackingFormat(carrier, trackingNumber) {
  const formats = {
    'jnt': /^JT\d{10,13}(PH)?$/i,
    'lbc': /^\d{12}$/,
    'lalamove': /^[A-Z0-9]{8,}$/i
  };
  
  const regex = formats[carrier.toLowerCase()];
  if (!regex) return true; // Unknown carrier, allow
  
  return regex.test(trackingNumber);
}

async function markAsShipped(req, res) {
  const { trackingNumber, carrier } = req.body;
  
  // Validate format
  if (!validateTrackingFormat(carrier, trackingNumber)) {
    return res.status(400).json({ 
      error: 'Invalid tracking number format for ' + carrier 
    });
  }
  
  // Update order
  await db.query(`
    UPDATE orders 
    SET 
      status = 'shipped',
      tracking_number = $1,
      shipping_carrier = $2,
      shipped_at = NOW(),
      auto_complete_at = NOW() + INTERVAL '7 days'
    WHERE id = $3
  `, [trackingNumber, carrier, orderId]);
  
  // Send notification
  await sendShippingEmail(order);
}
```

### 5.3 Smart Auto-Complete

**Prevents Scammer Sellers:**
```javascript
async function autoCompleteOrders() {
  const ordersToCheck = await db.query(`
    SELECT * FROM orders 
    WHERE status = 'shipped' 
    AND auto_complete_at <= NOW()
    AND completed_at IS NULL
  `);
  
  for (const order of ordersToCheck.rows) {
    // VALIDATION CHECKS
    
    // 1. Check tracking format
    if (!validateTrackingFormat(order.shipping_carrier, order.tracking_number)) {
      await flagOrder(order.id, 'Invalid tracking number format');
      continue;
    }
    
    // 2. High-value orders need proof
    if (order.total_price > 500 && !order.delivery_proof) {
      await requestDeliveryProof(order.id);
      continue;
    }
    
    // 3. New sellers need manual review
    const sellerStats = await getSellerStats(order.seller_id);
    if (sellerStats.total_orders < 5) {
      await flagForManualReview(order.id, 'New seller verification');
      continue;
    }
    
    // 4. All checks passed - complete with buffer
    await completeWithBuffer(order.id);
  }
}

async function completeWithBuffer(orderId) {
  // Don't release payment immediately
  const releaseDate = new Date();
  releaseDate.setDate(releaseDate.getDate() + 3); // 3-day buffer
  
  await db.query(`
    UPDATE orders 
    SET 
      status = 'completed',
      completed_at = NOW(),
      completion_type = 'auto',
      payment_release_date = $1,
      payment_status = 'pending_release'
    WHERE id = $2
  `, [releaseDate, orderId]);
  
  // Send final warning email
  await sendFinalWarningEmail(orderId);
}
```

### 5.4 Receipt Verification System

**Prevents "Wrong Item" Scams:**
```javascript
async function confirmReceipt(req, res) {
  const { 
    itemReceived, 
    itemAsDescribed, 
    itemCondition, 
    photos, 
    comments 
  } = req.body;
  
  // If item is NOT as described
  if (!itemAsDescribed || itemCondition === 'damaged') {
    // Require photos
    if (!photos || photos.length === 0) {
      return res.status(400).json({ 
        error: 'Photos required to file dispute' 
      });
    }
    
    // Create dispute
    await db.query(`
      INSERT INTO disputes (
        order_id,
        filed_by,
        dispute_type,
        reason,
        evidence_photos,
        customer_comments,
        status
      ) VALUES ($1, $2, 'item_not_as_described', $3, $4, $5, 'pending')
    `, [
      orderId,
      req.user.id,
      `Item condition: ${itemCondition}`,
      JSON.stringify(photos),
      comments
    ]);
    
    // Hold payment
    await db.query(`
      UPDATE orders 
      SET status = 'disputed', payment_status = 'held_pending_investigation'
      WHERE id = $1
    `, [orderId]);
    
    // Notify admin
    await notifyAdminOfDispute(orderId);
    
    return res.json({ 
      success: true, 
      message: 'Dispute filed. Admin will review within 24 hours.' 
    });
  }
  
  // Item is OK - complete order
  await completeOrder(orderId, 'manual');
  res.json({ success: true });
}
```

### 5.5 Seller Rating System

**Tracks Seller Reliability:**
```javascript
async function updateSellerStats(sellerId, action) {
  const updates = {
    'order_completed': 'completed_orders = completed_orders + 1',
    'order_cancelled': 'cancelled_orders = cancelled_orders + 1',
    'scam_report': 'scam_reports = scam_reports + 1',
    'fake_tracking': 'fake_tracking_reports = fake_tracking_reports + 1'
  };
  
  await db.query(`
    UPDATE seller_stats 
    SET 
      ${updates[action]},
      total_orders = total_orders + 1,
      rating = (completed_orders::DECIMAL / NULLIF(total_orders, 0)) * 5,
      account_status = CASE 
        WHEN scam_reports >= 3 THEN 'banned'
        WHEN scam_reports >= 2 THEN 'suspended'
        WHEN scam_reports >= 1 THEN 'warning'
        ELSE 'active'
      END,
      last_updated = NOW()
    WHERE seller_id = $1
  `, [sellerId]);
}
```

---

## 6. PROBLEM SCENARIOS & SOLUTIONS

### 6.1 Scenario: Customer Doesn't Confirm Receipt

**Problem:** Package delivered but customer doesn't click "Confirm Receipt"

**Solution:**
- Auto-complete after 7 days
- But with validation (check tracking, require proof for high-value)
- Additional 3-day buffer before releasing payment
- Total: 10 days for customer to notice issues

### 6.2 Scenario: Seller Enters Fake Tracking

**Problem:** Seller marks as "shipped" with fake tracking number

**Solution:**
- Validate tracking number format
- Customer can report fake tracking within 3 days
- System flags obviously invalid tracking
- Admin investigates before releasing payment
- Seller gets scam report and potential ban

### 6.3 Scenario: Seller Sends Wrong Item

**Problem:** Customer receives rock instead of artwork

**Solution:**
- Receipt verification with questions
- Require photo evidence if item wrong/damaged
- Automatic dispute creation
- Payment held until admin reviews
- Customer gets refund if evidence clear
- Seller gets scam report

### 6.4 Scenario: Customer Lies About Not Receiving

**Problem:** Customer received item but claims they didn't

**Solution:**
- Tracking shows "Delivered" as proof
- Seller can provide delivery receipt
- Admin reviews tracking history
- J&T/LBC tracking is third-party proof
- Customer must provide evidence for disputes

### 6.5 Scenario: Package Lost in Transit

**Problem:** Package genuinely lost by courier

**Solution:**
- Customer files dispute with tracking showing "lost"
- Admin contacts courier company
- If confirmed lost, customer gets refund
- Seller can claim insurance from courier
- Not seller's fault, no scam report

### 6.6 Scenario: Buyer and Seller Collude

**Problem:** Fake orders to boost seller rating

**Solution:**
- Track IP addresses and shipping addresses
- Flag orders with same buyer/seller repeatedly
- Require different shipping addresses
- Monitor for patterns
- Admin review for suspicious activity

### 6.7 Scenario: Seller Account Hacked

**Problem:** Hacker takes over seller account, steals payments

**Solution:**
- Escrow system prevents immediate payment
- Email notifications for all actions
- Two-factor authentication (optional)
- Withdrawal requires email confirmation
- Suspicious activity flags

---

## 7. API DOCUMENTATION

### 7.1 Cart Endpoints

**GET /api/cart**
- Get current user's cart items
- Response: `{ items: [...], total: 1000 }`

**POST /api/cart/add**
- Body: `{ itemId, quantity }`
- Response: `{ success: true, cart: {...} }`

**PUT /api/cart/:itemId**
- Body: `{ quantity }`
- Response: `{ success: true }`

**DELETE /api/cart/:itemId**
- Response: `{ success: true }`

### 7.2 Order Endpoints

**POST /api/orders/create**
- Body: `{ items, shippingAddress, totalPrice }`
- Response: `{ success: true, order: {...} }`

**GET /api/orders/buyer**
- Get all orders for current buyer
- Response: `{ orders: [...] }`

**GET /api/orders/seller**
- Get all orders for current seller
- Response: `{ orders: [...] }`

**PUT /api/orders/:orderId/ship**
- Body: `{ trackingNumber, carrier }`
- Response: `{ success: true }`

**PUT /api/orders/:orderId/confirm-receipt**
- Body: `{ itemReceived, itemAsDescribed, itemCondition, photos, comments }`
- Response: `{ success: true }` or creates dispute

### 7.3 Dispute Endpoints

**POST /api/orders/:orderId/dispute**
- Body: `{ reason, evidence, photos }`
- Response: `{ success: true, disputeId }`

**GET /api/admin/disputes**
- Get all pending disputes (admin only)
- Response: `{ disputes: [...] }`

**POST /api/admin/disputes/:id/resolve**
- Body: `{ decision: 'refund' | 'reject', adminNotes }`
- Response: `{ success: true }`

---

## 8. TESTING & VALIDATION

### 8.1 Test Cases

**Cart Functionality:**
- [ ] Add item to cart
- [ ] Update quantity
- [ ] Remove item
- [ ] Cart persists after logout/login
- [ ] Cart total calculates correctly

**Order Creation:**
- [ ] Create order from cart
- [ ] Escrow transaction created
- [ ] Cart cleared after order
- [ ] Email sent to buyer and seller
- [ ] Order appears in both dashboards

**Shipping:**
- [ ] Seller can enter tracking number
- [ ] Invalid tracking rejected
- [ ] Email sent with tracking link
- [ ] Tracking link works

**Auto-Complete:**
- [ ] Order auto-completes after 7 days
- [ ] Invalid tracking flagged
- [ ] High-value orders require proof
- [ ] New sellers flagged for review
- [ ] Payment buffer applied

**Disputes:**
- [ ] Customer can file dispute
- [ ] Photos required for "item not as described"
- [ ] Admin can review and decide
- [ ] Refund processes correctly
- [ ] Seller stats updated

**Security:**
- [ ] Escrow holds payment
- [ ] Payment only released after confirmation
- [ ] Seller can't access buyer's payment
- [ ] Disputes pause payment release
- [ ] Scam reports tracked

### 8.2 Manual Testing Checklist

1. **Happy Path:**
   - Buy item → Seller ships → Customer receives → Confirms → Payment released

2. **Fake Tracking:**
   - Seller enters invalid tracking → System rejects or flags

3. **Wrong Item:**
   - Customer receives wrong item → Files dispute with photos → Admin refunds

4. **No Confirmation:**
   - Customer doesn't confirm → Auto-completes after 7 days → Payment released

5. **Lost Package:**
   - Package lost → Customer files dispute → Admin reviews tracking → Refund

---

## 9. DEPLOYMENT CHECKLIST

### 9.1 Database Setup
- [ ] Create all tables
- [ ] Add indexes
- [ ] Set up foreign keys
- [ ] Initialize seller_stats for existing users

### 9.2 Environment Variables
```env
DATABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your_email
EMAIL_PASS=your_password
ADMIN_EMAIL=admin@museo.com
```

### 9.3 Cron Jobs
- [ ] Set up auto-complete job (daily)
- [ ] Set up payment release job (daily)
- [ ] Set up flag suspicious orders job (daily)

### 9.4 Email Templates
- [ ] Order confirmation
- [ ] Shipping notification
- [ ] Delivery notification
- [ ] Final warning (auto-complete)
- [ ] Dispute filed
- [ ] Refund processed

### 9.5 Admin Panel
- [ ] Dispute review interface
- [ ] Order management
- [ ] Seller stats dashboard
- [ ] Flagged orders list

---

## 10. TIMELINE & MILESTONES

**Week 1:** Shopping Cart + Marketplace Listing  
**Week 2:** Checkout + Order Creation + Escrow  
**Week 3:** Shipping + Tracking + Email Notifications  
**Week 4:** Receipt Verification + Disputes  
**Week 5:** Auto-Complete + Cron Jobs + Testing  
**Week 6:** Admin Panel + Final Testing + Deployment  

---

## 11. CONCLUSION

This marketplace system provides comprehensive protection for both buyers and sellers through:

1. **Escrow System** - Money held until delivery confirmed
2. **Tracking Verification** - Fake tracking detected and flagged
3. **Receipt Verification** - Photo evidence for wrong items
4. **Smart Auto-Complete** - Prevents indefinite waiting with validation
5. **Dispute Resolution** - Admin review with evidence
6. **Seller Ratings** - Track reliability and ban scammers
7. **Payment Buffer** - Extra time to report issues

The system is designed for a Philippine context using local couriers (J&T Express, LBC) and follows industry standards used by Shopee, Lazada, and other major e-commerce platforms.

**For Capstone Defense:**
This documentation demonstrates understanding of:
- E-commerce workflows
- Security best practices
- Database design
- API architecture
- Problem-solving and edge cases
- Real-world implementation

---

**Document Version:** 1.0  
**Last Updated:** November 2025  
**Status:** Ready for Implementation
