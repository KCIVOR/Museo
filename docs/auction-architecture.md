# Auction System Architecture - Refactored

## Pattern: DB Queries in Controller, External APIs in Service

### Your Preference
- ✅ **DB Queries** → Controller
- ✅ **External APIs (Xendit)** → Service
- ✅ **Business Logic** → Controller

---

## File Structure

```
backend/
├── controllers/
│   └── auctionController.js          ← ALL DB queries here
├── services/
│   └── auctionService.js             ← ONLY Xendit integration
└── routes/
    └── auctionRoutes.js              ← Route definitions
```

---

## auctionService.js (Lean & Clean)

**Only handles Xendit payment integration:**

```javascript
// backend/services/auctionService.js

import * as xenditService from '../services/xenditService.js';

const PAYMENT_WINDOW_HOURS = Number(process.env.AUCTION_PAYMENT_WINDOW_HOURS || 24);

// XENDIT PAYMENT HELPER
// Creates payment link for auction settlement
export async function createAuctionPaymentLink({ orderId, userId, auctionId, amountPesos }) {
  try {
    const paymentLink = await xenditService.createPaymentLink({
      amount: amountPesos,
      description: `Auction Order ${orderId}`,
      metadata: { orderId, userId, auctionId }
    });
    return paymentLink;
  } catch (error) {
    throw new Error(`Failed to create payment link: ${error.message}`);
  }
}

export default {
  createAuctionPaymentLink
};
```

---

## auctionController.js (All DB Logic)

**Handles all database queries and business logic:**

```javascript
// backend/controllers/auctionController.js

import db from '../database/db.js';
import auctionService from '../services/auctionService.js';

// STEP 1: CREATE AUCTION ITEM
export const createAuctionItem = async (req, res) => {
  try {
    const { title, description, medium, dimensions, ... } = req.body;
    const userId = req.user?.id;

    // ✅ DB QUERY IN CONTROLLER
    const { data: item, error } = await db
      .from('auction_items')
      .insert([{ userId, title, description, medium, dimensions, ... }])
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// STEP 2: CREATE AUCTION
export const createAuction = async (req, res) => {
  try {
    const { auctionItemId, startPriceCentavos, reservePriceCentavos, startAt, endAt } = req.body;
    const userId = req.user?.id;

    // ✅ DB QUERY IN CONTROLLER
    const { data: sellerProfile } = await db
      .from('sellerProfiles')
      .select('*')
      .eq('userId', userId)
      .single();

    // Auto-set status based on startAt
    const nowISO = new Date().toISOString();
    const status = new Date(startAt) > new Date(nowISO) ? 'scheduled' : 'active';

    // ✅ DB QUERY IN CONTROLLER
    const { data: auction, error } = await db
      .from('auctions')
      .insert([{
        sellerProfileId: sellerProfile.sellerProfileId,
        auctionItemId,
        startPriceCentavos,
        reservePriceCentavos,
        startAt,
        endAt,
        status
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.status(201).json({ success: true, data: auction });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// STEP 3: PLACE BID
export const placeBid = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { amountCentavos, idempotencyKey } = req.body;
    const userId = req.user?.id;

    // ✅ IDEMPOTENCY CHECK - DB QUERY IN CONTROLLER
    if (idempotencyKey) {
      const { data: existing } = await db
        .from('auction_bids')
        .select('*')
        .eq('auctionId', auctionId)
        .eq('bidderUserId', userId)
        .eq('idempotencyKey', idempotencyKey)
        .single();
      if (existing) {
        return res.status(201).json({ success: true, data: existing });
      }
    }

    // ✅ LOAD AUCTION - DB QUERY IN CONTROLLER
    const { data: auction, error: aerr } = await db
      .from('auctions')
      .select('*')
      .eq('auctionId', auctionId)
      .single();
    if (aerr || !auction) throw new Error('Auction not found');

    // BUSINESS LOGIC: VALIDATIONS
    const now = new Date();
    if (!(new Date(auction.startAt) <= now && now < new Date(auction.endAt))) {
      throw new Error('Bidding window is closed');
    }
    if (auction.status !== 'active') {
      throw new Error('Auction is not active');
    }

    // ✅ LOAD USER BIDS - DB QUERY IN CONTROLLER
    const { data: userBids } = await db
      .from('auction_bids')
      .select('*')
      .eq('auctionId', auctionId)
      .eq('bidderUserId', userId)
      .eq('isWithdrawn', false)
      .order('amountCentavos', { ascending: false });

    // BUSINESS LOGIC: BID AMOUNT VALIDATION
    const hasBid = userBids && userBids.length > 0;
    const userHighest = hasBid ? userBids[0].amountCentavos : 0;

    if (hasBid && amountCentavos <= userHighest) {
      throw new Error('New bid must be higher than your previous bid');
    }
    if (!hasBid && amountCentavos < auction.startPriceCentavos) {
      throw new Error('Bid must be at least the starting price');
    }

    // ✅ INSERT BID - DB QUERY IN CONTROLLER
    const bidData = { auctionId, bidderUserId: userId, amountCentavos };
    if (idempotencyKey) bidData.idempotencyKey = idempotencyKey;

    const { data: bid, error } = await db
      .from('auction_bids')
      .insert([bidData])
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.status(201).json({ success: true, data: bid });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// STEP 4: CLOSE AUCTION (CRON JOB)
export const closeAuction = async (auctionId) => {
  try {
    // ✅ LOAD AUCTION - DB QUERY IN CONTROLLER
    const { data: auction, error: aerr } = await db
      .from('auctions')
      .select('*')
      .eq('auctionId', auctionId)
      .single();
    if (aerr || !auction) throw new Error('Auction not found');

    if (['ended', 'settled', 'cancelled'].includes(auction.status)) {
      return { auction };
    }

    // ✅ LOAD BIDS - DB QUERY IN CONTROLLER
    const { data: bids } = await db
      .from('auction_bids')
      .select('*')
      .eq('auctionId', auctionId)
      .eq('isWithdrawn', false);

    // BUSINESS LOGIC: DETERMINE WINNER
    const winner = computeWinners(bids || []);

    // BUSINESS LOGIC: CHECK RESERVE PRICE
    if (!winner || (auction.reservePriceCentavos && winner.amountCentavos < auction.reservePriceCentavos)) {
      const { data: upd, error } = await db
        .from('auctions')
        .update({ status: 'ended', updated_at: new Date().toISOString() })
        .eq('auctionId', auctionId)
        .select()
        .single();
      return { auction: upd, winner: null };
    }

    // ✅ UPDATE AUCTION - DB QUERY IN CONTROLLER
    const dueAt = addHours(new Date(), PAYMENT_WINDOW_HOURS);
    const { data: upd, error } = await db
      .from('auctions')
      .update({
        status: 'ended',
        winnerUserId: winner.userId,
        winningBidId: winner.bidId,
        paymentDueAt: dueAt,
        updated_at: new Date().toISOString()
      })
      .eq('auctionId', auctionId)
      .select()
      .single();

    return { auction: upd, winner };
  } catch (error) {
    console.error('closeAuction error:', error);
    throw error;
  }
};

// STEP 5: SETTLE AUCTION (CRON JOB)
export const settleAuction = async (auctionId) => {
  try {
    // ✅ LOAD AUCTION - DB QUERY IN CONTROLLER
    const { data: auction, error: aerr } = await db
      .from('auctions')
      .select('*')
      .eq('auctionId', auctionId)
      .single();
    if (aerr || !auction) throw new Error('Auction not found');
    if (!auction.winnerUserId || !auction.winningBidId) throw new Error('No winner to settle');

    // ✅ LOAD WINNING BID - DB QUERY IN CONTROLLER
    const { data: winningBid, error: berr } = await db
      .from('auction_bids')
      .select('*')
      .eq('bidId', auction.winningBidId)
      .single();
    if (berr || !winningBid) throw new Error('Winning bid not found');

    // ✅ LOAD AUCTION ITEM - DB QUERY IN CONTROLLER
    const { data: item, error: ierr } = await db
      .from('auction_items')
      .select('*')
      .eq('auctionItemId', auction.auctionItemId)
      .single();
    if (ierr || !item) throw new Error('Auction item not found');

    // BUSINESS LOGIC: CALCULATE PAYOUT
    const userId = auction.winnerUserId;
    const amountPesos = Number((winningBid.amountCentavos / 100).toFixed(2));
    const PLATFORM_FEE_RATE = 0.04;
    const platformFee = Number((amountPesos * PLATFORM_FEE_RATE).toFixed(2));
    const now = new Date().toISOString();

    // ✅ CREATE ORDER - DB QUERY IN CONTROLLER
    const { data: order, error: oerr } = await db
      .from('orders')
      .insert([{
        userId,
        sellerProfileId: auction.sellerProfileId,
        is_auction: true,
        auctionId,
        status: 'pending',
        paymentStatus: 'pending',
        subtotal: amountPesos,
        platformFee,
        totalAmount: amountPesos,
        shippingMethod: 'auction',
        orderNotes: `Auction settlement for ${item.title}`,
        createdAt: now,
        updatedAt: now
      }])
      .select()
      .single();
    if (oerr || !order) throw new Error('Failed to create order');

    // ✅ CREATE ORDER ITEM - DB QUERY IN CONTROLLER
    const { error: oiError } = await db
      .from('order_items')
      .insert([{
        orderId: order.orderId,
        auctionItemId: item.auctionItemId,
        sellerProfileId: auction.sellerProfileId,
        userId,
        sellerId: item.userId,
        title: item.title,
        priceAtPurchase: amountPesos,
        quantity: 1,
        itemTotal: amountPesos,
        platformFeeAmount: platformFee,
        artistEarnings: Number((amountPesos - platformFee).toFixed(2)),
        createdAt: now
      }])
      .select()
      .single();
    if (oiError) {
      // ROLLBACK: Delete order if order_item fails
      await db.from('orders').delete().eq('orderId', order.orderId);
      throw new Error(oiError.message);
    }

    // ✅ CREATE PAYMENT LINK - XENDIT SERVICE (External API)
    let paymentLink;
    try {
      paymentLink = await auctionService.createAuctionPaymentLink({
        orderId: order.orderId,
        userId,
        auctionId,
        amountPesos
      });
    } catch (plError) {
      // ROLLBACK: Delete order_item and order if payment link fails
      await db.from('order_items').delete().eq('orderId', order.orderId);
      await db.from('orders').delete().eq('orderId', order.orderId);
      throw new Error(plError.message);
    }

    // ✅ UPDATE ORDER WITH PAYMENT LINK - DB QUERY IN CONTROLLER
    await db
      .from('orders')
      .update({
        paymentLinkId: paymentLink.paymentLinkId,
        paymentReference: paymentLink.referenceNumber,
        paymentProvider: 'xendit',
        paymentMethodUsed: 'xendit_invoice',
        updatedAt: new Date().toISOString()
      })
      .eq('orderId', order.orderId);

    // ✅ UPDATE AUCTION STATUS - DB QUERY IN CONTROLLER
    await db
      .from('auctions')
      .update({
        status: 'settled',
        settlementOrderId: order.orderId,
        updated_at: new Date().toISOString()
      })
      .eq('auctionId', auctionId);

    return { order, paymentLink };
  } catch (error) {
    console.error('settleAuction error:', error);
    throw error;
  }
};

// HELPER: Compute winner from bids
function computeWinners(bids) {
  const bestPerUser = new Map();
  for (const b of bids) {
    const prev = bestPerUser.get(b.bidderUserId);
    if (!prev || b.amountCentavos > prev.amountCentavos || 
        (b.amountCentavos === prev.amountCentavos && new Date(b.created_at) < new Date(prev.created_at))) {
      bestPerUser.set(b.bidderUserId, { 
        amountCentavos: b.amountCentavos, 
        bidId: b.bidId, 
        created_at: b.created_at 
      });
    }
  }

  let winner = null;
  for (const [userId, info] of bestPerUser.entries()) {
    if (!winner || info.amountCentavos > winner.amountCentavos || 
        (info.amountCentavos === winner.amountCentavos && new Date(info.created_at) < new Date(winner.created_at))) {
      winner = { userId, ...info };
    }
  }

  return winner;
}

// HELPER: Add hours to date
function addHours(date, hours) {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}
```

---

## Architecture Pattern

```
REQUEST
   ↓
CONTROLLER (auctionController.js)
   ├─ Validate input
   ├─ DB queries (SELECT, INSERT, UPDATE, DELETE)
   ├─ Business logic (validations, calculations)
   └─ Call SERVICE for external APIs
        ↓
SERVICE (auctionService.js)
   ├─ Xendit payment integration
   ├─ External API calls only
   └─ Return result
        ↓
CONTROLLER (continued)
   ├─ Handle service response
   ├─ More DB queries if needed
   └─ Send response to client
```

---

## Comparison

| Aspect | Before | After |
|--------|--------|-------|
| **DB Queries** | Service | ✅ Controller |
| **Xendit** | Service | ✅ Service |
| **Business Logic** | Service | ✅ Controller |
| **Reusable from Cron** | ✅ Yes | ⚠️ Need to call controller functions |
| **Testable** | ✅ Easy | ✅ Easy |
| **Follows Your Pattern** | ❌ No | ✅ Yes |

---

## Benefits

✅ **Matches your codebase pattern** - Same as marketplace, gallery, profile controllers
✅ **Lean service layer** - Only handles external APIs (Xendit)
✅ **Clear separation** - DB in controller, APIs in service
✅ **Easy to understand** - All logic in one place (controller)
✅ **Consistent** - Follows your existing architecture

---

## Note on Cron Jobs

For cron jobs, you can either:

**Option 1: Call controller functions directly**
```javascript
// auctionCron.js
import { closeAuction, settleAuction } from '../controllers/auctionController.js';

export async function runAuctionCron() {
  const auctions = await db.from('auctions').select('*')...
  for (const auction of auctions) {
    await closeAuction(auction.auctionId);
    await settleAuction(auction.auctionId);
  }
}
```

**Option 2: Extract logic to separate functions**
```javascript
// auctionLogic.js - Shared business logic
export async function closeAuctionLogic(auctionId) { ... }
export async function settleAuctionLogic(auctionId) { ... }

// Then use in both controller and cron
```

This is your choice based on preference!
