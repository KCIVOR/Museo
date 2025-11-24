// backend/services/notificationService.js
// Centralized creation + delivery of in-app notifications

import db from '../database/db.js';
import { cache } from '../utils/cache.js';
import { getIO } from '../utils/ioBus.js';

/**
 * Publish a notification: writes to DB and emits via Socket.IO.
 *
 * @param {Object} opts
 * @param {string} opts.type - e.g., 'event_created', 'auction_won'
 * @param {string} [opts.title]
 * @param {string|null} [opts.body]
 * @param {object} [opts.data]
 * @param {string|null} [opts.recipient] - null => global notification
 * @param {string|null} [opts.userId] - actor/creator user id (optional)
 * @param {object} [opts.dedupeContains] - JSON fragment to check in data for dedupe
 * @returns inserted notification row
 */
export async function publishNotification({ type, title, body = null, data = {}, recipient = null, userId = null, dedupeContains = null }) {
  // Optional dedupe: avoid duplicates for same type/recipient/data fragment
  if (dedupeContains) {
    try {
      const q = db
        .from('notification')
        .select('notificationId')
        .eq('type', type)
        .limit(1);
      if (recipient === null) {
        q.is('recipient', null);
      } else {
        q.eq('recipient', recipient);
      }
      const { data: exists } = await q.contains('data', dedupeContains);
      if (Array.isArray(exists) && exists.length > 0) {
        return null; // deduped
      }
    } catch (e) {
      // best-effort; continue
    }
  }

  const row = {
    type,
    title: title || null,
    body: body || null,
    data: data || {},
    userId: userId || null,
    recipient: recipient || null,
    readByUsers: [],
    deletedByUsers: [],
    createdAt: new Date().toISOString(),
  };

  const { data: inserted, error } = await db
    .from('notification')
    .insert(row)
    .select('*')
    .single();

  if (error) throw error;

  // Socket emit (global or targeted)
  try {
    const io = getIO();
    if (io) {
      if (recipient) io.to(`user_${recipient}`).emit('notification', inserted);
      else io.emit('notification', inserted);
    }
  } catch (_) {}

  // Cache bust
  if (recipient) await cache.clearPattern(`notifications:${recipient}:*`);
  else await cache.clearPattern('notifications:*');

  return inserted;
}

// Convenience helpers
export async function notifyEventCreated({ event, createdBy, details }) {
  return publishNotification({
    type: 'event_created',
    title: `New event: ${event?.title ?? 'Untitled'}`,
    body: details || null,
    data: {
      eventId: event?.eventId,
      venueName: event?.venueName,
      startsAt: event?.startsAt,
      image: event?.image || null,
      createdBy: createdBy || null,
    },
    recipient: null,
    userId: createdBy || null,
    // global announcements usually don't dedupe
  });
}

export async function notifyAuctionWinnerCentral({ winnerUserId, auctionId, order, paymentDueAt, checkoutUrl, itemTitle }) {
  return publishNotification({
    type: 'auction_won',
    title: 'You won the auction! 🎉',
    body: `Complete your payment before the deadline to claim ${itemTitle || 'your item'}.`,
    data: {
      auctionId,
      orderId: order?.orderId || null,
      totalAmount: order?.totalAmount || null,
      paymentDueAt: paymentDueAt || null,
      checkoutUrl: checkoutUrl || null,
      itemTitle: itemTitle || null,
    },
    recipient: winnerUserId,
    userId: null,
    dedupeContains: { auctionId },
  });
}

export default { publishNotification, notifyEventCreated, notifyAuctionWinnerCentral };
