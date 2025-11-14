// returnRoutes.js - CORRECTED VERSION
import express from 'express';
import multer from 'multer';
import returnController from '../controllers/returnController.js';
import { authMiddleware } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';

const router = express.Router();

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 5 // Maximum 5 files
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'), false);
    } else {
      cb(null, true);
    }
  }
});

// All routes require authentication (applied in server.js already, but adding for clarity)
router.use(authMiddleware);

// ========================================
// BUYER ROUTES
// ========================================

// Create return request (with optional evidence images)
router.post(
  '/',
  upload.array('evidence', 5),
  validateRequest(
    {
      body: {
        orderId: { type: 'string', required: true, min: 1 },
        reason: { type: 'string', required: true, enum: ['defective_damaged', 'wrong_item', 'not_as_described', 'changed_mind', 'other'] },
        description: { type: 'string', required: true, min: 1, max: 2000 }
      }
    },
    { source: 'body', allowUnknown: false, stripUnknown: true, trimStrings: true }
  ),
  returnController.createReturn
);

// Get buyer's returns
router.get(
  '/buyer',
  validateRequest(
    { query: { status: { type: 'string', required: false, enum: ['pending', 'approved', 'rejected', 'refunded', 'disputed'] } } },
    { source: 'query', allowUnknown: false, stripUnknown: true }
  ),
  returnController.getBuyerReturns
);

// Dispute a rejected return
router.post(
  '/:returnId/dispute',
  validateRequest(
    {
      params: { returnId: { type: 'uuid', required: true } },
      body: { disputeReason: { type: 'string', required: true, min: 1, max: 2000 } }
    },
    { source: ['params', 'body'], allowUnknown: false, stripUnknown: true, trimStrings: true }
  ),
  returnController.disputeReturn
);

// Buyer marks return as shipped
router.post(
  '/:returnId/shipped',
  validateRequest(
    {
      params: { returnId: { type: 'uuid', required: true } },
      body: { tracking_number: { type: 'string', required: false, min: 3, max: 100 } }
    },
    { source: ['params', 'body'], allowUnknown: false, stripUnknown: true, trimStrings: true }
  ),
  returnController.markShipped
);

// ========================================
// SELLER ROUTES
// ========================================

// Get seller's returns
router.get(
  '/seller',
  validateRequest(
    { query: { status: { type: 'string', required: false, enum: ['pending', 'approved', 'rejected', 'refunded', 'disputed'] } } },
    { source: 'query', allowUnknown: false, stripUnknown: true }
  ),
  returnController.getSellerReturns
);

// Approve return request
router.put(
  '/:returnId/approve',
  validateRequest(
    {
      params: { returnId: { type: 'uuid', required: true } },
      body: { sellerResponse: { type: 'string', required: false, min: 0, max: 2000 } }
    },
    { source: ['params', 'body'], allowUnknown: false, stripUnknown: true, trimStrings: true }
  ),
  returnController.approveReturn
);

// Reject return request
router.put(
  '/:returnId/reject',
  validateRequest(
    {
      params: { returnId: { type: 'uuid', required: true } },
      body: { sellerResponse: { type: 'string', required: true, min: 1, max: 2000 } }
    },
    { source: ['params', 'body'], allowUnknown: false, stripUnknown: true, trimStrings: true }
  ),
  returnController.rejectReturn
);

// Seller marks return as received (triggers refund)
router.put(
  '/:returnId/received',
  validateRequest(
    {
      params: { returnId: { type: 'uuid', required: true } },
      body: { received_condition: { type: 'string', required: false, min: 0, max: 200 } }
    },
    { source: ['params', 'body'], allowUnknown: false, stripUnknown: true, trimStrings: true }
  ),
  returnController.markReceived
);

// ========================================
// SHARED ROUTES
// ========================================

// Get return details (buyers, sellers, and admins can access)
router.get(
  '/:returnId',
  validateRequest(
    { params: { returnId: { type: 'uuid', required: true } } },
    { source: 'params', allowUnknown: false }
  ),
  returnController.getReturnDetails
);

// Add message to return conversation
router.post(
  '/:returnId/messages',
  validateRequest(
    {
      params: { returnId: { type: 'uuid', required: true } },
      body: { message: { type: 'string', required: true, min: 1, max: 2000 } }
    },
    { source: ['params', 'body'], allowUnknown: false, stripUnknown: true, trimStrings: true }
  ),
  returnController.addReturnMessage
);

// ========================================
// ADMIN ROUTES
// ========================================

// Get all returns (admin only)
router.get(
  '/admin/all',
  validateRequest(
    {
      query: {
        status: { type: 'string', required: false, enum: ['pending', 'approved', 'rejected', 'refunded', 'disputed'] },
        disputed: { type: 'string', required: false, pattern: /^(true|false)$/ }
      }
    },
    { source: 'query', allowUnknown: false, stripUnknown: true }
  ),
  returnController.getAllReturns
);

// Get return statistics (admin only)
router.get('/admin/stats', returnController.getReturnStats);

// Resolve dispute (admin only)
router.put(
  '/:returnId/resolve',
  validateRequest(
    {
      params: { returnId: { type: 'uuid', required: true } },
      body: {
        resolution: { type: 'string', required: true, enum: ['approve', 'reject'] },
        adminNotes: { type: 'string', required: true, min: 1, max: 2000 }
      }
    },
    { source: ['params', 'body'], allowUnknown: false, stripUnknown: true, trimStrings: true }
  ),
  returnController.resolveDispute
);

export default router;
