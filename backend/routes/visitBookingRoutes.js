import express from 'express';
import {
  createVisitBooking,
  getAllVisitBookings,
  getVisitBookingById,
  updateVisitBooking,
  deleteVisitBooking,
  getBookingStats,
  getMyBookings
} from '../controllers/visitBookingController.js';

import { authMiddleware } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission.js';

const router = express.Router();

/**
 * Visit Booking Routes
 */

// Public routes
router.post('/', createVisitBooking); // Submit a booking (no auth required)

// Protected routes (require authentication)
router.get('/my-bookings', authMiddleware, getMyBookings); // Get user's own bookings

// Admin only routes
router.get('/stats', authMiddleware, requirePermission('admin'), getBookingStats); // Get statistics
router.get('/', authMiddleware, requirePermission('admin'), getAllVisitBookings); // Get all bookings
router.get('/:id', authMiddleware, getVisitBookingById); // Get single booking (admin or owner)
router.put('/:id', authMiddleware, requirePermission('admin'), updateVisitBooking); // Update booking
router.delete('/:id', authMiddleware, requirePermission('admin'), deleteVisitBooking); // Delete booking

export default router;
