/**
 * Webhook Controller
 * Handles webhooks from payment providers (Xendit)
 */

import db from '../database/db.js';
import * as xenditService from '../services/xenditService.js';

/**
 * Handle Xendit webhook events
 */
export const handleXenditWebhook = async (req, res) => {
  try {
    const webhookData = req.body;
    
    console.log('📥 ========== XENDIT WEBHOOK RECEIVED ==========');
    console.log('📥 Webhook Data:', JSON.stringify(webhookData, null, 2));
    console.log('📥 Invoice ID:', webhookData.id);
    console.log('📥 Status:', webhookData.status);
    console.log('📥 External ID:', webhookData.external_id);
    console.log('📥 ==============================================');

    // Verify webhook signature (optional but recommended)
    const signature = req.headers['x-callback-token'];
    if (signature && !xenditService.verifyWebhookSignature(webhookData, signature)) {
      console.error('❌ Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Determine event type based on invoice status
    let eventType = 'invoice.unknown';
    if (webhookData.status === 'PAID' || webhookData.status === 'SETTLED') {
      eventType = 'invoice.paid';
    } else if (webhookData.status === 'EXPIRED') {
      eventType = 'invoice.expired';
    }
    
    console.log('📥 Determined Event Type:', eventType);

    // Handle different webhook events
    switch (eventType) {
      case 'invoice.paid':
        await handlePaymentPaid(webhookData);
        break;
      
      case 'invoice.expired':
        await handlePaymentExpired(webhookData);
        break;
      
      default:
        console.log(`ℹ️ Unhandled webhook event: ${eventType}`);
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    // Still return 200 to prevent Xendit from retrying
    res.status(200).json({ received: true, error: error.message });
  }
};

/**
 * Handle successful payment
 */
const handlePaymentPaid = async (webhookData) => {
  try {
    console.log('🔄 Starting handlePaymentPaid...');
    
    // Extract payment data from Xendit webhook
    const paymentData = xenditService.processPaymentSuccess(webhookData);
    
    console.log('💰 Payment successful:', {
      paymentId: paymentData.paymentId,
      amount: paymentData.amount,
      paymentMethod: paymentData.paymentMethod,
      referenceNumber: paymentData.referenceNumber
    });

    console.log('🔍 Searching for orders with reference:', paymentData.referenceNumber);

    // NEW: Find ALL orders with the same payment reference (multi-seller support)
    const { data: orders, error: orderError } = await db
      .from('orders')
      .select('*')
      .eq('paymentReference', paymentData.referenceNumber);

    if (orderError || !orders || orders.length === 0) {
      console.error('❌ No orders found with reference:', paymentData.referenceNumber);
      console.error('❌ Error details:', orderError);
      return;
    }

    console.log(`✅ Found ${orders.length} order(s) with payment reference`);

    // Check if any order is already paid (prevent double processing)
    const alreadyPaidOrders = orders.filter(o => o.paymentStatus === 'paid');
    if (alreadyPaidOrders.length > 0) {
      console.warn(`⚠️ ${alreadyPaidOrders.length} order(s) already processed as paid. Skipping duplicate webhook.`);
      console.warn('⚠️ Order IDs:', alreadyPaidOrders.map(o => o.orderId).join(', '));
      return;
    }

    console.log('✅ All orders are pending payment. Proceeding with payment processing...');

    // Calculate fee distribution per order
    const totalAmount = orders.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0);
    
    // Update ALL orders with payment details
    for (const order of orders) {
      const orderProportion = parseFloat(order.totalAmount) / totalAmount;
      const orderFee = paymentData.fee ? paymentData.fee * orderProportion : 0;
      const orderNetAmount = parseFloat(order.totalAmount) - orderFee;
      
      const { error: updateError } = await db
        .from('orders')
        .update({
          paymentStatus: 'paid',
          paymentIntentId: paymentData.paymentId,
          paymentMethodUsed: paymentData.paymentMethod,
          paymentFee: orderFee,
          netAmount: orderNetAmount,
          paidAt: paymentData.paidAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .eq('orderId', order.orderId);

      if (updateError) {
        console.error(`❌ Error updating order ${order.orderId}:`, updateError);
        continue;
      }
      
      console.log(`✅ Order ${order.orderId} payment status updated (₱${order.totalAmount})`);
    }

    // Flip auctions to SOLD when their settlement order is paid
    // Only apply to auction orders and guard on current auction status = 'settled'
    const paidAuctionOrders = orders.filter(o => o.is_auction && o.auctionId && o.orderId);
    const paidOrderIds = [...new Set(paidAuctionOrders.map(o => o.orderId))];
    if (paidOrderIds.length > 0) {
      const nowIso = new Date().toISOString();
      const { error: upAErr } = await db
        .from('auctions')
        .update({ status: 'sold', paymentDueAt: null, updated_at: nowIso })
        .in('settlementOrderId', paidOrderIds)
        .eq('status', 'settled');
      if (upAErr) {
        console.error('❌ Error marking auctions as sold:', upAErr);
      } else {
        console.log(`🏁 Marked auctions as SOLD for settlementOrderId in:`, paidOrderIds);
      }
    }

    // NOTE: Inventory is already reduced during order creation
    // We no longer need to update inventory here to prevent double-reduction
    console.log('📦 Inventory was already reserved during order creation');
    
    // NOTE: Cart is already cleared during order creation
    // No need to clear it again here
    console.log('🗑️ Cart was already cleared during order creation');

    console.log('✅ ========== PAYMENT PROCESSING COMPLETED ==========');

    // TODO: Send confirmation email to buyer
    // TODO: Send notification to sellers
    // TODO: Trigger any post-payment workflows

  } catch (error) {
    console.error('❌ ========== ERROR IN PAYMENT PROCESSING ==========');
    console.error('❌ Error details:', error);
    console.error('❌ Stack trace:', error.stack);
    throw error;
  }
};

/**
 * Handle expired payment
 */
const handlePaymentExpired = async (webhookData) => {
  try {
    console.log('⏰ Payment expired:', webhookData);

    // Extract payment data from Xendit webhook
    const externalId = webhookData.external_id;
    const metadata = webhookData.metadata || {};

    if (!externalId) {
      console.error('❌ No external_id in expired payment webhook');
      return;
    }

    console.log('🔍 Searching for orders with reference:', externalId);

    // Find orders with the payment reference
    const { data: orders, error: orderError } = await db
      .from('orders')
      .select('*')
      .eq('paymentReference', externalId);

    if (orderError || !orders || orders.length === 0) {
      console.error('❌ No orders found with reference:', externalId);
      return;
    }

    // Update all related orders
    for (const order of orders) {
      const { error: updateError } = await db
        .from('orders')
        .update({
          paymentStatus: 'expired',
          updatedAt: new Date().toISOString()
        })
        .eq('orderId', order.orderId);

      if (updateError) {
        console.error(`❌ Error updating order ${order.orderId}:`, updateError);
        continue;
      }

      console.log(`✅ Order ${order.orderId} marked as payment expired`);
    }

    // TODO: Send notification to buyer about expired payment
    // TODO: Optionally restore inventory if needed

  } catch (error) {
    console.error('❌ Error handling payment expiration:', error);
    throw error;
  }
};

export default {
  handleXenditWebhook
};
