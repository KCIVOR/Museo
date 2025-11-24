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
import { validateRequest } from '../middleware/validation.js';

const router = express.Router();

/**
 * Visit Booking Routes
 */

// Public routes
router.post(
  '/',
  validateRequest(
    {
      body: {
        visitorType: { type: 'string', required: true, enum: ['individual','school','organization'] },
        organizationName: { type: 'string', required: false, min: 0, max: 200 },
        howMany: { type: 'integer', required: true, min: 1 },
        classification: { type: 'string', required: false, min: 0, max: 100 },
        institutional: { type: 'string', required: false, min: 0, max: 100 },
        yearLevel: { type: 'string', required: false, min: 0, max: 100 },
        location: { type: 'string', required: true, min: 1, max: 300 },
        organizationDetails: { type: 'string', required: false, min: 0, max: 1000 },
        contactName: { type: 'string', required: true, min: 1, max: 200 },
        contactEmail: { type: 'email', required: true },
        contactPhone: { type: 'string', required: true, min: 7, max: 30 },
        preferredDate: {
          type: 'date',
          required: true,
          validate: (v) => {
            const d = new Date(v);
            const today = new Date();
            today.setHours(0,0,0,0);
            return (!Number.isNaN(d.valueOf()) && d >= today) || 'preferredDate cannot be in the past';
          }
        },
        preferredTime: { type: 'string', required: false, min: 0, max: 50 },
        purposeOfVisit: { type: 'string', required: true, min: 1, max: 200 },
        purposeOther: { type: 'string', required: false, min: 0, max: 400 },
        remarks: { type: 'string', required: false, min: 0, max: 1000 }
      }
    },
    { source: 'body', coerce: true, allowUnknown: false, stripUnknown: true }
  ),
  createVisitBooking
); // Submit a booking (no auth required)

// Protected routes (require authentication)
router.get('/my-bookings', getMyBookings); // Get user's own bookings

// Admin only routes
router.get(
  '/stats',

  requirePermission('admin'),
  validateRequest(
    { query: { startDate: { type: 'date', required: false }, endDate: { type: 'date', required: false } } },
    { source: 'query', allowUnknown: false, stripUnknown: true }
  ),
  getBookingStats
); // Get statistics
router.get(
  '/',
  requirePermission('admin'),
  validateRequest(
    {
      query: {
        status: { type: 'string', required: false, enum: ['pending','approved','rejected','completed','cancelled'] },
        visitorType: { type: 'string', required: false, enum: ['individual','school','organization'] },
        startDate: { type: 'date', required: false },
        endDate: { type: 'date', required: false },
        page: { type: 'integer', default: 1, min: 1 },
        limit: { type: 'integer', default: 20, min: 1, max: 200 }
      }
    },
    { source: 'query', coerce: true, allowUnknown: false, stripUnknown: true }
  ),
  getAllVisitBookings
); // Get all bookings
router.get(
  '/:id',
  requirePermission('admin'),
  validateRequest(
    { params: { id: { type: 'string', required: true, min: 1 } } },
    { source: 'params', allowUnknown: false }
  ),
  getVisitBookingById
); // Get single booking (admin or owner)
router.put(
  '/:id',

  requirePermission('admin'),
  validateRequest(
    {
      params: { id: { type: 'string', required: true, min: 1 } },
      body: {
        status: { type: 'string', required: false, enum: ['pending','approved','rejected','completed','cancelled'] },
        adminNotes: { type: 'string', required: false, min: 0, max: 1000 },
        preferredDate: { type: 'date', required: false },
        preferredTime: { type: 'string', required: false, min: 0, max: 50 }
      }
    },
    { source: ['params','body'], allowUnknown: false, stripUnknown: true }
  ),
  updateVisitBooking
); // Update booking
router.delete(
  '/:id',

  requirePermission('admin'),
  validateRequest(
    { params: { id: { type: 'string', required: true, min: 1 } } },
    { source: 'params', allowUnknown: false }
  ),
  deleteVisitBooking
); // Delete booking

export default router;
