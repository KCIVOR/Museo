// notificationPopUp.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { socket } from "./notificationsSocket"
import "./Notifications.css"

export default function NotificationsPopover({ onClose, items: itemsProp, setItems: setItemsProp }) {
  const popRef = useRef(null)
  const [localItems, setLocalItems] = useState([])
  const items = itemsProp ?? localItems
  const setItems = setItemsProp ?? setLocalItems

  const toItem = useCallback((n) => {
    if (n?.type === "event_created") {
      return {
        id: n.eventId ? `event-${n.eventId}` : crypto.randomUUID(),
        title: `New event: ${n.title ?? "Untitled"}`,
        subtitle: n.venueName || "",
        image: n.image || null,
        timestamp: n.startsAt || n.createdAt || new Date().toISOString(),
        href: n.eventId ? `/events/${n.eventId}` : null,
        unread: true,
      }
    }
    return {
      id: crypto.randomUUID(),
      title: "New notification",
      subtitle: "",
      image: null,
      timestamp: new Date().toISOString(),
      href: null,
      unread: true,
    }
  }, [])

  // Only subscribe here if this component owns the state, to avoid double listeners
  useEffect(() => {
    if (itemsProp && setItemsProp) return
    const handler = (payload) => {
      setItems((prev) => {
        const next = toItem(payload)
        if (next.id && prev.some((p) => p.id === next.id)) return prev
        return [next, ...prev]
      })
    }
    socket.on("notification", handler)
    return () => socket.off("notification", handler)
  }, [itemsProp, setItemsProp, setItems, toItem])

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
  const markAllRead = () => setItems((prev) => prev.map((p) => ({ ...p, unread: false })))
  const markRead = (id) => setItems((prev) => prev.map((p) => (p.id === id ? { ...p, unread: false } : p)))
  const removeItem = (id) => setItems((prev) => prev.filter((p) => p.id !== id))

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
    <div className="notif" ref={popRef} role="dialog" aria-label="Notifications">
      <div className="notif__header">Notifications {unreadCount > 0 ? `(${unreadCount})` : ""}</div>
      {items.length === 0 ? (
        <div className="notif__item" aria-disabled>No notifications yet</div>
      ) : (
        items.map((n) => (
          <div key={n.id} style={{ position: 'relative' }}>
            <button
              type="button"
              className={`notif__item ${n.unread ? "unread" : ""}`}
              onClick={() => markRead(n.id)}
            >
              <div className="notif__row">
                <div className="notif__title">{n.title}</div>
                <div className="notif__time">{timeAgo(n.timestamp)}</div>
              </div>
              {n.subtitle ? <div className="notif__body">{n.subtitle}</div> : null}
              {n.href ? (
                <a
                  href={n.href}
                  onClick={(e) => { e.stopPropagation(); markRead(n.id) }}
                  className="notif__link"
                >
                  View
                </a>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => removeItem(n.id)}
              aria-label="Dismiss"
              className="notif__dismiss"
            >
              ✕
            </button>
          </div>
        ))
      )}
      <div className="notif__footer" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '0 4px' }}>
        <button type="button" className="btn-link" onClick={markAllRead}>Mark all read</button>
        <button type="button" className="btn-link" onClick={onClose}>Close</button>
      </div>
    </div>
  )}
