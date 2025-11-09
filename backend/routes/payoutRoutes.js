/**
 * Payout Routes
 * API endpoints for seller payouts
 */

import express from 'express';
import {
  getSellerBalance,
  withdrawBalance,
  requestInstantPayout,
  getPayoutHistory,
  getPayoutDetails,
  processPendingPayouts,
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

// Request instant payout (1% fee)
router.post('/instant', requestInstantPayout);

// Get payout history
router.get('/history', getPayoutHistory);

// Get specific payout details
router.get('/:payoutId', getPayoutDetails);

// Payment information management
router.get('/payment-info', getPaymentInfo);
router.put('/payment-info', updatePaymentInfo);

// ========================================
// ADMIN ROUTES
// ========================================

// Manually process pending payouts
router.post('/admin/process', processPendingPayouts);

export default router;
