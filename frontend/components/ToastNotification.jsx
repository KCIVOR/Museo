import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { socket } from '../lib/socketClient'
import './ToastNotification.css'

// Reusable toast notification system
export default function ToastNotification({ 
  position = 'bottom-left', 
  duration = 10000,
  maxToasts = 5,
  enableSocket = true,
  customHandlers = {}
}) {
  const navigate = useNavigate()
  const [toasts, setToasts] = useState([])

  // Default notification handlers
  const defaultHandlers = {
    event_created: (payload) => ({
      id: payload.notificationId || crypto.randomUUID(),
      type: payload.type,
      title: payload.title || 'New Event',
      message: `${payload.venueName || 'Event'} has been created`,
      image: payload.image || payload.data?.image || null,
      eventId: payload.eventId || payload.data?.eventId || null,
      timestamp: Date.now(),
      duration,
      clickAction: (toast) => {
        // Deep link to the event modal route
        if (toast?.eventId) {
          navigate(`/event/${toast.eventId}`)
        }
      }
    }),
    // Add more notification types here
    user_registered: (payload) => ({
      id: payload.notificationId || crypto.randomUUID(),
      type: payload.type,
      title: 'New User',
      message: `${payload.username || 'Someone'} joined the platform`,
      image: payload.profilePicture || null,
      timestamp: Date.now(),
      duration,
      clickAction: null
    })
  }

  // Merge custom handlers with defaults
  const handlers = { ...defaultHandlers, ...customHandlers }

  useEffect(() => {
    if (!enableSocket) return

    const handleNotification = (payload) => {
      const handler = handlers[payload?.type]
      if (handler) {
        const toast = handler(payload)
        
        setToasts(prev => {
          const newToasts = [toast, ...prev].slice(0, maxToasts)
          return newToasts
        })
        
        // Auto remove after duration
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== toast.id))
        }, toast.duration)
      }
    }

    socket.on('notification', handleNotification)
    return () => socket.off('notification', handleNotification)
  }, [enableSocket, maxToasts, handlers])

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const handleToastClick = (toast) => {
    if (toast.clickAction) {
      toast.clickAction(toast)
      removeToast(toast.id)
    } else if (toast.eventId) {
      navigate('/Event', { state: { open: toast.eventId } })
      removeToast(toast.id)
    }
  }

  // Method to manually add toasts (for programmatic use)
  const addToast = (toastConfig) => {
    const toast = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      duration,
      ...toastConfig
    }
    
    setToasts(prev => {
      const newToasts = [toast, ...prev].slice(0, maxToasts)
      return newToasts
    })
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id))
    }, toast.duration)
  }

  // Expose addToast method for external use
  useEffect(() => {
    window.addToast = addToast
    return () => {
      delete window.addToast
    }
  }, [addToast])

  const timeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  return (
    <div className={`toast-container toast-container--${position}`}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast--${toast.type} ${(toast.eventId || toast.clickAction) ? 'toast--clickable' : ''}`}
          onClick={() => handleToastClick(toast)}
        >
          <div className="toast__content">
            {toast.image && (
              <img 
                src={toast.image} 
                alt="" 
                className="toast__image"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            )}
            
            <div className="toast__text">
              <div className="toast__title">{toast.title}</div>
              <div className="toast__message">{toast.message}</div>
              <div className="toast__time">{timeAgo(toast.timestamp)}</div>
            </div>
          </div>
          
          <button
            type="button"
            className="toast__close"
            onClick={(e) => {
              e.stopPropagation()
              removeToast(toast.id)
            }}
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
