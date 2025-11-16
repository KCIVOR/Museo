# Auction API Testing Guide - Postman/Thunder Client

## ✅ UPDATED FOR REFACTORED ARCHITECTURE
- All DB queries in **auctionController.js**
- Xendit integration in **auctionService.js**
- Ready to test!

## Setup

### 1. Get Your Auth Token (Seller)
First, authenticate to get a bearer token:

```
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "seller@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "seller-user-uuid",
      "email": "seller@example.com",
      "role": "artist"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Save the token** - you'll use it in all requests:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### 2. Get Bidder Auth Token (Optional - for testing competing bids)
Create another account or login as different user to test multiple bidders:

```
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "bidder@example.com",
  "password": "password123"
}
```

**Save as BIDDER_TOKEN** for testing competing bids

---

## Test Flow (Step by Step)

### STEP 1: Create Auction Item
**Endpoint:** `POST http://localhost:3000/api/auctions/items`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Vintage Oil Painting - Sunset Landscape",
  "description": "Beautiful 1950s oil painting depicting a serene sunset over mountains. Excellent condition, professionally framed.",
  "images": [
    "https://example.com/painting1.jpg",
    "https://example.com/painting2.jpg"
  ],
  "primary_image": "https://example.com/painting1.jpg",
  "medium": "Oil on canvas",
  "dimensions": "50cm x 40cm",
  "year_created": 1950,
  "weight_kg": 2.5,
  "is_original": true,
  "is_framed": true,
  "condition": "excellent",
  "categories": ["art", "vintage", "painting"],
  "tags": ["oil", "landscape", "1950s", "framed"]
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Auction item created",
  "data": {
    "auctionItemId": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "seller-user-uuid",
    "sellerProfileId": "seller-profile-uuid",
    "title": "Vintage Oil Painting - Sunset Landscape",
    "description": "Beautiful 1950s oil painting...",
    "medium": "Oil on canvas",
    "dimensions": "50cm x 40cm",
    "year_created": 1950,
    "weight_kg": 2.5,
    "is_original": true,
    "is_framed": true,
    "condition": "excellent",
    "created_at": "2025-11-15T19:20:00Z",
    "updated_at": "2025-11-15T19:20:00Z"
  }
}
```

**⚠️ SAVE THIS:** Copy `auctionItemId` for next step

**What happens in controller:**
- ✅ Verifies seller profile exists and is active
- ✅ Validates all required fields
- ✅ Inserts into `auction_items` table
- ✅ Returns created item with auctionItemId

---

### STEP 2: Create Auction
**Endpoint:** `POST http://localhost:3000/api/auctions`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

**Body:**
```json
{
  "auctionItemId": "550e8400-e29b-41d4-a716-446655440000",
  "startPriceCentavos": 50000,
  "reservePriceCentavos": 100000,
  "minIncrementCentavos": 10000,
  "startAt": "2025-11-15T19:25:00Z",
  "endAt": "2025-11-15T20:25:00Z"
}
```

**Field Explanations:**
- `auctionItemId`: From STEP 1
- `startPriceCentavos`: 50000 = ₱500 (minimum opening bid)
- `reservePriceCentavos`: 100000 = ₱1000 (minimum winning bid)
- `minIncrementCentavos`: 10000 = ₱100 (minimum bid increase)
- `startAt`: When bidding opens (use future time for testing)
- `endAt`: When bidding closes (1 hour later for testing)

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Auction created",
  "data": {
    "auctionId": "660e8400-e29b-41d4-a716-446655440000",
    "auctionItemId": "550e8400-e29b-41d4-a716-446655440000",
    "sellerProfileId": "seller-profile-uuid",
    "startPriceCentavos": 50000,
    "reservePriceCentavos": 100000,
    "minIncrementCentavos": 10000,
    "startAt": "2025-11-15T19:25:00Z",
    "endAt": "2025-11-15T20:25:00Z",
    "status": "scheduled",
    "winnerUserId": null,
    "winningBidId": null,
    "paymentDueAt": null,
    "created_at": "2025-11-15T19:20:30Z",
    "updated_at": "2025-11-15T19:20:30Z"
  }
}
```

**⚠️ SAVE THIS:** Copy `auctionId` for next steps

**What happens in controller:**
- ✅ Verifies seller profile exists and is active
- ✅ Auto-sets status: "scheduled" (if startAt > now) or "active" (if startAt <= now)
- ✅ Validates all required fields
- ✅ Inserts into `auctions` table
- ✅ Returns created auction with auctionId

---

### STEP 3: Get Auction Details
**Endpoint:** `GET http://localhost:3000/api/auctions/660e8400-e29b-41d4-a716-446655440000`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "auctionId": "660e8400-e29b-41d4-a716-446655440000",
    "status": "scheduled",
    "startPriceCentavos": 50000,
    "reservePriceCentavos": 100000,
    "minIncrementCentavos": 10000,
    "startAt": "2025-11-15T19:25:00Z",
    "endAt": "2025-11-15T20:25:00Z",
    "participantsCount": 0
  }
}
```

**What happens in controller:**
- ✅ Queries `auctions` table for auctionId
- ✅ Counts unique bidders from `auction_bids` table
- ✅ Only shows `participantsCount` to seller/admin (blind auction principle)
- ✅ Returns auction details with conditional participant count

---

### STEP 4: Place First Bid (As Bidder)
**Endpoint:** `POST http://localhost:3000/api/auctions/660e8400-e29b-41d4-a716-446655440000/bids`

**Headers:**
```
Authorization: Bearer BIDDER_TOKEN
Content-Type: application/json
```

**Body:**
```json
{
  "amountCentavos": 75000,
  "idempotencyKey": "bid-001-user-123"
}
```

**Field Explanations:**
- `amountCentavos`: 75000 = ₱750 (must be >= startPrice of 50000)
- `idempotencyKey`: Unique key for this bid (prevents duplicate on retry)

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Bid placed successfully",
  "data": {
    "bidId": "770e8400-e29b-41d4-a716-446655440000",
    "auctionId": "660e8400-e29b-41d4-a716-446655440000",
    "bidderUserId": "bidder-uuid-1",
    "amountCentavos": 75000,
    "idempotencyKey": "bid-001-user-123",
    "created_at": "2025-11-15T19:22:00Z",
    "isWithdrawn": false
  }
}
```

**What happens in controller:**
- ✅ Checks idempotency key (returns existing bid if duplicate)
- ✅ Validates auction exists and is 'active'
- ✅ Validates bidding window is open (startAt <= now < endAt)
- ✅ Validates bid amount >= startPrice
- ✅ Inserts bid into `auction_bids` table
- ✅ Returns created bid with bidId

---

### STEP 5: Place Second Bid (Higher Amount)
**Endpoint:** `POST http://localhost:3000/api/auctions/660e8400-e29b-41d4-a716-446655440000/bids`

**Headers:**
```
Authorization: Bearer BIDDER_TOKEN
Content-Type: application/json
```

**Body:**
```json
{
  "amountCentavos": 95000,
  "idempotencyKey": "bid-002-user-123"
}
```

**Field Explanations:**
- `amountCentavos`: 95000 = ₱950 (must be > 75000 + 10000 minIncrement = 85000)
- New idempotencyKey for this new bid

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Bid placed successfully",
  "data": {
    "bidId": "880e8400-e29b-41d4-a716-446655440000",
    "auctionId": "660e8400-e29b-41d4-a716-446655440000",
    "bidderUserId": "bidder-uuid-1",
    "amountCentavos": 95000,
    "idempotencyKey": "bid-002-user-123",
    "created_at": "2025-11-15T19:23:00Z",
    "isWithdrawn": false
  }
}
```

**What happens in controller:**
- ✅ Loads user's existing bids
- ✅ Validates new bid > previous bid + minIncrement
- ✅ Validates auction still active
- ✅ Inserts new bid into `auction_bids` table
- ✅ Returns new bid (old bid still exists in DB)

---

### STEP 6: Get User's Current Bid
**Endpoint:** `GET http://localhost:3000/api/auctions/660e8400-e29b-41d4-a716-446655440000/my-bid`

**Headers:**
```
Authorization: Bearer BIDDER_TOKEN
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "amountCentavos": 95000,
    "created_at": "2025-11-15T19:23:00Z"
  }
}
```

**What happens in controller:**
- ✅ Queries `auction_bids` table for user's latest bid
- ✅ Orders by created_at DESC to get most recent
- ✅ Returns only amountCentavos and created_at (not bidId for privacy)

---

### STEP 7: List All Auctions
**Endpoint:** `GET http://localhost:3000/api/auctions?status=active&page=1&limit=20`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Query Parameters:**
- `status`: active, scheduled, ended, settled (optional)
- `page`: 1, 2, 3... (default 1)
- `limit`: 10, 20, 50... (default 20)

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "auctionId": "660e8400-e29b-41d4-a716-446655440000",
      "status": "active",
      "startPriceCentavos": 50000,
      "reservePriceCentavos": 100000,
      "minIncrementCentavos": 10000,
      "startAt": "2025-11-15T19:25:00Z",
      "endAt": "2025-11-15T20:25:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20
  }
}
```

**What happens in controller:**
- ✅ Queries `auctions` table with optional status filter
- ✅ Applies pagination (offset/limit)
- ✅ Orders by endAt ascending (soonest ending first)
- ✅ Returns paginated list of auctions

---

## Error Test Cases

### ❌ Test 1: Bid Below Starting Price
**Endpoint:** `POST http://localhost:3000/api/auctions/660e8400-e29b-41d4-a716-446655440000/bids`

**Body:**
```json
{
  "amountCentavos": 30000,
  "idempotencyKey": "bid-low"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Bid must be at least the starting price"
}
```

---

### ❌ Test 2: Bid Below Minimum Increment
**Endpoint:** `POST http://localhost:3000/api/auctions/660e8400-e29b-41d4-a716-446655440000/bids`

**Body (after placing 95000 bid):**
```json
{
  "amountCentavos": 100000,
  "idempotencyKey": "bid-low-increment"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Minimum increment is 10000 centavos"
}
```

---

### ❌ Test 3: Bid on Closed Auction
**Endpoint:** `POST http://localhost:3000/api/auctions/660e8400-e29b-41d4-a716-446655440000/bids`

(After endAt time has passed)

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Bidding window is closed"
}
```

---

### ❌ Test 4: Idempotency Test (Same Request Twice)
**First Request:**
```json
{
  "amountCentavos": 75000,
  "idempotencyKey": "bid-idempotent-001"
}
```

**Response:** 201 Created (bid created)

**Second Request (same idempotencyKey):**
```json
{
  "amountCentavos": 75000,
  "idempotencyKey": "bid-idempotent-001"
}
```

**Response:** 201 Created (same bid returned, not duplicated)

---

## Thunder Client Collection Format

If you prefer Thunder Client, here's the format:

```json
{
  "client": "Thunder Client",
  "collectionName": "Museo Auction API",
  "dateExport": "2025-11-15T19:20:00Z",
  "version": "1.1",
  "folders": [],
  "requests": [
    {
      "name": "1. Create Auction Item",
      "method": "POST",
      "url": "http://localhost:3000/api/auctions/items",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN",
        "Content-Type": "application/json"
      },
      "body": {
        "title": "Vintage Oil Painting",
        "description": "Beautiful 1950s oil painting",
        "medium": "Oil on canvas",
        "dimensions": "50cm x 40cm",
        "year_created": 1950,
        "is_original": true,
        "is_framed": true,
        "condition": "excellent"
      }
    },
    {
      "name": "2. Create Auction",
      "method": "POST",
      "url": "http://localhost:3000/api/auctions",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN",
        "Content-Type": "application/json"
      },
      "body": {
        "auctionItemId": "550e8400-e29b-41d4-a716-446655440000",
        "startPriceCentavos": 50000,
        "reservePriceCentavos": 100000,
        "minIncrementCentavos": 10000,
        "startAt": "2025-11-15T19:25:00Z",
        "endAt": "2025-11-15T20:25:00Z"
      }
    },
    {
      "name": "3. Get Auction Details",
      "method": "GET",
      "url": "http://localhost:3000/api/auctions/660e8400-e29b-41d4-a716-446655440000",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN"
      }
    },
    {
      "name": "4. Place Bid",
      "method": "POST",
      "url": "http://localhost:3000/api/auctions/660e8400-e29b-41d4-a716-446655440000/bids",
      "headers": {
        "Authorization": "Bearer BIDDER_TOKEN",
        "Content-Type": "application/json"
      },
      "body": {
        "amountCentavos": 75000,
        "idempotencyKey": "bid-001-user-123"
      }
    },
    {
      "name": "5. Get My Bid",
      "method": "GET",
      "url": "http://localhost:3000/api/auctions/660e8400-e29b-41d4-a716-446655440000/my-bid",
      "headers": {
        "Authorization": "Bearer BIDDER_TOKEN"
      }
    },
    {
      "name": "6. List Auctions",
      "method": "GET",
      "url": "http://localhost:3000/api/auctions?status=active&page=1&limit=20",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN"
      }
    }
  ]
}
```

---

## Testing Checklist

- [ ] Create auction item successfully
- [ ] Create auction successfully
- [ ] Get auction details
- [ ] Place first bid (>= startPrice)
- [ ] Place second bid (> previous + minIncrement)
- [ ] Get user's current bid
- [ ] List auctions with filters
- [ ] Test bid below starting price (should fail)
- [ ] Test bid below minimum increment (should fail)
- [ ] Test bid after auction ends (should fail)
- [ ] Test idempotency (same request twice)

---

## Tips

1. **Use Environment Variables** in Postman/Thunder Client:
   - `{{token}}` - Your auth token
   - `{{auctionId}}` - Auction ID from STEP 2
   - `{{auctionItemId}}` - Auction item ID from STEP 1

2. **Set startAt/endAt Times**:
   - For testing, use times close to now
   - Example: `2025-11-15T19:25:00Z` (5 minutes from now)
   - Example: `2025-11-15T20:25:00Z` (65 minutes from now)

3. **Multiple Bidders**:
   - Create multiple test accounts
   - Use different bearer tokens for each bidder
   - Place competing bids to test winner selection

4. **Check Logs**:
   - Monitor backend console for validation messages
   - Look for error details in response body

---

## Common Issues

**Issue:** "Auction not found"
- **Solution:** Check auctionId is correct and copied fully

**Issue:** "Bidding window is closed"
- **Solution:** Make sure startAt <= now < endAt

**Issue:** "Auction is not active"
- **Solution:** Auction status must be 'active' (not 'scheduled' or 'ended')

**Issue:** "Unauthorized"
- **Solution:** Check bearer token is valid and not expired

**Issue:** "Minimum increment is X centavos"
- **Solution:** Increase bid by at least X centavos + minIncrement

---

## 🆕 FRESH TEST - Lower Reserve Price

### Complete Flow with Winner

#### STEP 1: Create Auction Item (Fresh)
```
POST http://localhost:3000/api/auctions/items
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "title": "Modern Art Sculpture",
  "description": "Contemporary sculpture piece",
  "images": ["https://example.com/sculpture.jpg"],
  "primary_image": "https://example.com/sculpture.jpg",
  "medium": "Bronze",
  "dimensions": "30cm x 20cm",
  "year_created": 2024,
  "weight_kg": 5.0,
  "is_original": true,
  "is_framed": false,
  "condition": "excellent",
  "categories": ["sculpture"],
  "tags": ["modern", "bronze"]
}
```

**Save:** `auctionItemId`

#### STEP 2: Create Auction with LOW Reserve
```
POST http://localhost:3000/api/auctions
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "auctionItemId": "YOUR_ITEM_ID",
  "startPrice": 1.00,
  "reservePrice": 5.00,
  "minIncrement": 0.50,
  "startAt": "2025-11-15T14:20:00Z",
  "endAt": "2025-11-15T14:25:00Z"
}
```

**⚠️ IMPORTANT - USE UTC TIMES (Convert from Manila +08:00)!**

Current Manila time: **22:20:43 +08:00**
Current UTC time: **14:20:43Z**

**Conversion formula:**
- Manila time - 8 hours = UTC time
- Example: 22:20 Manila = 14:20 UTC

**Key differences (in PESOS):**
- ✅ `startPrice`: 1.00 (₱1.00)
- ✅ `reservePrice`: 5.00 (₱5.00) - **LOWER!**
- ✅ `minIncrement`: 0.50 (₱0.50)
- ✅ `startAt`: **14:20:00Z** (in the past - auction active now)
- ✅ `endAt`: **14:25:00Z** (5 minutes from now)

**Save:** `auctionId`

#### STEP 3: Place Bid 1
```
POST http://localhost:3000/api/auctions/{auctionId}/bids
Authorization: Bearer BIDDER_TOKEN
Content-Type: application/json

{
  "amount": 2.00,
  "idempotencyKey": "test-bid-001"
}
```

**Expected:** ✅ Success (₱2.00 > ₱1.00 start price!)

#### STEP 4: Place Bid 2
```
POST http://localhost:3000/api/auctions/{auctionId}/bids
Authorization: Bearer BIDDER_TOKEN
Content-Type: application/json

{
  "amount": 6.00,
  "idempotencyKey": "test-bid-002"
}
```

**Expected:** ✅ Success (₱6.00 > ₱5.00 reserve!)

#### STEP 5: Wait for Auction to End
Current UTC time: **14:20:43Z**
Auction ends at: **14:25:00Z**

#### STEP 6: Trigger Cron Job
```
POST http://localhost:3000/api/cron/close-auctions
Content-Type: application/json
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Cron job executed successfully"
}
```

**Console should show:**
```
✅ Closed auction {auctionId}, winner: {bidder-uuid}, amount: 55000
✅ Settled auction {auctionId}, order: {orderId}
```

#### STEP 7: Verify Auction Closed
```
GET http://localhost:3000/api/auctions/{auctionId}
Authorization: Bearer YOUR_TOKEN
```

**Response should show:**
```json
{
  "success": true,
  "data": {
    "auctionId": "...",
    "status": "settled",
    "winnerUserId": "bidder-uuid",
    "winningBidId": "...",
    "participantsCount": 1
  }
}
```

#### STEP 8: Check Order Created
```sql
SELECT * FROM orders 
WHERE auctionId = 'your-auction-id'
LIMIT 1;
```

**Expected:**
```
orderId: auto-generated
auctionId: your-auction-id
buyerId: bidder-uuid
sellerId: seller-uuid
totalAmountCentavos: 55000
status: pending_payment
paymentStatus: pending
paymentDueAt: NOW() + 24 hours
```

---

## ✅ Why This Works

| Field | Value | Reason |
|-------|-------|--------|
| Start Price | 30000 | Opening bid threshold |
| Reserve Price | **50000** | **LOWER - easier to meet** |
| Highest Bid | 55000 | **EXCEEDS reserve** ✅ |
| Result | **WINNER** | Reserve met = Winner determined |

---

## 🎯 Test Summary

**Before (Failed):**
- Reserve: 100000
- Highest bid: 87000
- Result: ❌ No winner

**Now (Success):**
- Reserve: 50000
- Highest bid: 55000
- Result: ✅ Winner + Order Created
