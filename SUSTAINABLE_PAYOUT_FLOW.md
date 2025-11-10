# 💰 Sustainable Payout Flow for Museo

## Artist-First Philosophy

**Problem**: Artists wait weeks and lose 20-30% to fees on other platforms  
**Solution**: Fast payouts (24-72 hours) with fair fees (4%)

---

## The Complete Flow

### 1️⃣ **Order Placed**
```
Buyer → Selects artwork → Adds to cart → Checkout
```

**API Endpoint:**
```http
POST /api/marketplace/checkout
```

**Request Body:**
```json
{
  "items": [
    {
      "marketItemId": "uuid",
      "quantity": 1,
      "sellerId": "uuid"
    }
  ],
  "shippingAddress": { ... }
}
```

**What happens:**
- Creates order(s) in database with status: `pending`
- Generates Xendit payment link via `xenditService.createPaymentLink()`
- Returns payment URL to frontend
- Buyer redirected to Xendit payment page

**Purpose:** Initiate purchase and create payment link for buyer

---

### 2️⃣ **Payment Completed**
```
Buyer pays → Xendit webhook → Order status: `paid`
```

**API Endpoint (Webhook):**
```http
POST /api/webhooks/xendit
```

**Webhook Payload (from Xendit):**
```json
{
  "id": "invoice_id",
  "external_id": "MUSEO_timestamp_random",
  "status": "PAID",
  "amount": 1000,
  "paid_amount": 1000,
  "payment_method": "GCASH"
}
```

**Controller:** `webhookController.handleXenditWebhook()`

**What happens:**
1. Webhook received from Xendit
2. Finds order by `paymentReference` or `paymentGroupId`
3. Updates order: `paymentStatus = 'paid'`, `status = 'processing'`
4. Records payment details (method, reference, etc.)
5. Seller notified: "You have a new order!"

**Purpose:** Confirm payment received and activate order for fulfillment

---

### 3️⃣ **Order Fulfilled**
```
Seller → Packs item → Ships → Updates tracking
```

**API Endpoint:**
```http
PUT /api/marketplace/seller/orders/:orderId/ship
```

**Request Body:**
```json
{
  "trackingNumber": "SPX123456789",
  "shippingProvider": "J&T Express"
}
```

**Controller:** `marketplaceController.updateOrderStatus()`

**What happens:**
- Updates order status: `shipped`
- Records `shippedAt` timestamp
- Adds tracking information
- Buyer notified via email/SMS

**Purpose:** Track order fulfillment and keep buyer informed

---

### 4️⃣ **Order Delivered** ⭐ (PAYOUT CREATED)
```
Order delivered → Payout created → Escrow starts
```

**API Endpoint:**
```http
PUT /api/marketplace/seller/orders/:orderId/deliver
```

**Request Body:**
```json
{
  "status": "delivered"
}
```

**Controller:** `marketplaceController.updateOrderStatus()`

**What happens:**
1. Updates order status: `delivered`
2. Records `deliveredAt` timestamp
3. **Triggers payout creation** via `payoutService.createPayout(orderId)`
4. Payout record created in `seller_payouts` table:
   ```javascript
   {
     orderId: "uuid",
     sellerProfileId: "uuid",
     amount: 1000,        // Gross amount
     platformFee: 40,     // 4% fee
     netAmount: 960,      // What seller gets
     status: 'pending',   // In escrow
     payoutType: 'standard',
     readyDate: '2025-11-12T00:00:00Z'  // +24-72 hours
   }
   ```

**Escrow Period (Smart):**
- ✅ **First sale**: 3 days (extra safety)
- ✅ **High value (>₱5,000)**: 2 days (review period)
- ✅ **Regular orders**: 24 hours (fast!)

**Service Function:** `payoutService.createPayout(orderId)`

**Purpose:** Create payout record with escrow protection for buyer disputes

**Why escrow?**
- Protects buyers (can dispute if damaged)
- Protects sellers (money guaranteed after period)
- Protects platform (fraud prevention)

---

### 5️⃣ **Escrow Period Ends**
```
24-72 hours pass → Payout status: 'ready'
```

**No API call needed** - This happens automatically!

**How it works:**
When seller checks balance, the system runs:

**API Endpoint:**
```http
GET /api/payouts/balance
```

**Controller:** `payoutController.getSellerBalance()`

**Service Function:** `payoutService.getSellerBalance(sellerProfileId)`

**What happens:**
1. Fetches all payouts for seller
2. Checks if `readyDate` has passed
3. Auto-updates `status: 'pending'` → `'ready'`
4. Returns available balance

**Response:**
```json
{
  "success": true,
  "data": {
    "available": 960,
    "pending": 0,
    "totalPaidOut": 5000,
    "canWithdraw": true,
    "readyPayouts": [
      {
        "payoutId": "uuid",
        "amount": 960,
        "readyDate": "2025-11-12T00:00:00Z"
      }
    ]
  }
}
```

**Purpose:** Automatically release funds after escrow period without manual intervention

---

### 6️⃣ **Seller Withdraws** 💸
```
Seller → Dashboard → "Withdraw" → Money sent
```

**API Endpoint:**
```http
POST /api/payouts/withdraw
```

**Request Body:**
```json
{}  // No body needed, uses authenticated user
```

**Controller:** `payoutController.withdrawBalance()`

**Service Function:** `payoutService.withdrawBalance(sellerProfileId)`

**What happens:**

**Step 1: Validation**
```javascript
1. Get seller profile and payment method
2. Check if balance >= ₱100 (minimum)
3. Check if payment method is set (GCash/Bank)
4. Get all 'ready' payouts
```

**Step 2: Calculate Total**
```javascript
Sum all ready payouts:
  Payout 1: ₱960
  Payout 2: ₱1,440
  Total: ₱2,400
```

**Step 3: Process Withdrawal**

**Option A: Demo Mode** (Current - for testing)
```javascript
// Simulated withdrawal
- Updates all payouts to 'paid'
- Records paidDate
- Returns success with demo reference
```

**Option B: Production Mode** (Real money)
```javascript
// Via payoutGatewayService.processPayout()
1. Calls Xendit Disbursements API
2. Sends money to seller's GCash/Bank
3. Gets transaction reference
4. Updates payouts to 'paid'
5. Records Xendit reference
```

**Response:**
```json
{
  "success": true,
  "message": "Withdrawal of ₱2,400 has been processed",
  "data": {
    "amount": 2400,
    "payoutCount": 2,
    "reference": "DEMO_1699876543210",
    "paymentMethod": "gcash",
    "mode": "demo"
  }
}
```

**Purpose:** Transfer accumulated earnings to seller's payment account

**Xendit API Call (Production):**
```http
POST https://api.xendit.co/disbursements
Authorization: Basic {api_key}

{
  "external_id": "MUSEO_PAYOUT_timestamp",
  "amount": 2400,
  "bank_code": "GCASH",
  "account_holder_name": "Juan Dela Cruz",
  "account_number": "09171234567",
  "description": "Museo seller payout"
}
```

---

## Visual Timeline

```
Day 0: Order placed & paid
       ↓
Day 0: Seller ships
       ↓
Day 2: Order delivered
       ↓ [PAYOUT CREATED - ESCROW STARTS]
       ↓
Day 3: Escrow ends (24h later)
       ↓ [MONEY AVAILABLE]
       ↓
Day 3: Seller withdraws
       ↓
Day 3: Money in GCash! 💰
```

**Total time: 3 days** (vs competitors: 7-30 days)

---

## Fee Breakdown (Transparent)

### Example: ₱1,000 artwork sold

**Buyer pays:**
```
Artwork price: ₱1,000
Xendit fee: ₱39 (2.9% + ₱10)
Total charged: ₱1,039
```

**Platform receives:**
```
From Xendit: ₱1,000
```

**Seller receives:**
```
Gross sale: ₱1,000
Platform fee (4%): -₱40
Net payout: ₱960
```

**Platform costs:**
```
Revenue: ₱40
Xendit payout fee: -₱20
Server costs: -₱5
Net profit: ₱15 (1.5%)
```

**Sustainable?** Yes, barely. But prioritizes artists over profit.

---

## Safety Features

### 1. Escrow Protection
- ✅ Buyers can dispute within escrow period
- ✅ Sellers guaranteed payment after escrow
- ✅ Platform mediates disputes

### 2. Fraud Prevention
```javascript
First sale → 3 day hold
High value → 2 day hold
Suspicious pattern → Manual review
Multiple disputes → Account suspended
```

### 3. Minimum Withdrawal
- ✅ ₱100 minimum (keeps transaction fees low)
- ✅ Prevents micro-withdrawals

### 4. Payment Method Verification
- ✅ Sellers must set GCash/Bank before withdrawal
- ✅ Verified during seller application

---

## Database Flow

### Tables Involved:

**1. orders**
```sql
orderId → status → paymentStatus → deliveredAt
```

**2. seller_payouts**
```sql
payoutId → orderId → amount → netAmount → status → readyDate
```

**3. sellerProfiles**
```sql
sellerProfileId → paymentMethod → gcashNumber → bankAccount
```

### Status Progression:

**Order:**
```
pending → paid → processing → shipped → delivered
```

**Payout:**
```
pending (escrow) → ready (can withdraw) → paid (money sent)
```

---

## Implementation Checklist

### ✅ Already Working:
- [x] Order creation
- [x] Payment via Xendit
- [x] Payout creation on delivery
- [x] Escrow system (24-72 hours)
- [x] Manual withdrawal
- [x] Fee calculation (4%)

### 🔧 Improvements Needed:

#### 1. Auto-Withdrawal (Optional but nice)
```javascript
// Add to payoutService.js
async autoWithdraw() {
  // Find ready payouts with payment method set
  const readyPayouts = await db
    .from('seller_payouts')
    .select('*, sellerProfiles(*)')
    .eq('status', 'ready')
    .not('sellerProfiles.paymentMethod', 'is', null);
  
  // Process each
  for (const payout of readyPayouts) {
    await this.withdrawBalance(payout.sellerProfileId);
  }
}
```

#### 2. Seller Dashboard Clarity
Show:
- ✅ Available balance (green)
- ⏳ Pending in escrow (yellow)
- 💸 Total paid out (gray)
- 📊 Escrow countdown timer

#### 3. Notifications
- Email when payout created
- Email when money available
- SMS when money sent

---

## For Your Capstone Defense

### Key Points to Emphasize:

**1. Artist-Centric Design**
> "We prioritize artists over profit. 4% fee vs industry 20-30%."

**2. Fast Payouts**
> "24-72 hours vs competitors' 7-30 days. Artists get paid faster."

**3. Transparent Fees**
> "No hidden fees. Artists see exactly what they earn."

**4. Buyer Protection**
> "Escrow system protects both buyers and sellers."

**5. Sustainable Model**
> "4% covers costs with minimal profit. Focus is on artist success."

### When Asked About Fraud:
> "We have escrow periods (24-72 hours) that allow dispute resolution. First-time sellers have longer holds. High-value orders are reviewed. This balances speed with security."

### When Asked About Profitability:
> "This is a social enterprise model. We make ~1.5% profit per transaction, which covers operations. Revenue can be supplemented with premium features like promoted listings or analytics."

---

## Summary

**Your payout flow is ALREADY GOOD for a capstone!**

What makes it sustainable:
- ✅ 4% fee covers costs
- ✅ Escrow protects everyone
- ✅ Fast enough to help artists
- ✅ Simple enough to maintain
- ✅ Transparent and fair

**Don't overcomplicate it.** Focus on making the UI clear and the artist experience smooth.

---

## Next Steps (Priority Order)

1. **Test the full flow** (order → delivery → payout → withdrawal)
2. **Improve seller dashboard** (show escrow countdown, clear balance)
3. **Add email notifications** (payout created, money available)
4. **Document for defense** (this flow diagram)
5. **(Optional) Add auto-withdrawal** (if time permits)

**You're 90% there. Polish the UX, not the backend.**
