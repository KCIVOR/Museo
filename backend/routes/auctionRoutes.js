import express from 'express';
import multer from 'multer';
import { validateRequest } from '../middleware/validation.js';
import { requirePermission } from '../middleware/permission.js';
import {
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
  activateAuctionNow,
  forceExpireAndRollover,
  updateAuction,
  getAuctionBids,
  getMyBids,
  pauseAuction,
  resumeAuction,
  cancelAuction
} from '../controllers/auctionController.js';

const router = express.Router();

// Multer setup for multipart/form-data (image uploads)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (
      file.mimetype === 'image/jpeg' ||
      file.mimetype === 'image/jpg' ||
      file.mimetype === 'image/png'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG and PNG files are allowed'));
    }
  }
});

// ⚠️ IMPORTANT: Routes with specific paths MUST come BEFORE parameterized routes
// Otherwise /:auctionId will match /items before the /items route

// GET /api/auctions/items/my-items - Get user's auction items (seller only)
router.get(
  '/items/my-items',
  requirePermission(['artist', 'admin']),
  getUserAuctionItems
);

// GET /api/auctions/seller/my-auctions - seller-scoped list
router.get(
  '/seller/my-auctions',
  requirePermission(['artist', 'admin']),
  validateRequest(
    { query: { status: { type: 'string', required: false, min: 1, max: 50 } } },
    { source: 'query', allowUnknown: true, stripUnknown: true }
  ),
  getSellerAuctions
);

// POST /api/auctions/items - Create auction item (seller only)
router.post(
  '/items',
  requirePermission(['artist', 'admin']),
  // Parse multipart/form-data with images[]
  upload.array('images', 10),
  // NOTE: No validation middleware for FormData - handled in controller
  createAuctionItem
);

// PUT /api/auctions/items/:auctionItemId - Update auction item (seller only)
router.put(
  '/items/:auctionItemId',
  requirePermission(['artist', 'admin']),
  validateRequest(
    {
      params: { auctionItemId: { type: 'string', required: true, min: 1 } },
      body: {
        title: { type: 'string', required: false, min: 3, max: 200 },
        description: { type: 'string', required: false, min: 0, max: 5000 },
        medium: { type: 'string', required: false, max: 100 },
        dimensions: { type: 'string', required: false, max: 100 },
        year_created: { type: 'integer', required: false },
        weight_kg: { type: 'number', required: false },
        is_original: { type: 'boolean', required: false },
        is_framed: { type: 'boolean', required: false },
        condition: { type: 'string', required: false, max: 50 },
        categories: { type: 'array', required: false },
        tags: { type: 'array', required: false }
      }
    },
    { source: ['params', 'body'], allowUnknown: false, stripUnknown: true, coerce: true }
  ),
  updateAuctionItem
);

// DELETE /api/auctions/items/:auctionItemId - Delete auction item (seller only)
router.delete(
  '/items/:auctionItemId',
  requirePermission(['artist', 'admin']),
  validateRequest(
    { params: { auctionItemId: { type: 'string', required: true, min: 1 } } },
    { source: 'params', allowUnknown: false }
  ),
  deleteAuctionItem
);

// POST /api/auctions - Create auction (seller only)
router.post(
  '/',
  requirePermission(['artist', 'admin']),
  validateRequest(
    {
      body: {
        auctionItemId: { type: 'string', required: true, min: 1 },
        startPrice: { type: 'number', required: true, min: 0.01 },
        reservePrice: { type: 'number', required: false, min: 0.01 },
        minIncrement: { type: 'number', required: false, default: 0, min: 0 },
        startAt: { type: 'string', required: true },
        endAt: { type: 'string', required: true }
      }
    },
    { source: 'body', allowUnknown: false, stripUnknown: true, coerce: true }
  ),
  createAuction
);

// GET /api/auctions - List all auctions (public)
router.get(
  '/',
  validateRequest(
    {
      query: {
        status: { type: 'string', required: false, min: 1, max: 50 },
        page: { type: 'integer', required: false, default: 1, min: 1 },
        limit: { type: 'integer', required: false, default: 20, min: 1, max: 100 }
      }
    },
    { source: 'query', coerce: true, allowUnknown: false, stripUnknown: true }
  ),
  listAuctions
);

// GET /api/auctions/:auctionId - Get auction details (public)
router.get(
  '/:auctionId',
  validateRequest(
    { params: { auctionId: { type: 'string', required: true, min: 1 } } },
    { source: 'params', allowUnknown: false }
  ),
  getAuctionDetails
);

// GET /api/auctions/:auctionId/bids - Bid history (seller/admin only)
router.get(
  '/:auctionId/bids',
  requirePermission(['artist', 'admin']),
  validateRequest(
    { params: { auctionId: { type: 'string', required: true, min: 1 } } },
    { source: 'params', allowUnknown: false }
  ),
  getAuctionBids
);

// GET /api/auctions/:auctionId/my-bids - Authenticated user's bid history
router.get(
  '/:auctionId/my-bids',
  validateRequest(
    { params: { auctionId: { type: 'string', required: true, min: 1 } } },
    { source: 'params', allowUnknown: false }
  ),
  getMyBids
);

// PUT /api/auctions/:auctionId - Update auction scheduling/pricing (seller/admin)
router.put(
  '/:auctionId',
  requirePermission(['artist', 'admin']),
  validateRequest(
    {
      params: { auctionId: { type: 'string', required: true, min: 1 } },
      body: {
        startPrice: { type: 'number', required: false, min: 0.01 },
        reservePrice: { type: 'number', required: false, min: 0 },
        minIncrement: { type: 'number', required: false, min: 0 },
        startAt: { type: 'string', required: false },
        endAt: { type: 'string', required: false }
      }
    },
    { source: ['params', 'body'], allowUnknown: false, stripUnknown: true, coerce: true }
  ),
  updateAuction
);

// POST /api/auctions/:auctionId/force-expire - Admin only force expire & rollover
router.post(
  '/:auctionId/force-expire',
  requirePermission(['admin']),
  validateRequest(
    { params: { auctionId: { type: 'string', required: true, min: 1 } } },
    { source: 'params', allowUnknown: false }
  ),
  forceExpireAndRollover
);

// PUT /api/auctions/:auctionId/activate-now - activate scheduled auction now (seller only)
router.put(
  '/:auctionId/activate-now',
  requirePermission(['artist', 'admin']),
  validateRequest(
    { params: { auctionId: { type: 'string', required: true, min: 1 } } },
    { source: 'params', allowUnknown: false }
  ),
  activateAuctionNow
);

// PUT /api/auctions/:auctionId/pause - pause active auction (seller/admin)
router.put(
  '/:auctionId/pause',
  requirePermission(['artist', 'admin']),
  validateRequest(
    { params: { auctionId: { type: 'string', required: true, min: 1 } } },
    { source: 'params', allowUnknown: false }
  ),
  pauseAuction
);

// PUT /api/auctions/:auctionId/resume - resume paused auction (seller/admin)
router.put(
  '/:auctionId/resume',
  requirePermission(['artist', 'admin']),
  validateRequest(
    { params: { auctionId: { type: 'string', required: true, min: 1 } } },
    { source: 'params', allowUnknown: false }
  ),
  resumeAuction
);

// PUT /api/auctions/:auctionId/cancel - cancel auction (seller/admin)
router.put(
  '/:auctionId/cancel',
  requirePermission(['artist', 'admin']),
  validateRequest(
    {
      params: { auctionId: { type: 'string', required: true, min: 1 } },
      body: { reason: { type: 'string', required: false, max: 500 } }
    },
    { source: ['params', 'body'], allowUnknown: true, stripUnknown: true }
  ),
  cancelAuction
);
// GET /api/auctions/:auctionId/my-bid - Get user's bid (auth required)
router.get(
  '/:auctionId/my-bid',
  validateRequest(
    { params: { auctionId: { type: 'string', required: true, min: 1 } } },
    { source: 'params', allowUnknown: false }
  ),
  getMyBid
);

// POST /api/auctions/:auctionId/bids - Place a bid (auth required)
router.post(
  '/:auctionId/bids',
  validateRequest(
    {
      params: { auctionId: { type: 'string', required: true, min: 1 } },
      body: {
        amount: { type: 'number', required: true, min: 0.01 },
        userAddressId: { type: 'string', required: true, min: 1 },
        idempotencyKey: { type: 'string', required: false, min: 1, max: 255 }
      }
    },
    { source: ['params', 'body'], allowUnknown: false, stripUnknown: true, coerce: true }
  ),
  placeBid
);

export default router;