import express from 'express';
import { validateRequest } from '../middleware/validation.js';
import { requirePermission } from '../middleware/permission.js';
import {
  createReport,
  listReports,
  getReportById,
  updateReport
} from '../controllers/reportController.js';

const router = express.Router();

// POST /api/reports - create a report (auth required)
router.post(
  '/',
  validateRequest(
    {
      body: {
        targetType: { type: 'string', required: true, min: 2, max: 64 },
        targetId: { type: 'string', required: true, min: 1 },
        reason: { type: 'string', required: false, min: 1, max: 200 },
        details: { type: 'string', required: false, min: 1, max: 5000 }
      }
    },
    { source: 'body', allowUnknown: false, stripUnknown: true, coerce: true }
  ),
  createReport
);

// GET /api/reports - list reports (admin only)
router.get(
  '/',
  requirePermission(['admin']),
  validateRequest(
    {
      query: {
        status: { type: 'string', required: false, min: 2, max: 32 },
        targetType: { type: 'string', required: false, min: 2, max: 64 },
        targetId: { type: 'string', required: false, min: 1 },
        reporterUserId: { type: 'string', required: false, min: 1 },
        page: { type: 'integer', required: false, default: 1, min: 1 },
        limit: { type: 'integer', required: false, default: 20, min: 1, max: 100 }
      }
    },
    { source: 'query', allowUnknown: true, stripUnknown: true, coerce: true }
  ),
  listReports
);

// GET /api/reports/:reportId - get single report (admin only)
router.get(
  '/:reportId',
  requirePermission(['admin']),
  validateRequest(
    { params: { reportId: { type: 'string', required: true, min: 1 } } },
    { source: 'params', allowUnknown: false }
  ),
  getReportById
);

// PATCH /api/reports/:reportId - update status/details/reason (admin only)
router.patch(
  '/:reportId',
  requirePermission(['admin']),
  validateRequest(
    {
      params: { reportId: { type: 'string', required: true, min: 1 } },
      body: {
        status: { type: 'string', required: false, min: 2, max: 32 },
        reason: { type: 'string', required: false, min: 0, max: 200 },
        details: { type: 'string', required: false, min: 0, max: 5000 }
      }
    },
    { source: ['params', 'body'], allowUnknown: false, stripUnknown: true, coerce: true }
  ),
  updateReport
);

export default router;
