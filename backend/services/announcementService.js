// backend/services/announcementService.js
// Sends event announcements via SendGrid bulk template API

import db from '../database/db.js';
import mailerSendGrid from './mailerSendGrid.js';
import { notifyAuctionWinnerCentral } from './notificationService.js';

function fmtDatePH(iso) {
  try {
    if (!iso) return '';
    return new Date(iso).toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
  } catch (_) { return String(iso || ''); }
}

// Orchestrate auction winner notification (in-app + email)
export async function notifyAuctionWinner({ auctionId, winnerUserId, order, paymentLinkUrl }) {
  try {
    if (!auctionId || !winnerUserId) return { success: false, error: 'MISSING_PARAMS' };

    // Load auction context
    const { data: auction } = await db
      .from('auctions')
      .select('auctionId, auctionItemId, paymentDueAt')
      .eq('auctionId', auctionId)
      .single();

    // Load item title
    let item = null;
    if (auction?.auctionItemId) {
      const r = await db
        .from('auction_items')
        .select('title, primary_image')
        .eq('auctionItemId', auction.auctionItemId)
        .single();
      if (!r.error) item = r.data;
    }

    // Winner email + first name
    let winnerEmail = null; let firstName = '';
    try {
      if (db.auth?.admin?.getUserById) {
        const resp = await db.auth.admin.getUserById(winnerUserId);
        winnerEmail = resp?.data?.user?.email || resp?.user?.email || null;
      }
      const { data: prof } = await db.from('profile').select('firstName').eq('userId', winnerUserId).maybeSingle();
      firstName = prof?.firstName || '';
    } catch (_) {}

    // In-app notification (centralized)
    await notifyAuctionWinnerCentral({
      winnerUserId,
      auctionId,
      order,
      paymentDueAt: auction?.paymentDueAt || null,
      checkoutUrl: paymentLinkUrl || null,
      itemTitle: item?.title || null,
    });

    // Winner email (centralized)
    if (winnerEmail) {
      await sendAuctionWinnerEmail({
        email: winnerEmail,
        firstName,
        itemTitle: item?.title,
        amount: order?.totalAmount || 0,
        paymentDueAt: auction?.paymentDueAt,
        checkoutUrl: paymentLinkUrl,
        auctionId,
        orderId: order?.orderId,
      });
    }

    return { success: true };
  } catch (e) {
    console.warn('[announcement] notifyAuctionWinner failed:', e?.message || e);
    return { success: false, error: e?.message || String(e) };
  }
}

// Centralized single-recipient email for auction winners
export async function sendAuctionWinnerEmail({ email, firstName = '', itemTitle, amount, paymentDueAt, checkoutUrl, auctionId, orderId }) {
  try {
    const templateId = process.env.SENDGRID_AUCTION_WIN_TEMPLATE_ID || process.env.SENDGRID_ANNOUNCE_TEMPLATE_ID;
    const from = process.env.SENDGRID_FROM;
    const groupId = process.env.SENDGRID_UNSUB_GROUP_ID;
    if (!templateId || !from || !email) {
      console.warn('[auction-winner] Missing email config or recipient; skipping send');
      return { success: false, error: 'MISSING_CONFIG_OR_EMAIL' };
    }

    const personalizations = [{
      to: { email },
      dynamic_template_data: {
        firstName,
        itemTitle: itemTitle || 'Auction Item',
        amount: Number(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }),
        paymentDueAt: paymentDueAt ? fmtDatePH(paymentDueAt) : '',
        checkoutUrl: checkoutUrl || `${appOrigin()}/orders/${orderId || ''}`,
        auctionUrl: `${appOrigin()}/auction/${auctionId || ''}`,
        orderId: orderId || '',
      },
    }];

    const result = await mailerSendGrid.sendBulkTemplate({
      from,
      templateId,
      unsubscribeGroupId: groupId,
      personalizations,
      category: 'auction-winner',
    });
    return result;
  } catch (e) {
    console.warn('[announcement] sendAuctionWinnerEmail failed:', e?.message || e);
    return { success: false, error: e?.message || String(e) };
  }
}

function appOrigin() {
  return process.env.PUBLIC_APP_ORIGIN || 'http://localhost:5173';
}


// Build personalization object per user
function buildPzForUser(user, event) {
  const email = user?.email?.trim();
  if (!email || !email.includes('@')) return null;
  const meta = user?.user_metadata || {};
  const firstName = meta.firstName || meta.first_name || meta.given_name || '';
  return {
    to: { email },
    dynamic_template_data: {
      firstName,
      eventTitle: event?.title || 'Museo Event',
      details: event?.details || '',
      startsAt: fmtDatePH(event?.startsAt),
      venueName: event?.venueName || '',
      ctaUrl: `${appOrigin()}/event/${event?.eventId || ''}`,
    },
  };
}

export async function sendEventAnnouncement({ event }) {
  const templateId = process.env.SENDGRID_ANNOUNCE_TEMPLATE_ID;
  const from = process.env.SENDGRID_FROM;
  const groupId = process.env.SENDGRID_UNSUB_GROUP_ID; // string or int ok

  if (!templateId || !from) {
    console.warn('[announcement] Missing SENDGRID_FROM or SENDGRID_ANNOUNCE_TEMPLATE_ID; skipping send');
    return { success: false, error: 'MISSING_SENDGRID_CONFIG' };
  }

  const perPage = 1000;
  let page = 1;
  const personalizations = [];

  while (true) {
    try {
      const resp = await db.auth.admin.listUsers({ page, perPage });
      const users = resp?.data?.users ?? resp?.data ?? resp?.users ?? [];
      if (!Array.isArray(users) || users.length === 0) break;
      for (const u of users) {
        const p = buildPzForUser(u, event);
        if (p) personalizations.push(p);
      }
      if (users.length < perPage) break;
      page += 1;
    } catch (e) {
      console.warn('[announcement] listUsers failed:', e?.message || e);
      break;
    }
  }

  if (personalizations.length === 0) {
    console.log('[announcement] No recipients found');
    return { success: true, sent: 0 };
  }

  const result = await mailerSendGrid.sendBulkTemplate({
    from,
    templateId,
    unsubscribeGroupId: groupId,
    personalizations,
    category: 'event-announcement',
  });
  return result;
}

// Send a post-event email to only the participants of a given event
export async function notifyEventEnded({ eventId }) {
  const templateId = process.env.SENDGRID_ANNOUNCE_TEMPLATE_ID;
  const from = process.env.SENDGRID_FROM;
  const groupId = process.env.SENDGRID_UNSUB_GROUP_ID;
  if (!templateId || !from) {
    console.warn('[event-ended] Missing SENDGRID_FROM or SENDGRID_ANNOUNCE_TEMPLATE_ID; skipping send');
    return { success: false, error: 'MISSING_SENDGRID_CONFIG' };
  }

  // Load event
  const { data: ev, error: evErr } = await db
    .from('event')
    .select('eventId, title, details, startsAt, endsAt, venueName')
    .eq('eventId', eventId)
    .single();
  if (evErr || !ev) return { success: false, error: 'EVENT_NOT_FOUND' };

  // Load participants (userIds)
  const { data: parts, error: partErr } = await db
    .from('eventParticipant')
    .select('userId')
    .eq('eventId', eventId);
  if (partErr) return { success: false, error: 'FETCH_PARTICIPANTS_FAILED' };

  const ids = [...new Set((parts || []).map(r => r.userId).filter(Boolean))];
  if (ids.length === 0) return { success: true, sent: 0 };

  // Load profiles for first names
  const { data: profiles } = await db
    .from('profile')
    .select('userId, firstName')
    .in('userId', ids);
  const pMap = new Map((profiles || []).map(p => [p.userId, p]));

  // Fetch emails via Auth Admin (getUserById), limit concurrency
  const emails = [];
  const CONC = 6;
  let i = 0;
  async function fetchOne(uid) {
    try {
      if (db.auth?.admin?.getUserById) {
        const r = await db.auth.admin.getUserById(uid);
        const email = r?.data?.user?.email || r?.user?.email || null;
        if (email && email.includes('@')) {
          const firstName = pMap.get(uid)?.firstName || '';
          emails.push({ email, firstName });
        }
      }
    } catch (e) {
      console.warn('[event-ended] getUserById failed:', e?.message || e);
    }
  }
  const tasks = new Array(CONC).fill(0).map(async () => {
    while (i < ids.length) {
      const idx = i++;
      await fetchOne(ids[idx]);
    }
  });
  await Promise.all(tasks);

  if (emails.length === 0) return { success: true, sent: 0 };

  // Build personalizations
  const personalizations = emails.map(({ email, firstName }) => ({
    to: { email },
    dynamic_template_data: {
      firstName,
      eventTitle: ev?.title || 'Museo Event',
      details: (ev?.details || ''),
      startsAt: fmtDatePH(ev?.startsAt),
      venueName: ev?.venueName || '',
      ctaUrl: `${appOrigin()}/event/${ev?.eventId || ''}`,
      endedAt: fmtDatePH(ev?.endsAt),
      status: 'ended',
    },
  }));

  const result = await mailerSendGrid.sendBulkTemplate({
    from,
    templateId,
    unsubscribeGroupId: groupId,
    personalizations,
    category: 'event-ended',
  });
  return result;
}

// Periodic scanner: find events that have ended and have not been emailed yet
export async function checkAndNotifyEndedEvents() {
  try {
    const nowIso = new Date().toISOString();
    // Pull recently-ended events (past 24h window to limit scan)
    const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: events, error } = await db
      .from('event')
      .select('eventId, endsAt')
      .lte('endsAt', nowIso)
      .gte('endsAt', sinceIso);
    if (error) {
      console.warn('[event-ended] fetch ended events failed:', error);
      return { success: false };
    }
    const list = Array.isArray(events) ? events : [];
    if (list.length === 0) return { success: true, scanned: 0, sent: 0 };

    let sentCount = 0; let scanned = 0;
    for (const ev of list) {
      scanned += 1;
      const eventId = ev.eventId;
      if (!eventId) continue;
      // Skip if we already logged an 'event_ended' notification for this event
      try {
        const { data: existsRows } = await db
          .from('notification')
          .select('notificationId')
          .eq('type', 'event_ended')
          .contains('data', { eventId })
          .limit(1);
        if (Array.isArray(existsRows) && existsRows.length > 0) {
          continue; // already notified
        }
      } catch (e) {
        console.warn('[event-ended] precheck notification query failed:', e?.message || e);
      }

      const res = await notifyEventEnded({ eventId });
      if (res?.success) {
        sentCount += res.sent || 0;
        // Log a notification record to mark completion
        try {
          await db.from('notification').insert({
            type: 'event_ended',
            title: 'Event has ended',
            body: null,
            data: { eventId, endedAt: ev.endsAt },
            userId: null,
            recipient: null,
            readByUsers: [],
            deletedByUsers: [],
            createdAt: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('[event-ended] insert notification failed:', e?.message || e);
        }
      }
    }
    return { success: true, scanned, sent: sentCount };
  } catch (e) {
    console.warn('[event-ended] scanner failed:', e?.message || e);
    return { success: false };
  }
}

export default { sendEventAnnouncement, notifyEventEnded, checkAndNotifyEndedEvents, sendAuctionWinnerEmail, notifyAuctionWinner };
