// backend/controllers/searchController.js
import db from '../database/db.js';

function num(v, d) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
}

function ilikePattern(q) {
  const s = (q || '').toString().trim();
  if (!s) return '%';
  // Escape % and _ for LIKE
  return `%${s.replace(/[%_]/g, m => `\\${m}`)}%`;
}

// For PostgREST OR() filters, wildcards should use '*' instead of '%'
function ilikeStarPattern(q) {
  const s = (q || '').toString().trim();
  if (!s) return '*';
  // Basic escape for '*' in the input
  const safe = s.replace(/[*,]/g, m => `\\${m}`);
  return `*${safe}*`;
}

async function searchArtists(q, page, limit) {
  const offset = (page - 1) * limit;
  const pattern = ilikePattern(q);
  let query = db
    .from('profile')
    .select('userId, username, firstName, lastName, middleName, profilePicture', { count: 'exact' })
    .in('role', ['artist', 'admin'])
    .or(`username.ilike.${pattern},firstName.ilike.${pattern},lastName.ilike.${pattern},middleName.ilike.${pattern}`)
    .range(offset, offset + limit - 1);
  const { data, error, count } = await query;
  if (error) throw error;
  const items = (data || []).map(p => ({
    id: p.username || p.userId,
    username: p.username || null,
    name: [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ').trim() || p.username || 'Artist',
    hero: p.profilePicture || null,
  }));
  return { items, total: count || 0 };
}

async function searchProducts(q, page, limit) {
  const offset = (page - 1) * limit;
  const pattern = ilikePattern(q);
  let query = db
    .from('marketplace_items')
    .select('marketItemId, title, description, price, primary_image', { count: 'exact' })
    .eq('status', 'active')
    .eq('is_available', true)
    .or(`title.ilike.${pattern},description.ilike.${pattern}`)
    .range(offset, offset + limit - 1);
  const { data, error, count } = await query;
  if (error) throw error;
  const items = (data || []).map(it => ({
    id: it.marketItemId,
    title: it.title,
    description: it.description,
    price: it.price,
    image: it.primary_image || null,
  }));
  return { items, total: count || 0 };
}

async function searchEvents(q, page, limit) {
  const offset = (page - 1) * limit;
  const pattern = ilikePattern(q);
  let query = db
    .from('event')
    .select('eventId, title, details, image, venueName, startsAt, endsAt', { count: 'exact' })
    .or(`title.ilike.${pattern},details.ilike.${pattern},venueName.ilike.${pattern}`)
    .order('startsAt', { ascending: false })
    .range(offset, offset + limit - 1);
  const { data, error, count } = await query;
  if (error) throw error;
  const items = (data || []).map(ev => ({
    id: ev.eventId,
    eventId: ev.eventId,
    title: ev.title,
    details: ev.details,
    image: ev.image,
    venueName: ev.venueName,
    startsAt: ev.startsAt,
    endsAt: ev.endsAt,
  }));
  return { items, total: count || 0 };
}

async function searchAuctions(q, page, limit) {
  const offset = (page - 1) * limit;
  const pattern = ilikePattern(q);
  const star = ilikeStarPattern(q);
  let query = db
    .from('auctions')
    .select('auctionId, status, endAt, startAt, startPrice, reservePrice, minIncrement, auction_items!inner(title, primary_image, images, description)', { count: 'exact' })
    .or(`title.ilike.${star},description.ilike.${star}`, { foreignTable: 'auction_items' })
    .in('status', ['active', 'scheduled'])
    .order('endAt', { ascending: true })
    .range(offset, offset + limit - 1);
  const { data, error, count } = await query;
  if (error) throw error;
  const items = (data || []).map(a => ({
    id: a.auctionId,
    auctionId: a.auctionId,
    title: a.auction_items?.title || 'Auction Item',
    description: a.auction_items?.description || null,
    image: a.auction_items?.primary_image || null,
    primary_image: a.auction_items?.primary_image || null,
    images: a.auction_items?.images || [],
    status: a.status,
    endAt: a.endAt,
    startAt: a.startAt,
    startPrice: a.startPrice,
    reservePrice: a.reservePrice,
    minIncrement: a.minIncrement,
  }));
  return { items, total: count || 0 };
}

export const unifiedSearch = async (req, res) => {
  try {
    const q = (req.query?.q || '').toString();
    const tab = (req.query?.tab || 'all').toString();
    const page = num(req.query?.page, 1);
    const limit = Math.min(num(req.query?.limit, 12), 50);

    // Always compute counts for all categories.
    // Fetch items for active tab (or all tabs when tab='all').
    const artistPage = tab === 'artists' ? page : 1;
    const productPage = tab === 'products' ? page : 1;
    const eventPage = tab === 'events' ? page : 1;
    const auctionPage = tab === 'auctions' ? page : 1;

    const artistLimit = (tab === 'all' || tab === 'artists') ? limit : 1;
    const productLimit = (tab === 'all' || tab === 'products') ? limit : 1;
    const eventLimit = (tab === 'all' || tab === 'events') ? limit : 1;
    const auctionLimit = (tab === 'all' || tab === 'auctions') ? limit : 1;

    const [artists, products, events, auctions] = await Promise.all([
      searchArtists(q, artistPage, artistLimit),
      searchProducts(q, productPage, productLimit),
      searchEvents(q, eventPage, eventLimit),
      searchAuctions(q, auctionPage, auctionLimit),
    ]);

    return res.status(200).json({
      success: true,
      q,
      tab,
      page,
      limit,
      counts: {
        artists: artists.total,
        products: products.total,
        events: events.total,
        auctions: auctions.total,
      },
      artists: tab === 'all' || tab === 'artists' ? artists : { items: [], total: artists.total },
      products: tab === 'all' || tab === 'products' ? products : { items: [], total: products.total },
      events: tab === 'all' || tab === 'events' ? events : { items: [], total: events.total },
      auctions: tab === 'all' || tab === 'auctions' ? auctions : { items: [], total: auctions.total },
    });
  } catch (err) {
    console.error('[search] unifiedSearch failed:', err);
    return res.status(500).json({ success: false, error: 'Search failed' });
  }
};
