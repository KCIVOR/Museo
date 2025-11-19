// backend/services/auctionService.js
// Auction business logic: winner computation, closing, settling

import db from '../database/db.js';
import * as xenditService from '../services/xenditService.js';

const PAYMENT_WINDOW_HOURS = Number(process.env.AUCTION_PAYMENT_WINDOW_HOURS || 24);

// HELPER: Compute winners from bids
export function computeWinners(bids) {
  if (!bids || bids.length === 0) {
    return { winner: null, ranking: [] };
  }
  // Group bids by bidder, get highest bid per bidder
  const bidsByUser = {};
  bids.forEach(bid => {
    const existing = bidsByUser[bid.bidderUserId];
    if (!existing) {
      bidsByUser[bid.bidderUserId] = bid;
      return;
    }
    const nextAmt = Number(bid.amount);
    const currAmt = Number(existing.amount);
    // Keep the higher amount; if equal, keep the earliest bid by created_at
    if (
      nextAmt > currAmt ||
      (nextAmt === currAmt && new Date(bid.created_at) < new Date(existing.created_at))
    ) {
      bidsByUser[bid.bidderUserId] = bid;
    }
  });

  // Debug logging removed to keep function side-effect free

  // Sort by amount desc, tie-break by earliest created_at asc
  const ranking = Object.values(bidsByUser).sort((a, b) => {
    const diff = Number(b.amount) - Number(a.amount);
    if (diff !== 0) return diff;
    return new Date(a.created_at) - new Date(b.created_at);
  });
  // Debug logging removed
  const winner = ranking[0] || null;

  return { winner, ranking };
}

// Find the next eligible winner for an auction, excluding current winner and any user
// who already has a non-paid order for this auction.
export async function getNextWinnerForAuction(auctionId, currentWinnerUserId) {
  // Build exclusion set from orders (any status except 'paid')
  const exclude = new Set();
  if (currentWinnerUserId) exclude.add(currentWinnerUserId);

  const { data: priorOrders } = await db
    .from('orders')
    .select('userId, paymentStatus')
    .eq('auctionId', auctionId);

  if (Array.isArray(priorOrders)) {
    priorOrders.forEach(o => {
      const ps = (o?.paymentStatus || '').toLowerCase();
      if (ps !== 'paid' && o?.userId) exclude.add(o.userId);
    });
  }

  // Load bids and compute per-user highest ranking
  const { data: bids } = await db
    .from('auction_bids')
    .select('*')
    .eq('auctionId', auctionId)
    .eq('isWithdrawn', false);

  const { ranking } = computeWinners(bids || []);
  const next = ranking.find(r => !exclude.has(r.bidderUserId));

  if (!next) return null;
  return {
    winnerUserId: next.bidderUserId,
    winningBidId: next.bidId,
    amount: Number(next.amount)
  };
}

// CLOSE AUCTION: Determine winner
export async function closeAuction(auctionId) {
  try {
    const now = new Date().toISOString();

    // Get auction
    const { data: auction, error: aerr } = await db
      .from('auctions')
      .select('*')
      .eq('auctionId', auctionId)
      .single();
    if (aerr || !auction) throw new Error('Auction not found');

    // Get all bids
    const { data: bids, error: berr } = await db
      .from('auction_bids')
      .select('*')
      .eq('auctionId', auctionId)
      .eq('isWithdrawn', false);
    if (berr) throw new Error(berr.message);

    // Compute winner
    const { winner } = computeWinners(bids || []);

    // Check if reserve met
    if (!winner || winner.amount < (auction.reservePrice || 0)) {
      // No winner - mark as ended
      const { error: upErr } = await db
        .from('auctions')
        .update({ status: 'ended', updated_at: now })
        .eq('auctionId', auctionId);
      if (upErr) throw new Error(upErr.message);
      return { auction: { ...auction, status: 'ended' }, winner: null };
    }

    // Update auction with winner
    const paymentDueAt = new Date(now);
    paymentDueAt.setHours(paymentDueAt.getHours() + PAYMENT_WINDOW_HOURS);

    const { error: upErr } = await db
      .from('auctions')
      .update({
        status: 'ended',
        winnerUserId: winner.bidderUserId,
        winningBidId: winner.bidId,
        paymentDueAt: paymentDueAt.toISOString(),
        updated_at: now
      })
      .eq('auctionId', auctionId);
    if (upErr) throw new Error(upErr.message);

    return {
      auction: {
        ...auction,
        status: 'ended',
        winnerUserId: winner.bidderUserId,
        winningBidId: winner.bidId,
        paymentDueAt: paymentDueAt.toISOString()
      },
      winner: { userId: winner.bidderUserId, amount: winner.amount }
    };
  } catch (error) {
    throw new Error(`Failed to close auction: ${error.message}`);
  }
}

// SETTLE AUCTION: Create order for winner
export async function settleAuction(auctionId) {
  try {
    const now = new Date().toISOString();

    // Get auction
    const { data: auction, error: aerr } = await db
      .from('auctions')
      .select('*')
      .eq('auctionId', auctionId)
      .single();
    if (aerr || !auction) throw new Error('Auction not found');
    if (!auction.winnerUserId) throw new Error('No winner for this auction');

    // Get auction item
    const { data: item, error: ierr } = await db
      .from('auction_items')
      .select('*')
      .eq('auctionItemId', auction.auctionItemId)
      .single();
    if (ierr || !item) throw new Error('Auction item not found');

    // Get winning bid with address
    const { data: winningBid, error: wberr } = await db
      .from('auction_bids')
      .select('amount, userAddressId')
      .eq('bidId', auction.winningBidId)
      .single();
    if (wberr || !winningBid) throw new Error('Winning bid not found');

    // Get winner's address if provided
    let shippingAddress = null;
    if (winningBid.userAddressId) {
      const { data: addr, error: addrErr } = await db
        .from('user_addresses')
        .select('*')
        .eq('userAddressId', winningBid.userAddressId)
        .single();
      if (!addrErr && addr) {
        shippingAddress = {
          fullName: addr.fullName,
          email: addr.email,
          phoneNumber: addr.phoneNumber,
          alternatePhone: addr.alternatePhone,
          addressLine1: addr.addressLine1,
          addressLine2: addr.addressLine2,
          landmark: addr.landmark,
          cityMunicipalityCode: addr.cityMunicipalityCode,
          barangayCode: addr.barangayCode,
          regionName: addr.regionName,
          provinceName: addr.provinceName,
          cityMunicipalityName: addr.cityMunicipalityName,
          barangayName: addr.barangayName,
          postalCode: addr.postalCode,
          addressType: addr.addressType,
          deliveryInstructions: addr.deliveryInstructions
        };
      }
    }

    // Calculate totals (already in pesos)
    const totalAmount = winningBid.amount;
    const platformFeeRate = 0.04;
    const platformFee = parseFloat((totalAmount * platformFeeRate).toFixed(2));

    // Create order (matching marketplace order structure)
    const { data: order, error: oerr } = await db
      .from('orders')
      .insert([{
        auctionId,
        userId: auction.winnerUserId,
        sellerProfileId: item.sellerProfileId,
        status: 'pending',
        paymentStatus: 'pending',
        subtotal: totalAmount,
        platformFee: platformFee,
        shippingCost: 0,
        totalAmount: totalAmount,
        shippingMethod: 'standard',
        orderNotes: `Auction Order - ${item.title}`,
        is_auction: true,
        shippingAddress: shippingAddress || {},
        contactInfo: shippingAddress ? { email: shippingAddress.email, phone: shippingAddress.phoneNumber } : {},
        createdAt: now,
        updatedAt: now
      }])
      .select()
      .single();
    if (oerr) throw new Error(oerr.message);

    // Create order item linking auction item to order
    const itemTotal = totalAmount;
    const platformFeeAmount = parseFloat((itemTotal * platformFeeRate).toFixed(2));
    const artistEarnings = parseFloat((itemTotal - platformFeeAmount).toFixed(2));

    const { error: oiErr } = await db
      .from('order_items')
      .insert([{
        orderId: order.orderId,
        auctionItemId: auction.auctionItemId,
        sellerProfileId: item.sellerProfileId,
        userId: auction.winnerUserId,
        sellerId: item.userId,
        title: item.title,
        priceAtPurchase: totalAmount,
        quantity: 1,
        itemTotal: itemTotal,
        platformFeeAmount: platformFeeAmount,
        artistEarnings: artistEarnings,
        createdAt: now
      }])
      .select()
      .single();
    if (oiErr) throw new Error(`Failed to create order item: ${oiErr.message}`);

    // Create payment link via Xendit
    let paymentLink;
    try {
      paymentLink = await xenditService.createPaymentLink({
        amount: totalAmount,
        description: `Auction Order ${order.orderId}`,
        metadata: {
          orderId: order.orderId,
          userId: auction.winnerUserId,
          sellerProfileId: item.sellerProfileId,
          auctionId: auctionId,
          winningBidAmount: winningBid.amount
        }
      });
    } catch (plError) {
      // Rollback on failure
      await db.from('orders').delete().eq('orderId', order.orderId);
      throw new Error(`Failed to create payment link: ${plError.message}`);
    }

    // Update order with payment details
    const { error: payErr } = await db
      .from('orders')
      .update({
        paymentLinkId: paymentLink.paymentLinkId,
        paymentReference: paymentLink.referenceNumber,
        paymentProvider: 'xendit',
        paymentMethodUsed: 'xendit_invoice',
        updatedAt: now
      })
      .eq('orderId', order.orderId);
    if (payErr) throw new Error(payErr.message);

    // Update auction to settled
    const { error: upErr } = await db
      .from('auctions')
      .update({ status: 'settled', settlementOrderId: order.orderId, updated_at: now })
      .eq('auctionId', auctionId);
    if (upErr) throw new Error(upErr.message);

    return { order, paymentLink };
  } catch (error) {
    throw new Error(`Failed to settle auction: ${error.message}`);
  }
}

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
  computeWinners,
  closeAuction,
  settleAuction,
  createAuctionPaymentLink,
  getNextWinnerForAuction
};
