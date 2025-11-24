import db from '../database/db.js';
import * as xenditService from '../services/xenditService.js';
import { publishNotification } from '../services/notificationService.js';

// Enhanced cancel order handler used by routes
// Does not rely on helpers from marketplaceController to avoid tight coupling
export const cancelOrder = async (req, res) => {
  try {
    // Auth guard
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { orderId } = req.params;
    const rawReason = (req.body?.reason ?? '').toString();
    const reason = rawReason.trim();
    if (reason && (reason.length < 1 || reason.length > 500)) {
      return res.status(400).json({ success: false, message: 'Cancellation reason must be 1-500 characters' });
    }

    // Load order
    const { data: order, error: orderError } = await db
      .from('orders')
      .select('*')
      .eq('orderId', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Authorization: buyer or seller of this order
    const { data: items, error: itemsErr } = await db
      .from('order_items')
      .select('sellerProfileId, marketplaceItemId, quantity')
      .eq('orderId', orderId);

    if (itemsErr) {
      return res.status(500).json({ success: false, error: 'Failed to load order items' });
    }

    const isBuyer = order.userId === userId;

    let isSeller = false;
    const { data: sellerProfile } = await db
      .from('sellerProfiles')
      .select('sellerProfileId')
      .eq('userId', userId)
      .single();

    if (sellerProfile && Array.isArray(items)) {
      isSeller = items.some((it) => it.sellerProfileId === sellerProfile.sellerProfileId);
    }

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ success: false, error: 'You do not have permission to cancel this order' });
    }

    // Duplicate guard
    if (order.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Order is already cancelled' });
    }

    // Shipped/delivered guard
    if (order.status === 'shipped' || order.status === 'delivered') {
      return res.status(400).json({ success: false, error: 'Cannot cancel order that has been shipped or delivered' });
    }

    // Process payment side-effects
    let refundInfo = null;
    if (order.paymentStatus === 'paid') {
      // Create refund before any state changes
      try {
        refundInfo = await xenditService.createRefund({
          paymentIntentId: order.paymentLinkId,
          amount: order.totalAmount,
          reason: reason || 'Order cancelled',
        });
        // Notify buyer that refund was initiated (often pending initially)
        try {
          await publishNotification({
            type: 'order_refund_initiated',
            title: 'Your refund is being processed',
            body: `We initiated a refund for your order ${order.orderId.slice(0, 8).toUpperCase()}.`,
            data: {
              orderId: order.orderId,
              refundId: refundInfo?.id || null,
              amount: refundInfo?.amount || order.totalAmount,
              status: refundInfo?.status || 'PENDING'
            },
            recipient: order.userId,
            userId: null,
            dedupeContains: { orderId: order.orderId }
          });
        } catch (notifyErr) {
          console.warn('⚠️ Failed to publish refund notification:', notifyErr?.message || notifyErr);
        }
      } catch (err) {
        console.error('❌ Refund failure for order', orderId, err);
        return res.status(500).json({ success: false, error: 'Refund failed. Order was not cancelled.' });
      }
    } else if (order.paymentLinkId) {
      // Expire invoice to prevent future payments after cancel
      try {
        await xenditService.cancelPaymentLink(order.paymentLinkId);
      } catch (err) {
        console.warn('⚠️ Failed to expire payment link for order', orderId, err?.message || err);
        // continue
      }
    }

    // Restore inventory for marketplace items
    if (Array.isArray(items)) {
      for (const it of items) {
        if (!it.marketplaceItemId) continue;
        const { data: marketItem } = await db
          .from('marketplace_items')
          .select('quantity')
          .eq('marketItemId', it.marketplaceItemId)
          .single();
        if (marketItem) {
          await db
            .from('marketplace_items')
            .update({
              quantity: (marketItem.quantity || 0) + (it.quantity || 0),
              is_available: true,
              updated_at: new Date().toISOString(),
            })
            .eq('marketItemId', it.marketplaceItemId);
        }
      }
    }

    // Update order record
    const updateFields = {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (order.paymentStatus === 'paid') {
      updateFields.paymentStatus = 'refunded';
    }

    const { data: updatedOrder, error: updErr } = await db
      .from('orders')
      .update(updateFields)
      .eq('orderId', orderId)
      .select()
      .single();

    if (updErr) {
      console.error('❌ Error updating order cancel state:', updErr);
      return res.status(500).json({ success: false, error: updErr.message });
    }

    const message = order.paymentStatus === 'paid'
      ? `Order cancelled successfully. Inventory has been restored. Refund of ₱${Number(order.totalAmount).toLocaleString()} is being processed.`
      : 'Order cancelled successfully. Inventory has been restored.';

    const response = { success: true, message, data: updatedOrder };
    if (refundInfo) {
      response.data = {
        ...updatedOrder,
        refund: {
          id: refundInfo.id,
          amount: refundInfo.amount,
          status: refundInfo.status,
        },
      };
    }

    return res.json(response);
  } catch (error) {
    console.error('Error in enhanced cancelOrder:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export default { cancelOrder };
