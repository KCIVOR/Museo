// notificationPopUp.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { socket } from "../lib/socketClient"
import "./Notifications.css"

export default function NotificationsPopover({ onClose, items: itemsProp, setItems: setItemsProp }) {
  const navigate = useNavigate()
  const popRef = useRef(null)
  const [localItems, setLocalItems] = useState([])
  const [allNotifications, setAllNotifications] = useState([]) // Store all notifications
  const [displayedCount, setDisplayedCount] = useState(10) // How many to show
  const [loading, setLoading] = useState(false) // Loading state for "View more"
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
        timestamp: n.startsAt || n.createdAt || new Date().toISOString(),
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
          timestamp: d.startsAt || n.createdAt || new Date().toISOString(),
          href: d.eventId ? `/event/${d.eventId}` : null,
          eventId: d.eventId,
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

  useEffect(() => {
    let alive = true

    const apply = (updater) => {
      if (typeof setItemsProp === 'function') setItemsProp(updater)
      else setItems(updater)
    }

    async function load() {
      try {
        const url = `${import.meta.env.VITE_API_BASE}/notification`
        const res = await fetch(url, { credentials: "include" })
        if (!res.ok) return
        const { notifications } = await res.json()
        
        // Filter and sort notifications by date
        const filtered = (notifications || [])
          .filter(row => {
            // Only show notifications from the last 30 days
            const createdAt = new Date(row.createdAt || row.created_at)
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
            return createdAt >= thirtyDaysAgo
          })
          .sort((a, b) => {
            // Sort by creation date, newest first
            const dateA = new Date(a.createdAt || a.created_at || 0)
            const dateB = new Date(b.createdAt || b.created_at || 0)
            return dateB - dateA
          })
        
        const mapped = filtered.map((row) => {
          const it = toItem(row)
          return { ...it, unread: !row.isRead } 
        })
        
        if (!alive) return
        setAllNotifications(mapped) // Store all notifications
        apply(() => mapped.slice(0, displayedCount)) // Show only first 10
      } catch (_) {}
    }
    load()
    return () => { alive = false }
  }, []) // Only run once when component mounts

  // Socket notifications are now handled by ToastNotification component
  // This dropdown only shows persistent database notifications

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
  
  // Function to load more notifications (for infinite scroll)
  const loadMore = () => {
    if (loading || !hasMore) return
    
    setLoading(true)
    setTimeout(() => {
      const newCount = displayedCount + 10
      setDisplayedCount(newCount)
      const apply = (updater) => {
        if (typeof setItemsProp === 'function') setItemsProp(updater)
        else setItems(updater)
      }
      apply(() => allNotifications.slice(0, newCount))
      setLoading(false)
    }, 300) // Small delay for better UX
  }
  
  // Check if there are more notifications to load
  const hasMore = allNotifications.length > displayedCount
  
  // Infinite scroll handler
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50 // 50px threshold
    
    if (isNearBottom && hasMore && !loading) {
      loadMore()
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
      style={{
        position: 'absolute',
        top: 'calc(100% + 12px)',
        right: '0',
        minWidth: '380px',
        maxWidth: '420px',
        background: 'linear-gradient(135deg, #faf8f5 0%, #ffffff 100%)',
        border: '2px solid #d4b48a',
        borderRadius: '16px',
        boxShadow: '0 12px 32px rgba(110, 74, 46, 0.2), 0 4px 16px rgba(212, 180, 138, 0.3)',
        padding: '0',
        zIndex: 1000,
        opacity: 1,
        visibility: 'visible',
        transform: 'translateY(0) scale(1)',
        transition: 'all 0.3s ease',
        backdropFilter: 'blur(16px)',
        fontFamily: 'Georgia, Times New Roman, serif',
        maxHeight: '480px',
        overflow: 'hidden'
      }}
    >
      {/* Dropdown Arrow */}
      <div style={{
        position: 'absolute',
        top: '-8px',
        right: '20px',
        width: '14px',
        height: '14px',
        background: 'linear-gradient(135deg, #faf8f5 0%, #ffffff 100%)',
        borderLeft: '2px solid #d4b48a',
        borderTop: '2px solid #d4b48a',
        transform: 'rotate(45deg)',
        zIndex: -1
      }} />
      
      {/* Notification Header */}
      <div style={{
        padding: '20px 24px 16px',
        borderBottom: '1px solid rgba(212, 180, 138, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{
          margin: '0',
          fontSize: '18px',
          fontWeight: '600',
          color: '#6e4a2e',
          fontFamily: 'Georgia, Times New Roman, serif'
        }}>Notifications</h3>
        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
          {unreadCount > 0 && (
            <button 
              onClick={markAllRead}
              style={{
                background: 'none',
                border: 'none',
                color: '#8b6f47',
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
        style={{maxHeight: '360px', overflowY: 'auto', padding: '8px 0'}}
        onScroll={handleScroll}
      >
        {items.length === 0 ? (
          <div style={{
            padding: '40px 24px',
            textAlign: 'center',
            color: '#9c8668',
            fontStyle: 'italic'
          }}>
            No notifications yet
          </div>
        ) : (
          <>
            {items.map((n) => (
              <div
              key={n.id}
              className="notification-item"
              role="button"
              tabIndex={0}
              onClick={() => {
                markRead(n.id, n.notificationId);
                if (n.eventId) {
                  navigate(`/event/${n.eventId}`);
                  onClose?.();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  markRead(n.id, n.notificationId);
                  if (n.eventId) {
                    navigate(`/event/${n.eventId}`);
                    onClose?.();
                  }
                }
              }}
              style={{
                padding: '16px 24px',
                borderLeft: n.unread ? '3px solid #d4b48a' : '3px solid transparent',
                background: n.unread ? 'linear-gradient(135deg, rgba(212, 180, 138, 0.05) 0%, rgba(212, 180, 138, 0.02) 100%)' : 'transparent',
                cursor: n.eventId ? 'pointer' : 'default',
                transition: 'all 0.3s ease',
                position: 'relative'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = n.unread ? 'linear-gradient(135deg, rgba(212, 180, 138, 0.1) 0%, rgba(212, 180, 138, 0.05) 100%)' : 'rgba(212, 180, 138, 0.05)'}
              onMouseOut={(e) => e.currentTarget.style.background = n.unread ? 'linear-gradient(135deg, rgba(212, 180, 138, 0.05) 0%, rgba(212, 180, 138, 0.02) 100%)' : 'transparent'}
            >
              <div style={{display: 'flex', gap: '12px', alignItems: 'flex-start'}}>
                {/* Avatar/Image */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #7c9885 0%, #5a7c65 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: '0',
                  overflow: 'hidden'
                }}>
                  {n.image ? (
                    <img
                      src={n.image}
                      alt=""
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      loading="lazy"
                      onError={(e) => { 
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        parent.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#faf8f5" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
                      }}
                    />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#faf8f5" strokeWidth="2">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  )}
                </div>
                
                {/* Content */}
                <div style={{flex: '1', minWidth: '0'}}>
                  <h4 style={{
                    margin: '0 0 4px 0',
                    fontSize: '15px',
                    fontWeight: n.unread ? '600' : '500',
                    color: n.unread ? '#6e4a2e' : '#8b6f47',
                    lineHeight: '1.3'
                  }}>{n.title}</h4>
                  {n.subtitle && (
                    <p style={{
                      margin: '0 0 6px 0',
                      fontSize: '14px',
                      color: n.unread ? '#8b6f47' : '#9c8668',
                      lineHeight: '1.4'
                    }}>{n.subtitle}</p>
                  )}
                  <span style={{
                    fontSize: '12px',
                    color: n.unread ? '#9c8668' : '#b8a688',
                    fontStyle: 'italic'
                  }}>{timeAgo(n.timestamp)}</span>
                </div>
                
                {/* Right column with unread dot and X button */}
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'}}>
                  {n.unread && (
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#d4b48a',
                      flexShrink: '0'
                    }} />
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeItem(n.id, n.notificationId);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#9c8668',
                      fontSize: '14px',
                      cursor: 'pointer',
                      padding: '2px',
                      borderRadius: '4px',
                      transition: 'all 0.3s ease',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: '0'
                    }}
                    onMouseOver={(e) => {e.target.style.background = 'rgba(196, 117, 110, 0.1)'; e.target.style.color = '#c4756e'}}
                    onMouseOut={(e) => {e.target.style.background = 'none'; e.target.style.color = '#9c8668'}}
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
              <div style={{
                padding: '16px 24px',
                textAlign: 'center',
                borderTop: '1px solid rgba(212, 180, 138, 0.1)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  color: '#9c8668',
                  fontSize: '14px',
                  fontFamily: 'Georgia, Times New Roman, serif'
                }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    border: '2px solid #d4b48a',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
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
