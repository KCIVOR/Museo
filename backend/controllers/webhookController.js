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

    console.log('🔍 Searching for order with reference:', paymentData.referenceNumber);

    // Find the order by payment reference number
    const { data: order, error: orderError } = await db
      .from('orders')
      .select('*')
      .eq('paymentReference', paymentData.referenceNumber)
      .single();

    if (orderError || !order) {
      console.error('❌ Order not found with reference:', paymentData.referenceNumber);
      console.error('❌ Error details:', orderError);
      return;
    }

    console.log('✅ Order found:', order.orderId);

    // Update order with payment details
    const { error: updateError } = await db
      .from('orders')
      .update({
        paymentStatus: 'paid',
        paymentIntentId: paymentData.paymentId,
        paymentMethodUsed: paymentData.paymentMethod,
        paymentFee: paymentData.fee ? paymongoService.toPesos(paymentData.fee) : 0,
        netAmount: paymentData.netAmount ? paymongoService.toPesos(paymentData.netAmount) : order.totalAmount,
        paidAt: paymentData.paidAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .eq('orderId', order.orderId);

    if (updateError) {
      console.error('❌ Error updating order:', updateError);
      return;
    }

    console.log('✅ Order payment status updated:', order.orderId);

    console.log('📦 Starting inventory reduction...');

    // NOW reduce inventory after successful payment
    const { data: orderItems, error: itemsError } = await db
      .from('order_items')
      .select('marketplaceItemId, quantity')
      .eq('orderId', order.orderId);

    if (itemsError) {
      console.error('❌ Error fetching order items:', itemsError);
    } else if (!orderItems || orderItems.length === 0) {
      console.warn('⚠️ No order items found for order:', order.orderId);
    } else {
      console.log(`📦 Found ${orderItems.length} items to process`);
      
      for (const item of orderItems) {
        console.log(`🔄 Processing item: ${item.marketplaceItemId}, Qty to reduce: ${item.quantity}`);
        
        // Get current quantity
        const { data: marketItem, error: getError } = await db
          .from('marketplace_items')
          .select('quantity')
          .eq('marketItemId', item.marketplaceItemId)
          .single();

        if (getError) {
          console.error(`❌ Error fetching marketplace item ${item.marketplaceItemId}:`, getError);
        } else if (!marketItem) {
          console.error(`❌ Marketplace item not found: ${item.marketplaceItemId}`);
        } else {
          console.log(`📊 Current inventory for ${item.marketplaceItemId}: ${marketItem.quantity}`);
          
          const newQuantity = Math.max(0, marketItem.quantity - item.quantity);
          
          console.log(`📊 New inventory will be: ${newQuantity}`);
          
          // Update inventory
          const { error: updateInventoryError } = await db
            .from('marketplace_items')
            .update({ 
              quantity: newQuantity,
              updated_at: new Date().toISOString()
            })
            .eq('marketItemId', item.marketplaceItemId);

          if (updateInventoryError) {
            console.error('❌ Error updating inventory for item:', item.marketplaceItemId, updateInventoryError);
          } else {
            console.log(`✅ Inventory updated: ${item.marketplaceItemId} - Reduced by ${item.quantity}, New qty: ${newQuantity}`);
          }
        }
      }
      
      console.log('✅ Inventory reduction completed');
    }

    console.log('🗑️ Clearing user cart...');
    
    // Clear user's cart after successful payment
    const { error: clearError } = await db
      .from('cart_items')
      .delete()
      .eq('userId', order.userId);

    if (clearError) {
      console.error('⚠️ Error clearing cart:', clearError);
    } else {
      console.log('✅ Cart cleared for user:', order.userId);
    }

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
