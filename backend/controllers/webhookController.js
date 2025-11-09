/**
 * Webhook Controller
 * Handles webhooks from payment providers (PayMongo, etc.)
 */

import db from '../database/db.js';
import * as paymongoService from '../services/paymongoService.js';

/**
 * Handle PayMongo webhook events
 */
export const handlePaymongoWebhook = async (req, res) => {
  try {
    const webhookData = req.body;
    
    console.log('📥 ========== PAYMONGO WEBHOOK RECEIVED ==========');
    console.log('📥 Webhook Data:', JSON.stringify(webhookData, null, 2));
    console.log('📥 Event Type:', webhookData.data?.attributes?.type);
    console.log('📥 Event ID:', webhookData.data?.id);
    console.log('📥 ==============================================');

    // Verify webhook signature (optional but recommended)
    const signature = req.headers['paymongo-signature'];
    if (signature && !paymongoService.verifyWebhookSignature(webhookData, signature)) {
      console.error('❌ Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const eventType = webhookData.data?.attributes?.type;

    // Handle different webhook events
    switch (eventType) {
      case 'link.payment.paid':
        await handlePaymentPaid(webhookData);
        break;
      
      case 'payment.paid':
        await handlePaymentPaid(webhookData);
        break;
      
      case 'payment.failed':
        await handlePaymentFailed(webhookData);
        break;
      
      default:
        console.log(`ℹ️ Unhandled webhook event: ${eventType}`);
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    // Still return 200 to prevent PayMongo from retrying
    res.status(200).json({ received: true, error: error.message });
  }
};

/**
 * Handle successful payment
 */
const handlePaymentPaid = async (webhookData) => {
  try {
    console.log('🔄 Starting handlePaymentPaid...');
    
    // Extract payment data
    const paymentData = paymongoService.processPaymentSuccess(webhookData);
    
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
      const orderFee = paymentData.fee ? paymongoService.toPesos(paymentData.fee) * orderProportion : 0;
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
 * Handle failed payment
 */
const handlePaymentFailed = async (webhookData) => {
  try {
    console.log('❌ Payment failed:', webhookData);

    // Extract payment data
    const attributes = webhookData.data?.attributes;
    const metadata = attributes?.data?.attributes?.metadata || {};
    const orderId = metadata.orderId;

    if (!orderId) {
      console.error('❌ No orderId in failed payment metadata');
      return;
    }

    // Update order status
    const { error: updateError } = await db
      .from('orders')
      .update({
        paymentStatus: 'failed',
        updatedAt: new Date().toISOString()
      })
      .eq('orderId', orderId);

    if (updateError) {
      console.error('❌ Error updating order:', updateError);
      return;
    }

    console.log('✅ Order marked as payment failed:', orderId);

    // TODO: Send notification to buyer about failed payment
    // TODO: Optionally restore inventory if needed

  } catch (error) {
    console.error('❌ Error handling payment failure:', error);
    throw error;
  }
};

export default {
  handlePaymongoWebhook
};
