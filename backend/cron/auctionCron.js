// backend/cron/auctionCron.js
// Auction lifecycle management: activate, close, settle, rollover

import db from '../database/db.js';
import auctionService from '../services/auctionService.js';

const PAYMENT_WINDOW_HOURS = Number(process.env.AUCTION_PAYMENT_WINDOW_HOURS || 24);

/**
 * Activate scheduled auctions
 */
export async function activateScheduledAuctions() {
  try {
    console.log('🔔 Activating scheduled auctions...');
    const now = new Date().toISOString();

    const { data: toActivate, error } = await db
      .from('auctions')
      .select('*')
      .eq('status', 'scheduled')
      .lte('startAt', now);

    if (error) throw new Error(error.message);
    if (!toActivate || toActivate.length === 0) {
      console.log('✅ No auctions to activate');
      return;
    }

    for (const auction of toActivate) {
      const { error: upErr } = await db
        .from('auctions')
        .update({ status: 'active', updated_at: now })
        .eq('auctionId', auction.auctionId);
      if (upErr) {
        console.error(`Error activating auction ${auction.auctionId}:`, upErr);
      } else {
        console.log(`✅ Activated auction: ${auction.auctionId}`);
      }
    }
  } catch (error) {
    console.error('Error in activateScheduledAuctions:', error);
  }
}

/**
 * Close ended auctions and determine winners
 */
export async function closeEndedAuctions() {
  try {
    console.log('🔨 Closing ended auctions...');
    const now = new Date().toISOString();

    const { data: toClose, error } = await db
      .from('auctions')
      .select('*')
      .eq('status', 'active')
      .lte('endAt', now);

    if (error) throw new Error(error.message);
    if (!toClose || toClose.length === 0) {
      console.log('✅ No auctions to close');
      return;
    }

    for (const auction of toClose) {
      try {
        const { auction: updated, winner } = await auctionService.closeAuction(auction.auctionId);
        if (winner) {
          console.log(`✅ Closed auction ${auction.auctionId}, winner: ${winner.userId}, amount: ₱${winner.amount}`);
        } else {
          console.log(`✅ Closed auction ${auction.auctionId}, no winner (reserve not met or no bids)`);
        }
      } catch (err) {
        console.error(`Error closing auction ${auction.auctionId}:`, err);
      }
    }
  } catch (error) {
    console.error('Error in closeEndedAuctions:', error);
  }
}

/**
 * Settle auctions: create orders and payment links for winners
 */
export async function settleAuctions() {
  try {
    console.log('💳 Settling auctions...');

    const { data: toSettle, error } = await db
      .from('auctions')
      .select('*')
      .eq('status', 'ended')
      .not('winnerUserId', 'is', null);

    if (error) throw new Error(error.message);
    if (!toSettle || toSettle.length === 0) {
      console.log('✅ No auctions to settle');
      return;
    }

    for (const auction of toSettle) {
      try {
        const { order } = await auctionService.settleAuction(auction.auctionId);
        console.log(`✅ Settled auction ${auction.auctionId}, order: ${order.orderId}`);
      } catch (err) {
        console.error(`Error settling auction ${auction.auctionId}:`, err);
      }
    }
  } catch (error) {
    console.error('Error in settleAuctions:', error);
  }
}

/**
 * Handle unpaid winners: rollover to next highest bidder
 */
export async function rolloverUnpaidWinners() {
  try {
    console.log('🔄 Checking for unpaid winners...');
    const now = new Date().toISOString();

    const { data: settled, error } = await db
      .from('auctions')
      .select('*')
      .eq('status', 'settled')
      .lte('paymentDueAt', now);

    if (error) throw new Error(error.message);
    if (!settled || settled.length === 0) {
      console.log('✅ No unpaid winners to rollover');
      return;
    }

    for (const auction of settled) {
      try {
        // Check if settlement order is still unpaid
        const { data: order, error: oErr } = await db
          .from('orders')
          .select('*')
          .eq('orderId', auction.settlementOrderId)
          .single();

        if (oErr || !order) {
          console.warn(`Order ${auction.settlementOrderId} not found`);
          continue;
        }

        if (order.paymentStatus === 'paid') {
          console.log(`✅ Order ${order.orderId} is paid, no rollover needed`);
          continue;
        }

        // Unpaid - rollover to next highest
        const { data: bids } = await db
          .from('auction_bids')
          .select('*')
          .eq('auctionId', auction.auctionId)
          .eq('isWithdrawn', false);

        const { ranking } = auctionService.computeWinners(bids || []);
        const nextWinner = ranking.find(r => r.userId !== auction.winnerUserId);

        if (!nextWinner) {
          console.log(`⚠️ No next bidder for auction ${auction.auctionId}, marking unsold`);
          await db
            .from('auctions')
            .update({ status: 'ended', updated_at: now })
            .eq('auctionId', auction.auctionId);
          continue;
        }

        // Cancel current order
        await db
          .from('orders')
          .update({ status: 'cancelled', paymentStatus: 'expired', cancelledAt: now })
          .eq('orderId', order.orderId);

        // Update auction to new winner
        const dueAt = new Date(now);
        dueAt.setHours(dueAt.getHours() + PAYMENT_WINDOW_HOURS);

        const { data: nextBid } = await db
          .from('auction_bids')
          .select('*')
          .eq('bidderUserId', nextWinner.userId)
          .eq('auctionId', auction.auctionId)
          .order('amount', { ascending: false })
          .limit(1)
          .single();

        await db
          .from('auctions')
          .update({
            winnerUserId: nextWinner.userId,
            winningBidId: nextBid?.bidId || nextWinner.bidId,
            paymentDueAt: dueAt.toISOString(),
            updated_at: now
          })
          .eq('auctionId', auction.auctionId);

        // Settle for new winner
        const { order: newOrder } = await auctionService.settleAuction(auction.auctionId);
        console.log(`✅ Rolled over auction ${auction.auctionId} to new winner, new order: ${newOrder.orderId}`);
      } catch (err) {
        console.error(`Error rolling over auction ${auction.auctionId}:`, err);
      }
    }
  } catch (error) {
    console.error('Error in rolloverUnpaidWinners:', error);
  }
}

/**
 * Main cron job runner
 */
export async function runAuctionCron() {
  console.log('═══════════════════════════════════════════');
  console.log('🏛️ Running Auction Cron Jobs');
  console.log('Time:', new Date().toISOString());
  console.log('═══════════════════════════════════════════');

  try {
    await activateScheduledAuctions();
    await closeEndedAuctions();
    await settleAuctions();
    await rolloverUnpaidWinners();
    console.log('═══════════════════════════════════════════\n');
  } catch (error) {
    console.error('🚨 Critical error in auction cron:', error);
  }
}

export default {
  activateScheduledAuctions,
  closeEndedAuctions,
  settleAuctions,
  rolloverUnpaidWinners,
  runAuctionCron
};
