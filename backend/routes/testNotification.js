import { Router } from "express";
import db from "../database/db.js";

const router = Router();

// Test endpoint to create a notification
router.post("/test", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Create a test notification in the database
    const testNotification = {
      type: "event_created",
      title: `Test Event ${Date.now()}`,
      body: "This is a test notification",
      data: {
        eventId: `test-${Date.now()}`,
        venueName: "Test Venue",
        startsAt: new Date().toISOString(),
        image: "https://via.placeholder.com/300x200",
        createdBy: userId
      },
      userId: userId, // Who created it
      recipient: null, // Global notification (everyone sees it)
      readByUsers: [],
      deletedByUsers: [],
      createdAt: new Date().toISOString() // Explicitly set createdAt
    };

    // Insert into database
    const { data: notifRow, error: notifErr } = await db
      .from('notification')
      .insert(testNotification)
      .select('*')
      .single();

    if (notifErr) {
      console.error("Test notification insert failed:", notifErr);
      return res.status(500).json({ error: "Failed to create test notification" });
    }

    // Emit via Socket.IO
    const io = req.app.get("io");
    if (io) {
      const socketPayload = {
        ...notifRow,
        notificationId: notifRow.notificationId || notifRow.id
      };
      
      console.log("[TestNotification] Emitting to all clients:", socketPayload);
      io.emit("notification", socketPayload); // Emit to ALL connected clients
      
      res.json({ 
        success: true, 
        message: "Test notification created and emitted",
        notification: notifRow 
      });
    } else {
      console.warn("[TestNotification] Socket.IO not available");
      res.json({ 
        success: true, 
        message: "Test notification created but not emitted (no socket)",
        notification: notifRow 
      });
    }
  } catch (error) {
    console.error("Test notification error:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

export default router;
