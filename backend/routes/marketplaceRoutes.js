import express from 'express';
import multer from 'multer';
import db from '../database/db.js';
import * as paymongoService from '../services/paymongoService.js';
import {
  createMarketplaceItem,
  getMarketplaceItems,
  getMarketplaceItem,
  updateMarketplaceItem,
  deleteMarketplaceItem,
  createTestItems,
  getCart,
  addToCart,
  updateCartQuantity,
  removeFromCart,
  clearCart,
  createOrder,
  getBuyerOrders,
  getSellerOrders,
  getOrderDetails,
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
  getSellerStats
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
router.post('/items/test', createTestItems);

// Create marketplace item (with image upload)
router.post('/items', upload.array('images', 10), createMarketplaceItem);

// Get all marketplace items
router.get('/items', getMarketplaceItems);

// Get single marketplace item
router.get('/items/:id', getMarketplaceItem);

// Update marketplace item (with image upload)
router.put('/items/:id', upload.array('images', 10), updateMarketplaceItem);

// Delete marketplace item
router.delete('/items/:id', deleteMarketplaceItem);

// ========================================
// PHASE 1: CART ROUTES
// ========================================

// Get user's cart
router.get('/cart', getCart);

// Add item to cart
router.post('/cart/add', addToCart);

// Update cart item quantity
router.put('/cart/:itemId', updateCartQuantity);

// Remove item from cart
router.delete('/cart/:itemId', removeFromCart);

// Clear entire cart
router.delete('/cart/clear', clearCart);

// ========================================
// PHASE 2: ORDERS & CHECKOUT
// ========================================

// Create order from cart
router.post('/orders/create', createOrder);

// Get buyer's orders
router.get('/orders/buyer', getBuyerOrders);

// Get seller's orders
router.get('/orders/seller', getSellerOrders);

// Get order details
router.get('/orders/:orderId', getOrderDetails);

// Get payment link for pending order
router.get('/orders/:orderId/payment-link', async (req, res) => {
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

    // Get payment link from PayMongo using reference number
    const paymentLink = await paymongoService.getPaymentLink(order.paymentReference);

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
router.put('/orders/:orderId/process', markOrderAsProcessing);

// Mark order as shipped (Seller)
router.put('/orders/:orderId/ship', markOrderAsShipped);

// Mark order as delivered (Buyer)
router.put('/orders/:orderId/deliver', markOrderAsDelivered);

// Cancel order (Buyer or Seller)
router.put('/orders/:orderId/cancel', cancelOrder);

// ========================================
// SELLER APPLICATIONS
// ========================================

// Submit seller application (with file upload)
router.post('/seller/apply', upload.single('idDocument'), submitSellerApplication);

// Check if user is an active seller
router.get('/seller/status', checkSellerStatus);

// Get my seller application status
router.get('/seller/my-application', getMySellerApplication);

// Get all seller applications (Admin only)
router.get('/seller/applications', getAllSellerApplications);

// Approve seller application (Admin only)
router.put('/seller/applications/:applicationId/approve', approveSellerApplication);

// Reject seller application (Admin only)
router.put('/seller/applications/:applicationId/reject', rejectSellerApplication);

// Delete seller application (Admin only)
router.delete('/seller/applications/:applicationId', deleteSellerApplication);

// TESTING ONLY - Cancel my own application
router.post('/seller/cancel-my-application', cancelMyApplication);

// ========================================
// SELLER DASHBOARD
// ========================================

// Get seller's own items
router.get('/seller/my-items', getMyItems);

// Get seller dashboard statistics
router.get('/seller/stats', getSellerStats);

// ========================================
// ADDRESS MANAGEMENT
// ========================================

// Get all user addresses
router.get('/addresses', getUserAddresses);

// Create new address
router.post('/addresses', createAddress);

// Update address
router.put('/addresses/:addressId', updateAddress);

// Delete address
router.delete('/addresses/:addressId', deleteAddress);

// ========================================
// ORDER CLEANUP (Admin/Testing)
// ========================================

import { manualCleanup, fixStuckOrders } from '../controllers/orderCleanupController.js';

// Manual cleanup trigger (for testing)
router.post('/orders/cleanup', manualCleanup);

// Fix stuck orders with inventory issues (one-time fix)
router.post('/orders/fix-stuck', fixStuckOrders);

export default router;
