// returnController.js - CORRECTED VERSION
import returnService from '../services/returnService.js';
import db from '../database/db.js';

class ReturnController {
  /**
   * Create return request
   * POST /api/returns
   */
  async createReturn(req, res) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }

      const { orderId, reason, description } = req.body;

      // Validate required fields
      if (!orderId || !reason || !description) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: orderId, reason, and description are required'
        });
      }


      const validReasons = ['defective_damaged', 'wrong_item', 'not_as_described', 'changed_mind', 'other'];
      if (!validReasons.includes(reason)) {
        return res.status(400).json({
          success: false,
          error: `Invalid return reason. Must be one of: ${validReasons.join(', ')}`
        });
      }

      // Handle evidence images upload
      let evidenceImages = [];
      if (req.files && req.files.length > 0) {
        if (req.files.length > 5) {
          return res.status(400).json({
            success: false,
            error: 'Maximum 5 images allowed'
          });
        }

        // Upload images to storage
        for (const file of req.files) {
          try {
            const fileName = `returns/${req.user.id}/${Date.now()}-${file.originalname}`;
            const { data, error } = await db.storage
              .from('uploads')
              .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: false
              });

            if (error) {
              console.error('Image upload error:', error);
              continue;
            }

            const { data: publicUrl } = db.storage
              .from('uploads')
              .getPublicUrl(fileName);

            evidenceImages.push(publicUrl.publicUrl);
          } catch (uploadError) {
            console.error('Error uploading image:', uploadError);
          }
        }
      }

      const returnData = await returnService.createReturn({
        orderId,
        buyerId: req.user.id,
        reason,
        description,
        evidenceImages
      });

      res.status(201).json({
        success: true,
        message: 'Return request created successfully',
        data: returnData
      });
    } catch (error) {
      console.error('Error creating return:', error);
      const statusCode = error.message.includes('not found') ? 404 : 
                        error.message.includes('unauthorized') ? 403 : 400;
      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get buyer's returns
   * GET /api/returns/buyer
   */
  async getBuyerReturns(req, res) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }

      const { status } = req.query;
      
      // Validate status if provided
      if (status) {
        const validStatuses = ['pending', 'approved', 'rejected', 'refunded', 'disputed'];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({
            success: false,
            error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
          });
        }
      }

      const returns = await returnService.getBuyerReturns(req.user.id, status);

      res.json({
        success: true,
        data: returns
      });
    } catch (error) {
      console.error('Error fetching buyer returns:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch returns'
      });
    }
  }

  /**
   * Get seller's returns
   * GET /api/returns/seller
   */
  async getSellerReturns(req, res) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }

      // Get seller profile
      const { data: sellerProfile, error: profileError } = await db
        .from('sellerProfiles')
        .select('sellerProfileId')
        .eq('userId', req.user.id)
        .eq('isActive', true)
        .single();

      if (profileError || !sellerProfile) {
        return res.status(403).json({
          success: false,
          error: 'Active seller profile required'
        });
      }

      const { status } = req.query;
      
      // Validate status if provided
      if (status) {
        const validStatuses = ['pending', 'approved', 'rejected', 'refunded', 'disputed'];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({
            success: false,
            error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
          });
        }
      }

      const returns = await returnService.getSellerReturns(sellerProfile.sellerProfileId, status);

      res.json({
        success: true,
        data: returns
      });
    } catch (error) {
      console.error('Error fetching seller returns:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch returns'
      });
    }
  }

  /**
   * Get return details
   * GET /api/returns/:returnId
   */
  async getReturnDetails(req, res) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }

      const { returnId } = req.params;
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(returnId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid return ID format'
        });
      }

      const returnData = await returnService.getReturnDetails(returnId, req.user.id);

      res.json({
        success: true,
        data: returnData
      });
    } catch (error) {
      console.error('Error fetching return details:', error);
      const statusCode = error.message.includes('not found') ? 404 : 
                        error.message.includes('Unauthorized') ? 403 : 500;
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to fetch return details'
      });
    }
  }

  /**
   * Approve return (Seller)
   * PUT /api/returns/:returnId/approve
   */
  async approveReturn(req, res) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }

      // Get seller profile
      const { data: sellerProfile, error: profileError } = await db
        .from('sellerProfiles')
        .select('sellerProfileId')
        .eq('userId', req.user.id)
        .eq('isActive', true)
        .single();

      if (profileError || !sellerProfile) {
        return res.status(403).json({
          success: false,
          error: 'Active seller profile required'
        });
      }

      const { returnId } = req.params;
      const { sellerResponse } = req.body;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(returnId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid return ID format'
        });
      }

      const result = await returnService.approveReturn(
        returnId, 
        sellerProfile.sellerProfileId, 
        sellerResponse || ''
      );

      res.json(result);
    } catch (error) {
      console.error('Error approving return:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to approve return'
      });
    }
  }

  /**
   * Reject return (Seller)
   * PUT /api/returns/:returnId/reject
   */
  async rejectReturn(req, res) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }

      // Get seller profile
      const { data: sellerProfile, error: profileError } = await db
        .from('sellerProfiles')
        .select('sellerProfileId')
        .eq('userId', req.user.id)
        .eq('isActive', true)
        .single();

      if (profileError || !sellerProfile) {
        return res.status(403).json({
          success: false,
          error: 'Active seller profile required'
        });
      }

      const { returnId } = req.params;
      const { sellerResponse } = req.body;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(returnId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid return ID format'
        });
      }

      if (!sellerResponse || sellerResponse.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Rejection reason is required'
        });
      }

      const result = await returnService.rejectReturn(
        returnId, 
        sellerProfile.sellerProfileId, 
        sellerResponse
      );

      res.json(result);
    } catch (error) {
      console.error('Error rejecting return:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to reject return'
      });
    }
  }

  /**
   * Dispute return (Buyer)
   * POST /api/returns/:returnId/dispute
   */
  async disputeReturn(req, res) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }

      const { returnId } = req.params;
      const { disputeReason } = req.body;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(returnId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid return ID format'
        });
      }

      if (!disputeReason || disputeReason.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Dispute reason is required'
        });
      }

      const result = await returnService.disputeReturn(
        returnId,
        req.user.id,
        disputeReason
      );

      res.json(result);
    } catch (error) {
      console.error('Error disputing return:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to dispute return'
      });
    }
  }

  /**
   * Add message to return
   * POST /api/returns/:returnId/messages
   */
  async addReturnMessage(req, res) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }

      const { returnId } = req.params;
      const { message } = req.body;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(returnId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid return ID format'
        });
      }

      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Message is required'
        });
      }

      // Check if user is admin
      const { data: profile } = await db
        .from('profile')
        .select('role')
        .eq('userId', req.user.id)
        .single();

      const isAdmin = profile?.role === 'admin';

      const newMessage = await returnService.addReturnMessage(
        returnId,
        req.user.id,
        message,
        isAdmin
      );

      res.status(201).json({
        success: true,
        data: newMessage
      });
    } catch (error) {
      console.error('Error adding message:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to add message'
      });
    }
  }

  /**
   * Get all returns (Admin)
   * GET /api/returns/admin/all
   */
  async getAllReturns(req, res) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }

      // Check admin status
      const { data: profile } = await db
        .from('profile')
        .select('role')
        .eq('userId', req.user.id)
        .single();

      if (profile?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const { status, disputed } = req.query;
      
      // Build query
      let query = db
        .from('returns')
        .select('*')
        .order('createdAt', { ascending: false });

      if (status) {
        const validStatuses = ['pending', 'approved', 'rejected', 'refunded', 'disputed'];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({
            success: false,
            error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
          });
        }
        query = query.eq('status', status);
      }

      if (disputed === 'true') {
        query = query.eq('status', 'disputed');
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Get additional details for each return
      for (const returnItem of data) {
        // Get order details
        const { data: order } = await db
          .from('orders')
          .select('orderId, orderNumber, totalAmount')
          .eq('orderId', returnItem.orderId)
          .single();

        // Get seller details
        const { data: sellerProfile } = await db
          .from('sellerProfiles')
          .select('shopName')
          .eq('sellerProfileId', returnItem.sellerProfileId)
          .single();

        // Get buyer details
        const { data: buyer } = await db
          .from('profile')
          .select('username')
          .eq('userId', returnItem.buyerId)
          .single();

        returnItem.order = order;
        returnItem.sellerProfile = sellerProfile;
        returnItem.buyer = buyer;
      }

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Error fetching all returns:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch returns'
      });
    }
  }

  /**
   * Resolve dispute (Admin)
   * PUT /api/returns/:returnId/resolve
   */
  async resolveDispute(req, res) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }

      // Check admin status
      const { data: profile } = await db
        .from('profile')
        .select('role')
        .eq('userId', req.user.id)
        .single();

      if (profile?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const { returnId } = req.params;
      const { resolution, adminNotes } = req.body;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(returnId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid return ID format'
        });
      }

      if (!resolution || !['approve', 'reject'].includes(resolution)) {
        return res.status(400).json({
          success: false,
          error: 'Valid resolution required (approve/reject)'
        });
      }

      if (!adminNotes || adminNotes.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Admin notes required'
        });
      }

      const result = await returnService.resolveDispute(
        returnId,
        req.user.id,
        resolution,
        adminNotes
      );

      res.json(result);
    } catch (error) {
      console.error('Error resolving dispute:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to resolve dispute'
      });
    }
  }

  /**
   * Buyer marks return as shipped
   * POST /api/returns/:returnId/shipped
   */
  async markShipped(req, res) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const { returnId } = req.params;
      const { tracking_number } = req.body || {};
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!returnId || !uuidRegex.test(returnId)) {
        return res.status(400).json({ success: false, error: 'Invalid return ID format' });
      }
      
      // If tracking number provided, validate format
      if (tracking_number && (typeof tracking_number !== 'string' || tracking_number.length < 3 || tracking_number.length > 100)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Tracking number must be between 3 and 100 characters' 
        });
      }

      // Call service method
      const result = await returnService.markShipped(returnId, req.user.id, tracking_number);
      res.json(result);
      
    } catch (error) {
      console.error('Error marking return as shipped:', error);
      
      const statusCode = 
        error.message.includes('not found') ? 404 : 
        error.message.includes('Unauthorized') ? 403 : 400;
      
      res.status(statusCode).json({ 
        success: false, 
        error: error.message || 'Failed to mark return as shipped' 
      });
    }
  }

  /**
   * Seller marks return as received
   * PUT /api/returns/:returnId/received
   */
  async markReceived(req, res) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      // Get seller profile ID
      const { data: sellerProfile, error: profileError } = await db
        .from('sellerProfiles')
        .select('sellerProfileId')
        .eq('userId', req.user.id)
        .eq('isActive', true)
        .single();

      if (profileError || !sellerProfile) {
        return res.status(403).json({ 
          success: false, 
          error: 'Active seller profile required' 
        });
      }

      const { returnId } = req.params;
      const { received_condition } = req.body || {};
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!returnId || !uuidRegex.test(returnId)) {
        return res.status(400).json({ success: false, error: 'Invalid return ID format' });
      }

      // Call service method
      const result = await returnService.markReceived(
        returnId, 
        sellerProfile.sellerProfileId,
        received_condition
      );
      
      res.json(result);
      
    } catch (error) {
      console.error('Error marking return as received:', error);
      
      const statusCode = 
        error.message.includes('not found') ? 404 : 
        error.message.includes('Unauthorized') ? 403 : 400;
      
      res.status(statusCode).json({ 
        success: false, 
        error: error.message || 'Failed to mark return as received' 
      });
    }
  }

  /**
   * Get return statistics (Admin)
   * GET /api/returns/admin/stats
   */
  async getReturnStats(req, res) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }

      // Check admin status
      const { data: profile } = await db
        .from('profile')
        .select('role')
        .eq('userId', req.user.id)
        .single();

      if (profile?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      // Get all returns
      const { data: returns, error } = await db
        .from('returns')
        .select('status, reason, refundAmount');

      if (error) {
        throw error;
      }

      // Calculate statistics
      const stats = {
        totalReturns: returns.length,
        statusBreakdown: {},
        reasonBreakdown: {},
        totalRefundAmount: 0
      };

      returns.forEach(r => {
        // Status breakdown
        stats.statusBreakdown[r.status] = (stats.statusBreakdown[r.status] || 0) + 1;
        
        // Reason breakdown
        stats.reasonBreakdown[r.reason] = (stats.reasonBreakdown[r.reason] || 0) + 1;
        
        // Total refund amount
        if (r.status === 'refunded' && r.refundAmount) {
          stats.totalRefundAmount += parseFloat(r.refundAmount);
        }
      });

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching return stats:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch statistics'
      });
    }
  }
}

export default new ReturnController();
