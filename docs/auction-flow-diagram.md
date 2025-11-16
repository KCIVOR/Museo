# Blind Auction System - Complete Flow Diagram

## Overview
First-price sealed-bid auction system with automated settlement and payment processing.

---

## 1️⃣ SELLER CREATES AUCTION ITEM
```
POST /api/auctions/items
├─ Seller uploads item details
├─ Stores in auction_items table
│  ├─ userId (seller's user ID)
│  ├─ sellerProfileId (seller's profile)
│  ├─ title, description, images
│  ├─ medium, dimensions, year_created
│  ├─ is_original, is_framed, condition
│  └─ categories, tags
└─ Returns: auctionItemId (UUID)
```

---

## 2️⃣ SELLER CREATES AUCTION
```
POST /api/auctions
├─ Seller links to auction_item via auctionItemId
├─ Sets auction parameters:
│  ├─ startPrice (minimum opening bid in pesos)
│  ├─ reservePrice (minimum winning bid in pesos)
│  ├─ minIncrement (minimum bid increase in pesos)
│  ├─ startAt (when bidding opens)
│  ├─ endAt (when bidding closes)
│  ├─ allowBidUpdates (can bidders update bids?)
│  └─ singleBidOnly (only one bid per user?)
├─ Status auto-set:
│  ├─ 'scheduled' if startAt > now
│  └─ 'active' if startAt <= now
└─ Returns: auctionId (UUID)
```

---

## 3️⃣ BIDDER SELECTS SHIPPING ADDRESS (NEW)
```
GET /marketplace/addresses
├─ Bidder retrieves their saved addresses
└─ Returns: list of userAddressId + address details

POST /marketplace/addresses
├─ Bidder creates new address if needed
├─ Stores in user_addresses table:
│  ├─ userAddressId (UUID)
│  ├─ userId (FK)
│  ├─ fullName, email, phoneNumber
│  ├─ addressLine1, addressLine2, landmark
│  ├─ regionName, provinceName, cityMunicipalityName, barangayName
│  ├─ postalCode, addressType, isDefault
│  └─ deliveryInstructions
└─ Returns: userAddressId (to be used in bid)
```

---

## 4️⃣ BIDDERS PLACE SEALED BIDS (WITH ADDRESS)
```
POST /api/auctions/:auctionId/bids
├─ Bidder submits:
│  ├─ amount (sealed bid amount)
│  ├─ userAddressId (shipping address for if they win)
│  └─ idempotencyKey (optional, for retry safety)
├─ System validates:
│  ├─ Auction exists and status='active'
│  ├─ Bidding window open: startAt <= now < endAt
│  ├─ First bid >= startPrice
│  ├─ Subsequent bids > previous bid + minIncrement
│  ├─ userAddressId belongs to bidder (ownership check)
│  ├─ Respects auction policies
│  └─ Idempotency check (prevents duplicate bids)
├─ Stores in auction_bids table:
│  ├─ bidId (UUID)
│  ├─ auctionId (FK)
│  ├─ bidderUserId (FK to auth.users)
│  ├─ amount (sealed - hidden from other bidders)
│  ├─ userAddressId (FK to user_addresses) ✅ NEW
│  ├─ idempotencyKey (for retry safety)
│  └─ created_at (for tie-breaking)
└─ Returns: bid object with userAddressId
```

### Bid Validation Rules
```
FIRST BID:
  amount >= auction.startPrice

SUBSEQUENT BIDS:
  amount > userPreviousBid + auction.minIncrement

POLICIES:
  if singleBidOnly=true:
    - User can only place ONE bid total
  
  if allowBidUpdates=false:
    - User cannot update/replace their bid
```

---

## 5️⃣ AUCTION ENDS (CRON JOB - Every 5 minutes)
```
closeAuction(auctionId)
├─ Triggered when: endAt time passes
├─ Load all sealed bids for auction
├─ Determine winner:
│  ├─ Highest bid amount
│  └─ Tie-breaker: earliest timestamp wins
├─ Check reserve price:
│  ├─ If no winner OR winner.bid < reservePrice:
│  │  └─ Auction FAILS → status='ended', winner=null
│  └─ If winner.bid >= reservePrice:
│     └─ Auction SUCCEEDS → status='ended'
├─ Set payment deadline:
│  └─ paymentDueAt = now + 24 hours (configurable)
└─ Returns: auction object + winner
```

### Winner Selection Algorithm
```
1. Get all non-withdrawn bids
2. For each bidder, select their highest bid
3. Among all bidders' highest bids, select the maximum
4. If tie (same amount), earliest timestamp wins
5. Return winner with bidId and amount (in pesos)
```

---

## 6️⃣ SETTLEMENT & PAYMENT LINK (CRON JOB - Every 5 minutes)
```
settleAuction(auctionId)
├─ Triggered when: auction.status='ended' and winner exists
├─ Load winner details + winning bid
├─ FETCH WINNER'S ADDRESS ✅ NEW
│  └─ From auction_bids.userAddressId → user_addresses table
│     ├─ fullName, email, phoneNumber
│     ├─ addressLine1, addressLine2, landmark
│     ├─ regionName, provinceName, cityMunicipalityName, barangayName
│     ├─ postalCode, addressType, deliveryInstructions
│     └─ Used to populate orders.shippingAddress
├─ Calculate payout:
│  ├─ subtotal = winningBid.amount (in pesos)
│  ├─ platformFee = subtotal * 0.04 (4%)
│  └─ artistEarnings = subtotal - platformFee (96%)
├─ STEP 1: Create order (WITH ADDRESS)
│  └─ orders table:
│     ├─ userId (winner)
│     ├─ sellerProfileId (seller)
│     ├─ is_auction=true
│     ├─ auctionId (FK)
│     ├─ status='pending'
│     ├─ paymentStatus='pending'
│     ├─ subtotal, platformFee, totalAmount
│     ├─ shippingAddress: { fullName, email, phone, address... } ✅ NEW
│     ├─ contactInfo: { email, phone } ✅ NEW
│     └─ shippingMethod='standard'
├─ STEP 2: Create order item
│  └─ order_items table:
│     ├─ orderId (FK)
│     ├─ auctionItemId (FK)
│     ├─ priceAtPurchase (subtotal)
│     ├─ platformFeeAmount
│     └─ artistEarnings
├─ STEP 3: Create payment link (Xendit)
│  └─ Xendit invoice:
│     ├─ amount (subtotal in pesos)
│     ├─ description
│     └─ metadata (orderId, userId, auctionId)
├─ STEP 4: Update order with payment link
│  └─ orders table:
│     ├─ paymentLinkId
│     ├─ paymentReference
│     ├─ paymentProvider='xendit'
│     └─ paymentMethodUsed='xendit_invoice'
├─ STEP 5: Update auction status
│  └─ auctions table:
│     ├─ status='settled'
│     └─ settlementOrderId (FK to orders)
└─ Returns: order object + payment link
```

---

## 7️⃣ WINNER PAYS (EXTERNAL - Xendit)
```
Winner receives payment link via email/notification
├─ Email includes:
│  ├─ Winning bid amount
│  ├─ Shipping address (pre-filled from their bid selection) ✅ NEW
│  └─ Payment link
├─ Clicks link → Xendit payment page
├─ Selects payment method (credit card, e-wallet, bank transfer)
├─ Completes payment
└─ Xendit webhook notifies backend:
   ├─ Order status: 'pending' → 'paid'
   ├─ Payment status: 'pending' → 'completed'
   ├─ Seller receives payout:
   │  └─ artistEarnings (96% of winning bid)
   └─ Platform keeps: platformFee (4% of winning bid)
```

---

## 8️⃣ PAYMENT FAILURE HANDLING
```
If winner doesn't pay within paymentDueAt:
├─ Order marked as 'failed'
├─ Payment status: 'pending' → 'failed'
└─ Future: Re-settle with next highest bidder
   (Currently manual - to be automated)
```

---

## Database Schema

### auction_items
```sql
auctionItemId (PK, UUID)
userId (FK → auth.users)
sellerProfileId (FK → sellerProfiles)
title (TEXT)
description (TEXT)
images (JSONB)
primary_image (TEXT)
medium (VARCHAR)
dimensions (VARCHAR)
year_created (INT)
weight_kg (NUMERIC)
is_original (BOOLEAN)
is_framed (BOOLEAN)
condition (VARCHAR)
categories (JSONB)
tags (JSONB)
created_at (TIMESTAMPTZ)
updated_at (TIMESTAMPTZ)
```

### auctions
```sql
auctionId (PK, UUID)
auctionItemId (FK → auction_items)
sellerProfileId (FK → sellerProfiles)
startPrice (NUMERIC, in pesos)
reservePrice (NUMERIC, nullable, in pesos)
minIncrement (NUMERIC, default 0, in pesos)
startAt (TIMESTAMPTZ)
endAt (TIMESTAMPTZ)
status (TEXT: draft|scheduled|active|ended|settled|cancelled)
winnerUserId (FK → auth.users, nullable)
winningBidId (FK → auction_bids, nullable)
paymentDueAt (TIMESTAMPTZ, nullable)
settlementOrderId (FK → orders, nullable)
requiresDeposit (BOOLEAN, default false)
depositAmount (NUMERIC, default 0, in pesos)
allowBidUpdates (BOOLEAN, default true)
singleBidOnly (BOOLEAN, default false)
created_at (TIMESTAMPTZ)
updated_at (TIMESTAMPTZ)
```

### auction_bids
```sql
bidId (PK, UUID)
auctionId (FK → auctions)
bidderUserId (FK → auth.users)
amount (NUMERIC, in pesos)
userAddressId (FK → user_addresses, nullable) ✅ NEW
idempotencyKey (TEXT, nullable)
created_at (TIMESTAMPTZ)
isWithdrawn (BOOLEAN, default false)
```

### orders (augmented)
```sql
is_auction (BOOLEAN, default false)
auctionId (FK → auctions, nullable)
```

---

## API Endpoints

### Create Auction Item
```
POST /api/auctions/items
Authorization: Bearer token
Content-Type: application/json

{
  "title": "Vintage Painting",
  "description": "Beautiful oil painting from 1950s",
  "images": ["url1", "url2"],
  "primary_image": "url1",
  "medium": "Oil on canvas",
  "dimensions": "50cm x 40cm",
  "year_created": 1950,
  "weight_kg": 2.5,
  "is_original": true,
  "is_framed": true,
  "condition": "excellent",
  "categories": ["art", "vintage"],
  "tags": ["painting", "oil"]
}

Response: 201 Created
{
  "success": true,
  "message": "Auction item created",
  "data": {
    "auctionItemId": "uuid",
    "userId": "seller-uuid",
    "sellerProfileId": "seller-profile-uuid",
    ...
  }
}
```

### Create Auction
```
POST /api/auctions
Authorization: Bearer token
Content-Type: application/json

{
  "auctionItemId": "uuid",
  "startPrice": 500,                // ₱500
  "reservePrice": 1000,             // ₱1000
  "minIncrement": 100,              // ₱100
  "startAt": "2025-11-16T10:00:00Z",
  "endAt": "2025-11-17T10:00:00Z"
}

Response: 201 Created
{
  "success": true,
  "message": "Auction created",
  "data": {
    "auctionId": "uuid",
    "status": "scheduled",
    ...
  }
}
```

### Place Bid (WITH ADDRESS)
```
POST /api/auctions/:auctionId/bids
Authorization: Bearer token
Content-Type: application/json

{
  "amount": 1500,                   // Bid amount in pesos
  "userAddressId": "addr-uuid",     // ✅ NEW: Shipping address if they win
  "idempotencyKey": "unique-key"    // Optional, for retry safety
}

Response: 201 Created
{
  "success": true,
  "message": "Bid placed successfully",
  "data": {
    "bidId": "uuid",
    "auctionId": "uuid",
    "bidderUserId": "user-uuid",
    "amount": 1500,
    "userAddressId": "addr-uuid",   // ✅ NEW
    "created_at": "2025-11-16T12:30:00Z"
  }
}
```

### Get Auction Details
```
GET /api/auctions/:auctionId
Authorization: Bearer token

Response: 200 OK
{
  "success": true,
  "data": {
    "auctionId": "uuid",
    "status": "active",
    "startPrice": 500,
    "reservePrice": 1000,
    "minIncrement": 100,
    "startAt": "2025-11-16T10:00:00Z",
    "endAt": "2025-11-17T10:00:00Z",
    "participantsCount": 5  // Only shown to seller/admin
  }
}
```

### Get User's Bid
```
GET /api/auctions/:auctionId/my-bid
Authorization: Bearer token

Response: 200 OK
{
  "success": true,
  "data": {
    "amount": 1500,
    "created_at": "2025-11-16T12:30:00Z"
  }
}
```

### Get User Addresses (NEW)
```
GET /marketplace/addresses
Authorization: Bearer token

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "userAddressId": "addr-uuid-111",
      "fullName": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "09123456789",
      "addressLine1": "123 Makati Avenue",
      "cityMunicipalityName": "Makati",
      "postalCode": "1226",
      "isDefault": true,
      ...
    }
  ]
}
```

### Create User Address (NEW)
```
POST /marketplace/addresses
Authorization: Bearer token
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "09123456789",
  "alternatePhone": "09987654321",
  "addressLine1": "123 Makati Avenue",
  "addressLine2": "Unit 2001",
  "landmark": "Near Greenbelt",
  "regionCode": "NCR",
  "provinceCode": "MM",
  "cityMunicipalityCode": "133914000",
  "barangayCode": "133914001",
  "regionName": "National Capital Region",
  "provinceName": "Metro Manila",
  "cityMunicipalityName": "Makati",
  "barangayName": "Barangay 1",
  "postalCode": "1226",
  "addressType": "residential",
  "isDefault": true,
  "deliveryInstructions": "Leave at security"
}

Response: 201 Created
{
  "success": true,
  "message": "Address created successfully",
  "data": {
    "userAddressId": "addr-uuid-111",
    ...
  }
}
```

---

## Status Flow Diagram

```
SELLER PERSPECTIVE:
  Create Item → Create Auction → Wait for Bids → Auction Ends → Payment Received → Payout

AUCTION STATUS FLOW:
  draft → scheduled → active → ended → settled
                                 ↓
                            (reserve not met)
                                 ↓
                              failed

BIDDER PERSPECTIVE:
  Browse Auctions → Select Address → Place Bid → Wait for Result → Win/Lose → Pay (if winner)
                                ✅ NEW

ORDER STATUS FLOW (after settlement):
  pending → paid → completed
    ↓
  failed (if no payment within 24h)
  
  Note: shippingAddress pre-filled from bidder's selected address ✅ NEW
```

---

## Key Features

✅ **Blind Auction**: Bids sealed until auction ends (amounts hidden from other bidders)
✅ **First-Price**: Winner pays their sealed bid amount
✅ **Reserve Price**: Auction fails if highest bid < reserve
✅ **Minimum Increment**: Enforced bid increases
✅ **Idempotency**: Network retries won't create duplicate bids
✅ **Automated Settlement**: Cron job handles closing and payment link generation
✅ **Secure Payment**: Xendit integration for payment processing
✅ **Privacy**: Participant count hidden from bidders
✅ **Tie-Breaking**: Earliest highest bid wins on amount tie
✅ **Rollback Safety**: Failed payment link creation rolls back order
✅ **Address Integration** (NEW): Bidders select shipping address before bidding
✅ **Pre-filled Orders** (NEW): Winner's address auto-populated in order upon settlement
✅ **Address Management** (NEW): CRUD endpoints for user addresses

---

## Configuration

```javascript
// Environment variables
AUCTION_PAYMENT_WINDOW_HOURS=24  // Payment deadline (default 24 hours)
XENDIT_API_KEY=your_key
XENDIT_API_URL=https://api.xendit.co
```

---

## Future Enhancements

- [ ] Deposit requirement for bidders
- [ ] Automatic rollover to next highest bidder if winner doesn't pay
- [ ] Auction extensions on last-minute bids (anti-sniping)
- [ ] Bid history visibility (after auction ends)
- [ ] Auction cancellation by seller
- [ ] Bid withdrawal (with penalties)
- [ ] Auction analytics dashboard
- [ ] Email/SMS notifications at key milestones
