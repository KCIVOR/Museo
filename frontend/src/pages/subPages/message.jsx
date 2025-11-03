import { useMemo, useRef, useState, useEffect, useLayoutEffect } from "react";
import { io } from "socket.io-client";
import MuseoLoadingBox from "../../components/MuseoLoadingBox";
const API = import.meta.env.VITE_API_BASE;
const SOCKET_URL = (API && API.replace(/\/api\/?$/, "")) || window.location.origin;
import "./css/message.css";

// Museo SVG Icons
const IconSearch = ({ className = "msg-icon" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconAttach = ({ className = "msg-icon" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.2a2 2 0 0 1-2.83-2.83l8.49-8.49" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconSend = ({ className = "msg-icon" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconMenu = ({ className = "msg-icon" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <circle cx="12" cy="12" r="1" stroke="currentColor" strokeWidth="2" fill="currentColor" />
    <circle cx="12" cy="5" r="1" stroke="currentColor" strokeWidth="2" fill="currentColor" />
    <circle cx="12" cy="19" r="1" stroke="currentColor" strokeWidth="2" fill="currentColor" />
  </svg>
);

// Avatar fallback
const AV = "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/2ooze2k90v5e1.jpeg";

export default function Message() {

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchMode, setSearchMode] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [query, setQuery] = useState("");
  const [threads, setThreads] = useState({});
  const [draft, setDraft] = useState("");
  const [user, setUser] = useState([])
  const [meAvatar, setMeAvatar] = useState(AV)
  const [isFetchingMe, setIsFetchingMe] = useState(false)
  // Unified search support
  const [searchUsers, setSearchUsers] = useState([])
  const [searching, setSearching] = useState(false)
  const [isSending, setIsSending] = useState(false)
  
  // Refs
  const socketRef = useRef(null);
  const msgBodyRef = useRef(null);
  const endRef = useRef(null);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [messagePagination, setMessagePagination] = useState({});
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchMe = async () => {
    if (isFetchingMe) return;
    setIsFetchingMe(true)
    try{
      const res = await fetch(`${API}/users/me`, {
        method: "GET",
        credentials: "include",
      });
      
      if (!res.ok) {
        console.error("Failed to fetch user");
        return;
      }
      const data = await res.json();
      setUser(data.id)

      // Fetch my profile to get my avatar for "me" bubbles
      try {
        const profRes = await fetch(`${API}/profile/getProfile`, {
          credentials: "include",
          method: "GET",
        });
        if (profRes.ok) {
          const prof = await profRes.json();
          const p = prof?.profile ?? {};
          const av = p.profilePicture || AV;
          setMeAvatar(av);
        }
      } catch {}
    } catch (err) {
      console.error("Error fetching me:", err);
    } finally {
      setIsFetchingMe(false)
    }
  };

  // Initialize user and data on mount
  useEffect(() => {
    fetchMe();
    fetchConversations();
  }, []);

  // Setup socket connection when user is loaded
  useEffect(() => {
    if (!user) return; // Wait for user to be fetched
    
    // Disconnect existing socket if any
    if (socketRef.current) {
      try { socketRef.current.disconnect(); } catch {}
      socketRef.current = null;
    }
    
    const s = io(SOCKET_URL, { withCredentials: true });
    socketRef.current = s;

    s.on("connect", () => {
      console.log("[Socket] Connected, joining room for user:", user);
      try { s.emit("join", user); } catch {}
    });

    // Someone sent me a new message
    s.on("message:new", (payload) => {
      console.log("[Socket] Received message:new", payload);
      const { conversationId, message } = payload || {};
      if (!conversationId || !message) return;
      
      const fromMe = message.senderId === user;
      
      // Always add the message to threads for the conversation
      const m = {
        id: message.id || message.messageId,
        at: new Date(message.created_at || message.createdAt || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase(),
        from: message.senderId === user ? "me" : "them",
        text: message.content,
      };
      
      // Add to threads regardless of which conversation is active
      setThreads(t => {
        const existing = t[conversationId] || [];
        // Check if message already exists to prevent duplicates
        const messageId = m.id;
        const exists = existing.some(msg => msg.id === messageId);
        if (exists) {
          console.log("[Socket] Message already exists, skipping:", messageId);
          return t;
        }
        console.log("[Socket] Adding new message to conversation:", conversationId, "ID:", messageId);
        // Create new object to ensure React detects the change
        const newThreads = { ...t };
        newThreads[conversationId] = [...existing, m];
        return newThreads;
      });
      
      // Update last preview
      setConversations((prev) => {
        const ts = message.created_at || new Date().toISOString();
        let found = false;
        const updated = prev.map(c => {
          if (c.conversationId === conversationId) {
            found = true;
            return {
              ...c,
              lastMessageContent: message.content,
              lastMessageAt: ts,
              unreadCount: c.conversationId === activeConvId ? 0 : (c.unreadCount || 0) + (fromMe ? 0 : 1),
            };
          }
          return c;
        });
        if (!found) {
          // If convo missing (first-time message on receiver), refresh list
          fetchConversations();
          return prev;
        }
        return [...updated].sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
      });

      // If this thread is active, mark as read
      if (conversationId === activeConvId && !fromMe) {
        fetch(`${API}/message/markRead/${conversationId}`, { method: 'POST', credentials: 'include' }).catch(() => {});
      }
    });

    // Confirmation of my own sent message
    s.on("message:sent", (payload) => {
      console.log("[Socket] Received message:sent", payload);
      const { conversationId, message } = payload || {};
      if (!conversationId || !message) return;
      if (message.senderId !== user) return;
      
      const m = {
        id: message.id || message.messageId,
        at: new Date(message.created_at || message.createdAt || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase(),
        from: "me",
        text: message.content,
      };
      
      // Add to threads with duplicate check
      setThreads(t => {
        const existing = t[conversationId] || [];
        // Check if message already exists to prevent duplicates
        const messageId = m.id;
        const exists = existing.some(msg => msg.id === messageId);
        if (exists) {
          console.log("[Socket] Sent message already exists, skipping:", messageId);
          return t;
        }
        console.log("[Socket] Adding sent message to conversation:", conversationId, "ID:", messageId);
        // Create new object to ensure React detects the change
        const newThreads = { ...t };
        newThreads[conversationId] = [...existing, m];
        return newThreads;
      });
      setConversations(prev => {
        const ts = message.created_at || new Date().toISOString();
        const updated = prev.map(c => (
          c.conversationId === conversationId
            ? { ...c, lastMessageContent: message.content, lastMessageAt: ts }
            : c
        ));
        return [...updated].sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
      });
    });

    return () => {
      try { s.disconnect(); } catch {}
      socketRef.current = null;
    };
  }, [user]); // Only reconnect when user changes, not activeConvId

  const fetchConversations = async () => {
    if (loadingConvs) return;
    try{
      setLoadingConvs(true);

      const timestamp = Date.now();
      const res = await fetch(`${API}/message/getConversation?t=${timestamp}`, {
        credentials: "include",
        cache: "no-cache", // Force fresh fetch
      });

      if (!res.ok) {
        console.error("conversations failed", res.status);
        setConversations([]);
        return;
      }
      const data = await res.json();

      const convs = (data.conversations || []).slice().sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));

      setConversations(convs);
      if (!activeConvId && convs.length) {
        setActiveConvId(convs[0].conversationId);
      }
    
    }catch(error){
      console.error("fetchConversations error:", error);
      setConversations([]);
    }finally{
        setLoadingConvs(false);
    }
  }

  // Load messages for active conversation (force fresh fetch)
  const loadMessages = async (conversationId, page = 1, append = false) => {
    try {
      // Add timestamp to bypass any potential browser cache
      const timestamp = Date.now();
      const r = await fetch(`${API}/message/getConversation/${conversationId}?page=${page}&limit=20&t=${timestamp}`, {
        credentials: "include",
        cache: "no-cache", // Force fresh fetch
      });
      if (!r.ok) {
        console.error("load messages failed", r.status);
        return;
      }
      const d = await r.json();
      const msgs = (d.messages || []).map(m => ({
        id: m.id || m.messageId,
        at: new Date(m.created_at || m.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase(),
        from: m.senderId === user ? "me" : "them",
        text: m.content,
      }));

      // Update pagination info
      setMessagePagination(p => ({ ...p, [conversationId]: d.pagination }));

      if (append) {
        // When appending (pagination), filter out duplicates
        setThreads(t => {
          const existing = t[conversationId] || [];
          const existingIds = new Set(existing.map(msg => msg.id));
          
          // Filter out any messages that already exist
          const newMessages = msgs.filter(msg => !existingIds.has(msg.id));
          
          console.log(`[Pagination] Loading ${msgs.length} messages, ${newMessages.length} are new`);
          
          // Prepend new messages (older messages go at the beginning)
          return { ...t, [conversationId]: [...newMessages, ...existing] };
        });
      } else {
        // Initial load - deduplicate in case some messages were already added via socket
        setThreads(t => {
          const existing = t[conversationId] || [];
          const existingIds = new Set(existing.map(msg => msg.id));
          
          // Keep existing messages that aren't in the new batch
          const existingNotInNew = existing.filter(msg => !msgs.some(m => m.id === msg.id));
          
          console.log(`[Initial Load] Got ${msgs.length} messages, keeping ${existingNotInNew.length} existing`);
          
          // Combine: new messages from server + any messages added via socket that aren't duplicates
          return { ...t, [conversationId]: [...msgs, ...existingNotInNew] };
        });
      }
    } catch (e) {
      console.error("fetch messages error:", e);
    }
  };

  // Handle activeConvId changes - load messages when switching conversations
  useEffect(() => {
    if (!activeConvId || !user) return;
    
    console.log("[ConversationChange] Loading messages for:", activeConvId);
    
    // Optimistically clear unread badge for this conversation
    setConversations(prev => prev.map(c => (
      c.conversationId === activeConvId ? { ...c, unreadCount: 0 } : c
    )));
    
    // Persist unread reset on backend (best-effort)
    fetch(`${API}/message/markRead/${activeConvId}`, {
      method: "POST",
      credentials: "include",
    }).catch(e => console.error("markRead failed:", e));
    
    // Always load initial messages when switching conversations
    // The socket will handle real-time updates
    loadMessages(activeConvId, 1, false);
  }, [activeConvId, user]); // Dependencies only include activeConvId and user

  // Handle scroll to load more messages
  const handleScroll = async (e) => {
    if (!activeConvId || loadingMore) return;
    
    const { scrollTop } = e.target;
    const pagination = messagePagination[activeConvId];
    
    // Load more when scrolled to top and there are more messages
    if (scrollTop < 100 && pagination?.hasMore) {
      setLoadingMore(true);
      const nextPage = pagination.page + 1;
      
      // Save current scroll height to restore position after loading
      const oldScrollHeight = e.target.scrollHeight;
      
      await loadMessages(activeConvId, nextPage, true);
      
      // Restore scroll position (prevent jump to top)
      setTimeout(() => {
        if (msgBodyRef.current) {
          const newScrollHeight = msgBodyRef.current.scrollHeight;
          msgBodyRef.current.scrollTop = newScrollHeight - oldScrollHeight;
        }
        setLoadingMore(false);
      }, 100);
    };
  };

  // Filter left list by conversation data
  const filteredConversations = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(c => {
      const u = c.otherUser || {};
      const fullName = [u.firstName, u.middleName, u.lastName].filter(Boolean).join(" ");
      return (
        (fullName || "").toLowerCase().includes(q) ||
        (u.username || "").toLowerCase().includes(q) ||
        (u.bio || "").toLowerCase().includes(q) ||
        (c.lastMessageContent || "").toLowerCase().includes(q)
      );
    });
  }, [query, conversations]);

  // Debounced fetch of users when typing (>=2 chars)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setSearchUsers([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${API}/users/getall`, { credentials: 'include' });
        if (!res.ok) { setSearchUsers([]); return; }
        const data = await res.json();
        const lower = q.toLowerCase();
        const mapped = (Array.isArray(data) ? data : [])
          .map(p => ({
            id: p.userId || p.profileId || p.id,
            username: p.username || '',
            firstName: p.firstName || '',
            middleName: p.middleName || '',
            lastName: p.lastName || '',
            profilePicture: p.profilePicture || null,
            bio: p.bio || '',
          }))
          .filter(u => (
            [u.firstName, u.middleName, u.lastName].filter(Boolean).join(' ').toLowerCase().includes(lower)
            || (u.username || '').toLowerCase().includes(lower)
            || (u.bio || '').toLowerCase().includes(lower)
          ));
        setSearchUsers(mapped);
      } catch {}
      finally { setSearching(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  // Merge conversations + new users (when typing)
  const leftItems = useMemo(() => {
    const convItems = filteredConversations.map(c => ({
      kind: 'conversation',
      conversationId: c.conversationId,
      userId: c.otherUser?.id,
      avatar: c.otherUser?.profilePicture || AV,
      name: [c.otherUser?.firstName, c.otherUser?.middleName, c.otherUser?.lastName].filter(Boolean).join(' ') || c.otherUser?.username || 'Unknown',
      subtitle: c.lastMessageContent || 'No messages yet',
      unread: c.unreadCount || 0,
    }));

    if (query.trim().length < 2) return convItems;

    const inConv = new Set(conversations.map(c => c.otherUser?.id).filter(Boolean));
    const newUsers = (searchUsers || [])
      .filter(u => !inConv.has(u.id) && u.id !== user)
      .map(u => ({
        kind: 'new-user',
        id: `new-${u.id}`,
        userId: u.id,
        avatar: u.profilePicture || AV,
        name: [u.firstName, u.middleName, u.lastName].filter(Boolean).join(' ') || u.username || 'Unknown',
        subtitle: 'Start conversation',
        unread: 0,
    }));

    return [...convItems, ...newUsers];
  }, [filteredConversations, searchUsers, conversations, user, query]);

  // Resolve selected conversation and peer, and use correct thread key
  const activeConversation = useMemo(
    () => conversations.find(c => c.conversationId === activeConvId) || null,
    [conversations, activeConvId]
  );

  const currentPeer = useMemo(() => {
    if (selectedUser) return selectedUser;
    return activeConversation?.otherUser || null;
  }, [selectedUser, activeConversation]);

  // Function to start chat with a new user
  const openChatWith = (userInfo) => {
    // Check if conversation already exists
    const existing = conversations.find(c => c.otherUser?.id === userInfo.id);
    if (existing) {
      setActiveConvId(existing.conversationId);
      setSelectedUser(null);
    } else {
      // Set up for new conversation
      setSelectedUser(userInfo);
      setActiveConvId(null);
      setThreads(t => ({ ...t, [`new-${userInfo.id}`]: [] }));
    }
  };

  // Get messages for the active conversation - force re-render on thread changes
  const msgs = useMemo(() => {
    if (activeConvId) {
      const messages = threads[activeConvId] || [];
      console.log("[Render] Active conversation messages:", activeConvId, messages.length);
      return messages;
    }
    if (selectedUser) {
      const messages = threads[`new-${selectedUser.id}`] || [];
      return messages;
    }
    return [];
  }, [threads, activeConvId, selectedUser]);



  // Track previous conversation to detect switches
  const prevConvIdRef = useRef(null);
  const isInitialLoadRef = useRef(true);

  // Scroll to bottom when messages change (initial load or new messages)
  useLayoutEffect(() => {
    if (msgBodyRef.current && msgs.length > 0) {
      const isSwitchingConversation = prevConvIdRef.current !== activeConvId;
      prevConvIdRef.current = activeConvId;
      
      // On initial load or conversation switch, scroll instantly to bottom
      if (isSwitchingConversation || isInitialLoadRef.current) {
        msgBodyRef.current.scrollTop = msgBodyRef.current.scrollHeight;
        isInitialLoadRef.current = false;
      } else {
        // For new messages in same conversation, smooth scroll
        endRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [msgs.length, activeConvId]);
  
  // Reset initial load flag when conversation changes
  useEffect(() => {
    isInitialLoadRef.current = true;
  }, [activeConvId]);

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    if (isSending) return; // hard guard

    // Determine receiver based on current context
    const receiverId = (activeConversation && activeConversation.otherUser && activeConversation.otherUser.id)
      || (selectedUser && selectedUser.id)
      || null;
    if (!receiverId) return;

    try {
      setIsSending(true);
      const r = await fetch(`${API}/message/send`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId, content: text }),
      });
      if (!r.ok) {
        console.error("send failed", r.status, await r.text());
        return;
      }
      const result = await r.json();
      setDraft("");

      // Ensure we are focused on the correct conversation (covers first-time chats)
      const convId = result?.conversationId || activeConvId;
      if (convId && convId !== activeConvId) setActiveConvId(convId);

      // Optimistically update sidebar without full refresh
      setConversations(prev => {
        const ts = new Date().toISOString();
        let found = false;
        const updated = prev.map(c => {
          if (c.conversationId === convId) {
            found = true;
            return { ...c, lastMessageContent: text, lastMessageAt: ts };
          }
          return c;
        });
        if (!found) {
          // First-time chat: pull in the new conversation once backend created it
          fetchConversations();
          return prev;
        }
        return [...updated].sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
      });

      // Thread will be appended by socket 'message:sent'
      // Log for debugging
      console.log("[Message] Sent to:", receiverId, "conversation:", convId);
    } catch (e) {
      console.error("send error:", e);
    }finally{
      setIsSending(false)
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isSending && draft.trim()) send();
    }
    // Shift+Enter will naturally create a new line in textarea
  };

  return (
    <div className="msgPage">
      <div className="msgWrap">
        {/* Sidebar */}
        <aside className="msgSide">
          <div className="msgSideHead">
            <h2 className="msg-title">Messages</h2>
          </div>
          <div className="msgSearch">
            <IconSearch className="msgSearchIcon" />
            <input
              className="museo-input"
              placeholder="Search Messages"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="msgList">
            {loadingConvs ? (
              <MuseoLoadingBox message="Loading conversations..." show={loadingConvs} />
            ) : leftItems.length === 0 ? (
              <div className="msgNote" style={{ 
                padding: '20px 12px', 
                textAlign: 'center',
                color: 'var(--museo-text-muted)'
              }}>
                {query.trim().length < 2 ? (
                  <div>
                    <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.7 }}>📭</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px', color: 'var(--museo-text-secondary)' }}>
                      No conversations yet
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--museo-text-muted)' }}>
                      Search for users to start chatting
                    </div>
                  </div>
                ) : (searching ? (
                  <div>
                    <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.7 }}>🔍</div>
                    <div style={{ fontSize: '14px', color: 'var(--museo-text-secondary)' }}>
                      Searching...
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.7 }}>❌</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px', color: 'var(--museo-text-secondary)' }}>
                      No results found
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--museo-text-muted)' }}>
                      Try a different search term
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              leftItems.map(item => (
                <a
                  key={item.conversationId || item.id}
                  className={`msgItem ${item.conversationId && item.conversationId === activeConvId ? 'is-active' : ''}`}
                  onClick={() => {
                    if (item.kind === 'conversation') {
                      setActiveConvId(item.conversationId);
                      setSelectedUser(null);
                    } else {
                      openChatWith({ id: item.userId, username: item.name, profilePicture: item.avatar });
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <img className="msgAvatar" src={item.avatar} alt="" />
                  <div className="msgMeta">
                    <div className="msgName" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{item.name}</span>
                      {item.kind === 'new-user' && (
                        <span style={{ fontSize: 10, background: 'var(--museo-accent)', color: '#fff', padding: '2px 6px', borderRadius: 10 }}>New</span>
                      )}
                    </div>
                    <div className="msgNote">{item.subtitle}</div>
                  </div>
                  {item.unread > 0 && (
                    <span className="msgBadge">{item.unread}</span>
                  )}
                </a>
              ))
            )}
          </div>
        </aside>

        {/* Conversation */}
        <main className="msgMain">
          {!activeConvId && !selectedUser ? (
            // Empty state when no conversation is selected
            <div className="msgEmptyState" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--museo-text-muted)',
              background: 'var(--museo-bg-secondary)'
            }}>
              <h3 style={{
                margin: '0 0 8px 0',
                fontSize: '20px',
                fontWeight: '600',
                color: 'var(--museo-text-primary)',
                fontFamily: 'var(--museo-font-body)'
              }}>
                Welcome to Messages
              </h3>
              <p style={{
                margin: '0 0 24px 0',
                fontSize: '16px',
                color: 'var(--museo-text-secondary)',
                maxWidth: '300px',
                lineHeight: '1.5'
              }}>
                Start a conversation by searching for users above or select an existing conversation.
              </p>
            </div>
          ) : (
            // Active conversation interface
            <>
              <header className="msgHead">
                <div className="msgPeer">
                  <img
                    className="msgAvatar msgAvatar--lg"
                    src={(currentPeer && currentPeer.profilePicture) || AV}
                    alt=""
                  />
                  <div className="msgPeerName">
                    {currentPeer
                      ? [currentPeer.firstName, currentPeer.middleName, currentPeer.lastName]
                          .filter(Boolean)
                          .join(" ") || currentPeer.username || "Conversation"
                      : "Conversation"}
                  </div>
                </div>
                <a className="msgHeadDots" aria-label="Menu" role="button" tabIndex={0}>
                  <IconMenu className="msg-icon" />
                </a>
              </header>

              <section className="msgBody" ref={msgBodyRef} onScroll={handleScroll}>
                {loadingMore && (
                  <div style={{ textAlign: 'center', padding: '10px', color: 'var(--museo-text-muted)' }}>
                    Loading more messages...
                  </div>
                )}
                {msgs.map(m => (
                  <article key={m.id} className={`bubbleRow ${m.from === "me" ? "from-me" : "from-them"}`}>
                    {m.from === "them" && (
                      <img
                        className="bubbleAvatar"
                        src={(currentPeer && currentPeer.profilePicture) || AV}
                        alt=""
                      />
                    )}
                    <div className={`bubble ${m.from === "me" ? "bubble--me" : "bubble--them"}`}>
                      <p className="bubbleText">{m.text}</p>
                      <div className="bubbleTime">{m.at}</div>
                    </div>
                    {m.from === "me" && <img className="bubbleAvatar" src={meAvatar || AV} alt="" />}
                  </article>
                ))}
                <div ref={endRef} />
              </section>

              {/* Composer */}
              <footer className="msgCompose">
                <button className="btn btn-secondary" aria-label="Attach" type="button">
                  <IconAttach className="msg-icon" />
                </button>
                <textarea
                  className="museo-textarea"
                  placeholder="Write a message..."
                  rows={1}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKey}
                />
                <button
                  className="btn btn-primary"
                  onClick={() => { if (!isSending) send(); }}
                  aria-label={isSending ? "Sending..." : "Send"}
                  disabled={isSending || !draft.trim()}
                  type="button"
                  title={isSending ? "Sending..." : (draft.trim() ? "Send" : "Type a message")}
                >
                  <IconSend className="msg-icon" />
                </button>
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
