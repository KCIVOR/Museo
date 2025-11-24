// notificationPopUp.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { socket } from "../lib/socketClient"
// Notification styles now in src/styles/components/dropdowns.css (imported via main.css)

export default function NotificationsPopover({ onClose, items: itemsProp, setItems: setItemsProp }) {
  const navigate = useNavigate()
  const popRef = useRef(null)
  const [localItems, setLocalItems] = useState([])
  const [allNotifications, setAllNotifications] = useState([]) // Store all notifications
  const [currentPage, setCurrentPage] = useState(1) // Track current page
  const [hasMore, setHasMore] = useState(true) // Track if more pages exist
  const [loading, setLoading] = useState(false) // Loading state for pagination
  const [error, setError] = useState(null) // Error state
  const items = itemsProp ?? localItems
  const setItems = setItemsProp ?? setLocalItems

  // Normalize both realtime payloads and DB rows to a UI item
  const toItem = useCallback((n) => {
    // Realtime shape (from eventController emit)
    if (n?.type === "event_created" && (n?.eventId || n?.title)) {
      // Try to get image from multiple possible locations
      const image = n.image || n.data?.image || null;
      // Try to get eventId from multiple possible locations
      const eventId = n.eventId || n.data?.eventId || null;
      
      return {
        id: n.notificationId || (eventId ? `event-${eventId}` : crypto.randomUUID()),
        notificationId: n.notificationId,
        title: `${n.title ?? "Untitled"}`,
        subtitle: n.venueName || "",
        image: image,
        timestamp: n.createdAt || new Date().toISOString(), // Use notification creation time
        href: eventId ? `/event/${eventId}` : null,
        eventId: eventId,
        unread: true,
        onClick: () => navigate(`/event/${eventId}`),
      }
    }


    if (n && (n.notificationId || n.data)) {
      
      let d = n.data || {}
      // Some drivers may return JSONB as a string; parse if needed
      if (typeof d === 'string') {
        try { d = JSON.parse(d) } catch { d = {} }
      }
      // Prefer top-level image first (older rows may keep it there), then nested under data
      const img = n.image || n.imageUrl || n.cover || n.coverUrl || d.image || d.imageUrl || d.cover || d.coverUrl || null
      
      if (n.type === "event_created") {
        return {
          id: n.notificationId || n.id || crypto.randomUUID(),
          notificationId: n.notificationId || n.id,
          title: n.title || `New event: ${d.title ?? "Untitled"}`,
          subtitle: n.body || d.venueName || "",
          image: img,
          timestamp: n.createdAt || new Date().toISOString(), // Use notification creation time, not event start time
          href: d.eventId ? `/event/${d.eventId}` : null,
          eventId: d.eventId,
          unread: !n.isRead,
        }
      }
      if (n.type === "auction_won") {
        return {
          id: n.notificationId || n.id || crypto.randomUUID(),
          notificationId: n.notificationId || n.id,
          title: n.title || "You won the auction!",
          subtitle: n.body || "View your order in My Orders",
          image: img,
          timestamp: n.createdAt || new Date().toISOString(),
          href: "/marketplace/myorders",
          eventId: null,
          unread: !n.isRead,
        }
      }
      // Fallback generic row
      return {
        id: n.notificationId || n.id || crypto.randomUUID(),
        notificationId: n.notificationId || n.id,
        title: n.title || "Notification",
        subtitle: n.body || "",
        image: n.image || n.imageUrl || n.cover || n.coverUrl || null,
        timestamp: n.createdAt || new Date().toISOString(),
        href: null,
        eventId: null, // No eventId for generic notifications
        unread: !n.isRead,
      }
    }

    return {
      id: crypto.randomUUID(),
      title: "New notification",
      subtitle: "",
      image: null,
      timestamp: new Date().toISOString(),
      href: null,
      eventId: null,
      unread: true,
    }
  }, [])

  // Load notifications from API with pagination
  const loadNotifications = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      setError(null) // Clear any previous errors
      
      // Add timestamp to bypass any browser cache
      const timestamp = Date.now()
      const url = `${import.meta.env.VITE_API_BASE}/notification?page=${page}&limit=10&t=${timestamp}`
      const res = await fetch(url, { 
        credentials: "include",
        cache: "no-cache" // Force fresh fetch
      })
      
      if (!res.ok) {
        throw new Error(`Failed to load notifications: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json()
      const { notifications, hasMore: morePages } = data
      
      // Filter notifications from the last 30 days
      const filtered = (notifications || []).filter(row => {
        const createdAt = new Date(row.createdAt || row.created_at || row.created || Date.now())
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        return createdAt >= thirtyDaysAgo
      })
      
      const mapped = filtered.map((row) => {
        const it = toItem(row)
        return { ...it, unread: !row.isRead } 
      })
      
      if (page === 1) {
        // First page - replace all notifications
        setAllNotifications(mapped)
        setItems(mapped)
      } else {
        // Subsequent pages - append to existing with deduplication
        setAllNotifications(prev => {
          const existingIds = new Set(prev.map(n => n.id))
          // Filter out any notifications that already exist
          const newNotifications = mapped.filter(n => !existingIds.has(n.id))
          return [...prev, ...newNotifications]
        })
        setItems(prev => {
          const existingIds = new Set(prev.map(n => n.id))
          const newNotifications = mapped.filter(n => !existingIds.has(n.id))
          return [...prev, ...newNotifications]
        })
      }
      
      setHasMore(morePages)
      setCurrentPage(page)
    } catch (err) {
      console.error('Failed to load notifications:', err)
      setError(err.message || 'Failed to load notifications')
      // If it's the first page, clear notifications on error
      if (page === 1) {
        setAllNotifications([])
        setItems([])
      }
    } finally {
      setLoading(false)
    }
  }, [toItem, setItems])

  useEffect(() => {
    loadNotifications(1) // Load first page on mount
  }, [loadNotifications])
  
  // Listen for socket notifications to refresh the list
  useEffect(() => {
    const handleNewNotification = (payload) => {
      // Add a delay to ensure the notification is saved to DB before we fetch
      // Using 1.5 seconds to be safer under heavy load
      setTimeout(() => {
        loadNotifications(1) // Refresh from first page
      }, 1500) // 1.5 second delay to ensure DB write completes
    }
    
    socket.on('notification', handleNewNotification)
    return () => socket.off('notification', handleNewNotification)
  }, [loadNotifications])

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.()
    const onClick = (e) => { if (!popRef.current?.contains(e.target)) onClose?.() }
    window.addEventListener("keydown", onKey)
    window.addEventListener("mousedown", onClick)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("mousedown", onClick)
    }
  }, [onClose])

  const unreadCount = useMemo(() => allNotifications.reduce((acc, it) => acc + (it.unread ? 1 : 0), 0), [allNotifications])
  
  // Infinite scroll handler - loads next page from API
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50 // 50px threshold
    
    if (isNearBottom && hasMore && !loading) {
      loadNotifications(currentPage + 1) // Load next page from API
    }
  }
  
  // Mark all notifications as read (sync with backend)
  const markAllRead = async () => {
    try {
      const url = `${import.meta.env.VITE_API_BASE}/notification/mark-all-read`
      const res = await fetch(url, { 
        method: 'PUT',
        credentials: "include" 
      })
      if (res.ok) {
        setAllNotifications((prev) => prev.map((p) => ({ ...p, unread: false })))
        setItems((prev) => prev.map((p) => ({ ...p, unread: false })))
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  // Mark single notification as read (sync with backend)
  const markRead = async (id, notificationId) => {
    try {
      if (notificationId) {
        const url = `${import.meta.env.VITE_API_BASE}/notification/${notificationId}/read`
        await fetch(url, { 
          method: 'PUT',
          credentials: "include" 
        })
      }
      setAllNotifications((prev) => prev.map((p) => (p.id === id ? { ...p, unread: false } : p)))
      setItems((prev) => prev.map((p) => (p.id === id ? { ...p, unread: false } : p)))
    } catch (error) {
      console.error('Failed to mark as read:', error)
      // Still update UI even if backend fails
      setItems((prev) => prev.map((p) => (p.id === id ? { ...p, unread: false } : p)))
    }
  }
  // Delete notification from database and remove from UI
  const removeItem = async (id, notificationId) => {
    try {
      if (notificationId) {
        const url = `${import.meta.env.VITE_API_BASE}/notification/${notificationId}`
        const res = await fetch(url, { 
          method: 'DELETE',
          credentials: "include" 
        })
        if (!res.ok) {
          console.error('Failed to delete notification from database')
        }
      }
      // Remove from UI regardless of backend success/failure
      setAllNotifications((prev) => prev.filter((p) => p.id !== id))
      setItems((prev) => prev.filter((p) => p.id !== id))
    } catch (error) {
      console.error('Failed to delete notification:', error)
      // Still remove from UI even if backend fails
      setItems((prev) => prev.filter((p) => p.id !== id))
    }
  }

  const timeAgo = (iso) => {
    try {
      const t = new Date(iso).getTime()
      const s = Math.max(1, Math.floor((Date.now() - t) / 1000))
      if (s < 60) return `${s}s ago`
      const m = Math.floor(s / 60)
      if (m < 60) return `${m}m ago`
      const h = Math.floor(m / 60)
      if (h < 24) return `${h}h ago`
      const d = Math.floor(h / 24)
      return `${d}d ago`
    } catch {
      return ""
    }
  }

  return (
    <div 
      ref={popRef} 
      className="dropdown-menu notification-dropdown"
      role="dialog" 
      aria-label="Notifications" 
      tabIndex={-1}
    >
      {/* Dropdown Arrow */}
      <div className="dropdown-arrow" />
      
      {/* Notification Header */}
      <div className="notification-header">
        <h3>Notifications</h3>
        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
          {unreadCount > 0 && (
            <button 
              onClick={markAllRead}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--museo-text-muted)',
                fontSize: '13px',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '6px',
                transition: 'all 0.3s ease',
                fontFamily: 'Georgia, Times New Roman, serif'
              }}
              onMouseOver={(e) => e.target.style.background = 'rgba(212, 180, 138, 0.1)'}
              onMouseOut={(e) => e.target.style.background = 'none'}
            >
              Mark all read
            </button>
          )}
        </div>
      </div>
      
      {/* Notification Items */}
      <div 
        className="notification-list"
        onScroll={handleScroll}
      >
        {error ? (
          <div className="notification-error" style={{
            padding: '20px',
            textAlign: 'center',
            color: 'var(--museo-error)',
            fontSize: '14px',
            fontFamily: 'Georgia, Times New Roman, serif'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginBottom: '8px' }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>{error}</div>
            <button 
              onClick={() => {
                setError(null);
                loadNotifications(1);
              }}
              style={{
                marginTop: '12px',
                padding: '6px 12px',
                background: 'var(--museo-accent)',
                color: 'var(--museo-white)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: 'Georgia, Times New Roman, serif'
              }}
            >
              Try Again
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="notification-empty">
            No notifications yet
          </div>
        ) : (
          <>
            {items.map((n) => (
              <div
              key={n.id}
              className={`notification-item ${n.unread ? 'unread' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => {
                markRead(n.id, n.notificationId);
                if (typeof n.onClick === 'function') {
                  n.onClick();
                  onClose?.();
                  return;
                }
                if (n.href) {
                  navigate(n.href);
                  onClose?.();
                  return;
                }
                if (n.eventId) {
                  navigate(`/event/${n.eventId}`);
                  onClose?.();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  markRead(n.id, n.notificationId);
                  if (typeof n.onClick === 'function') {
                    n.onClick();
                    onClose?.();
                    return;
                  }
                  if (n.href) {
                    navigate(n.href);
                    onClose?.();
                    return;
                  }
                  if (n.eventId) {
                    navigate(`/event/${n.eventId}`);
                    onClose?.();
                  }
                }
              }}
            >
              <div className="notification-content">
                {/* Avatar/Image */}
                <div className="notification-avatar">
                  {n.image ? (
                    <img
                      src={n.image}
                      alt=""
                      loading="lazy"
                      onError={(e) => { 
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        parent.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--museo-white)" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
                      }}
                    />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--museo-white)" strokeWidth="2">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  )}
                </div>
                
                {/* Content */}
                <div className="notification-body">
                  <h4 className="notification-title">{n.title}</h4>
                  {n.subtitle && (
                    <p className="notification-subtitle">{n.subtitle}</p>
                  )}
                  <span className="notification-time">{timeAgo(n.timestamp)}</span>
                </div>
                
                {/* Right column with unread dot and X button */}
                <div className="notification-actions">
                  {n.unread && (
                    <div className="notification-dot" />
                  )}
                  <button
                    className="notification-remove"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeItem(n.id, n.notificationId);
                    }}
                    aria-label="Remove notification"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
            ))}
            
            {/* Loading indicator at bottom when scrolling */}
            {loading && hasMore && (
              <div className="notification-loading">
                <div className="notification-loading-content">
                  <div className="notification-spinner" />
                  Loading more notifications...
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
