/**
 * Payout Routes
 * API endpoints for seller payouts
 */

import express from 'express';
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
router.post('/withdraw', withdrawBalance);

// Get payout history
router.get('/history', getPayoutHistory);

// Payment information management
router.get('/payment-info', getPaymentInfo);
router.put('/payment-info', updatePaymentInfo);

export default router;
