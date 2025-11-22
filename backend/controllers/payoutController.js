/**
 * Payout Controller
 * API endpoints for seller payouts
 */

import payoutService from '../services/payoutService.js';
import db from '../database/db.js';
// payoutMethodsRepo inlined below to keep controller self-contained

// Show current mode in console
const PAYOUT_MODE = process.env.PAYOUT_MODE || 'demo';
console.log(`💰 Payout System Running in ${PAYOUT_MODE.toUpperCase()} MODE`);

// Inlined payout methods helpers (previously in repositories/payoutMethodsRepo.js)
const normalizePhoneE164 = (phone) => {
  if (!phone) return null;
  const p = String(phone).trim();
  if (p.startsWith('+')) return p; // assume already E.164
  if (p.startsWith('0')) return `+63${p.slice(1)}`; // PH local to E.164
  return p;
};

/**
 * Delete a payout method (soft delete). If it was default, set another as default or clear legacy fields.
 */
export const deletePayoutMethod = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!id) return res.status(400).json({ success: false, error: 'Method id is required' });

    // Get seller profile id
    const { data: sellerProfile, error: profileError } = await db
      .from('sellerProfiles')
      .select('sellerProfileId')
      .eq('userId', userId)
      .single();

    if (profileError || !sellerProfile) {
      return res.status(404).json({ success: false, error: 'Seller profile not found' });
    }

    // Load method
    const { data: methodRow, error: methodErr } = await db
      .from('sellerPayoutMethods')
      .select('*')
      .eq('sellerPayoutMethodId', id)
      .eq('sellerProfileId', sellerProfile.sellerProfileId)
      .neq('status', 'deleted')
      .single();

    if (methodErr || !methodRow) {
      return res.status(404).json({ success: false, error: 'Payout method not found' });
    }

    const now = new Date().toISOString();

    // Soft delete
    const { error: delErr } = await db
      .from('sellerPayoutMethods')
      .update({ status: 'deleted', isDefault: false, updatedAt: now })
      .eq('sellerPayoutMethodId', id)
      .eq('sellerProfileId', sellerProfile.sellerProfileId);
    if (delErr) {
      console.error('Error deleting payout method:', delErr);
      return res.status(500).json({ success: false, error: 'Failed to delete payout method' });
    }

    // If deleted method was default, pick a replacement or clear legacy fields
    if (methodRow.isDefault) {
      // Find the most recent remaining active method
      const { data: candidates, error: candErr } = await db
        .from('sellerPayoutMethods')
        .select('*')
        .eq('sellerProfileId', sellerProfile.sellerProfileId)
        .neq('status', 'deleted')
        .order('createdAt', { ascending: false })
        .limit(1);

      if (candErr) {
        console.warn('Warning: failed to load replacement default:', candErr);
      }

      const replacement = Array.isArray(candidates) ? candidates[0] : null;
      if (replacement) {
        await db
          .from('sellerPayoutMethods')
          .update({ isDefault: true, updatedAt: now })
          .eq('sellerPayoutMethodId', replacement.sellerPayoutMethodId)
          .eq('sellerProfileId', sellerProfile.sellerProfileId);

        // Sync legacy sellerProfiles to replacement
        const updates = {
          paymentMethod: replacement.method,
          bankAccountName: null,
          bankAccountNumber: null,
          bankName: null,
          gcashNumber: null,
          mayaNumber: null,
          paymentInfoUpdatedAt: now
        };
        if (replacement.method === 'gcash') updates.gcashNumber = replacement.phoneE164;
        if (replacement.method === 'maya') updates.mayaNumber = replacement.phoneE164;
        if (replacement.method === 'bank') {
          updates.bankName = replacement.bankName;
          updates.bankAccountName = replacement.bankAccountName;
          updates.bankAccountNumber = replacement.bankAccountNumber;
        }
        await db
          .from('sellerProfiles')
          .update(updates)
          .eq('sellerProfileId', sellerProfile.sellerProfileId);
      } else {
        // No remaining methods: clear legacy fields
        await db
          .from('sellerProfiles')
          .update({
            paymentMethod: null,
            bankAccountName: null,
            bankAccountNumber: null,
            bankName: null,
            gcashNumber: null,
            mayaNumber: null,
            paymentInfoUpdatedAt: now
          })
          .eq('sellerProfileId', sellerProfile.sellerProfileId);
      }
    }

    res.json({ success: true, message: 'Payout method deleted' });
  } catch (e) {
    console.error('Error deleting payout method:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
async function getDefaultPayoutMethod(sellerProfileId) {
  const { data, error } = await db
    .from('sellerPayoutMethods')
    .select('*')
    .eq('sellerProfileId', sellerProfileId)
    .eq('isDefault', true)
    .neq('status', 'deleted')
    .limit(1);

  if (error) {
    console.error('getDefaultPayoutMethod error:', error);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return row || null;
}

/**
 * List payout methods for a seller (non-deleted)
 */
export const getPayoutMethods = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { data: sellerProfile, error: profileError } = await db
      .from('sellerProfiles')
      .select('sellerProfileId')
      .eq('userId', userId)
      .single();

    if (profileError || !sellerProfile) {
      return res.status(404).json({ success: false, error: 'Seller profile not found' });
    }

    const { data: methods, error } = await db
      .from('sellerPayoutMethods')
      .select('*')
      .eq('sellerProfileId', sellerProfile.sellerProfileId)
      .neq('status', 'deleted')
      .order('createdAt', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({ success: true, data: methods || [] });
  } catch (e) {
    console.error('Error listing payout methods:', e);
    res.status(500).json({ success: false, error: 'Failed to fetch payout methods' });
  }
};

/**
 * Set a payout method as default by id (and sync legacy sellerProfiles)
 */
export const setDefaultPayoutMethod = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    if (!id) {
      return res.status(400).json({ success: false, error: 'Method id is required' });
    }

    // Get seller profile id
    const { data: sellerProfile, error: profileError } = await db
      .from('sellerProfiles')
      .select('sellerProfileId')
      .eq('userId', userId)
      .single();

    if (profileError || !sellerProfile) {
      return res.status(404).json({ success: false, error: 'Seller profile not found' });
    }

    // Verify method belongs to seller
    const { data: methodRow, error: methodErr } = await db
      .from('sellerPayoutMethods')
      .select('*')
      .eq('sellerPayoutMethodId', id)
      .eq('sellerProfileId', sellerProfile.sellerProfileId)
      .neq('status', 'deleted')
      .single();

    if (methodErr || !methodRow) {
      return res.status(404).json({ success: false, error: 'Payout method not found' });
    }

    const now = new Date().toISOString();

    // Clear existing default and set new default
    await db
      .from('sellerPayoutMethods')
      .update({ isDefault: false, updatedAt: now })
      .eq('sellerProfileId', sellerProfile.sellerProfileId)
      .eq('isDefault', true);

    const { error: setErr } = await db
      .from('sellerPayoutMethods')
      .update({ isDefault: true, updatedAt: now })
      .eq('sellerPayoutMethodId', id)
      .eq('sellerProfileId', sellerProfile.sellerProfileId);

    if (setErr) {
      console.error('Error setting default payout method:', setErr);
      return res.status(500).json({ success: false, error: 'Failed to set default payout method' });
    }

    // Sync legacy sellerProfiles for backward compatibility
    const updates = {
      paymentMethod: methodRow.method,
      bankAccountName: null,
      bankAccountNumber: null,
      bankName: null,
      gcashNumber: null,
      mayaNumber: null,
      paymentInfoUpdatedAt: now
    };
    if (methodRow.method === 'gcash') updates.gcashNumber = methodRow.phoneE164;
    if (methodRow.method === 'maya') updates.mayaNumber = methodRow.phoneE164;
    if (methodRow.method === 'bank') {
      updates.bankName = methodRow.bankName;
      updates.bankAccountName = methodRow.bankAccountName;
      updates.bankAccountNumber = methodRow.bankAccountNumber;
    }
    const { error: syncErr } = await db
      .from('sellerProfiles')
      .update(updates)
      .eq('sellerProfileId', sellerProfile.sellerProfileId);
    if (syncErr) {
      console.warn('Warning: default set but failed to sync sellerProfiles:', syncErr);
    }

    res.json({ success: true, message: 'Default payout method updated' });
  } catch (e) {
    console.error('Error setting default payout method:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

async function upsertPayoutMethod(sellerProfileId, payload) {
  const now = new Date().toISOString();
  const {
    method,
    provider = 'xendit',
    gcashNumber,
    mayaNumber,
    bankName,
    bankAccountName,
    bankAccountNumber,
    externalAccountId,
    cardBrand,
    cardLast4,
    cardExpMonth,
    cardExpYear,
    setDefault = true
  } = payload || {};

  if (!method) throw new Error('method is required');

  const phoneE164 = method === 'gcash'
    ? normalizePhoneE164(gcashNumber)
    : method === 'maya'
      ? normalizePhoneE164(mayaNumber)
      : null;

  if (setDefault) {
    await db
      .from('sellerPayoutMethods')
      .update({ isDefault: false, updatedAt: now })
      .eq('sellerProfileId', sellerProfileId)
      .eq('isDefault', true);
  }

  const insertRow = {
    sellerProfileId,
    method,
    provider,
    externalAccountId: externalAccountId || null,
    isDefault: !!setDefault,
    phoneE164,
    bankName: bankName || null,
    bankAccountName: bankAccountName || null,
    bankAccountNumber: bankAccountNumber || null,
    cardBrand: cardBrand || null,
    cardLast4: cardLast4 || null,
    cardExpMonth: cardExpMonth || null,
    cardExpYear: cardExpYear || null,
    verified: false,
    status: 'active',
    createdAt: now,
    updatedAt: now
  };

  const { data, error } = await db
    .from('sellerPayoutMethods')
    .insert(insertRow)
    .select()
    .single();

  if (error) throw new Error(error.message || 'Failed to save payout method');

  return data;
}

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

    // Upsert into sellerPayoutMethods (set as default)
    await upsertPayoutMethod(sellerProfile.sellerProfileId, {
      method: paymentMethod,
      gcashNumber,
      mayaNumber,
      bankName,
      bankAccountName,
      bankAccountNumber,
      setDefault: true
    });

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

    // Get seller profile id
    const { data: profileRow, error: profileErr } = await db
      .from('sellerProfiles')
      .select('sellerProfileId, paymentMethod, bankAccountName, bankAccountNumber, bankName, gcashNumber, mayaNumber, paymentInfoUpdatedAt')
      .eq('userId', userId)
      .single();

    if (profileErr || !profileRow) {
      return res.status(404).json({
        success: false,
        error: 'Seller profile not found'
      });
    }

    // Try new table first
    const defaultPm = await getDefaultPayoutMethod(profileRow.sellerProfileId);
    if (defaultPm) {
      // Map to legacy shape for frontend compatibility
      const mapped = {
        paymentMethod: defaultPm.method,
        bankAccountName: defaultPm.bankAccountName,
        bankAccountNumber: defaultPm.bankAccountNumber,
        bankName: defaultPm.bankName,
        gcashNumber: defaultPm.method === 'gcash' ? defaultPm.phoneE164 : null,
        mayaNumber: defaultPm.method === 'maya' ? defaultPm.phoneE164 : null,
        paymentInfoUpdatedAt: defaultPm.updatedAt
      };

      return res.json({ success: true, data: mapped });
    }

    // Fallback to legacy fields
    return res.json({
      success: true,
      data: {
        paymentMethod: profileRow.paymentMethod,
        bankAccountName: profileRow.bankAccountName,
        bankAccountNumber: profileRow.bankAccountNumber,
        bankName: profileRow.bankName,
        gcashNumber: profileRow.gcashNumber,
        mayaNumber: profileRow.mayaNumber,
        paymentInfoUpdatedAt: profileRow.paymentInfoUpdatedAt
      }
    });

  } catch (error) {
    console.error('Error fetching payment info:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
