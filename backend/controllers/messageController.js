import db from "../database/db.js";


// POST /api/message/send  { receiverId, content, messageType? }
export const createMessage = async (req, res) => {
  try {
    const senderId = req.user?.id;
    const { receiverId, content, messageType = "text" } = req.body || {};

    if (!senderId) return res.status(401).json({ error: "Not authenticated" });
    if (!receiverId || !content?.trim()) {
      return res.status(400).json({ error: "receiverId and content are required" });
    }

    // Find conversation for pair in either order
    let { data: conv, error: convErr } = await db
      .from("conversation")
      .select("*")
      .or(
        `and(participant_1.eq.${senderId},participant_2.eq.${receiverId}),` +
        `and(participant_1.eq.${receiverId},participant_2.eq.${senderId})`
      )
      .maybeSingle();

    if (convErr) {
      console.error("createMessage: conv lookup error:", convErr);
      return res.status(500).json({ error: "Conversation lookup failed" });
    }

    // Create conversation if none
    if (!conv) {
      const { data: created, error: createErr } = await db
        .from("conversation")
        .insert({
          participant_1: senderId,
          participant_2: receiverId,
          unreadCount_1: 0,
          unreadCount_2: 0,
        })
        .select("*")
        .single();
      if (createErr) return res.status(500).json({ error: "Conversation create failed" });
      conv = created;
    }

    // Insert message
    const { data: message, error: msgErr } = await db
      .from("message")
      .insert({
        senderId,
        receiverId,
        conversationId: conv.conversationId,
        content: content.trim(),
        messageType,
      })
      .select("*")
      .single();

    if (msgErr) return res.status(500).json({ error: "Failed to send message" });

    // Update conversation summary + unread for receiver
    const isSenderP1 = conv.participant_1 === senderId;
    const unreadField = isSenderP1 ? "unreadCount_2" : "unreadCount_1";
    const nextUnread = (conv[unreadField] || 0) + 1;

    const { error: updErr } = await db
      .from("conversation")
      .update({
        lastMessageContent: content.trim(),
        lastMessageAt: new Date().toISOString(),
        lastMessageSenderId: senderId,
        [unreadField]: nextUnread,
        updated_at: new Date().toISOString(),
      })
      .eq("conversationId", conv.conversationId);

    if (updErr) {
      console.warn("createMessage: summary update failed", updErr);
    }

    // Realtime: notify both participants
    try {
      const io = req.app.get("io");
      if (io) {
        const payload = {
          conversationId: conv.conversationId,
          message,
        };
        io.to(`user:${receiverId}`).emit("message:new", payload);
        io.to(`user:${senderId}`).emit("message:sent", payload);
      }
    } catch (e) {
      console.warn("socket emit failed:", e);
    }

    return res.json({ ok: true, conversationId: conv.conversationId, message });
  } catch (err) {
    console.error("createMessage error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};


// GET /api/message/getConversation
export const getConversation = async (req, res) => {
  try {
    const me = req.user?.id;
    if (!me) return res.status(401).json({ error: "Not authenticated" });

    // 1) Fetch conversations where I'm a participant
    const { data: convs, error } = await db
      .from("conversation")
      .select("*")
      .or(`participant_1.eq.${me},participant_2.eq.${me}`)
      .order("lastMessageAt", { ascending: false })
      .limit(50);

    if (error) {
      console.error("getConversation: conversation query failed:", error);
      return res.status(500).json({ error: "Failed to fetch conversations" });
    }

    const conversations = convs || [];
    if (!conversations.length) {
      return res.json({ conversations: [] });
    }

    // 2) Gather the "other user" ids
    const otherIds = [
      ...new Set(
        conversations.map((c) => (c.participant_1 === me ? c.participant_2 : c.participant_1))
      ),
    ];

    // 3) Fetch display data for other users from profile
    let profileMap = new Map();
    if (otherIds.length) {
      const { data: profiles, error: profErr } = await db
        .from("profile")
        .select("userId, username, profilePicture, bio, firstName, middleName, lastName")
        .in("userId", otherIds);

      if (profErr) {
        console.warn("getConversation: profile lookup failed:", profErr);
      } else if (profiles) {
        profileMap = new Map(profiles.map((p) => [p.userId, p]));
      }
    }

    // 4) Shape the response for the left panel
    const shaped = conversations.map((c) => {
      const otherId = c.participant_1 === me ? c.participant_2 : c.participant_1;
      const p = profileMap.get(otherId) || {};
      const unread =
        c.participant_1 === me ? c.unreadCount_1 || 0 : c.unreadCount_2 || 0;

      return {
        conversationId: c.conversationId,
        lastMessageContent: c.lastMessageContent || null,
        lastMessageAt: c.lastMessageAt || c.updated_at || null,
        unreadCount: unread,
        otherUser: {
          id: otherId,
          username: p.username || "",
          firstName: p.firstName || null,
          middleName: p.middleName || null,
          lastName: p.lastName || null,
          profilePicture: p.profilePicture || null,
          bio: p.bio || "",
        },
      };
    });
    console.log(shaped)
    return res.json({ conversations: shaped });
  } catch (err) {
    console.error("getConversation error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};



export const getConversationById = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit || "50", 10);
    const order = (req.query.order || "desc").toLowerCase();

    let rows, error;
    if (order === "asc") {
      const page = parseInt(req.query.page || "1", 10);
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      ({ data: rows, error } = await db
        .from("message")
        .select("*")
        .eq("conversationId", conversationId)
        .order("created_at", { ascending: true })
        .range(from, to));
    } else {
      // Default: return the latest N messages so UI always sees the newest after long threads
      ({ data: rows, error } = await db
        .from("message")
        .select("*")
        .eq("conversationId", conversationId)
        .order("created_at", { ascending: false })
        .limit(limit));
      // Reverse to keep chronological display (oldest -> newest)
      rows = rows || [];
      rows.reverse();
    }

    if (error) return res.status(500).json({ error: "Failed to fetch messages" });

    res.json({ messages: rows || [], limit, order });
  } catch (err) {
    console.error("getConversationById error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/message/markRead/:conversationId
export const markRead = async (req, res) => {
  try {
    const me = req.user?.id;
    const { conversationId } = req.params;
    if (!me) return res.status(401).json({ error: "Not authenticated" });
    if (!conversationId) return res.status(400).json({ error: "conversationId required" });

    const { data: conv, error } = await db
      .from("conversation")
      .select("conversationId, participant_1, participant_2")
      .eq("conversationId", conversationId)
      .maybeSingle();

    if (error) return res.status(500).json({ error: "Lookup failed" });
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    const field = conv.participant_1 === me
      ? "unreadCount_1"
      : (conv.participant_2 === me ? "unreadCount_2" : null);
    if (!field) return res.status(403).json({ error: "Not a participant" });

    const { error: updErr } = await db
      .from("conversation")
      .update({ [field]: 0, updated_at: new Date().toISOString() })
      .eq("conversationId", conversationId);

    if (updErr) return res.status(500).json({ error: "Failed to mark read" });
    return res.json({ ok: true });
  } catch (err) {
    console.error("markRead error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
