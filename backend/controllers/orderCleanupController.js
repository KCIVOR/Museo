/**
 * Order Cleanup Controller
 * Handles cleanup of abandoned orders and restoring inventory
 */

import db from '../database/db.js';

/**
 * Cancel expired pending orders
 * Run this periodically (e.g., every hour via cron job)
 */
export const cancelExpiredOrders = async () => {
  try {
    console.log('🔍 Checking for expired pending orders...');
    
    // Get pending orders older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: expiredOrders, error: fetchError } = await db
      .from('orders')
      .select('*')
      .eq('paymentStatus', 'pending')
      .eq('status', 'pending')
      .lt('createdAt', oneHourAgo);
    
    if (fetchError) {
      console.error('Error fetching expired orders:', fetchError);
      return;
    }
    
    if (!expiredOrders || expiredOrders.length === 0) {
      console.log('✅ No expired orders found');
      return;
    }
    
    console.log(`Found ${expiredOrders.length} expired orders to cancel`);
    
    for (const order of expiredOrders) {
      try {
        // Note: We don't need to restore inventory since we changed the logic
        // to only reduce inventory AFTER payment confirmation
        
        // Update order status to cancelled
        const { error: updateError } = await db
          .from('orders')
          .update({
            status: 'cancelled',
            paymentStatus: 'expired',
            cancelledAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            cancellationReason: 'Payment link expired - Order automatically cancelled'
          })
          .eq('orderId', order.orderId);
        
        if (updateError) {
          console.error(`Error cancelling order ${order.orderId}:`, updateError);
          continue;
        }
        
        console.log(`🚫 Cancelled expired order: ${order.orderId}`);
        
        // Optional: Send notification to user about cancelled order
        // await sendOrderCancelledNotification(order.userId, order.orderId);
        
      } catch (orderError) {
        console.error(`Error processing order ${order.orderId}:`, orderError);
      }
    }
    
    console.log(`✅ Cleanup complete: ${expiredOrders.length} orders cancelled`);
    
  } catch (error) {
    console.error('Error in cancelExpiredOrders:', error);
  }
};

/**
 * Manual cleanup endpoint (for testing or manual trigger)
 */
export const manualCleanup = async (req, res) => {
  try {
    await cancelExpiredOrders();
    
    res.json({
      success: true,
      message: 'Order cleanup completed'
    });
    
  } catch (error) {
    console.error('Error in manual cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Cleanup failed'
    });
  }
};

/**
 * Fix existing orders with reduced inventory but unpaid status
 * One-time fix for the current issue
 */
export const fixStuckOrders = async (req, res) => {
  try {
    console.log('🔧 Starting fix for stuck orders...');
    
    // Find all pending orders with order items
    const { data: pendingOrders, error: fetchError } = await db
      .from('orders')
      .select(`
        *,
        order_items (
          marketplaceItemId,
          quantity
        )
      `)
      .eq('paymentStatus', 'pending')
      .eq('status', 'pending');
    
    if (fetchError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch pending orders'
      });
    }
    
    let fixedCount = 0;
    let restoredItems = 0;
    
    // For each pending order older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    for (const order of pendingOrders) {
      if (order.createdAt < oneHourAgo) {
        // This order should be cancelled and inventory restored
        
        // Restore inventory for each item
        for (const item of order.order_items) {
          const { data: marketItem } = await db
            .from('marketplace_items')
            .select('quantity')
            .eq('marketItemId', item.marketplaceItemId)
            .single();
          
          if (marketItem) {
            // Restore the quantity
            await db
              .from('marketplace_items')
              .update({
                quantity: marketItem.quantity + item.quantity,
                updated_at: new Date().toISOString()
              })
              .eq('marketItemId', item.marketplaceItemId);
            
            restoredItems++;
            console.log(`📦 Restored ${item.quantity} units to item ${item.marketplaceItemId}`);
          }
        }
        
        // Cancel the order
        await db
          .from('orders')
          .update({
            status: 'cancelled',
            paymentStatus: 'expired',
            cancelledAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            cancellationReason: 'Order expired - Inventory restored'
          })
          .eq('orderId', order.orderId);
        
        fixedCount++;
        console.log(`✅ Fixed order: ${order.orderId}`);
      }
    }
    
    res.json({
      success: true,
      message: `Fixed ${fixedCount} stuck orders and restored ${restoredItems} items`,
      data: {
        ordersFixed: fixedCount,
        itemsRestored: restoredItems
      }
    });
    
  } catch (error) {
    console.error('Error fixing stuck orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fix stuck orders'
    });
  }
};

export default {
  cancelExpiredOrders,
  manualCleanup,
  fixStuckOrders
};
