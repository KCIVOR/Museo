// backend/routes/auctionRoutes.js
// Blind auction REST endpoints

import express from 'express';
import { validateRequest } from '../middleware/validation.js';
import { requirePermission } from '../middleware/permission.js';
import {
  getAuctionDetails,
  getMyBid,
  placeBid,
  listAuctions,
  createAuctionItem,
  createAuction
} from '../controllers/auctionController.js';

const router = express.Router();

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
        userAddressId: { type: 'string', required: false, min: 1 },
        idempotencyKey: { type: 'string', required: false, min: 1, max: 255 }
      }
    },
    { source: ['params', 'body'], allowUnknown: false, stripUnknown: true, coerce: true }
  ),
  placeBid
);

// POST /api/auctions/items - Create auction item (seller only)
router.post(
  '/items',
  requirePermission(['artist', 'admin']),
  validateRequest(
    {
      body: {
        title: { type: 'string', required: true, min: 3, max: 200 },
        description: { type: 'string', required: false, min: 0, max: 5000 },
        images: { type: 'array', required: false },
        primary_image: { type: 'string', required: false },
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
    { source: 'body', allowUnknown: false, stripUnknown: true, coerce: true }
  ),
  createAuctionItem
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

export default router;
