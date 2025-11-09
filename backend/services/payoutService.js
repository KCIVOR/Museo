/**
 * Payout Service
 * Core business logic for artist payouts
 * Simple, fair, and transparent
 */

import db from '../database/db.js';

// 🎮 DEMO MODE - Set to 'demo' for testing, 'production' for real payouts
const PAYOUT_MODE = process.env.PAYOUT_MODE || 'demo';

// Only import Xendit service in production
let payoutGatewayService = null;
if (PAYOUT_MODE === 'production') {
  payoutGatewayService = (await import('./payoutGatewayService.js')).default;
}

class PayoutService {
  // Platform fee is a flat 4% for everyone
  PLATFORM_FEE_RATE = 0.04;
  
  // Instant payout fee is 1%
  INSTANT_FEE_RATE = 0.01;
  
  // Minimum payout amount
  MIN_PAYOUT_AMOUNT = 100;

  /**
   * Create a payout when an order is marked as delivered
   * Called automatically from order controller
   */
  async createPayout(orderId) {
    try {
      // Get order details
      const { data: order, error: orderError } = await db
        .from('orders')
        .select(`
          orderId,
          sellerProfileId,
          totalAmount,
          userId,
          createdAt
        `)
        .eq('orderId', orderId)
        .single();

      if (orderError || !order) {
        throw new Error('Order not found');
      }

      // Check if payout already exists for this order
      const { data: existingPayout } = await db
        .from('seller_payouts')
        .select('payoutId')
        .eq('orderId', orderId)
        .single();

      if (existingPayout) {
        console.log(`Payout already exists for order ${orderId}`);
        return existingPayout;
      }

      // Run safety checks
      const safetyChecks = await this.runSafetyChecks(order);

      // Calculate amounts
      const grossAmount = parseFloat(order.totalAmount);
      const platformFee = grossAmount * this.PLATFORM_FEE_RATE;
      const netAmount = grossAmount - platformFee;

      // Determine ready date based on safety checks
      let readyDate = new Date();
      if (safetyChecks.isFirstSale) {
        // First sale: 3 days hold for extra safety
        readyDate.setDate(readyDate.getDate() + 3);
        console.log(`First sale for seller ${order.sellerProfileId} - 3 day hold`);
      } else if (safetyChecks.isHighValue) {
        // High value order: 2 days for review
        readyDate.setDate(readyDate.getDate() + 2);
        console.log(`High value order ${orderId} - 2 day hold`);
      } else {
        // Standard: 24 hours
        readyDate.setDate(readyDate.getDate() + 1);
      }

      // Get seller's payment method from profile
      const { data: sellerProfile } = await db
        .from('sellerProfiles')
        .select('paymentMethod')
        .eq('sellerProfileId', order.sellerProfileId)
        .single();

      // Create payout record
      const { data: payout, error: payoutError } = await db
        .from('seller_payouts')
        .insert({
          sellerProfileId: order.sellerProfileId,
          orderId: orderId,
          amount: grossAmount,
          platformFee: platformFee,
          netAmount: netAmount,
          status: 'pending',
          payoutType: 'standard',
          readyDate: readyDate.toISOString(),
          payoutMethod: sellerProfile?.paymentMethod || null,
          notes: safetyChecks.notes.join('; ')  // Convert array to string
        })
        .select()
        .single();

      if (payoutError) {
        console.error('Error creating payout:', payoutError);
        throw new Error('Failed to create payout');
      }

      console.log(`Payout created for order ${orderId}: ₱${netAmount} ready on ${readyDate.toLocaleDateString()}`);
      return payout;

    } catch (error) {
      console.error('Error in createPayout:', error);
      throw error;
    }
  }

  /**
   * Run safety checks on an order
   * Returns flags for special handling
   */
  async runSafetyChecks(order) {
    const checks = {
      isFirstSale: false,
      isHighValue: false,
      isNewBuyer: false,
      notes: []
    };

    try {
      // Check 1: Is this the seller's first completed sale?
      const { data: previousPayouts } = await db
        .from('seller_payouts')
        .select('payoutId')
        .eq('sellerProfileId', order.sellerProfileId)
        .eq('status', 'paid')
        .limit(1);

      if (!previousPayouts || previousPayouts.length === 0) {
        checks.isFirstSale = true;
        checks.notes.push('First sale - 3 day hold applied');
        
        // Log safety check
        await this.logSafetyCheck(order.orderId, order.sellerProfileId, 'first_sale', true, 'First completed sale for seller');
      }

      // Check 2: Is this a high-value order?
      if (order.totalAmount > 5000) {
        checks.isHighValue = true;
        checks.notes.push(`High value order (₱${order.totalAmount}) - 2 day hold`);
        
        // Log safety check
        await this.logSafetyCheck(order.orderId, order.sellerProfileId, 'high_value', true, `Order amount: ₱${order.totalAmount}`);
      }

      // Check 3: Is this a new buyer?
      const { data: buyerOrders } = await db
        .from('orders')
        .select('orderId')
        .eq('userId', order.userId)
        .eq('paymentStatus', 'paid')
        .limit(2);

      if (buyerOrders && buyerOrders.length === 1) {
        checks.isNewBuyer = true;
        checks.notes.push('First-time buyer');
        
        // Log safety check
        await this.logSafetyCheck(order.orderId, order.sellerProfileId, 'new_buyer', true, 'Buyer\'s first purchase');
      }

    } catch (error) {
      console.error('Error running safety checks:', error);
    }

    checks.notes = checks.notes.length > 0 ? checks.notes.join('; ') : null;
    return checks;
  }

  /**
   * Log a safety check for audit trail
   */
  async logSafetyCheck(orderId, sellerProfileId, checkType, passed, notes) {
    try {
      await db
        .from('payoutSafetyLogs')
        .insert({
          orderId,
          sellerProfileId,
          checkType,
          passed,
          notes
        });
    } catch (error) {
      console.error('Error logging safety check:', error);
    }
  }

  /**
   * Process ready payouts (called by daily cron job)
   * Marks payouts as 'ready' when their ready date has passed
   */
  async processReadyPayouts() {
    try {
      const now = new Date();

      // Find all pending payouts that are ready
      const { data: pendingPayouts, error } = await db
        .from('seller_payouts')
        .select('*')
        .eq('status', 'pending')
        .lte('readyDate', now.toISOString());

      if (error) {
        console.error('Error fetching pending payouts:', error);
        return { processed: 0, errors: [error.message] };
      }

      let processedCount = 0;
      const errors = [];

      for (const payout of pendingPayouts || []) {
        try {
          // Update status to ready
          const { error: updateError } = await db
            .from('seller_payouts')
            .update({
              status: 'ready',
              updatedAt: new Date().toISOString()
            })
            .eq('payoutId', payout.payoutId);

          if (updateError) {
            errors.push(`Failed to update payout ${payout.payoutId}: ${updateError.message}`);
          } else {
            processedCount++;
            console.log(`Payout ${payout.payoutId} marked as ready: ₱${payout.netAmount}`);
          }
        } catch (err) {
          errors.push(`Error processing payout ${payout.payoutId}: ${err.message}`);
        }
      }

      console.log(`Daily payout processing complete: ${processedCount} payouts ready`);
      return { processed: processedCount, errors };

    } catch (error) {
      console.error('Error in processReadyPayouts:', error);
      throw error;
    }
  }

  /**
   * Get seller's balance information
   */
  async getSellerBalance(sellerProfileId) {
    try {
      // Get all payouts for this seller
      const { data: payouts, error } = await db
        .from('seller_payouts')
        .select('status, netAmount')
        .eq('sellerProfileId', sellerProfileId);

      if (error) {
        throw error;
      }

      // Calculate balances
      let availableBalance = 0;
      let pendingBalance = 0;
      let totalPaidOut = 0;

      for (const payout of payouts || []) {
        const amount = parseFloat(payout.netAmount);
        
        if (payout.status === 'ready') {
          availableBalance += amount;
        } else if (payout.status === 'pending') {
          pendingBalance += amount;
        } else if (payout.status === 'paid') {
          totalPaidOut += amount;
        }
      }

      return {
        availableBalance,
        pendingBalance,
        totalPaidOut,
        canWithdraw: availableBalance >= this.MIN_PAYOUT_AMOUNT,
        canInstantPayout: pendingBalance >= this.MIN_PAYOUT_AMOUNT
      };

    } catch (error) {
      console.error('Error getting seller balance:', error);
      throw error;
    }
  }

  /**
   * Process withdrawal of available balance
   */
  async withdrawBalance(sellerProfileId) {
    try {
      // Get seller's payment info
      const { data: sellerProfile, error: profileError } = await db
        .from('sellerProfiles')
        .select('paymentMethod, bankAccountName, bankAccountNumber, bankName, gcashNumber, mayaNumber')
        .eq('sellerProfileId', sellerProfileId)
        .single();

      if (profileError || !sellerProfile) {
        throw new Error('Seller profile not found');
      }

      if (!sellerProfile.paymentMethod) {
        throw new Error('Please set up your payment method first');
      }

      // Get all ready payouts
      const { data: readyPayouts, error: payoutsError } = await db
        .from('seller_payouts')
        .select('*')
        .eq('sellerProfileId', sellerProfileId)
        .eq('status', 'ready');

      if (payoutsError) {
        throw payoutsError;
      }

      if (!readyPayouts || readyPayouts.length === 0) {
        throw new Error('No funds available for withdrawal');
      }

      // Calculate total amount
      const totalAmount = readyPayouts.reduce((sum, p) => sum + parseFloat(p.netAmount), 0);

      if (totalAmount < this.MIN_PAYOUT_AMOUNT) {
        throw new Error(`Minimum withdrawal is ₱${this.MIN_PAYOUT_AMOUNT}. Available: ₱${totalAmount.toFixed(2)}`);
      }

      // Generate reference number
      const reference = `WD${Date.now()}${sellerProfileId.substring(0, 4).toUpperCase()}`;

      // 🎮 DEMO MODE vs PRODUCTION MODE
      let payoutResult;
      let finalReference;
      
      if (PAYOUT_MODE === 'demo') {
        // DEMO MODE - Simulate successful payout
        console.log('🎮 DEMO MODE: Simulating payout...');
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Generate demo reference
        finalReference = `DEMO${reference}`;
        
        payoutResult = {
          success: true,
          referenceId: finalReference,
          status: 'COMPLETED'
        };
        
        console.log(`🎮 DEMO: Simulated payout of ₱${totalAmount} to ${sellerProfile.paymentMethod}`);
        
      } else {
        // PRODUCTION MODE - Real payout via Xendit
        const { data: sellerData } = await db
          .from('sellerProfiles')
          .select('shopName')
          .eq('sellerProfileId', sellerProfileId)
          .single();

        payoutResult = await payoutGatewayService.processPayout({
          paymentMethod: sellerProfile.paymentMethod,
          amount: totalAmount,
          sellerInfo: {
            ...sellerProfile,
            shopName: sellerData?.shopName || 'Artist'
          },
          payoutId: reference
        });

        if (!payoutResult.success) {
          throw new Error(`Payout failed: ${payoutResult.error}`);
        }
        
        finalReference = payoutResult.referenceId;
      }

      // Mark all ready payouts as paid (works for both demo and production)
      const payoutIds = readyPayouts.map(p => p.payoutId);
      const { error: updateError } = await db
        .from('seller_payouts')
        .update({
          status: 'paid',
          paidDate: new Date().toISOString(),
          payoutReference: finalReference,
          notes: PAYOUT_MODE === 'demo' 
            ? `DEMO: Simulated payout via ${sellerProfile.paymentMethod}`
            : `Automated payout via ${sellerProfile.paymentMethod}`,
          updatedAt: new Date().toISOString()
        })
        .in('payoutId', payoutIds);

      if (updateError) {
        throw updateError;
      }

      const modeIcon = PAYOUT_MODE === 'demo' ? '🎮' : '✅';
      console.log(`${modeIcon} Withdrawal processed: ₱${totalAmount} to ${sellerProfile.paymentMethod} (Ref: ${finalReference})`);

      return {
        success: true,
        amount: totalAmount,
        payoutCount: readyPayouts.length,
        reference: finalReference,
        paymentMethod: sellerProfile.paymentMethod,
        gatewayStatus: payoutResult.status,
        mode: PAYOUT_MODE
      };

    } catch (error) {
      console.error('Error processing withdrawal:', error);
      throw error;
    }
  }

  /**
   * Process instant payout (with 1% fee)
   */
  async requestInstantPayout(sellerProfileId) {
    try {
      // Get seller's payment info
      const { data: sellerProfile } = await db
        .from('sellerProfiles')
        .select('paymentMethod')
        .eq('sellerProfileId', sellerProfileId)
        .single();

      if (!sellerProfile?.paymentMethod) {
        throw new Error('Please set up your payment method first');
      }

      // Get all pending payouts
      const { data: pendingPayouts, error } = await db
        .from('seller_payouts')
        .select('*')
        .eq('sellerProfileId', sellerProfileId)
        .eq('status', 'pending');

      if (error) {
        throw error;
      }

      if (!pendingPayouts || pendingPayouts.length === 0) {
        throw new Error('No pending payouts available for instant withdrawal');
      }

      // Calculate amounts
      const grossAmount = pendingPayouts.reduce((sum, p) => sum + parseFloat(p.netAmount), 0);
      const instantFee = grossAmount * this.INSTANT_FEE_RATE;
      const finalAmount = grossAmount - instantFee;

      if (finalAmount < this.MIN_PAYOUT_AMOUNT) {
        throw new Error(`After instant fee, amount (₱${finalAmount.toFixed(2)}) is below minimum ₱${this.MIN_PAYOUT_AMOUNT}`);
      }

      // Generate reference
      const reference = `INST${Date.now()}${sellerProfileId.substring(0, 4).toUpperCase()}`;

      // Get full seller info
      const { data: fullSellerProfile } = await db
        .from('sellerProfiles')
        .select('*')
        .eq('sellerProfileId', sellerProfileId)
        .single();

      // 🎮 DEMO MODE vs PRODUCTION MODE
      let payoutResult;
      let finalReference;
      
      if (PAYOUT_MODE === 'demo') {
        // DEMO MODE - Simulate instant payout
        console.log('🎮 DEMO MODE: Simulating instant payout...');
        
        // Simulate processing delay (shorter for instant)
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Generate demo reference
        finalReference = `DEMO${reference}`;
        
        payoutResult = {
          success: true,
          referenceId: finalReference,
          status: 'COMPLETED'
        };
        
        console.log(`🎮 DEMO: Simulated instant payout of ₱${finalAmount} to ${fullSellerProfile.paymentMethod} (fee: ₱${instantFee})`);
        
      } else {
        // PRODUCTION MODE - Real instant payout via Xendit
        payoutResult = await payoutGatewayService.processPayout({
          paymentMethod: fullSellerProfile.paymentMethod,
          amount: finalAmount, // Send final amount after instant fee
          sellerInfo: fullSellerProfile,
          payoutId: reference
        });

        if (!payoutResult.success) {
          throw new Error(`Instant payout failed: ${payoutResult.error}`);
        }
        
        finalReference = payoutResult.referenceId;
      }

      // Update all pending payouts to paid with instant fee (works for both modes)
      const payoutIds = pendingPayouts.map(p => p.payoutId);
      const { error: updateError } = await db
        .from('seller_payouts')
        .update({
          status: 'paid',
          payoutType: 'instant',
          instantFee: instantFee / pendingPayouts.length, // Distribute fee across payouts
          paidDate: new Date().toISOString(),
          payoutReference: finalReference,
          notes: PAYOUT_MODE === 'demo'
            ? `DEMO: Simulated instant payout via ${fullSellerProfile.paymentMethod}`
            : `Instant payout via ${fullSellerProfile.paymentMethod}`,
          updatedAt: new Date().toISOString()
        })
        .in('payoutId', payoutIds);

      if (updateError) {
        throw updateError;
      }

      const modeIcon = PAYOUT_MODE === 'demo' ? '🎮' : '✅';
      console.log(`${modeIcon} Instant payout: ₱${finalAmount} to ${fullSellerProfile.paymentMethod} (fee: ₱${instantFee}, Ref: ${finalReference})`);

      return {
        success: true,
        amount: finalAmount,
        instantFee: instantFee,
        grossAmount: grossAmount,
        reference: finalReference,
        paymentMethod: fullSellerProfile.paymentMethod,
        gatewayStatus: payoutResult.status,
        mode: PAYOUT_MODE
      };

    } catch (error) {
      console.error('Error processing instant payout:', error);
      throw error;
    }
  }

  /**
   * Get payout history for a seller
   */
  async getPayoutHistory(sellerProfileId, limit = 20, offset = 0) {
    try {
      const { data: payouts, error, count } = await db
        .from('seller_payouts')
        .select('*', { count: 'exact' })
        .eq('sellerProfileId', sellerProfileId)
        .order('createdAt', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return {
        payouts: payouts || [],
        total: count || 0,
        hasMore: (count || 0) > offset + limit
      };

    } catch (error) {
      console.error('Error fetching payout history:', error);
      throw error;
    }
  }
}

export default new PayoutService();
