// notificationPopUp.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { socket } from "../lib/socketClient"
import "./Notifications.css"

export default function NotificationsPopover({ onClose, items: itemsProp, setItems: setItemsProp }) {
  const navigate = useNavigate()
  const popRef = useRef(null)
  const [localItems, setLocalItems] = useState([])
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
        href: eventId ? `/Event` : null,
        eventId: eventId,
        unread: true,
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
          href: d.eventId ? `/Event` : null,
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
        apply(() => mapped) // Replace all notifications with filtered/sorted ones
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

  const unreadCount = useMemo(() => items.reduce((acc, it) => acc + (it.unread ? 1 : 0), 0), [items])
  // Mark all notifications as read (sync with backend)
  const markAllRead = async () => {
    try {
      const url = `${import.meta.env.VITE_API_BASE}/notification/mark-all-read`
      const res = await fetch(url, { 
        method: 'PUT',
        credentials: "include" 
      })
      if (res.ok) {
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
    <div ref={popRef} className="notif" role="dialog" aria-label="Notifications" tabIndex={-1}>
      {/* Header */}
      <div className="notif__header">
        <div className="notif__header-left">
          <span className="notif__header-title">Notifications</span>
          {unreadCount > 0 && (
            <span className="notif__chip">{unreadCount}</span>
          )}
        </div>
        <div className="notif__header-actions">
          {unreadCount > 0 && (
            <button type="button" className="btn-link" onClick={markAllRead}>
              Mark all read
            </button>
          )}
          <button type="button" className="btn-icon" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      {items.length === 0 ? (
        <div className="notif__empty">No notifications yet</div>
      ) : (
        <div>
          {items.map((n) => (
            <div
              key={n.id}
              className={`notif__item ${n.unread ? 'unread' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => {
                markRead(n.id, n.notificationId);
                if (n.eventId) {
                  navigate('/Event', { state: { open: n.eventId } });
                  onClose?.(); // Close the notification popover
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  markRead(n.id, n.notificationId);
                  if (n.eventId) {
                    navigate('/Event', { state: { open: n.eventId } });
                    onClose?.(); // Close the notification popover
                  }
                }
              }}
              style={{ cursor: n.eventId ? 'pointer' : 'default' }}
            >
              {/* Avatar/Image */}
              {n.image ? (
                <img
                  src={n.image}
                  alt=""
                  className="notif__avatar"
                  loading="lazy"
                  onError={(e) => { 
                    // Replace with fallback instead of hiding
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              
              {/* Fallback Avatar - Always present but hidden if image loads */}
              <div 
                className="notif__avatar" 
                style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: n.image ? 'none' : 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                🎨
              </div>

              {/* Content */}
              <div className="notif__content">
                <div className="notif__row">
                  <div className="notif__title">
                    {n.title}
                    {n.unread && <span className="notif__dot"></span>}
                  </div>
                  <div className="notif__time">{timeAgo(n.timestamp)}</div>
                </div>
                
                {n.subtitle && (
                  <div className="notif__body">{n.subtitle}</div>
                )}
                
              </div>

              {/* Dismiss Button */}
              <button
                type="button"
                className="notif__dismiss"
                aria-label="Dismiss"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  removeItem(n.id, n.notificationId);
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
