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

// GET /api/auctions/seller/my-auctions?status=
export const getSellerAuctions = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    // Resolve seller profile
    const { data: sellerProfile, error: spErr } = await db
      .from('sellerProfiles')
      .select('sellerProfileId')
      .eq('userId', userId)
      .eq('isActive', true)
      .single();
    if (spErr || !sellerProfile) {
      return res.status(403).json({ success: false, error: 'Must be an active seller' });
    }

    const { status } = req.query || {};
    let query = db
      .from('auctions')
      .select('*, auction_items(*)')
      .eq('sellerProfileId', sellerProfile.sellerProfileId)
      .order('startAt', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error fetching seller auctions:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// PUT /api/auctions/:auctionId/activate-now
export const activateAuctionNow = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { auctionId } = req.params;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!auctionId) return res.status(400).json({ success: false, error: 'Missing auctionId' });

    // Resolve seller profile
    const { data: sellerProfile, error: spErr } = await db
      .from('sellerProfiles')
      .select('sellerProfileId')
      .eq('userId', userId)
      .eq('isActive', true)
      .single();
    if (spErr || !sellerProfile) {
      return res.status(403).json({ success: false, error: 'Must be an active seller' });
    }

    // Load auction
    const { data: auction, error: aErr } = await db
      .from('auctions')
      .select('*')
      .eq('auctionId', auctionId)
      .single();
    if (aErr || !auction) return res.status(404).json({ success: false, error: 'Auction not found' });
    if (auction.sellerProfileId !== sellerProfile.sellerProfileId) {
      return res.status(403).json({ success: false, error: 'Not authorized to modify this auction' });
    }

    // Validate timing and status
    const now = new Date();
    if (new Date(auction.endAt) <= now) {
      return res.status(400).json({ success: false, error: 'Auction already ended' });
    }
    if (auction.status === 'active') {
      return res.status(400).json({ success: false, error: 'Auction already active' });
    }

    // Activate immediately
    const { data: updated, error: uErr } = await db
      .from('auctions')
      .update({ status: 'active', startAt: now.toISOString() })
      .eq('auctionId', auctionId)
      .select('*')
      .single();
    if (uErr) throw new Error(uErr.message);

    return res.json({ success: true, message: 'Auction activated', data: updated });
  } catch (error) {
    console.error('Error activating auction:', error);
    return res.status(500).json({ success: false, error: error.message });
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

    console.log('📋 listAuctions - Query params:', { status, page, limit, offset });

    let query = db
      .from('auctions')
      .select(`
        auctionId,
        sellerProfileId,
        auctionItemId,
        startPrice,
        minIncrement,
        startAt,
        endAt,
        status,
        singleBidOnly,
        allowBidUpdates,
        created_at,
        updated_at,
        auction_items (
          auctionItemId,
          title,
          description,
          primary_image,
          images,
          medium,
          dimensions,
          year_created,
          weight_kg,
          is_original,
          is_framed,
          condition,
          categories,
          tags,
          seller:sellerProfiles (
            sellerProfileId,
            shopName,
            shopDescription,
            fullName,
            email
          )
        )
      `)
      .order('endAt', { ascending: true })
      .range(offset, offset + parseInt(limit) - 1);

    if (status) {
      console.log('🔍 Filtering by status:', status);
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      console.error('❌ Database error:', error.message);
      throw new Error(error.message);
    }

    console.log(`✅ listAuctions - Found ${data?.length || 0} auctions`);
    console.log('📦 Sample auction data:', JSON.stringify(data?.[0], null, 2));

    res.json({
      success: true,
      data,
      pagination: { page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (error) {
    console.error('❌ Error listing auctions:', error);
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

    // Extract and validate FormData fields
    const {
      title,
      description,
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

    // Handle image uploads to Supabase storage
    let imageUrls = [];
    let primaryImageUrl = null;

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const safeName = file.originalname?.replace(/[^a-zA-Z0-9._-]/g, "_") || "image.png";
          const fileName = `${Date.now()}-${safeName}`;
          const filePath = `auctions/${userId}/${fileName}`;

          const { data, error } = await db.storage
            .from("uploads")
            .upload(filePath, file.buffer, {
              contentType: file.mimetype,
              upsert: false,
            });

          if (error) {
            console.error(`Error uploading ${file.originalname}:`, error);
            continue;
          }

          const { data: publicUrlData } = db.storage
            .from("uploads")
            .getPublicUrl(data.path);

          if (publicUrlData?.publicUrl) {
            imageUrls.push(publicUrlData.publicUrl);
          }
        } catch (uploadError) {
          console.error(`Upload error for ${file.originalname}:`, uploadError);
          continue;
        }
      }

      // First image becomes primary
      if (imageUrls.length > 0) {
        primaryImageUrl = imageUrls[0];
      }
    }

    // Validate required fields
    if (!title || title.trim().length < 3) {
      return res.status(400).json({ success: false, error: 'Title must be at least 3 characters' });
    }
    if (!medium) {
      return res.status(400).json({ success: false, error: 'Medium is required' });
    }
    if (!dimensions) {
      return res.status(400).json({ success: false, error: 'Dimensions are required' });
    }

    // Parse JSON strings from FormData
    let parsedCategories = [];
    let parsedTags = [];
    try {
      if (categories && typeof categories === 'string') {
        parsedCategories = JSON.parse(categories);
      } else if (Array.isArray(categories)) {
        parsedCategories = categories;
      }
      if (tags && typeof tags === 'string') {
        parsedTags = JSON.parse(tags);
      } else if (Array.isArray(tags)) {
        parsedTags = tags;
      }
    } catch (parseErr) {
      console.error('Error parsing categories/tags:', parseErr);
      return res.status(400).json({ success: false, error: 'Invalid categories or tags format' });
    }

    if (parsedCategories.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one category is required' });
    }

    if (imageUrls.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one image is required' });
    }

    // Build auction item object
    const auctionItem = {
      userId,
      sellerProfileId: sellerProfile.sellerProfileId,
      title: title.trim(),
      description: description || null,
      images: imageUrls,
      primary_image: primaryImageUrl,
      medium: medium.trim(),
      dimensions: dimensions.trim(),
      year_created: year_created ? parseInt(year_created) : null,
      weight_kg: weight_kg ? parseFloat(weight_kg) : null,
      is_original: is_original === 'true' || is_original === true,
      is_framed: is_framed === 'true' || is_framed === true,
      condition: condition || 'excellent',
      categories: parsedCategories,
      tags: parsedTags
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

// GET /api/auctions/items/my-items - Get user's auction items (seller only)
export const getUserAuctionItems = async (req, res) => {
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

    // Fetch user's auction items with all details
    const { data: items, error: err } = await db
      .from('auction_items')
      .select('*')
      .eq('userId', userId)
      .order('created_at', { ascending: false });

    if (err) throw new Error(err.message);

    res.json({
      success: true,
      data: items || []
    });
  } catch (error) {
    console.error('Error fetching user auction items:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// DELETE /api/auctions/items/:auctionItemId - Delete auction item (seller only)
export const deleteAuctionItem = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { auctionItemId } = req.params;
    
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!auctionItemId) return res.status(400).json({ success: false, error: 'Item ID required' });

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

    // Verify ownership
    const { data: item, error: itemErr } = await db
      .from('auction_items')
      .select('auctionItemId, userId, images')
      .eq('auctionItemId', auctionItemId)
      .single();
    
    if (itemErr || !item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    if (item.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this item' });
    }

    // Check if item is already used in an auction
    const { data: auction, error: auctionErr } = await db
      .from('auctions')
      .select('auctionId')
      .eq('auctionItemId', auctionItemId)
      .single();
    
    if (auction) {
      return res.status(400).json({ success: false, error: 'Cannot delete item that is already in an auction' });
    }

    // Delete images from storage
    if (item.images && Array.isArray(item.images)) {
      for (const imageUrl of item.images) {
        try {
          let filePath = '';
          if (imageUrl.includes('/storage/v1/object/public/uploads/')) {
            filePath = imageUrl.split('/storage/v1/object/public/uploads/')[1];
          }
          if (filePath) {
            await db.storage.from('uploads').remove([filePath]);
          }
        } catch (storageErr) {
          console.error('Error deleting image:', storageErr);
        }
      }
    }

    // Delete item from database
    const { error: deleteErr } = await db
      .from('auction_items')
      .delete()
      .eq('auctionItemId', auctionItemId);

    if (deleteErr) throw new Error(deleteErr.message);

    res.json({
      success: true,
      message: 'Auction item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting auction item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// PUT /api/auctions/items/:auctionItemId - Update auction item (seller only)
export const updateAuctionItem = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { auctionItemId } = req.params;
    
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!auctionItemId) return res.status(400).json({ success: false, error: 'Item ID required' });

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

    // Verify ownership
    const { data: item, error: itemErr } = await db
      .from('auction_items')
      .select('*')
      .eq('auctionItemId', auctionItemId)
      .single();
    
    if (itemErr || !item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    if (item.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized to update this item' });
    }

    // Extract updateable fields
    const {
      title,
      description,
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

    // Build update object
    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description || null;
    if (medium !== undefined) updateData.medium = medium.trim();
    if (dimensions !== undefined) updateData.dimensions = dimensions.trim();
    if (year_created !== undefined) updateData.year_created = year_created ? parseInt(year_created) : null;
    if (weight_kg !== undefined) updateData.weight_kg = weight_kg ? parseFloat(weight_kg) : null;
    if (is_original !== undefined) updateData.is_original = is_original === 'true' || is_original === true;
    if (is_framed !== undefined) updateData.is_framed = is_framed === 'true' || is_framed === true;
    if (condition !== undefined) updateData.condition = condition;
    if (categories !== undefined) {
      try {
        updateData.categories = typeof categories === 'string' ? JSON.parse(categories) : categories;
      } catch (e) {
        return res.status(400).json({ success: false, error: 'Invalid categories format' });
      }
    }
    if (tags !== undefined) {
      try {
        updateData.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (e) {
        return res.status(400).json({ success: false, error: 'Invalid tags format' });
      }
    }

    updateData.updated_at = new Date().toISOString();

    // Update item
    const { data: updatedItem, error: updateErr } = await db
      .from('auction_items')
      .update(updateData)
      .eq('auctionItemId', auctionItemId)
      .select()
      .single();

    if (updateErr) throw new Error(updateErr.message);

    res.json({
      success: true,
      message: 'Auction item updated successfully',
      data: updatedItem
    });
  } catch (error) {
    console.error('Error updating auction item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export default {
  getAuctionDetails,
  getMyBid,
  placeBid,
  listAuctions,
  createAuctionItem,
  createAuction,
  getUserAuctionItems,
  deleteAuctionItem,
  updateAuctionItem,
  getSellerAuctions,
  activateAuctionNow
};
