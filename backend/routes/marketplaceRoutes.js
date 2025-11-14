import express from 'express';
import multer from 'multer';
import db from '../database/db.js';
import * as xenditService from '../services/xenditService.js';
import { requirePermission } from '../middleware/permission.js';
import { validateRequest } from '../middleware/validation.js';
import {
  createMarketplaceItem,
  getMarketplaceItems,
  getMarketplaceItem,
  updateMarketplaceItem,
  deleteMarketplaceItem,
  createTestItems,
  checkPaymentStatus,
  getBuyerOrders,
  getSellerOrders,
  getOrderDetails,
  buyNowOrder,
  markOrderAsProcessing,
  markOrderAsShipped,
  markOrderAsDelivered,
  cancelOrder,
  submitSellerApplication,
  getMySellerApplication,
  getAllSellerApplications,
  approveSellerApplication,
  rejectSellerApplication,
  deleteSellerApplication,
  checkSellerStatus,
  cancelMyApplication,
  getUserAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  getMyItems,
  getSellerStats,
} from '../controllers/marketplaceController.js';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs for ID documents
    if (file.mimetype === 'image/jpeg' || 
        file.mimetype === 'image/jpg' || 
        file.mimetype === 'image/png' ||
        file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and PDF files are allowed'), false);
    }
  }
});

// ========================================
// MARKETPLACE ITEMS (CRUD)
// ========================================

// TESTING ONLY - Create test items
router.post(
  '/items/test',
  requirePermission(['admin']),
  validateRequest({ body: {} }, { source: 'body', allowUnknown: false, stripUnknown: true }),
  createTestItems
);

// Create marketplace item (with image upload)
router.post(
  '/items',
  requirePermission(['artist', 'admin']),
  upload.array('images', 10),
  validateRequest(
    {
      body: {
        title: { type: 'string', required: true, min: 3, max: 200 },
        price: { type: 'number', required: true, min: 0.01, max: 10000000 },
        description: { type: 'string', required: false, min: 0, max: 5000 },
        medium: { type: 'string', required: false, min: 0, max: 100 },
        dimensions: { type: 'string', required: false, min: 0, max: 100 },
        year_created: {
          type: 'integer',
          required: false,
          validate: (v) => (v === undefined || (parseInt(v, 10) >= 1000 && parseInt(v, 10) <= new Date().getFullYear())) || `year_created must be between 1000 and ${new Date().getFullYear()}`
        },
        weight_kg: { type: 'number', required: false, min: 0, max: 1000 },
        quantity: { type: 'integer', required: false, default: 1, min: 1, max: 1000 },
        is_original: { type: 'boolean', required: false },
        is_framed: { type: 'boolean', required: false },
        is_available: { type: 'boolean', required: false },
        is_featured: { type: 'boolean', required: false },
        status: { type: 'string', required: false, min: 0, max: 50 },
        categories: { type: 'string', required: false, max: 2000 },
        tags: { type: 'string', required: false, max: 2000 }
      }
    },
    { source: 'body', allowUnknown: false, stripUnknown: true, coerce: true }
  ),
  createMarketplaceItem
);

// Get all marketplace items
router.get(
  '/items',
  validateRequest(
    {
      query: {
        status: { type: 'string', required: false, min: 1, max: 50 },
        sellerProfileId: { type: 'string', required: false, min: 1, max: 120 },
        page: { type: 'integer', required: false, default: 1, min: 1 },
        limit: { type: 'integer', required: false, default: 20, min: 1, max: 100 }
      }
    },
    { source: 'query', coerce: true, allowUnknown: false, stripUnknown: true }
  ),
  getMarketplaceItems
);

// Get single marketplace item
router.get(
  '/items/:id',
  validateRequest(
    { params: { id: { type: 'string', required: true, min: 1 } } },
    { source: 'params', allowUnknown: false }
  ),
  getMarketplaceItem
);

// Update marketplace item (with image upload)
router.put(
  '/items/:id',
  requirePermission(['artist', 'admin']),
  upload.array('images', 10),
  validateRequest(
    {
      params: { id: { type: 'string', required: true, min: 1 } },
      body: {
        title: { type: 'string', required: false, min: 3, max: 200 },
        description: { type: 'string', required: false, min: 0, max: 5000 },
        price: { type: 'number', required: false, min: 0.01, max: 10000000 },
        medium: { type: 'string', required: false, min: 0, max: 100 },
        dimensions: { type: 'string', required: false, min: 0, max: 100 },
        year_created: {
          type: 'integer',
          required: false,
          validate: (v) => (v === undefined || (parseInt(v, 10) >= 1000 && parseInt(v, 10) <= new Date().getFullYear())) || `year_created must be between 1000 and ${new Date().getFullYear()}`
        },
        weight_kg: { type: 'number', required: false, min: 0, max: 1000 },
        quantity: { type: 'integer', required: false, min: 1, max: 1000 },
        is_original: { type: 'boolean', required: false },
        is_framed: { type: 'boolean', required: false },
        is_available: { type: 'boolean', required: false },
        is_featured: { type: 'boolean', required: false },
        condition: { type: 'string', required: false, min: 0, max: 50 },
        status: { type: 'string', required: false, min: 0, max: 50 },
        categories: { type: 'string', required: false, max: 2000 },
        tags: { type: 'string', required: false, max: 2000 },
        existing_images_to_keep: { type: 'string', required: false, max: 10000 },
        remove_all_images: { type: 'boolean', required: false }
      }
    },
    { source: ['params', 'body'], allowUnknown: false, stripUnknown: true, coerce: true }
  ),
  updateMarketplaceItem
);

// Delete marketplace item
router.delete(
  '/items/:id',
  requirePermission(['artist', 'admin']),
  validateRequest(
    { params: { id: { type: 'string', required: true, min: 1 } } },
    { source: 'params', allowUnknown: false }
  ),
  deleteMarketplaceItem
);


// Buy Now (single item)
router.post(
  '/orders/buy-now',
  validateRequest(
    {
      body: {
        marketItemId: { type: 'string', required: true, min: 1 },
        quantity: { type: 'integer', required: false, default: 1, min: 1, max: 100 },
        shippingFee: { type: 'number', required: false, min: 0, max: 100000 },
        shippingMethod: { type: 'string', required: false, min: 1, max: 50 },
        orderNotes: { type: 'string', required: false, min: 0, max: 500 },
        shippingAddress: { type: 'object', required: false },
        contactInfo: { type: 'object', required: false }
      }
    },
    { source: 'body', allowUnknown: false, stripUnknown: true, coerce: true }
  ),
  buyNowOrder
);

// Check payment status manually (backup for webhook failures)
router.get(
  '/orders/:orderId/check-payment',
  validateRequest(
    { params: { orderId: { type: 'string', required: true, min: 1 } } },
    { source: 'params', allowUnknown: false }
  ),
  checkPaymentStatus
);

// Get buyer's orders
router.get(
  '/orders/buyer',
  validateRequest(
    { query: { status: { type: 'string', required: false, min: 1, max: 50 } } },
    { source: 'query', allowUnknown: false, stripUnknown: true }
  ),
  getBuyerOrders
);

// Get seller's orders
router.get(
  '/orders/seller',
  validateRequest(
    {
      query: {
        status: { type: 'string', required: false, min: 1, max: 50 },
        filter: { type: 'string', required: false, min: 1, max: 50 }
      }
    },
    { source: 'query', allowUnknown: false, stripUnknown: true }
  ),
  getSellerOrders
);

// Get order details
router.get(
  '/orders/:orderId',
  validateRequest(
    { params: { orderId: { type: 'string', required: true, min: 1 } } },
    { source: 'params', allowUnknown: false }
  ),
  getOrderDetails
);

// Get payment link for pending order
router.get(
  '/orders/:orderId/payment-link',
  validateRequest(
    { params: { orderId: { type: 'string', required: true, min: 1 } } },
    { source: 'params', allowUnknown: false }
  ),
  async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Get order
    const { data: order, error } = await db
      .from('orders')
      .select('*')
      .eq('orderId', orderId)
      .eq('userId', userId)
      .single();

    if (error || !order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Only allow for pending payment orders
    if (order.paymentStatus !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        error: 'Order payment is already completed or expired' 
      });
    }

    // Check if payment link ID exists
    if (!order.paymentLinkId) {
      console.error('Order missing paymentLinkId:', orderId);
      return res.status(404).json({ 
        success: false, 
        error: 'Payment link not found for this order' 
      });
    }

    // Get payment link from Xendit using the payment link ID
    let paymentLink;
    try {
      paymentLink = await xenditService.getPaymentLink(order.paymentLinkId);
    } catch (err) {
      console.error('Error fetching payment link:', err.message);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve payment link' 
      });
    }

    if (!paymentLink || !paymentLink.checkoutUrl) {
      return res.status(404).json({ 
        success: false, 
        error: 'Payment link not found or expired' 
      });
    }

    res.json({
      success: true,
      data: {
        paymentUrl: paymentLink.checkoutUrl,
        referenceNumber: order.paymentReference,
        amount: order.totalAmount,
        expiresAt: paymentLink.expiresAt
      }
    });
  } catch (error) {
    console.error('Error getting payment link:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// PHASE 3: ORDER STATUS UPDATES
// ========================================

// Mark order as processing (Seller)
router.put(
  '/orders/:orderId/process',
  validateRequest(
    { params: { orderId: { type: 'string', required: true, min: 1 } } },
    { source: 'params', allowUnknown: false }
  ),
  markOrderAsProcessing
);

// Mark order as shipped (Seller)
router.put(
  '/orders/:orderId/ship',
  validateRequest(
    {
      params: { orderId: { type: 'string', required: true, min: 1 } },
      body: { tracking_number: { type: 'string', required: true, min: 5, max: 100 } }
    },
    { source: ['params', 'body'], allowUnknown: false, stripUnknown: true }
  ),
  markOrderAsShipped
);

// Mark order as delivered (Buyer)
router.put(
  '/orders/:orderId/deliver',
  validateRequest(
    { params: { orderId: { type: 'string', required: true, min: 1 } } },
    { source: 'params', allowUnknown: false }
  ),
  markOrderAsDelivered
);

// Cancel order (Buyer or Seller)
router.put(
  '/orders/:orderId/cancel',
  validateRequest(
    {
      params: { orderId: { type: 'string', required: true, min: 1 } },
      body: { reason: { type: 'string', required: false, min: 1, max: 500 } }
    },
    { source: ['params', 'body'], allowUnknown: false, stripUnknown: true }
  ),
  cancelOrder
);

// ========================================
// SELLER APPLICATIONS
// ========================================

// Submit seller application (with file upload)
router.post(
  '/seller/apply',
  upload.single('idDocument'),
  validateRequest(
    {
      body: {
        shopName: { type: 'string', required: true, min: 3, max: 100 },
        fullName: { type: 'string', required: true, min: 2, max: 100 },
        email: { type: 'email', required: true },
        phoneNumber: { type: 'phone', required: true },
        street: { type: 'string', required: true, min: 5, max: 200 },
        region: { type: 'string', required: true, min: 2, max: 100 },
        province: { type: 'string', required: true, min: 2, max: 100 },
        city: { type: 'string', required: true, min: 2, max: 100 },
        barangay: { type: 'string', required: true, min: 2, max: 100 },
        postalCode: { type: 'string', required: true, pattern: /^\d{4}$/ },
        shopDescription: { type: 'string', required: true, min: 20, max: 1000 },
        landmark: { type: 'string', required: false, min: 0, max: 200 }
      }
    },
    { source: 'body', allowUnknown: false, stripUnknown: true, trimStrings: true }
  ),
  submitSellerApplication
);

// Check if user is an active seller
router.get('/seller/status', checkSellerStatus);

// Get my seller application status
router.get('/seller/my-application', getMySellerApplication);

// Get all seller applications (Admin only)
router.get(
  '/seller/applications',
  requirePermission(['admin']),
  validateRequest(
    { query: { status: { type: 'string', required: false, min: 1, max: 50 } } },
    { source: 'query', allowUnknown: false, stripUnknown: true }
  ),
  getAllSellerApplications
);

// Approve seller application (Admin only)
router.put(
  '/seller/applications/:applicationId/approve',
  requirePermission(['admin']),
  validateRequest(
    { params: { applicationId: { type: 'string', required: true, min: 1 } } },
    { source: 'params', allowUnknown: false }
  ),
  approveSellerApplication
);

// Reject seller application (Admin only)
router.put(
  '/seller/applications/:applicationId/reject',
  requirePermission(['admin']),
  validateRequest(
    {
      params: { applicationId: { type: 'string', required: true, min: 1 } },
      body: { rejectionReason: { type: 'string', required: true, min: 10, max: 500 } }
    },
    { source: ['params', 'body'], allowUnknown: false, stripUnknown: true }
  ),
  rejectSellerApplication
);

// Delete seller application (Admin only)
router.delete(
  '/seller/applications/:applicationId',
  requirePermission(['admin']),
  validateRequest(
    { params: { applicationId: { type: 'string', required: true, min: 1 } } },
    { source: 'params', allowUnknown: false }
  ),
  deleteSellerApplication
);

// TESTING ONLY - Cancel my own application
router.post(
  '/seller/cancel-my-application',
  validateRequest({ body: {} }, { source: 'body', allowUnknown: false, stripUnknown: true }),
  cancelMyApplication
);

// ========================================
// SELLER DASHBOARD
// ========================================

// Get seller's own items
router.get('/seller/my-items', getMyItems);

// Get seller dashboard statistics
router.get(
  '/seller/stats',
  validateRequest(
    { query: { period: { type: 'string', required: false, enum: ['all', 'daily', 'weekly', 'monthly'], default: 'all' } } },
    { source: 'query', allowUnknown: false, stripUnknown: true }
  ),
  getSellerStats
);

// ========================================
// ADDRESS MANAGEMENT
// ========================================

// Get all user addresses
router.get('/addresses', getUserAddresses);

// Create new address
router.post(
  '/addresses',
  validateRequest(
    {
      body: {
        fullName: { type: 'string', required: true, min: 2, max: 100 },
        email: { type: 'email', required: true },
        phoneNumber: { type: 'phone', required: true },
        alternatePhone: { type: 'phone', required: false },
        addressLine1: { type: 'string', required: true, min: 5, max: 200 },
        addressLine2: { type: 'string', required: false, min: 0, max: 200 },
        landmark: { type: 'string', required: false, min: 0, max: 200 },
        regionCode: { type: 'string', required: true, min: 1, max: 20 },
        provinceCode: { type: 'string', required: true, min: 1, max: 20 },
        cityMunicipalityCode: { type: 'string', required: true, min: 1, max: 20 },
        barangayCode: { type: 'string', required: true, min: 1, max: 20 },
        regionName: { type: 'string', required: true, min: 2, max: 100 },
        provinceName: { type: 'string', required: true, min: 2, max: 100 },
        cityMunicipalityName: { type: 'string', required: true, min: 2, max: 100 },
        barangayName: { type: 'string', required: true, min: 2, max: 100 },
        postalCode: { type: 'string', required: true, pattern: /^\d{4}$/ },
        addressType: { type: 'string', required: false, min: 0, max: 50 },
        isDefault: { type: 'boolean', required: false, default: false },
        deliveryInstructions: { type: 'string', required: false, min: 0, max: 300 }
      }
    },
    { source: 'body', allowUnknown: false, stripUnknown: true, coerce: true }
  ),
  createAddress
);

// Update address
router.put(
  '/addresses/:addressId',
  validateRequest(
    {
      params: { addressId: { type: 'string', required: true, min: 1 } },
      body: {
        fullName: { type: 'string', required: false, min: 2, max: 100 },
        email: { type: 'email', required: false },
        phoneNumber: { type: 'phone', required: false },
        alternatePhone: { type: 'phone', required: false },
        addressLine1: { type: 'string', required: false, min: 5, max: 200 },
        addressLine2: { type: 'string', required: false, min: 0, max: 200 },
        landmark: { type: 'string', required: false, min: 0, max: 200 },
        regionCode: { type: 'string', required: false, min: 1, max: 20 },
        provinceCode: { type: 'string', required: false, min: 1, max: 20 },
        cityMunicipalityCode: { type: 'string', required: false, min: 1, max: 20 },
        barangayCode: { type: 'string', required: false, min: 1, max: 20 },
        regionName: { type: 'string', required: false, min: 2, max: 100 },
        provinceName: { type: 'string', required: false, min: 2, max: 100 },
        cityMunicipalityName: { type: 'string', required: false, min: 2, max: 100 },
        barangayName: { type: 'string', required: false, min: 2, max: 100 },
        postalCode: { type: 'string', required: false, pattern: /^\d{4}$/ },
        addressType: { type: 'string', required: false, min: 0, max: 50 },
        isDefault: { type: 'boolean', required: false },
        deliveryInstructions: { type: 'string', required: false, min: 0, max: 300 }
      }
    },
    { source: ['params', 'body'], allowUnknown: false, stripUnknown: true, coerce: true }
  ),
  updateAddress
);

// Delete address
router.delete(
  '/addresses/:addressId',
  validateRequest(
    { params: { addressId: { type: 'string', required: true, min: 1 } } },
    { source: 'params', allowUnknown: false }
  ),
  deleteAddress
);

// ========================================
// PAYOUT SYSTEM - REMOVED (To be replaced)
// ========================================

// ========================================
// ORDER CLEANUP (Admin/Testing)
// ========================================

import { manualCleanup, fixStuckOrders } from '../controllers/orderCleanupController.js';

// Manual cleanup trigger (for testing)
router.post('/orders/cleanup', manualCleanup);

// Fix stuck orders with inventory issues (one-time fix)
router.post('/orders/fix-stuck', fixStuckOrders);

export default router;
