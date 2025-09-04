
import db from '../database/db.js';

export const getAllEvents = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, userId, scope = 'upcoming', sort } = req.query;
    const today = new Date().toISOString().slice(0, 10);
    let query = db.from('event').select('*');
    if (userId) query = query.eq('userId', userId);
    if (scope === 'upcoming') {
      query = query.gte('startsAt', today);
    } else if (scope === 'past') {
      query = query.lte('endsAt', today);
    }
    const ascending = typeof sort === 'string' ? sort === 'asc' : scope !== 'past';
    query = query.order('startsAt', { ascending });
    const from = (Number(page) - 1) * Number(pageSize);
    const to = from + Number(pageSize) - 1;
    query = query.range(from, to);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await db.from('event').select('*').eq('eventId', id).single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
};

export const createEvent = async (req, res) => {
  try {
    const { title, details, venue, startsAt, endsAt, userId } = req.body;
    if (!title || !startsAt || !endsAt || !userId) {
      return res.status(400).json({ error: 'title, startsAt, endsAt, userId are required' });
    }
    const payload = { title, details: details ?? null, venue: venue ?? null, startsAt, endsAt, userId };
    const { data, error } = await db.from('event').insert([payload]).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const patch = req.body;
    const { data, error } = await db.from('event').update(patch).eq('eventId', id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await db.from('event').delete().eq('eventId', id).select().single();
    if (error) throw error;
    res.json({ deleted: data.eventId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
