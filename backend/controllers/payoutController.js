/**
 * Payout Controller
 * API endpoints for seller payouts
 */

import payoutService from '../services/payoutService.js';
import db from '../database/db.js';

// Show current mode in console
const PAYOUT_MODE = process.env.PAYOUT_MODE || 'demo';
console.log(`💰 Payout System Running in ${PAYOUT_MODE.toUpperCase()} MODE`);

/**
 * Get seller's balance information
 * GET /api/payouts/balance
 */
export const getSellerBalance = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Get seller profile
    const { data: sellerProfile, error: profileError } = await db
      .from('sellerProfiles')
      .select('sellerProfileId')
      .eq('userId', userId)
      .single();

    if (profileError || !sellerProfile) {
      return res.status(404).json({
        success: false,
        error: 'Seller profile not found'
      });
    }

    // Get balance information
    const balance = await payoutService.getSellerBalance(sellerProfile.sellerProfileId);

    res.json({
      success: true,
      data: {
        available: balance.available,
        pending: balance.pending,
        totalPaidOut: balance.totalPaid,
        canWithdraw: parseFloat(balance.available) >= 100,
        minimumPayout: 100,
        mode: PAYOUT_MODE // Show if demo or production
      }
    });

  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch balance'
    });
  }
};

/**
 * Request withdrawal of available balance
 * POST /api/payouts/withdraw
 */
export const withdrawBalance = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Get seller profile
    const { data: sellerProfile, error: profileError } = await db
      .from('sellerProfiles')
      .select('sellerProfileId, paymentMethod')
      .eq('userId', userId)
      .single();

    if (profileError || !sellerProfile) {
      return res.status(404).json({
        success: false,
        error: 'Seller profile not found'
      });
    }

    if (!sellerProfile.paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Please set up your payment method first'
      });
    }

    // Process withdrawal
    const result = await payoutService.withdrawBalance(sellerProfile.sellerProfileId);

    // Add demo mode notice if applicable
    const message = PAYOUT_MODE === 'demo' 
      ? `[DEMO] Simulated withdrawal of ₱${result.amount.toFixed(2)} has been processed`
      : `Withdrawal of ₱${result.amount.toFixed(2)} has been processed`;

    res.json({
      success: true,
      message: message,
      data: {
        amount: result.amount,
        reference: result.reference,
        paymentMethod: result.paymentMethod,
        payoutCount: result.payoutCount,
        mode: result.mode || PAYOUT_MODE
      }
    });

  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to process withdrawal'
    });
  }
};

/**
 * Request instant payout (1% fee)
 * POST /api/payouts/instant
 */
export const requestInstantPayout = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Get seller profile
    const { data: sellerProfile, error: profileError } = await db
      .from('sellerProfiles')
      .select('sellerProfileId, paymentMethod')
      .eq('userId', userId)
      .single();

    if (profileError || !sellerProfile) {
      return res.status(404).json({
        success: false,
        error: 'Seller profile not found'
      });
    }

    if (!sellerProfile.paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Please set up your payment method first'
      });
    }

    // Process instant payout
    const result = await payoutService.requestInstantPayout(sellerProfile.sellerProfileId);

    // Add demo mode notice if applicable
    const message = PAYOUT_MODE === 'demo' 
      ? `[DEMO] Simulated instant payout of ₱${result.amount.toFixed(2)} has been processed (1% fee: ₱${result.instantFee.toFixed(2)})`
      : `Instant payout of ₱${result.amount.toFixed(2)} has been processed (1% fee: ₱${result.instantFee.toFixed(2)})`;

    res.json({
      success: true,
      message: message,
      data: {
        amount: result.amount,
        instantFee: result.instantFee,
        grossAmount: result.grossAmount,
        reference: result.reference,
        paymentMethod: result.paymentMethod,
        mode: result.mode || PAYOUT_MODE
      }
    });

  } catch (error) {
    console.error('Instant payout error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to process instant payout'
    });
  }
};

/**
 * Get payout history
 * GET /api/payouts/history
 */
export const getPayoutHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 20 } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Get seller profile
    const { data: sellerProfile, error: profileError } = await db
      .from('sellerProfiles')
      .select('sellerProfileId')
      .eq('userId', userId)
      .single();

    if (profileError || !sellerProfile) {
      return res.status(404).json({
        success: false,
        error: 'Seller profile not found'
      });
    }

    // Calculate offset
    const offset = (page - 1) * limit;

    // Get payout history
    const history = await payoutService.getPayoutHistory(
      sellerProfile.sellerProfileId,
      parseInt(limit),
      offset
    );

    res.json({
      success: true,
      data: {
        payouts: history.payouts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: history.total,
          totalPages: Math.ceil(history.total / limit),
          hasMore: history.hasMore
        }
      }
    });

  } catch (error) {
    console.error('Error fetching payout history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payout history'
    });
  }
};

/**
 * Get specific payout details
 * GET /api/payouts/:payoutId
 */
export const getPayoutDetails = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { payoutId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Get seller profile
    const { data: sellerProfile, error: profileError } = await db
      .from('sellerProfiles')
      .select('sellerProfileId')
      .eq('userId', userId)
      .single();

    if (profileError || !sellerProfile) {
      return res.status(404).json({
        success: false,
        error: 'Seller profile not found'
      });
    }

    // Get payout details
    const { data: payout, error: payoutError } = await db
      .from('seller_payouts')
      .select(`
        *,
        orders (
          orderId,
          totalAmount,
          createdAt,
          deliveredAt
        )
      `)
      .eq('payoutId', payoutId)
      .eq('sellerProfileId', sellerProfile.sellerProfileId)
      .single();

    if (payoutError || !payout) {
      return res.status(404).json({
        success: false,
        error: 'Payout not found'
      });
    }

    res.json({
      success: true,
      data: payout
    });

  } catch (error) {
    console.error('Error fetching payout details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payout details'
    });
  }
};

/**
 * Admin: Process pending payouts manually
 * POST /api/payouts/admin/process
 */
export const processPendingPayouts = async (req, res) => {
  try {
    const userRole = req.user?.role;

    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    // Process ready payouts
    const result = await payoutService.processReadyPayouts();

    res.json({
      success: true,
      message: `Processed ${result.processed} payouts`,
      data: {
        processed: result.processed,
        errors: result.errors
      }
    });

  } catch (error) {
    console.error('Error processing payouts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process payouts'
    });
  }
};

/**
 * Update payment information
 * PUT /api/payouts/payment-info
 */
export const updatePaymentInfo = async (req, res) => {
  try {
    const userId = req.user?.id;
    const {
      paymentMethod,
      bankAccountName,
      bankAccountNumber,
      bankName,
      gcashNumber,
      mayaNumber
    } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Get seller profile
    const { data: sellerProfile, error: profileError } = await db
      .from('sellerProfiles')
      .select('sellerProfileId')
      .eq('userId', userId)
      .single();

    if (profileError || !sellerProfile) {
      return res.status(404).json({
        success: false,
        error: 'Seller profile not found'
      });
    }

    // Validate payment method
    if (!['bank', 'gcash', 'maya'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment method'
      });
    }

    // Validate required fields based on payment method
    if (paymentMethod === 'bank') {
      if (!bankAccountName || !bankAccountNumber || !bankName) {
        return res.status(400).json({
          success: false,
          error: 'Bank account details are required'
        });
      }
    } else if (paymentMethod === 'gcash' && !gcashNumber) {
      return res.status(400).json({
        success: false,
        error: 'GCash number is required'
      });
    } else if (paymentMethod === 'maya' && !mayaNumber) {
      return res.status(400).json({
        success: false,
        error: 'Maya number is required'
      });
    }

    // Update payment info
    const { error: updateError } = await db
      .from('sellerProfiles')
      .update({
        paymentMethod,
        bankAccountName: paymentMethod === 'bank' ? bankAccountName : null,
        bankAccountNumber: paymentMethod === 'bank' ? bankAccountNumber : null,
        bankName: paymentMethod === 'bank' ? bankName : null,
        gcashNumber: paymentMethod === 'gcash' ? gcashNumber : null,
        mayaNumber: paymentMethod === 'maya' ? mayaNumber : null,
        paymentInfoUpdatedAt: new Date().toISOString()
      })
      .eq('sellerProfileId', sellerProfile.sellerProfileId);

    if (updateError) {
      console.error('Error updating payment info:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update payment information'
      });
    }

    res.json({
      success: true,
      message: 'Payment information updated successfully'
    });

  } catch (error) {
    console.error('Error updating payment info:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Get payment information
 * GET /api/payouts/payment-info
 */
export const getPaymentInfo = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Get seller profile with payment info
    const { data: sellerProfile, error } = await db
      .from('sellerProfiles')
      .select('paymentMethod, bankAccountName, bankAccountNumber, bankName, gcashNumber, mayaNumber, paymentInfoUpdatedAt')
      .eq('userId', userId)
      .single();

    if (error || !sellerProfile) {
      return res.status(404).json({
        success: false,
        error: 'Seller profile not found'
      });
    }

    res.json({
      success: true,
      data: sellerProfile
    });

  } catch (error) {
    console.error('Error fetching payment info:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
