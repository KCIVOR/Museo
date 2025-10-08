import db from "../database/db.js";

// Get notifications for the current user (including global ones)
export async function listNotifications(req, res) {
  try {
    const userId = req.user?.id; // Get current user ID from auth middleware
    
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Get notifications for this user OR global notifications (recipient = null)
    const { data, error } = await db
      .from("notification")
      .select("*")
      .or(`recipient.is.null,recipient.eq.${userId}`) // Global OR personal notifications
      .order("createdAt", { ascending: false })
      .limit(50);

    if (error) {
      console.error("listNotifications error:", error);
      return res.status(500).json({ error: "Failed to fetch notifications" });
    }

    // Filter out deleted notifications and add user-specific read status
    const notificationsWithReadStatus = (data || [])
      .filter(notification => {
        // Hide notifications that this user has deleted
        const deletedByUsers = notification.deletedByUsers || [];
        return !deletedByUsers.includes(userId);
      })
      .map(notification => {
        // Check if this user has read this notification
        const readByUsers = notification.readByUsers || [];
        const isReadByCurrentUser = readByUsers.includes(userId);
        
        return {
          ...notification,
          isRead: isReadByCurrentUser // User-specific read status from readByUsers array
        };
      });

    return res.status(200).json({ 
      notifications: notificationsWithReadStatus,
      unreadCount: notificationsWithReadStatus.filter(n => !n.isRead).length
    });
  } catch (e) {
    console.error("listNotifications unexpected error:", e);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}

// Mark notification as read
export async function markAsRead(req, res) {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // First, get the current notification
    const { data: notification, error: fetchError } = await db
      .from("notification")
      .select("readByUsers")
      .eq("notificationId", notificationId)
      .or(`recipient.is.null,recipient.eq.${userId}`)
      .single();

    if (fetchError || !notification) {
      console.error("markAsRead fetch error:", fetchError);
      return res.status(404).json({ error: "Notification not found" });
    }

    // Add current user to readByUsers array if not already there
    const readByUsers = notification.readByUsers || [];
    if (!readByUsers.includes(userId)) {
      readByUsers.push(userId);

      const { error: updateError } = await db
        .from("notification")
        .update({ readByUsers })
        .eq("notificationId", notificationId);

      if (updateError) {
        console.error("markAsRead update error:", updateError);
        return res.status(500).json({ error: "Failed to mark as read" });
      }
    }

    return res.status(200).json({ message: "Notification marked as read" });
  } catch (e) {
    console.error("markAsRead unexpected error:", e);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}

// Mark all notifications as read for current user
export async function markAllAsRead(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Get all notifications for this user
    const { data: notifications, error: fetchError } = await db
      .from("notification")
      .select("notificationId, readByUsers")
      .or(`recipient.is.null,recipient.eq.${userId}`);

    if (fetchError) {
      console.error("markAllAsRead fetch error:", fetchError);
      return res.status(500).json({ error: "Failed to fetch notifications" });
    }

    // Update each notification to include current user in readByUsers
    const updates = notifications.map(async (notification) => {
      const readByUsers = notification.readByUsers || [];
      if (!readByUsers.includes(userId)) {
        readByUsers.push(userId);
        
        return db
          .from("notification")
          .update({ readByUsers })
          .eq("notificationId", notification.notificationId);
      }
      return Promise.resolve();
    });

    await Promise.all(updates);

    return res.status(200).json({ message: "All notifications marked as read" });
  } catch (e) {
    console.error("markAllAsRead unexpected error:", e);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}

// Delete notification (user-specific hiding)
export async function deleteNotification(req, res) {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!notificationId) {
      return res.status(400).json({ error: "Notification ID is required" });
    }

    // Get current notification
    const { data: notification, error: fetchError } = await db
      .from("notification")
      .select("deletedByUsers")
      .eq("notificationId", notificationId)
      .or(`recipient.is.null,recipient.eq.${userId}`)
      .single();

    if (fetchError || !notification) {
      console.error("deleteNotification fetch error:", fetchError);
      return res.status(404).json({ error: "Notification not found" });
    }

    // Add current user to deletedByUsers array if not already there
    const deletedByUsers = notification.deletedByUsers || [];
    if (!deletedByUsers.includes(userId)) {
      deletedByUsers.push(userId);

      const { error: updateError } = await db
        .from("notification")
        .update({ deletedByUsers })
        .eq("notificationId", notificationId);

      if (updateError) {
        console.error("deleteNotification update error:", updateError);
        return res.status(500).json({ error: "Failed to delete notification" });
      }
    }

    return res.status(200).json({ message: "Notification deleted successfully" });
  } catch (e) {
    console.error("deleteNotification unexpected error:", e);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}
