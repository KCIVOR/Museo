// returnRoutes.js - CORRECTED VERSION
import express from 'express';
import multer from 'multer';
import returnController from '../controllers/returnController.js';
import { authMiddleware } from '../middleware/auth.js';

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
router.post('/', upload.array('evidence', 5), returnController.createReturn);

// Get buyer's returns
router.get('/buyer', returnController.getBuyerReturns);

// Dispute a rejected return
router.post('/:returnId/dispute', returnController.disputeReturn);

// Buyer marks return as shipped
router.post('/:returnId/shipped', returnController.markShipped);

// ========================================
// SELLER ROUTES
// ========================================

// Get seller's returns
router.get('/seller', returnController.getSellerReturns);

// Approve return request
router.put('/:returnId/approve', returnController.approveReturn);

// Reject return request
router.put('/:returnId/reject', returnController.rejectReturn);

// Seller marks return as received (triggers refund)
router.put('/:returnId/received', returnController.markReceived);

// ========================================
// SHARED ROUTES
// ========================================

// Get return details (buyers, sellers, and admins can access)
router.get('/:returnId', returnController.getReturnDetails);

// Add message to return conversation
router.post('/:returnId/messages', returnController.addReturnMessage);

// ========================================
// ADMIN ROUTES
// ========================================

// Get all returns (admin only)
router.get('/admin/all', returnController.getAllReturns);

// Get return statistics (admin only)
router.get('/admin/stats', returnController.getReturnStats);

// Resolve dispute (admin only)
router.put('/:returnId/resolve', returnController.resolveDispute);

export default router;
