import { Router } from "express";
import { listNotifications, markAsRead, markAllAsRead, deleteNotification } from "../controllers/notificationController.js";
import { validateRequest } from "../middleware/validation.js";

const router = Router();

// Get notifications for current user (already has authMiddleware in server.js)
router.get(
  "/",
  validateRequest(
    { query: { page: { type: "integer", default: 1, min: 1 }, limit: { type: "integer", default: 20, min: 1, max: 100 } } },
    { source: "query", coerce: true, allowUnknown: false, stripUnknown: true }
  ),
  listNotifications
);

// Mark specific notification as read
router.put(
  "/:notificationId/read",
  validateRequest(
    { params: { notificationId: { type: "uuid", required: true } } },
    { source: "params", allowUnknown: false }
  ),
  markAsRead
);

// Mark all notifications as read for current user
router.put("/mark-all-read", markAllAsRead);

// Delete specific notification
router.delete(
  "/:notificationId",
  validateRequest(
    { params: { notificationId: { type: "uuid", required: true } } },
    { source: "params", allowUnknown: false }
  ),
  deleteNotification
);

export default router;
