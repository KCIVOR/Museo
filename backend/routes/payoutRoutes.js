/**
 * Payout Routes
 * API endpoints for seller payouts
 */

import express from 'express';
import { validateRequest } from '../middleware/validation.js';
import {
  getSellerBalance,
  withdrawBalance,
  getPayoutHistory,
  updatePaymentInfo,
  getPaymentInfo
} from '../controllers/payoutController.js';

const router = express.Router();

// ========================================
// SELLER ROUTES (requires authentication)
// ========================================

// Get current balance
router.get('/balance', getSellerBalance);

// Request withdrawal of available balance
router.post(
  '/withdraw',
  validateRequest({ body: {} }, { source: 'body', allowUnknown: false, stripUnknown: true }),
  withdrawBalance
);

// Get payout history
router.get(
  '/history',
  validateRequest(
    {
      query: {
        page: { type: 'integer', required: false, default: 1, min: 1 },
        limit: { type: 'integer', required: false, default: 20, min: 1, max: 100 }
      }
    },
    { source: 'query', allowUnknown: false, stripUnknown: true, coerce: true }
  ),
  getPayoutHistory
);

// Payment information management
router.get('/payment-info', getPaymentInfo);
router.put(
  '/payment-info',
  validateRequest(
    {
      body: {
        paymentMethod: {
          type: 'string',
          required: true,
          enum: ['bank', 'gcash', 'maya'],
          validate: (v, data) => {
            if (v === 'bank') {
              if (!data.bankAccountName || !data.bankAccountNumber || !data.bankName) {
                return 'Bank account details are required (bankAccountName, bankAccountNumber, bankName)';
              }
            } else if (v === 'gcash') {
              if (!data.gcashNumber) return 'GCash number is required';
            } else if (v === 'maya') {
              if (!data.mayaNumber) return 'Maya number is required';
            }
            return true;
          }
        },
        bankAccountName: { type: 'string', required: false, min: 2, max: 100 },
        bankAccountNumber: { type: 'string', required: false, pattern: /^[0-9\- ]{6,30}$/ },
        bankName: { type: 'string', required: false, min: 2, max: 100 },
        gcashNumber: { type: 'phone', required: false },
        mayaNumber: { type: 'phone', required: false }
      }
    },
    { source: 'body', allowUnknown: false, stripUnknown: true, trimStrings: true }
  ),
  updatePaymentInfo
);

export default router;
