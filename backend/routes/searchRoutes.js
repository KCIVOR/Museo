import express from 'express';
import { validateRequest } from '../middleware/validation.js';
import { unifiedSearch } from '../controllers/searchController.js';

const router = express.Router();

router.get(
  '/',
  validateRequest(
    {
      query: {
        q: { type: 'string', required: false, min: 0, max: 200 },
        tab: { type: 'string', required: false, enum: ['all','artists','products','events','auctions'] },
        page: { type: 'integer', required: false, min: 1, default: 1 },
        limit: { type: 'integer', required: false, min: 1, max: 50, default: 12 }
      }
    },
    { source: 'query', allowUnknown: true, coerce: true, stripUnknown: true }
  ),
  unifiedSearch
);

export default router;
