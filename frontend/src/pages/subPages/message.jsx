import { useMemo, useRef, useState, useEffect } from "react";
import { io } from "socket.io-client";
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

  // UI states
  const [loadingConvs, setLoadingConvs] = useState(false);

  // Optional: the user you picked from search for first-time chat
  const [selectedUser, setSelectedUser] = useState(null);

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
  const endRef = useRef(null);
  const socketRef = useRef(null);


  useEffect(() => {
    fetchMe()
    fetchConversations()
  }, [])

  const findConversationWith = (userId) =>
    conversations.find(c => c.otherUser?.id === userId) || null;

  const openChatWith = (user) => {
    const conv = findConversationWith(user.id);
    if (conv) {
      // Existing conversation
      setActiveConvId(conv.conversationId);
      setSelectedUser(null);
    } else {
      // First-time conversation (prepares right panel to send first message)
      setActiveConvId(null);
      setSelectedUser(user); // { id, username, profilePicture? }
    }
  };


  const fetchMe = async () => {
    setIsFetchingMe(true)
    try{
      if (isFetchingMe) return;
      const res = await fetch(`${API}/users/me`, {
        method: "GET",
        credentials: "include",
      });
      
      if (!res.ok) {
        console.error("ayaw boss");
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
          if (p.profilePicture) setMeAvatar(p.profilePicture);
        }
      } catch (e) {
        // keep fallback avatar if profile fetch fails
      }

    }catch(error){
      console.error("error:", error);

    }finally{
      setIsFetchingMe(false)

    }
  }


  // Realtime: connect socket once we know user id
  useEffect(() => {
    if (!user) return;
    if (socketRef.current) return; // already connected
    const s = io(SOCKET_URL, { withCredentials: true });
    socketRef.current = s;

    s.on("connect", () => {
      try { s.emit("join", user); } catch {}
    });

    // Someone sent me a new message
    s.on("message:new", (payload) => {
      const { conversationId, message } = payload || {};
      if (!conversationId || !message) return;
      const fromMe = message.senderId === user;
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

      // If this thread is active, append and mark read
      if (conversationId === activeConvId) {
        const m = {
          id: message.id || message.messageId,
          at: new Date(message.created_at || message.createdAt || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase(),
          from: message.senderId === user ? "me" : "them",
          text: message.content,
        };
        setThreads(t => ({ ...t, [conversationId]: [...(t[conversationId] || []), m] }));
        // ensure unread cleared
        fetch(`${API}/message/markRead/${conversationId}`, { method: 'POST', credentials: 'include' }).catch(() => {});
      }
    });

    // Confirmation of my own sent message (useful if we skip refetch)
    s.on("message:sent", (payload) => {
      const { conversationId, message } = payload || {};
      if (!conversationId || !message) return;
      if (message.senderId !== user) return;
      const m = {
        id: message.id || message.messageId,
        at: new Date(message.created_at || message.createdAt || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase(),
        from: "me",
        text: message.content,
      };
      setThreads(t => ({ ...t, [conversationId]: [...(t[conversationId] || []), m] }));
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
  }, [user, activeConvId]);


  const fetchConversations = async () => {
    try{
      if (loadingConvs) return;
      setLoadingConvs(true);

      const res = await fetch(`${API}/message/getConversation`, {
        credentials: "include",
      });

      if (!res.ok) {
        console.error("conversations failed", res.status, await res.text());
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



  useEffect(() => {
  if (!activeConvId) return;
    // Optimistically clear unread badge for this conversation
    setConversations(prev => prev.map(c => (
      c.conversationId === activeConvId ? { ...c, unreadCount: 0 } : c
    )));
    // Persist unread reset on backend (best-effort)
    fetch(`${API}/message/markRead/${activeConvId}`, {
      method: "POST",
      credentials: "include",
    }).catch(e => console.error("markRead failed:", e));
    (async () => {
      try {
        const r = await fetch(`${API}/message/getConversation/${activeConvId}?page=1&limit=50`, {
          credentials: "include",
        });
        if (!r.ok) {
          console.error("load messages failed", r.status, await r.text());
          return;
        }
        const d = await r.json();
        const msgs = (d.messages || []).map(m => ({
          id: m.id || m.messageId,
          at: new Date(m.created_at || m.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase(),
          from: m.senderId ===  user ? "me" : "them",
          text: m.content,
        }));
        setThreads(t => ({ ...t, [activeConvId]: msgs }));
      } catch (e) {
        console.error("fetch messages error:", e);
      }
    })();
  }, [activeConvId]);
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

  const msgs = threads[activeConvId] || [];



  // Scroll to bottom on conversation or new message
  useEffect(() => { 
    endRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [activeConvId, msgs.length]);

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

      // Thread will be appended by socket 'message:sent'; no need to refetch here
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
              className="msgSearchInput"
              placeholder="Search Messages"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="msgList">
            {loadingConvs ? (
              <div className="msgNote" style={{ 
                padding: '20px 12px', 
                textAlign: 'center',
                color: 'var(--museo-text-secondary)'
              }}>
                Loading conversations...
              </div>
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

              <section className="msgBody">
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
                <a className="mcBtn" aria-label="Attach" role="button" tabIndex={0}>
                  <IconAttach className="msg-icon" />
                </a>
                <textarea
                  className="mcInput"
                  placeholder="Write a message..."
                  rows={1}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKey}
                />
                <a
                  className="mcSend"
                  onClick={() => { if (!isSending) send(); }}
                  aria-label={isSending ? "Sending..." : "Send"}
                  aria-disabled={isSending || !draft.trim()}
                  role="button"
                  tabIndex={0}
                  style={isSending || !draft.trim() ? { opacity: 0.6, pointerEvents: 'none', cursor: 'not-allowed' } : undefined}
                  title={isSending ? "Sending..." : (draft.trim() ? "Send" : "Type a message")}
                >
                  <IconSend className="msg-icon" />
                </a>
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
