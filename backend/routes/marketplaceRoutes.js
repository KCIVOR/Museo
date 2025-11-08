import express from 'express';
import multer from 'multer';
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
  deleteAddress
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

// ========================================
// PHASE 3: ORDER STATUS UPDATES
// ========================================

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

export default router;
