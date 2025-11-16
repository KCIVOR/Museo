# Auction API - Quick Reference Card

## Base URL
```
http://localhost:3000/api/auctions
```

## Authentication
All requests require:
```
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

---

## Endpoints Summary

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/items` | Create auction item | ✅ Seller |
| POST | `/` | Create auction | ✅ Seller |
| GET | `/` | List auctions | ✅ Any |
| GET | `/:auctionId` | Get auction details | ✅ Any |
| GET | `/:auctionId/my-bid` | Get user's bid | ✅ Bidder |
| POST | `/:auctionId/bids` | Place bid | ✅ Bidder |

---

## 1️⃣ Create Auction Item

```bash
POST /items
```

**Request:**
```json
{
  "title": "Vintage Painting",
  "description": "Oil painting from 1950s",
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
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "auctionItemId": "uuid",
    ...
  }
}
```

---

## 2️⃣ Create Auction

```bash
POST /
```

**Request:**
```json
{
  "auctionItemId": "uuid-from-step-1",
  "startPriceCentavos": 50000,
  "reservePriceCentavos": 100000,
  "minIncrementCentavos": 10000,
  "startAt": "2025-11-15T19:25:00Z",
  "endAt": "2025-11-15T20:25:00Z"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "auctionId": "uuid",
    "status": "scheduled",
    ...
  }
}
```

---

## 3️⃣ List Auctions

```bash
GET /?status=active&page=1&limit=20
```

**Query Params:**
- `status`: active, scheduled, ended, settled (optional)
- `page`: 1, 2, 3... (default 1)
- `limit`: 10, 20, 50... (default 20)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [...],
  "pagination": { "page": 1, "limit": 20 }
}
```

---

## 4️⃣ Get Auction Details

```bash
GET /:auctionId
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "auctionId": "uuid",
    "status": "active",
    "startPriceCentavos": 50000,
    "reservePriceCentavos": 100000,
    "minIncrementCentavos": 10000,
    "startAt": "2025-11-15T19:25:00Z",
    "endAt": "2025-11-15T20:25:00Z",
    "participantsCount": 5
  }
}
```

---

## 5️⃣ Place Bid

```bash
POST /:auctionId/bids
```

**Request:**
```json
{
  "amountCentavos": 75000,
  "idempotencyKey": "unique-key-123"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "bidId": "uuid",
    "auctionId": "uuid",
    "bidderUserId": "uuid",
    "amountCentavos": 75000,
    "created_at": "2025-11-15T19:22:00Z"
  }
}
```

---

## 6️⃣ Get My Bid

```bash
GET /:auctionId/my-bid
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "amountCentavos": 75000,
    "created_at": "2025-11-15T19:22:00Z"
  }
}
```

---

## Validation Rules

### First Bid
```
amountCentavos >= auction.startPriceCentavos
```

### Subsequent Bids
```
amountCentavos > userPreviousBid + auction.minIncrementCentavos
```

### Auction Status
```
Must be 'active' (not scheduled, ended, or settled)
```

### Bidding Window
```
startAt <= now < endAt
```

---

## Currency Conversion

| Centavos | Pesos |
|----------|-------|
| 1 | ₱0.01 |
| 100 | ₱1.00 |
| 1,000 | ₱10.00 |
| 10,000 | ₱100.00 |
| 50,000 | ₱500.00 |
| 100,000 | ₱1,000.00 |

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Bid must be at least the starting price"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Must be an active seller"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Auction not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Error message"
}
```

---

## Status Values

| Status | Meaning |
|--------|---------|
| `draft` | Not yet published |
| `scheduled` | Waiting for startAt time |
| `active` | Bidding is open |
| `ended` | Bidding closed, winner determined |
| `settled` | Order created, payment link generated |
| `cancelled` | Seller cancelled auction |

---

## Postman/Thunder Client Setup

### 1. Create Environment
```json
{
  "baseUrl": "http://localhost:3000/api/auctions",
  "token": "YOUR_BEARER_TOKEN",
  "auctionId": "uuid-from-step-2",
  "auctionItemId": "uuid-from-step-1"
}
```

### 2. Use Variables in Requests
```
Authorization: Bearer {{token}}
GET {{baseUrl}}/{{auctionId}}
```

### 3. Save Response Values
After creating auction, save auctionId:
```
Tests tab:
var jsonData = pm.response.json();
pm.environment.set("auctionId", jsonData.data.auctionId);
```

---

## Testing Workflow

```
1. Create Auction Item
   ↓ Save auctionItemId
2. Create Auction
   ↓ Save auctionId
3. Get Auction Details
   ↓ Verify status
4. Place Bid (as Bidder 1)
   ↓ Save bidId
5. Place Higher Bid (as Bidder 2)
   ↓ Verify minimum increment
6. Get My Bid
   ↓ Verify current bid
7. List Auctions
   ↓ Verify auction appears
8. Test Error Cases
   ↓ Verify validations work
```

---

## Example: Complete Test Sequence

### Step 1: Login (Get Token)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seller@example.com",
    "password": "password123"
  }'
```

### Step 2: Create Item
```bash
curl -X POST http://localhost:3000/api/auctions/items \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Vintage Painting",
    "medium": "Oil on canvas",
    "year_created": 1950,
    "condition": "excellent"
  }'
```

### Step 3: Create Auction
```bash
curl -X POST http://localhost:3000/api/auctions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "auctionItemId": "ITEM_ID_FROM_STEP_2",
    "startPriceCentavos": 50000,
    "reservePriceCentavos": 100000,
    "minIncrementCentavos": 10000,
    "startAt": "2025-11-15T19:25:00Z",
    "endAt": "2025-11-15T20:25:00Z"
  }'
```

### Step 4: Place Bid
```bash
curl -X POST http://localhost:3000/api/auctions/AUCTION_ID/bids \
  -H "Authorization: Bearer BIDDER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amountCentavos": 75000,
    "idempotencyKey": "bid-001"
  }'
```

---

## Tips & Tricks

✅ **Use Postman Pre-request Scripts** to set timestamps:
```javascript
var now = new Date();
var startAt = new Date(now.getTime() + 5*60000);  // 5 min from now
var endAt = new Date(now.getTime() + 65*60000);   // 65 min from now

pm.environment.set("startAt", startAt.toISOString());
pm.environment.set("endAt", endAt.toISOString());
```

✅ **Use Postman Tests** to validate responses:
```javascript
pm.test("Status code is 201", function() {
  pm.response.to.have.status(201);
});

pm.test("Response has auctionId", function() {
  var jsonData = pm.response.json();
  pm.expect(jsonData.data.auctionId).to.exist;
});
```

✅ **Chain Requests** - Save IDs from one request to use in next:
```javascript
var jsonData = pm.response.json();
pm.environment.set("auctionId", jsonData.data.auctionId);
```

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| "Auction not found" | Check auctionId is correct |
| "Bidding window is closed" | Ensure startAt <= now < endAt |
| "Auction is not active" | Status must be 'active' |
| "Unauthorized" | Check bearer token is valid |
| "Must be at least starting price" | Increase bid amount |
| "Minimum increment is X" | Increase bid by at least X centavos |
