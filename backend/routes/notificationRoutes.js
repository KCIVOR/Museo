import { Router } from "express";
import { listNotifications, markAsRead, markAllAsRead, deleteNotification } from "../controllers/notificationController.js";

const router = Router();

// Get notifications for current user (already has authMiddleware in server.js)
router.get("/", listNotifications);

// Mark specific notification as read
router.put("/:notificationId/read", markAsRead);

// Mark all notifications as read for current user
router.put("/mark-all-read", markAllAsRead);

// Delete specific notification
router.delete("/:notificationId", deleteNotification);

export default router;
