import express from 'express';
import {
  createTestItems,
  createMarketplaceItem,
  getMarketplaceItem,
  getMarketplaceItems,
  updateMarketplaceItem,
  deleteMarketplaceItem,
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
  cancelOrder
} from '../controllers/marketplaceController.js';

const router = express.Router();

// ========================================
// MARKETPLACE ITEMS (CRUD)
// ========================================

// TESTING ONLY - Create test items
router.post('/items/test', createTestItems);

// Create marketplace item
router.post('/items', createMarketplaceItem);

// Get all marketplace items
router.get('/items', getMarketplaceItems);

// Get single marketplace item
router.get('/items/:id', getMarketplaceItem);

// Update marketplace item
router.put('/items/:id', updateMarketplaceItem);

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

export default router;
