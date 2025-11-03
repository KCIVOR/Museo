import db from "../database/db.js"; // Using singleton instance!

export const registerAsArtist = async (req, res) =>{
    try{
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: "User not authenticated" });
        }

        const userId = req.user.id;
        const files = req.files || {};
        const body = req.body || {};
        const firstName = body.firstName || "";
        const midInit = body.midInit || "";
        const lastName = body.lastName || "";
        const phone = body.phone || "";
        const age = body.age || "";
        const sex = body.sex || "";
        const birthdate = body.birthdate || "";
        const address = body.address || "";

        // Optional: allow client-specified requestType, default to artist_verification
        const requestType = body.requestType || "artist_verification";

        // ✅ USING SINGLETON: No new client creation!
        // Using db from import instead of creating new serviceClient
        const svc = db;

        const uploadedUrls = [];
        async function uploadOne(fieldName) {
            const f = files[fieldName]?.[0];
            if (!f) return null;
            const safeName = (f.originalname || "image.png").replace(/[^a-zA-Z0-9._-]/g, "_");
            const fileName = `${Date.now()}-${safeName}`;
            const filePath = `requests/${userId}/${fileName}`;
            const { data: up, error: upErr } = await svc.storage
                .from("uploads")
                .upload(filePath, f.buffer, { contentType: f.mimetype, upsert: false });
            if (upErr) throw upErr;
            const pub = svc.storage.from("uploads").getPublicUrl(up.path);
            return pub?.data?.publicUrl || null;
        }

        // Upload up to two files: file, file2
        const url1 = await uploadOne("file");
        const url2 = await uploadOne("file2");
        if (url1) uploadedUrls.push(url1);
        if (url2) uploadedUrls.push(url2);

        // Build data JSON to store in request.data (jsonb)
        const requestData = {
            firstName,
            midInit,
            lastName,
            phone,
            age,
            sex,
            birthdate,
            address,
            images: uploadedUrls,
            status: 'pending',
        };

        // Ensure only one request per user and type: delete previous then insert latest
        const { error: delErr } = await db
            .from("request")
            .delete()
            .eq("userId", userId)
            .eq("requestType", requestType);
        if (delErr) {
            console.warn("registerAsArtist: failed to clear previous requests", delErr);
            // proceed anyway; insert will still create the latest
        }

        const { data: inserted, error: insertErr } = await db
            .from("request")
            .insert([
                {
                    userId,
                    requestType,
                    data: requestData,
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                },
            ])
            .select()
            .single();

        if (insertErr){
            console.error(insertErr);
            return res.status(500).json({ error: 'uploadError' });
        }

        return res.status(201).json({ message: "Artist verification request submitted", request: inserted });
        
    }catch(err){
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
};


export const getRequest = async (req, res) => {
    try {
        const requesterId = req.user?.id;

        // Verify requester is authenticated
        if (!requesterId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Verify requester is an admin
        const { data: requesterProfile, error: requesterError } = await db
            .from('profile')
            .select('role')
            .eq('userId', requesterId)
            .single();

        if (requesterError || !requesterProfile) {
            return res.status(403).json({ error: 'Access denied. Unable to verify permissions.' });
        }

        if (requesterProfile.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }

        // ✅ FIXED: Add pagination to prevent fetching all requests
        const { type } = req.query; // optional filter e.g. artist_verification
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '50', 10);
        const offset = (page - 1) * limit;
        
        let query = db
            .from("request")
            .select("*")
            .order('createdAt', { ascending: false })
            .range(offset, offset + limit - 1);
        if (type) query = query.eq('requestType', type);

        const { data, error } = await query;
        if (error) return res.status(500).json({ error: 'Server error' });
        return res.status(200).json({ requests: data || [] });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
}



export const action = async (req, res) => {
    try {
      const { id, action, type } = req.body || {};
      const requesterId = req.user?.id;

      if (!id || !action) {
        return res.status(400).json({ error: "Missing id or action" });
      }

      // Verify requester is authenticated
      if (!requesterId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Verify requester is an admin
      const { data: requesterProfile, error: requesterError } = await db
        .from('profile')
        .select('role')
        .eq('userId', requesterId)
        .single();

      if (requesterError || !requesterProfile) {
        return res.status(403).json({ error: 'Access denied. Unable to verify permissions.' });
      }

      if (requesterProfile.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
      }

      console.log(id)
      // 1) Load the request to get the userId (and canonical type)
      const { data: requestRow, error: reqErr } = await db
        .from("request")
        .select("requestId, userId, requestType, data")
        .eq("requestId", id)
        .single();

      if (reqErr || !requestRow) {
        return res.status(404).json({ error: "Request not found" });
      }

      const userId = requestRow.userId;
      const reqType = requestRow.requestType || type || "unknown";
      if (!userId) {
        return res.status(400).json({ error: "Request missing userId" });
      }

      // 2) Approve: if artist_verification, set profile.role = 'artist'; always mark request as approved
      if (action === "approve") {
        if (reqType === 'artist_verification') {
          const { data: updatedProfile, error: upErr } = await db
            .from("profile")
            .update({ role: "artist" })
            .eq("userId", userId)
            .select("userId, role")
            .maybeSingle();
          if (upErr) {
            console.error("Failed to update profile role", upErr);
            return res.status(500).json({ error: "Failed to update role" });
          }
          if (!updatedProfile) {
            return res.status(404).json({ error: "Profile not found for user" });
          }
        }

        // Update request status both in data JSON and status column
        const newData = {
          ...(requestRow.data || {}),
          status: 'approved',
        };
        const { error: updErr } = await db
          .from("request")
          .update({ 
            data: newData,
            status: 'approved',
            updatedAt: new Date().toISOString()
          })
          .eq("requestId", id);
        if (updErr) {
          console.warn("Approved but failed to mark request as approved", updErr);
        }

        // Create notification for approved artist request
        if (reqType === 'artist_verification') {
          await createArtistRequestNotification(req, userId, 'approved', requestRow);
        }

        return res.status(200).json({
          message: reqType === 'artist_verification' ? "Approved; role set to artist" : "Approved",
          requestId: id,
          userId,
          requestType: reqType,
          action: "approve",
          status: 'approved',
        });
      }

      // 3) Reject: mark the request as rejected
      if (action === "reject") {
        const newData = {
          ...(requestRow.data || {}),
          status: 'rejected',
        };
        const { error: updErr } = await db
          .from("request")
          .update({ 
            data: newData,
            status: 'rejected',
            updatedAt: new Date().toISOString()
          })
          .eq("requestId", id);
        if (updErr) {
          console.error("Failed to mark rejected request", updErr);
          return res.status(500).json({ error: "Failed to reject request" });
        }

        // Create notification for rejected artist request
        if (reqType === 'artist_verification') {
          await createArtistRequestNotification(req, userId, 'rejected', requestRow);
        }

        return res.status(200).json({
          message: "Rejected; request removed",
          requestId: id,
          userId,
          requestType: reqType,
          action: "reject",
          status: 'rejected',
        });
      }
  
      return res.status(400).json({ error: "Unsupported action" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  };

export const deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user?.id;

    if (!id) {
      return res.status(400).json({ error: "Missing request ID" });
    }

    // Verify requester is authenticated
    if (!requesterId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify requester is an admin
    const { data: requesterProfile, error: requesterError } = await db
      .from('profile')
      .select('role')
      .eq('userId', requesterId)
      .single();

    if (requesterError || !requesterProfile) {
      return res.status(403).json({ error: 'Access denied. Unable to verify permissions.' });
    }

    if (requesterProfile.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    // Delete the request
    const { error } = await db
      .from("request")
      .delete()
      .eq("requestId", id);

    if (error) {
      console.error("Failed to delete request", error);
      return res.status(500).json({ error: "Failed to delete request" });
    }

    return res.status(200).json({ message: "Request deleted successfully", requestId: id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Helper function to create notifications for artist request actions
const createArtistRequestNotification = async (req, userId, action, requestRow) => {
  try {
    // Get user profile information for the notification
    const { data: userProfile, error: profileErr } = await db
      .from("profile")
      .select("firstName, lastName, profilePicture")
      .eq("userId", userId)
      .single();

    if (profileErr) {
      console.warn('Failed to fetch user profile for notification:', profileErr);
      return;
    }

    const userName = `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || 'User';
    const isApproved = action === 'approved';
    
    const notification = {
      type: isApproved ? "artist_request_approved" : "artist_request_rejected",
      requestId: requestRow.requestId,
      userId: userId,
      userName: userName,
      userProfilePicture: userProfile?.profilePicture || null,
      action: action,
      createdAt: new Date().toISOString()
    };

    // Save notification to database
    const insertRow = {
      type: notification.type,
      title: isApproved 
        ? `🎨 Artist Request Approved` 
        : `❌ Artist Request Rejected`,
      body: isApproved 
        ? `Your request as artist has been approved. You are now an artist!`
        : `Your request as artist has been rejected.`,
      data: {
        requestId: notification.requestId,
        userId: notification.userId,
        userName: notification.userName,
        userProfilePicture: notification.userProfilePicture,
        action: notification.action
      },
      userId: req.user?.id || null, // Admin who performed the action
      recipient: userId, // Send notification to the user who made the request
      readByUsers: [], // Initialize empty array
      deletedByUsers: [], // Initialize empty array
      createdAt: new Date().toISOString() // Explicitly set createdAt
    };

    const { data: notifRow, error: notifErr } = await db
      .from('notification')
      .insert(insertRow)
      .select('*')
      .single();

    if (notifErr) {
      console.warn('Artist request notification insert failed:', notifErr);
      return;
    }

    if (notifRow) {
      notification.notificationId = notifRow.notificationId || notifRow.id;
      notification.createdAt = notifRow.createdAt || notification.createdAt;
    }
    
    // Emit real-time notification via Socket.IO
    const io = req.app.get("io");
    if (io) {
      // Send to specific user room only (not to all users)
      io.to(`user_${userId}`).emit("notification", notification);
      
      // Clear notification cache ONLY for this specific user
      // This is a targeted notification, so only the recipient's cache needs clearing
      // Other users' caches remain intact for better performance
      const { cache } = await import('../utils/cache.js');
      await cache.clearPattern(`notifications:${userId}:*`);
    } else {
      console.warn("[artist-request] io not available to emit notification");
    }

  } catch (error) {
    console.error('Error creating artist request notification:', error);
  }
};