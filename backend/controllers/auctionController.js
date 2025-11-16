// backend/controllers/auctionController.js
// REST handlers for blind auction endpoints
// All DB queries here, external APIs in auctionService

import db from '../database/db.js';
import auctionService from '../services/auctionService.js';

const PAYMENT_WINDOW_HOURS = Number(process.env.AUCTION_PAYMENT_WINDOW_HOURS || 24);

// HELPER: Add hours to date
function addHours(date, hours) {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

// GET /api/auctions/:auctionId
export const getAuctionDetails = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const userId = req.user?.id;

    // ✅ DB QUERY IN CONTROLLER
    const { data: auction, error: aerr } = await db
      .from('auctions')
      .select('*')
      .eq('auctionId', auctionId)
      .single();
    if (aerr || !auction) throw new Error('Auction not found');

    // ✅ DB QUERY IN CONTROLLER - Count participants
    const { data: bids } = await db
      .from('auction_bids')
      .select('bidderUserId')
      .eq('auctionId', auctionId)
      .eq('isWithdrawn', false);
    const participantsCount = bids ? new Set(bids.map(b => b.bidderUserId)).size : 0;

    // Only show participant count to seller or admin (not to bidders - blind auction principle)
    const isSeller = auction.sellerProfileId && userId === auction.sellerProfileId;
    const isAdmin = req.user?.role === 'admin';
    const showParticipantCount = isSeller || isAdmin;

    res.json({
      success: true,
      data: {
        ...auction,
        ...(showParticipantCount && { participantsCount })
      }
    });
  } catch (error) {
    console.error('Error fetching auction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/auctions/:auctionId/my-bid
export const getMyBid = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    // ✅ DB QUERY IN CONTROLLER
    const { data: bid, error } = await db
      .from('auction_bids')
      .select('*')
      .eq('auctionId', auctionId)
      .eq('bidderUserId', userId)
      .eq('isWithdrawn', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw new Error(error.message);

    res.json({
      success: true,
      data: bid ? { amount: bid.amount, created_at: bid.created_at } : null
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/auctions/:auctionId/bids
export const placeBid = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { amount, userAddressId, idempotencyKey } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid bid amount' });
    }

    // Validate userAddressId if provided
    if (userAddressId) {
      const { data: addr, error: addrErr } = await db
        .from('user_addresses')
        .select('userAddressId')
        .eq('userAddressId', userAddressId)
        .single();
      if (addrErr || !addr) {
        return res.status(400).json({ success: false, error: 'Invalid shipping address' });
      }
    }

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
        return res.status(201).json({ success: true, message: 'Bid placed successfully', data: existing });
      }
    }

    // ✅ LOAD AUCTION - DB QUERY IN CONTROLLER
    const { data: auction, error: aerr } = await db
      .from('auctions')
      .select('*')
      .eq('auctionId', auctionId)
      .single();
    if (aerr || !auction) throw new Error('Auction not found');

    // VALIDATION 1: Bidding window open
    const now = new Date();
    if (!(new Date(auction.startAt) <= now && now < new Date(auction.endAt))) {
      throw new Error('Bidding window is closed');
    }

    // VALIDATION 2: Auction must be 'active'
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
      .order('amount', { ascending: false });
    const hasBid = userBids && userBids.length > 0;

    // VALIDATION 3: Check auction policies
    if (auction.singleBidOnly && hasBid) {
      throw new Error('Only one bid allowed for this auction');
    }
    if (!auction.allowBidUpdates && hasBid) {
      throw new Error('Bid updates are disabled for this auction');
    }

    // VALIDATION 4: Bid amount checks
    const userHighest = hasBid ? userBids[0].amount : 0;
    if (hasBid && amount <= userHighest) {
      throw new Error('New bid must be higher than your previous bid');
    }
    if (!hasBid && amount < auction.startPrice) {
      throw new Error('Bid must be at least the starting price');
    }
    if (hasBid && auction.minIncrement > 0) {
      const delta = amount - userHighest;
      if (delta < auction.minIncrement) {
        throw new Error(`Minimum increment is ₱${auction.minIncrement}`);
      }
    }

    // ✅ INSERT BID - DB QUERY IN CONTROLLER
    const bidData = { auctionId, bidderUserId: userId, amount };
    if (idempotencyKey) bidData.idempotencyKey = idempotencyKey;
    if (userAddressId) bidData.userAddressId = userAddressId;

    const { data: bid, error } = await db
      .from('auction_bids')
      .insert([bidData])
      .select()
      .single();
    if (error) throw new Error(error.message);

    res.status(201).json({
      success: true,
      message: 'Bid placed successfully',
      data: bid
    });
  } catch (error) {
    console.error('Error placing bid:', error);
    const statusCode = error.message.includes('closed') || error.message.includes('not active') ? 400 : 500;
    res.status(statusCode).json({ success: false, error: error.message });
  }
};

// GET /api/auctions?status=active&page=1&limit=20
export const listAuctions = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = db
      .from('auctions')
      .select('*')
      .order('endAt', { ascending: true })
      .range(offset, offset + parseInt(limit) - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    res.json({
      success: true,
      data,
      pagination: { page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (error) {
    console.error('Error listing auctions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/auctions/items (seller only) - Create auction item
export const createAuctionItem = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    // Verify seller profile
    const { data: sellerProfile, error: spErr } = await db
      .from('sellerProfiles')
      .select('sellerProfileId')
      .eq('userId', userId)
      .eq('isActive', true)
      .single();
    if (spErr || !sellerProfile) {
      return res.status(403).json({ success: false, error: 'Must be an active seller' });
    }

    const {
      title,
      description,
      images,
      primary_image,
      medium,
      dimensions,
      year_created,
      weight_kg,
      is_original,
      is_framed,
      condition,
      categories,
      tags
    } = req.body;

    const auctionItem = {
      userId,
      sellerProfileId: sellerProfile.sellerProfileId,
      title,
      description,
      images,
      primary_image,
      medium,
      dimensions,
      year_created,
      weight_kg,
      is_original,
      is_framed,
      condition,
      categories,
      tags
    };

    const { data, error } = await db
      .from('auction_items')
      .insert([auctionItem])
      .select()
      .single();

    if (error) throw new Error(error.message);

    res.status(201).json({
      success: true,
      message: 'Auction item created',
      data
    });
  } catch (error) {
    console.error('Error creating auction item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/auctions (seller only) - Create auction
export const createAuction = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const {
      auctionItemId,
      startPrice,
      reservePrice,
      minIncrement,
      startAt,
      endAt
    } = req.body;

    // ✅ VERIFY SELLER PROFILE - DB QUERY IN CONTROLLER
    const { data: sellerProfile, error: spErr } = await db
      .from('sellerProfiles')
      .select('sellerProfileId')
      .eq('userId', userId)
      .eq('isActive', true)
      .single();
    if (spErr || !sellerProfile) {
      return res.status(403).json({ success: false, error: 'Must be an active seller' });
    }

    // ✅ AUTO-SET STATUS - DB QUERY IN CONTROLLER
    const nowISO = new Date().toISOString();
    const status = new Date(startAt) > new Date(nowISO) ? 'scheduled' : 'active';

    // ✅ CREATE AUCTION - DB QUERY IN CONTROLLER
    const { data: auction, error } = await db
      .from('auctions')
      .insert([{
        sellerProfileId: sellerProfile.sellerProfileId,
        auctionItemId,
        startPrice,
        reservePrice,
        minIncrement,
        startAt,
        endAt,
        status
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);

    res.status(201).json({
      success: true,
      message: 'Auction created',
      data: auction
    });
  } catch (error) {
    console.error('Error creating auction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export default {
  getAuctionDetails,
  getMyBid,
  placeBid,
  listAuctions,
  createAuctionItem,
  createAuction
};
