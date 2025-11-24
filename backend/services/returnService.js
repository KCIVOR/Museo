// returnService.js - CORRECTED VERSION
import db from '../database/db.js';
import xenditService from './xenditService.js';
import { publishNotification } from './notificationService.js';

class ReturnService {
  /**
   * Create a return request
   */
  async createReturn(data) {
    const { orderId, buyerId, reason, description, evidenceImages } = data;

    try {
      // Validate order exists and belongs to buyer
      const { data: order, error: orderError } = await db
        .from('orders')
        .select('*')
        .eq('orderId', orderId)
        .eq('userId', buyerId)
        .single();

      if (orderError || !order) {
        throw new Error('Order not found or unauthorized');
      }

      // Check if order is delivered
      if (order.status !== 'delivered') {
        throw new Error('Only delivered orders can be returned');
      }

      // Check 7-day return window
      const deliveredDate = new Date(order.deliveredAt);
      const now = new Date();
      const daysDiff = Math.floor((now - deliveredDate) / (1000 * 60 * 60 * 24));

      if (daysDiff > 7) {
        throw new Error('Return window expired (7 days from delivery)');
      }

      // Check if return already exists
      const { data: existingReturn } = await db
        .from('returns')
        .select('returnId')
        .eq('orderId', orderId)
        .single();

      if (existingReturn) {
        throw new Error('Return request already exists for this order');
      }

      // Create return request
      const { data: newReturn, error: returnError } = await db
        .from('returns')
        .insert({
          orderId,
          buyerId,
          sellerProfileId: order.sellerProfileId,
          reason,
          description,
          evidenceImages: evidenceImages || [],
          refundAmount: order.totalAmount,
          status: 'pending'
        })
        .select()
        .single();

      if (returnError) {
        console.error('Error creating return:', returnError);
        throw new Error('Failed to create return request');
      }

      // Create notification for seller
      await this.createSellerNotification(order.sellerProfileId, newReturn.returnId, 'new_return');

      return newReturn;
    } catch (error) {
      console.error('Error in createReturn:', error);
      throw error;
    }
  }

  /**
   * Get returns for buyer
   */
  async getBuyerReturns(buyerId, status = null) {
    try {
      let query = db
        .from('returns')
        .select('*')
        .eq('buyerId', buyerId)
        .order('createdAt', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching buyer returns:', error);
        throw new Error('Failed to fetch returns');
      }

      // Get order details separately
      for (const returnItem of data) {
        const { data: order } = await db
          .from('orders')
          .select('orderId, orderNumber, totalAmount, status, createdAt')
          .eq('orderId', returnItem.orderId)
          .single();
        
        returnItem.order = order;
      }

      return data;
    } catch (error) {
      console.error('Error in getBuyerReturns:', error);
      throw error;
    }
  }

  /**
   * Get returns for seller
   */
  async getSellerReturns(sellerProfileId, status = null) {
    try {
      let query = db
        .from('returns')
        .select('*')
        .eq('sellerProfileId', sellerProfileId)
        .order('createdAt', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching seller returns:', error);
        throw new Error('Failed to fetch returns');
      }

      // Get order and buyer details separately
      for (const returnItem of data) {
        const { data: order } = await db
          .from('orders')
          .select('orderId, orderNumber, totalAmount, status, createdAt')
          .eq('orderId', returnItem.orderId)
          .single();
        
        const { data: buyer } = await db
          .from('profile')
          .select('userId, username, email')
          .eq('userId', returnItem.buyerId)
          .single();
        
        returnItem.order = order;
        returnItem.buyer = buyer;

        // Check for expired responses (48 hour window)
        if (returnItem.status === 'pending') {
          const createdAt = new Date(returnItem.createdAt);
          const now = new Date();
          const hoursDiff = Math.floor((now - createdAt) / (1000 * 60 * 60));
          
          if (hoursDiff >= 48) {
            // Auto-approve after 48 hours
            await this.approveReturn(returnItem.returnId, sellerProfileId, 
              'Auto-approved due to no response within 48 hours');
          }
        }
      }

      return data;
    } catch (error) {
      console.error('Error in getSellerReturns:', error);
      throw error;
    }
  }

  /**
   * Get single return details
   */
  async getReturnDetails(returnId, userId) {
    try {
      // Get the return first
      const { data: returnData, error } = await db
        .from('returns')
        .select('*')
        .eq('returnId', returnId)
        .single();

      if (error || !returnData) {
        console.error('Error fetching return:', error);
        throw new Error('Return not found');
      }

      // Verify user has access
      let hasAccess = false;
      
      // Check if buyer
      if (returnData.buyerId === userId) {
        hasAccess = true;
      }
      
      // Check if seller
      if (!hasAccess) {
        const { data: sellerProfile } = await db
          .from('sellerProfiles')
          .select('userId')
          .eq('sellerProfileId', returnData.sellerProfileId)
          .single();
        
        if (sellerProfile && sellerProfile.userId === userId) {
          hasAccess = true;
        }
      }
      
      // Check if admin
      if (!hasAccess) {
        const { data: profile } = await db
          .from('profile')
          .select('role')
          .eq('userId', userId)
          .single();
        
        if (profile && profile.role === 'admin') {
          hasAccess = true;
        }
      }

      if (!hasAccess) {
        throw new Error('Unauthorized access');
      }

      // Get related data separately
      const { data: order } = await db
        .from('orders')
        .select('orderId, orderNumber, totalAmount, status, paymentIntentId')
        .eq('orderId', returnData.orderId)
        .single();

      const { data: sellerProfile } = await db
        .from('sellerProfiles')
        .select('sellerProfileId, shopName, userId')
        .eq('sellerProfileId', returnData.sellerProfileId)
        .single();

      const { data: buyer } = await db
        .from('profile')
        .select('userId, username, email')
        .eq('userId', returnData.buyerId)
        .single();

      const { data: messages } = await db
        .from('returnMessages')
        .select('*')
        .eq('returnId', returnId)
        .order('createdAt', { ascending: true });

      // Combine all data
      returnData.order = order;
      returnData.sellerProfile = sellerProfile;
      returnData.buyer = buyer;
      returnData.messages = messages || [];

      return returnData;
    } catch (error) {
      console.error('Error in getReturnDetails:', error);
      throw error;
    }
  }

  /**
   * Approve return request
   */
  async approveReturn(returnId, sellerProfileId, sellerResponse = '') {
    try {
      // Get return data first
      const { data: returnData, error: fetchError } = await db
        .from('returns')
        .select('*')
        .eq('returnId', returnId)
        .eq('sellerProfileId', sellerProfileId)
        .single();

      if (fetchError || !returnData) {
        throw new Error('Return not found or unauthorized');
      }

      if (returnData.status !== 'pending') {
        throw new Error('Return is not pending');
      }

      // Get seller's address details for return shipping
      const { data: sellerInfo } = await db
        .from('sellerProfiles')
        .select('*')
        .eq('sellerProfileId', sellerProfileId)
        .single();

      // Build return address object
      const returnAddress = {
        name: sellerInfo?.shopName || 'Seller',
        phone: sellerInfo?.phoneNumber || null,
        street: sellerInfo?.street || null,
        landmark: sellerInfo?.landmark || null,
        barangay: sellerInfo?.barangay || null,
        city: sellerInfo?.city || null,
        province: sellerInfo?.province || null,
        region: sellerInfo?.region || null,
        postalCode: sellerInfo?.postalCode || null
      };

      // Update return to approved (awaiting buyer to ship back) — do NOT refund yet
      const { error: updateError } = await db
        .from('returns')
        .update({
          status: 'approved',
          shippingStatus: "pendingShipment",
          sellerResponse,
          respondedAt: new Date().toISOString(),
          returnAddress
        })
        .eq('returnId', returnId);

      if (updateError) {
        throw new Error('Failed to approve return');
      }

      // Update order's returnStatus only (not main status yet)
      await db
        .from('orders')
        .update({ 
          returnStatus: 'approved'
        })
        .eq('orderId', returnData.orderId);

      // Notify buyer
      await this.createBuyerNotification(returnData.buyerId, returnId, 'return_approved');

      return { success: true, message: 'Return approved. Please ship the item back to the provided address.' };
    } catch (error) {
      console.error('Error in approveReturn:', error);
      throw error;
    }
  }

  /**
   * Reject return request
   */
  async rejectReturn(returnId, sellerProfileId, sellerResponse) {
    try {
      const { data: returnData, error: fetchError } = await db
        .from('returns')
        .select('*')
        .eq('returnId', returnId)
        .eq('sellerProfileId', sellerProfileId)
        .single();

      if (fetchError || !returnData) {
        throw new Error('Return not found or unauthorized');
      }

      if (returnData.status !== 'pending') {
        throw new Error('Return is not pending');
      }

      // Update return status
      const { error: updateError } = await db
        .from('returns')
        .update({
          status: 'rejected',
          sellerResponse,
          respondedAt: new Date().toISOString()
        })
        .eq('returnId', returnId);

      if (updateError) {
        throw new Error('Failed to reject return');
      }

      // Update order return status
      await db
        .from('orders')
        .update({ returnStatus: 'rejected' })
        .eq('orderId', returnData.orderId);

      // Notify buyer
      await this.createBuyerNotification(returnData.buyerId, returnId, 'return_rejected');

      return { success: true, message: 'Return rejected' };
    } catch (error) {
      console.error('Error in rejectReturn:', error);
      throw error;
    }
  }

  /**
   * Dispute return decision
   */
  async disputeReturn(returnId, buyerId, disputeReason) {
    try {
      const { data: returnData, error: fetchError } = await db
        .from('returns')
        .select('*')
        .eq('returnId', returnId)
        .eq('buyerId', buyerId)
        .single();

      if (fetchError || !returnData) {
        throw new Error('Return not found or unauthorized');
      }

      // Block if an admin has already resolved a dispute on this return
      if (returnData.resolvedAt) {
        throw new Error('This return dispute has already been resolved by an admin');
      }

      // Block if a dispute is already in progress
      if (returnData.status === 'disputed' || returnData.disputedAt) {
        throw new Error('A dispute is already in progress for this return');
      }

      if (returnData.status !== 'rejected') {
        throw new Error('Only rejected returns can be disputed');
      }

      // Update return status
      const { error: updateError } = await db
        .from('returns')
        .update({
          status: 'disputed',
          disputedAt: new Date().toISOString()
        })
        .eq('returnId', returnId);

      if (updateError) {
        throw new Error('Failed to dispute return');
      }

      // Add dispute message
      await db
        .from('returnMessages')
        .insert({
          returnId,
          senderId: buyerId,
          message: `Dispute reason: ${disputeReason}`,
          isAdmin: false
        });

      // Update order return status
      await db
        .from('orders')
        .update({ returnStatus: 'disputed' })
        .eq('orderId', returnData.orderId);

      // Notify admin
      await this.createAdminNotification(returnId, 'new_dispute');

      return { success: true, message: 'Return disputed and sent to admin for review' };
    } catch (error) {
      console.error('Error in disputeReturn:', error);
      throw error;
    }
  }

  /**
   * Process refund via Xendit
   */
  async processRefund(returnId) {
    try {
      const { data: returnData, error: fetchError } = await db
        .from('returns')
        .select('*')
        .eq('returnId', returnId)
        .single();

      if (fetchError || !returnData) {
        throw new Error('Return not found');
      }

      const { data: order } = await db
        .from('orders')
        .select('*')
        .eq('orderId', returnData.orderId)
        .single();

      if (!order) {
        throw new Error('Order not found');
      }

      // Check if payment info exists
      const paymentId = order.paymentIntentId || order.paymentLinkId || order.paymentReference;
      
      if (!paymentId) {
        console.warn('⚠️ No payment ID found for order, skipping actual refund');
        
        // Update return status without processing actual refund
        await db
          .from('returns')
          .update({
            status: 'refunded',
            refundId: 'MANUAL_REFUND_REQUIRED',
            refundedAt: new Date().toISOString()
          })
          .eq('returnId', returnId);
          
        return {
          success: true,
          message: 'Return approved but manual refund required (no payment ID)',
          manualRefundRequired: true
        };
      }

      // Try to create Xendit refund
      try {
        const refundResult = await xenditService.createRefund({
          paymentIntentId: paymentId,
          amount: returnData.refundAmount || order.totalAmount,
          reason: `Return approved for order ${order.orderId}`
        });

        // Update return with refund details
        await db
          .from('returns')
          .update({
            status: 'refunded',
            refundId: refundResult.id,
            refundedAt: new Date().toISOString()
          })
          .eq('returnId', returnId);

        // Adjust seller payout
        await this.adjustSellerPayout(returnData.sellerProfileId, returnData.refundAmount);

        return refundResult;
      } catch (xenditError) {
        // If Xendit refund fails (invalid payment ID, etc.), mark for manual refund
        console.warn('⚠️ Xendit refund failed, marking for manual processing:', xenditError.message);
        
        await db
          .from('returns')
          .update({
            status: 'refunded',
            refundId: 'MANUAL_REFUND_REQUIRED',
            refundedAt: new Date().toISOString(),
            adminNotes: `Xendit refund failed: ${xenditError.message}. Manual refund required.`
          })
          .eq('returnId', returnId);
        
        return {
          success: true,
          message: 'Return approved but manual refund required (Xendit error)',
          manualRefundRequired: true,
          error: xenditError.message
        };
      }
    } catch (error) {
      console.error('Refund processing error:', error);
      throw new Error('Failed to process refund');
    }
  }

  /**
   * Add message to return conversation
   */
  async addReturnMessage(returnId, senderId, message, isAdmin = false) {
    try {
      // Verify return exists
      const { data: returnData } = await db
        .from('returns')
        .select('buyerId, sellerProfileId')
        .eq('returnId', returnId)
        .single();

      if (!returnData) {
        throw new Error('Return not found');
      }

      // Verify sender has access
      let hasAccess = false;
      
      // Check if buyer
      if (returnData.buyerId === senderId) {
        hasAccess = true;
      }
      
      // Check if seller
      if (!hasAccess) {
        const { data: sellerProfile } = await db
          .from('sellerProfiles')
          .select('userId')
          .eq('sellerProfileId', returnData.sellerProfileId)
          .single();
        
        if (sellerProfile && sellerProfile.userId === senderId) {
          hasAccess = true;
        }
      }
      
      // Check if admin
      if (!hasAccess && isAdmin) {
        hasAccess = true;
      }

      if (!hasAccess) {
        throw new Error('Unauthorized');
      }

      const { data: newMessage, error } = await db
        .from('returnMessages')
        .insert({
          returnId,
          senderId,
          message,
          isAdmin
        })
        .select()
        .single();

      if (error) {
        throw new Error('Failed to send message');
      }

      // Notify recipient
      if (returnData.buyerId === senderId) {
        // Notify seller
        const { data: sellerProfile } = await db
          .from('sellerProfiles')
          .select('userId')
          .eq('sellerProfileId', returnData.sellerProfileId)
          .single();
        
        if (sellerProfile) {
          await this.createMessageNotification(sellerProfile.userId, returnId);
        }
      } else {
        // Notify buyer
        await this.createMessageNotification(returnData.buyerId, returnId);
      }

      return newMessage;
    } catch (error) {
      console.error('Error in addReturnMessage:', error);
      throw error;
    }
  }

  /**
   * Admin resolve dispute
   */
  async resolveDispute(returnId, adminId, resolution, adminNotes) {
    try {
      const { data: returnData, error: fetchError } = await db
        .from('returns')
        .select('*')
        .eq('returnId', returnId)
        .single();

      if (fetchError || !returnData) {
        throw new Error('Return not found');
      }

      if (returnData.status !== 'disputed') {
        throw new Error('Return is not in dispute');
      }

      let newStatus = resolution === 'approve' ? 'approved' : 'rejected';
      
      // If approving the dispute, handle similar to approveReturn
      if (resolution === 'approve') {
        // Get seller's address for return shipping
        const { data: sellerInfo } = await db
          .from('sellerProfiles')
          .select('*')
          .eq('sellerProfileId', returnData.sellerProfileId)
          .single();

        // Build return address object
        const returnAddress = {
          name: sellerInfo?.shopName || 'Seller',
          phone: sellerInfo?.phoneNumber || null,
          street: sellerInfo?.street || null,
          landmark: sellerInfo?.landmark || null,
          barangay: sellerInfo?.barangay || null,
          city: sellerInfo?.city || null,
          province: sellerInfo?.province || null,
          region: sellerInfo?.region || null,
          postalCode: sellerInfo?.postalCode || null
        };
        
        // Update return without processing refund yet
        const { error: updateError } = await db
          .from('returns')
          .update({
            status: newStatus,
            shippingStatus: "pendingShipment",
            adminNotes,
            resolvedAt: new Date().toISOString(),
            returnAddress
          })
          .eq('returnId', returnId);

        if (updateError) {
          throw new Error('Failed to resolve dispute');
        }
        
        // Only update returnStatus on order
        await db
          .from('orders')
          .update({ returnStatus: 'approved' })
          .eq('orderId', returnData.orderId);
      } else {
        // For rejection, just update status
        const { error: updateError } = await db
          .from('returns')
          .update({
            status: newStatus,
            adminNotes,
            resolvedAt: new Date().toISOString()
          })
          .eq('returnId', returnId);

        if (updateError) {
          throw new Error('Failed to resolve dispute');
        }
        
        // Update order return status
        await db
          .from('orders')
          .update({ returnStatus: 'rejected' })
          .eq('orderId', returnData.orderId);
      }

      // Notify both parties
      await this.createBuyerNotification(returnData.buyerId, returnId, `dispute_${resolution}d`);
      await this.createSellerNotification(returnData.sellerProfileId, returnId, `dispute_${resolution}d`);

      return { success: true, message: `Dispute ${resolution}d` };
    } catch (error) {
      console.error('Error in resolveDispute:', error);
      throw error;
    }
  }

  /**
   * Buyer marks return as shipped
   */
  async markShipped(returnId, buyerId, trackingNumber = null) {
    try {
      // Validate return exists and belongs to buyer
      const { data: returnData, error } = await db
        .from('returns')
        .select('*')
        .eq('returnId', returnId)
        .eq('buyerId', buyerId)
        .single();
        
      if (error || !returnData) throw new Error('Return not found');
      if (returnData.shippingStatus !== "pendingShipment") {
        throw new Error('Return is not in pending shipment state');
      }
      if (returnData.buyerShippedAt) {
        throw new Error('Return has already been marked as shipped');
      }
      
      // Update return with shipped status
      const { error: updateError } = await db
        .from('returns')
        .update({
          shippingStatus: "inTransit",
          buyerShippedAt: new Date().toISOString(),
          trackingNumber: trackingNumber || null
        })
        .eq('returnId', returnId);
        
      if (updateError) throw new Error('Failed to mark as shipped');
      
      // Notify seller
      await this.createSellerNotification(returnData.sellerProfileId, returnId, 'return_shipped');
      
      return { success: true, message: 'Return marked as shipped' };
    } catch (e) {
      console.error('Error in markShipped:', e);
      throw e;
    }
  }

  /**
   * Seller marks return as received and processes refund
   */
  async markReceived(returnId, sellerProfileId, receivedCondition = null) {
    try {
      // Validate return exists and belongs to seller
      const { data: returnData, error } = await db
        .from('returns')
        .select('*')
        .eq('returnId', returnId)
        .eq('sellerProfileId', sellerProfileId)
        .single();
        
      if (error || !returnData) throw new Error('Return not found');
      if (returnData.shippingStatus !== "inTransit") {
        throw new Error('Return is not in transit');
      }
      if (!returnData.buyerShippedAt) {
        throw new Error('Buyer has not marked this return as shipped');
      }
      if (returnData.sellerReceivedAt) {
        throw new Error('Return has already been marked as received');
      }
      
      // Update return with received status
      const { error: updateError } = await db
        .from('returns')
        .update({
          shippingStatus: "received",
          sellerReceivedAt: new Date().toISOString(),
          receivedCondition: receivedCondition || null
        })
        .eq('returnId', returnId);
        
      if (updateError) throw new Error('Failed to mark as received');
      
      // Process refund now
      const refundOutcome = await this.processRefund(returnId);
      
      // Update final statuses
      await db
        .from('returns')
        .update({
          status: 'refunded',
          shippingStatus: "completed"
        })
        .eq('returnId', returnId);
      
      // Update order status
      await db
        .from('orders')
        .update({
          status: 'returned',
          returnStatus: 'refunded'
        })
        .eq('orderId', returnData.orderId);
      
      // Notify buyer via centralized notification service
      try {
        await publishNotification({
          type: 'return_refund_completed',
          title: 'Your refund has been issued',
          body: `Your return for order ${returnData.orderId} has been processed.`,
          data: {
            returnId,
            orderId: returnData.orderId,
            refundAmount: returnData.refundAmount || null,
            refundStatus: refundOutcome?.status || 'SUCCEEDED'
          },
          recipient: returnData.buyerId,
          userId: null,
          dedupeContains: { returnId }
        });
      } catch (notifyErr) {
        console.warn('⚠️ Failed to publish return refund notification:', notifyErr?.message || notifyErr);
      }
      
      return { success: true, message: 'Return received and refund processed' };
    } catch (e) {
      console.error('Error in markReceived:', e);
      throw e;
    }
  }

  // Helper methods
  async adjustSellerPayout(sellerProfileId, amount) {
    // Implement payout adjustment logic
    console.log(`Adjusting payout for seller ${sellerProfileId} by -${amount}`);
  }

  async createBuyerNotification(buyerId, returnId, type) {
    const messages = {
      return_approved: 'Your return request has been approved',
      return_rejected: 'Your return request has been rejected',
      dispute_approved: 'Your dispute has been resolved in your favor',
      dispute_rejected: 'Your dispute has been resolved',
      return_refunded: 'Your item has been received and refund processed'
    };

    try {
      await db.from('notifications').insert({
        userId: buyerId,
        type: 'return_update',
        message: messages[type],
        metadata: { returnId },
        isRead: false
      });
    } catch (error) {
      console.error('Error creating buyer notification:', error);
    }
  }

  async createSellerNotification(sellerProfileId, returnId, type) {
    try {
      const { data: seller } = await db
        .from('sellerProfiles')
        .select('userId')
        .eq('sellerProfileId', sellerProfileId)
        .single();

      if (!seller) return;

      const messages = {
        new_return: 'You have a new return request',
        dispute_approved: 'A return dispute was resolved against you',
        dispute_rejected: 'A return dispute was resolved in your favor',
        return_shipped: 'Buyer has shipped the return item'
      };

      await db.from('notifications').insert({
        userId: seller.userId,
        type: 'return_update',
        message: messages[type],
        metadata: { returnId },
        isRead: false
      });
    } catch (error) {
      console.error('Error creating seller notification:', error);
    }
  }

  async createAdminNotification(returnId, type) {
    try {
      const { data: admins } = await db
        .from('profile')
        .select('userId')
        .eq('role', 'admin');

      if (!admins) return;

      const messages = {
        new_dispute: 'A return has been disputed and requires review'
      };

      for (const admin of admins) {
        await db.from('notifications').insert({
          userId: admin.userId,
          type: 'return_dispute',
          message: messages[type],
          metadata: { returnId },
          isRead: false
        });
      }
    } catch (error) {
      console.error('Error creating admin notification:', error);
    }
  }

  async createMessageNotification(userId, returnId) {
    try {
      await db.from('notifications').insert({
        userId,
        type: 'return_message',
        message: 'New message on your return request',
        metadata: { returnId },
        isRead: false
      });
    } catch (error) {
      console.error('Error creating message notification:', error);
    }
  }
}

export default new ReturnService();
