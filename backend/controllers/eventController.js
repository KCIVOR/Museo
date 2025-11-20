import db from '../database/db.js';
import { cache } from '../utils/cache.js';
import { sendEventAnnouncement, notifyEventEnded as notifyEventEndedService } from '../services/announcementService.js';

export const getEvents = async (req, res) => {
  try {
    // Extract pagination parameters from query (Homepage style)
    const { page = 1, limit = 10 } = req.query;
    
    // Convert pagination params to numbers
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;
    
    // Check cache first
    const cacheKey = `events:${pageNum}:${limitNum}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log('✅ Cache HIT:', cacheKey);
      return res.status(200).json(cached);
    }
    console.log('❌ Cache MISS:', cacheKey);
    
    // Fetch events with pagination
    const { data, error } = await db
      .from('event')
      .select('*')
      .order('startsAt', { ascending: true })
      .range(offset, offset + limitNum - 1);

    if (error) {
      console.error('getEvents: supabase error:', error);
      return res.status(500).json({ error: 'Failed to fetch events' });
    }
    
    // Check if there are more events
    const hasMore = data.length === limitNum;
    
    const result = { 
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        count: data.length,
        hasMore
      }
    };
    
    // Cache the result (15 minutes - events don't change frequently)
    await cache.set(cacheKey, result, 900);
    console.log('💾 CACHED:', cacheKey);
    
    return res.status(200).json(result);
  } catch (err) {
    console.error('getEvents: unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
};

// GET /event/:id
export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Missing event id' });

    // Check cache first (10 minutes - event details don't change frequently)
    const cacheKey = `event:${id}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log('✅ Cache HIT:', cacheKey);
      return res.status(200).json(cached);
    }
    console.log('❌ Cache MISS:', cacheKey);

    // First try by eventId (uuid used across app)
    let row = await db.from('event').select('*').eq('eventId', id).single();

    // If not found and your table also has a numeric 'id', try that as fallback
    if ((row.error || !row.data)) {
      row = await db.from('event').select('*').eq('id', id).single();
    }

    if (row.error || !row.data) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const result = { event: row.data };
    
    // Cache for 10 minutes (event details)
    await cache.set(cacheKey, result, 600);
    console.log('💾 CACHED:', cacheKey);
    
    return res.status(200).json(result);
  } catch (err) {
    console.error('getEventById: unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
};

export const createEvent = async (req, res) => {
  try {
    const {
      title,
      details,
      venueName,
      venueAddress,
      startsAt,
      endsAt,
      image, // optional direct URL (for JSON clients)
      admission,
      admissionNote,
      activities,
      imageBase64, // optional base64 upload
      imageName,   // optional original filename
    } = req.body || {};

    // Sanitize string inputs (trim spaces)
    const s = (v) => typeof v === 'string' ? v.trim() : v;
    const _title = s(title);
    const _details = s(details);
    const _venueName = s(venueName);
    const _venueAddress = s(venueAddress);
    const _admission = s(admission);
    const _admissionNote = s(admissionNote);

    if (!_title || !_details || !_venueName || !_venueAddress || !startsAt || !endsAt) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Normalize activities: accept array, JSON string, or comma/newline separated string
    let acts = [];
    if (Array.isArray(activities)) {
      acts = activities;
    } else if (typeof activities === 'string') {
      try {
        const parsed = JSON.parse(activities);
        if (Array.isArray(parsed)) acts = parsed;
      } catch (_) {
        acts = activities.split(/\r?\n|,\s*/).map(s => s.trim()).filter(Boolean);
      }
    }

    // Prefer Multer file (multipart/form-data). Fallback to base64, then to direct URL.
    let imageUrl = image || null;
    if (req.file && req.file.buffer) {
      try {
        const filenameSafe = (req.file.originalname || 'image').replace(/[^a-zA-Z0-9_.-]/g, '_');
        const filePath = `events/${Date.now()}-${filenameSafe}`;
        const { error: upErr } = await db.storage
          .from('uploads')
          .upload(filePath, req.file.buffer, {
            contentType: req.file.mimetype || 'application/octet-stream',
            upsert: false,
          });
        if (upErr) throw upErr;
        const { data: pub } = db.storage.from('uploads').getPublicUrl(filePath);
        imageUrl = pub?.publicUrl || null;
      } catch (e) {
        console.error('createEvent: storage upload failed (multer):', e);
      }
    } else if (!imageUrl && imageBase64 && imageName) {
      try {
        const buffer = Buffer.from(imageBase64, 'base64');
        const filenameSafe = imageName.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const filePath = `events/${Date.now()}-${filenameSafe}`;
        const { error: upErr } = await db.storage
          .from('uploads')
          .upload(filePath, buffer, {
            contentType: 'application/octet-stream',
            upsert: false,
          });
        if (upErr) throw upErr;
        const { data: pub } = db.storage.from('uploads').getPublicUrl(filePath);
        imageUrl = pub?.publicUrl || null;
      } catch (e) {
        console.error('createEvent: storage upload failed (base64):', e);
      }
    }

    // Additional required fields enforcement
    if (!_admission || !_admissionNote) {
      return res.status(400).json({ error: 'Admission and Admission Note are required' });
    }
    if (!acts || acts.length === 0) {
      return res.status(400).json({ error: 'At least one activity is required' });
    }
    if (!imageUrl) {
      return res.status(400).json({ error: 'Event cover image is required' });
    }

    // Validate dates
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format for startsAt/endsAt' });
    }
    if (end <= start) {
      return res.status(400).json({ error: 'endsAt must be later than startsAt' });
    }

    const payload = {
      title,
      details: _details,
      venueName: _venueName,
      venueAddress: _venueAddress,
      startsAt,
      endsAt,
      image: imageUrl,
      admission: _admission || null,
      admissionNote: _admissionNote || null,
      activities: acts,
      // If you have auth middleware, set userId from it; otherwise null
      userId: req.user?.id || null
    };
  const { data, error } = await db
      .from('event')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('createEvent: supabase error:', error);
      return res.status(500).json({ error: 'Failed to create event' });
    }

    // Clear events cache
    await cache.del('events:*');
    console.log('🗑️ Events cache invalidated after create');

    const notification = {
      type: "event_created",
      eventId: data.eventId,
      title: data.title,
      startsAt: data.startsAt,
      venueName: data.venueName,
      image: data.image || null,
      createdBy: data.createdBy || null,
      createdAt: new Date().toISOString(),
    }


    // Save notification to database for offline users
    // Table columns: notificationId, createdAt, type, title, body, data, userId, recipient, isRead
    try {
      const insertRow = {
        type: notification.type,
        title: `New event: ${notification.title ?? "Untitled"}`,
        body: _details || null,
        data: {
          eventId: notification.eventId,
          venueName: notification.venueName,
          startsAt: notification.startsAt,
          image: notification.image,
          createdBy: notification.createdBy,
        },
        userId: req.user?.id || null, // Who created the event
        recipient: null, // null = send to everyone (global notification)
        readByUsers: [], // Initialize empty array - no one has read it yet
        deletedByUsers: [], // Initialize empty array
        createdAt: new Date().toISOString() // Explicitly set createdAt
      }
      const { data: notifRow, error: notifErr } = await db
        .from('notification')
        .insert(insertRow)
        .select('*')
        .single()

      if (notifErr) {
        console.warn('createEvent: notification insert failed:', notifErr)
      } else if (notifRow) {
        // Carry DB identifiers/timestamps back to the emitted payload
        notification.notificationId = notifRow.notificationId || notifRow.id || undefined
        notification.createdAt = notifRow.createdAt || notification.createdAt
      }
    } catch (e) {
      console.warn('createEvent: notification insert threw:', e)
    }

    const io = req.app.get("io")
    if (io) {
      io.emit("notification", notification)
      
      // Clear notification cache for ALL users
      // This is intentional for global notifications (events) since everyone needs to see them
      // Trade-off: All users get cache miss on next request, but ensures immediate visibility
      await cache.clearPattern('notifications:*');
    } else {
      console.warn("[event] io not available to emit notification")
    }

    // Fire-and-forget: SendGrid announcement broadcast (non-blocking)
    try {
      const eventForEmail = {
        eventId: data?.eventId,
        title: data?.title,
        details: data?.details,
        startsAt: data?.startsAt,
        venueName: data?.venueName,
        image: data?.image || null,
      };
      setImmediate(() => {
        sendEventAnnouncement({ event: eventForEmail })
          .then(r => console.log('[event][sendgrid] broadcast:', r))
          .catch(e => console.warn('[event][sendgrid] broadcast failed:', e?.message || e));
      });
    } catch (e) {
      console.warn('[event][sendgrid] scheduling failed:', e?.message || e);
    }

    // Create an announcement post entry linked to this event
    // This should not block event creation in case of a minor failure
    try {
      const announce = {
        title: title,
        userId: req.user?.id || null,
        datePosted: new Date().toISOString(),
        date: startsAt, // event start as the announcement date
        venueName: _venueName,
        isAnnouncement: true,
        eventId: data?.eventId || null, // store eventId directly on post for reliable linking
      };
      const { data: postRow, error: postErr } = await db
        .from('post')
        .insert(announce)
        .select('*')
        .single();

      if (postErr) {
        console.warn('createEvent: announcement post creation failed:', postErr);
        return res.status(201).json({ data, announcement: null, warning: 'Event created but announcement failed' });
      }
      return res.status(201).json({ data, announcement: postRow });
    } catch (e) {
      console.warn('createEvent: announcement post creation threw:', e);
      return res.status(201).json({ data, announcement: null, warning: 'Event created but announcement failed' });
    }
  } catch (err) {
    console.error('createEvent: unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Missing event id' });

    // Load current row
    const current = await db.from('event').select('*').eq('eventId', id).single();
    if (current.error || !current.data) return res.status(404).json({ error: 'Event not found' });

    const body = req.body || {};
    const s = (v) => (typeof v === 'string' ? v.trim() : v);

    const title = s(body.title ?? current.data.title);
    const details = s(body.details ?? current.data.details);
    const venueName = s(body.venueName ?? current.data.venueName);
    const venueAddress = s(body.venueAddress ?? current.data.venueAddress);
    const startsAt = body.startsAt ?? current.data.startsAt;
    const endsAt = body.endsAt ?? current.data.endsAt;
    const admission = s(body.admission ?? current.data.admission);
    const admissionNote = s(body.admissionNote ?? current.data.admissionNote);

    // Dates validation
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return res.status(400).json({ error: 'Invalid or inconsistent dates' });
    }

    // Activities normalization
    let activities = current.data.activities || [];
    if (typeof body.activities !== 'undefined') {
      if (Array.isArray(body.activities)) activities = body.activities;
      else if (typeof body.activities === 'string') {
        try { const p = JSON.parse(body.activities); if (Array.isArray(p)) activities = p; }
        catch { activities = body.activities.split(/\r?\n|,\s*/).map(s => s.trim()).filter(Boolean); }
      }
    }

    // Image: prefer multer file, else direct URL string, else keep
    let image = current.data.image || null;
    if (req.file && req.file.buffer) {
      try {
        const filenameSafe = (req.file.originalname || 'image').replace(/[^a-zA-Z0-9_.-]/g, '_');
        const filePath = `events/${Date.now()}-${filenameSafe}`;
        const { error: upErr } = await db.storage
          .from('uploads')
          .upload(filePath, req.file.buffer, { contentType: req.file.mimetype || 'application/octet-stream', upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = db.storage.from('uploads').getPublicUrl(filePath);
        image = pub?.publicUrl || image;
      } catch (e) {
        console.error('updateEvent: storage upload failed:', e);
      }
    } else if (typeof body.image === 'string' && body.image.trim()) {
      image = body.image.trim();
    }

    if (!title || !details || !venueName || !venueAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!image) return res.status(400).json({ error: 'Event cover image is required' });
    if (!activities || activities.length === 0) return res.status(400).json({ error: 'At least one activity is required' });

    const updatePayload = { title, details, venueName, venueAddress, startsAt, endsAt, admission, admissionNote, activities, image };

    const { data, error } = await db
      .from('event')
      .update(updatePayload)
      .eq('eventId', id)
      .select('*')
      .single();
    if (error) return res.status(500).json({ error: 'Failed to update event' });
    
    // Clear events cache and specific event cache
    await cache.del('events:*');
    await cache.del(`event:${id}`);
    console.log('🗑️ Events cache invalidated after update');
    
    return res.status(200).json({ data });
  } catch (err) {
    console.error('updateEvent: unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Missing event id' });
    const { error } = await db.from('event').delete().eq('eventId', id);
    if (error) return res.status(500).json({ error: 'Failed to delete event' });
    
    // Clear events list cache (event removed from list) and specific event cache
    await cache.del('events:*');
    await cache.del(`event:${id}`);
    console.log('🗑️ Events cache invalidated after delete');
    
    return res.status(204).send();
  } catch (err) {
    console.error('deleteEvent: unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
};


export const joinEvent = async (req, res) => {
  try {
    const userId = req.user?.id; // auth user id
    const eventId = req.body?.eventId; // event.eventId (uuid)

    console.log("userId", userId, "eventId", eventId)
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!eventId) return res.status(400).json({ error: 'Missing eventId' });

    // Verify event exists
    const { data: ev, error: evErr } = await db.from('event').select('eventId').eq('eventId', eventId).single();
    if (evErr || !ev) {
      console.warn('joinEvent: event lookup failed:', evErr);
      return res.status(404).json({ error: 'Event not found' });
    }


    // Check if already joined
    const { data: existsRows, error: existsErr } = await db
      .from('eventParticipant')
      .select('eventParticipantId')
      .eq('eventId', eventId)
      .eq('userId', userId);
    if (existsErr) {
      console.error('joinEvent: exists check failed:', existsErr);
      return res.status(500).json({ error: 'Failed to check participation' });
    }
    if (Array.isArray(existsRows) && existsRows.length > 0) {
      // Toggle OFF: remove participation
      const row = existsRows[0];
      const { error: delErr } = await db
        .from('eventParticipant')
        .delete()
        .eq('eventParticipantId', row.eventParticipantId);
      if (delErr) {
        console.error('joinEvent: delete failed:', delErr);
        return res.status(500).json({ error: 'Failed to cancel participation' });
      }
      
      // Clear participants cache for this event
      await cache.del(`participants:event:${eventId}`);
      // Clear user's myEvents cache
      await cache.del(`myEvents:${userId}`);
      // Clear user's isJoined cache for this event
      await cache.del(`isJoined:${userId}:${eventId}`);
      console.log(`🗑️ Cleared participants, myEvents, and isJoined cache after leave`);
      
      return res.status(200).json({ ok: true, removed: true });
    }

    // Toggle ON: Insert participation using auth userId
    const payload = {eventId, userId, joinedAt: new Date().toISOString() };
    const { data, error } = await db.from('eventParticipant').insert(payload).select('*').single();
    if (error) {
      // If a unique constraint exists on (userId,eventId), treat violation as already joined
      if (error.code === '23505') {
        return res.status(200).json({ ok: true, joined: true });
      }
      console.error('joinEvent: insert failed:', error);
      return res.status(500).json({ error: 'Failed to join event', details: error.message || error });
    }
    
    // Clear participants cache for this event
    await cache.del(`participants:event:${eventId}`);
    // Clear user's myEvents cache
    await cache.del(`myEvents:${userId}`);
    // Clear user's isJoined cache for this event
    await cache.del(`isJoined:${userId}:${eventId}`);
    console.log(`🗑️ Cleared participants, myEvents, and isJoined cache after join`);
    
    return res.status(201).json({ ok: true, joined: true, participation: data });
  } catch (err) {
    console.error('joinEvent: unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected server error', details: String(err?.message || err) });
  }
}

// POST /api/event/notifyEventEnded
// Body: { eventId: string }
export const notifyEventEndedController = async (req, res) => {
  try {
    const eventId = req.body?.eventId;
    if (!eventId) return res.status(400).json({ error: 'Missing eventId' });
    const result = await notifyEventEndedService({ eventId });
    return res.status(200).json(result);
  } catch (err) {
    console.error('notifyEventEndedController: unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
};

export const isJoined = async (req, res) => {
  try {
    const userId = req.user?.id;
    const eventId = req.query?.eventId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!eventId) return res.status(400).json({ error: 'Missing eventId' });
    
    // Check cache first (2 minutes - join status changes when user joins/leaves)
    const cacheKey = `isJoined:${userId}:${eventId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log('✅ Cache HIT:', cacheKey);
      return res.status(200).json(cached);
    }
    console.log('❌ Cache MISS:', cacheKey);
    
    const { data, error } = await db
      .from('eventParticipant')
      .select('eventParticipantId')
      .eq('eventId', eventId)
      .eq('userId', userId)
      .limit(1);
    if (error) return res.status(500).json({ error: 'Failed to check participation' });
    const joined = Array.isArray(data) && data.length > 0;
    
    const result = { ok: true, joined };
    
    // Cache for 2 minutes (join status)
    await cache.set(cacheKey, result, 120);
    console.log('💾 CACHED:', cacheKey);
    
    return res.status(200).json(result);
  } catch (err) {
    console.error('isJoined: unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
}

export const myEvents = async (req, res) => {
  try{
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    // Check cache first (2 minutes - user's events don't change frequently)
    const cacheKey = `myEvents:${userId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log('✅ Cache HIT:', cacheKey);
      return res.status(200).json(cached);
    }
    console.log('❌ Cache MISS:', cacheKey);
    
    // Get joined event IDs
    const { data: epRows, error: epErr } = await db
      .from('eventParticipant')
      .select('eventId')
      .eq('userId', userId);
    if (epErr) return res.status(500).json({ error: 'Failed to fetch events' });
    const ids = (epRows || []).map(r => r.eventId).filter(Boolean);
    if (ids.length === 0) {
      const result = { ok: true, events: [] };
      // Cache empty result too (2 minutes)
      await cache.set(cacheKey, result, 120);
      console.log('💾 CACHED (empty):', cacheKey);
      return res.status(200).json(result);
    }
    // Fetch full event details
    const { data: events, error: evErr } = await db
      .from('event')
      .select('eventId, title, details, startsAt, endsAt, venueName, venueAddress, image, admission, admissionNote, activities')
      .in('eventId', ids);
    if (evErr) return res.status(500).json({ error: 'Failed to fetch event details' });
    
    const result = { ok: true, events };
    
    // Cache for 2 minutes (user's joined events)
    await cache.set(cacheKey, result, 120);
    console.log('💾 CACHED:', cacheKey);
    
    return res.status(200).json(result);
  }catch(err){
    console.error('myEvents: unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
}



export const eventParticipants = async (req, res) => {
  try{
    const eventId = req.body?.eventId;
    if (!eventId) return res.status(400).json({ error: 'Missing eventId' });

    // Check cache first (30 seconds - participants change frequently)
    const cacheKey = `participants:event:${eventId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log('✅ Cache HIT:', cacheKey);
      return res.status(200).json(cached);
    }
    console.log('❌ Cache MISS:', cacheKey);

    // 1) Get participant rows for the event (include timestamps)
    const { data: rows, error: partErr } = await db
      .from('eventParticipant')
      .select('*')
      .eq('eventId', eventId);
    if (partErr) return res.status(500).json({ error: 'Failed to fetch participants' });

    const ids = (rows || []).map(r => r.userId).filter(Boolean);
    if (ids.length === 0) {
      const result = { ok: true, participants: [] };
      // Cache empty result too (2 minutes)
      await cache.set(cacheKey, result, 120);
      console.log('💾 CACHED (empty):', cacheKey);
      return res.status(200).json(result);
    }

    // 2) Fetch profile details for those userIds
    const { data: users, error: profErr } = await db
      .from('profile')
      .select('userId, firstName, lastName, middleName, username, profilePicture')
      .in('userId', ids);
    if (profErr) return res.status(500).json({ error: 'Failed to fetch user details' });

    // 3) Merge join timestamp per userId; support various timestamp column names
    const byId = new Map((rows || []).map(r => [r.userId, r]));
    const merged = (users || []).map(u => {
      const row = byId.get(u.userId) || {};
      const joinedAt = row.joinedAt || row.createdAt || row.created_at || row.inserted_at || null;
      return { ...u, joinedAt };
    });

    const result = { ok: true, participants: merged };
    
    // Cache for 2 minutes (participants don't change that frequently)
    await cache.set(cacheKey, result, 120);
    console.log('💾 CACHED:', cacheKey);

    return res.status(200).json(result);
  }catch(err){
    console.error('eventParticipants: unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
}
  

export const removeParticipant = async (req, res) => {
  try{
    const eventId = req.body?.eventId;
    const userId = req.body?.userId;
    if (!eventId || !userId) return res.status(400).json({ error: 'Missing eventId or userId' });
    const { error } = await db
      .from('eventParticipant')
      .delete()
      .eq('eventId', eventId)
      .eq('userId', userId);
    if (error) return res.status(500).json({ error: 'Failed to remove participant' });
    
    // Clear participants cache for this event
    await cache.del(`participants:event:${eventId}`);
    console.log(`🗑️ Cleared participants cache for event ${eventId} after remove`);
    
    return res.status(204).send();
  }catch(err){
    console.error('removeParticipant: unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
}