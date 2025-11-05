// src/components/Navbar.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../src/contexts/UserContext";
import "./Navbar.css";
import NotificationsPopover from "./notificationPopUp";
import TopUpModal from "./topUpModal";
import RegisterArtist from "../src/pages/Artist/registerArtist";
import Message from "../src/pages/Shared/message";
import { createPortal } from "react-dom";
import { useRealtimeNotifications } from "./useRealtimeNotifications";
const API = import.meta.env.VITE_API_BASE;
// Professional SVG Icons for Museum Theme
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
  </svg>
);

const CoinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 6v12"/>
    <path d="M6 12h12"/>
  </svg>
);

const BellIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
  </svg>
);

const MessageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const ProfileIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const TopUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);

const ArtistIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);
const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16,17 21,12 16,7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

export default function Navbar({ role, userData }) {
  const navigate = useNavigate();
  const { clearUserData } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifItems, setNotifItems] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [topupOpen, setTopupOpen] = useState(false)
  const [msgOpen, setMsgOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [notifRefreshKey, setNotifRefreshKey] = useState(0) // Force refresh notifications
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  // Transform server payload -> UI item (kept in Navbar for reuse)
  const toItem = useCallback((n) => {
    if (n?.type === "event_created") {
      return {
        id: n.eventId ? `event-${n.eventId}` : crypto.randomUUID(),
        title: `New event: ${n.title ?? "Untitled"}`,
        subtitle: n.venueName || "",
        image: n.image || null,
        timestamp: n.startsAt || n.createdAt || new Date().toISOString(),
        href: n.eventId ? `/event/${n.eventId}` : null,
        unread: true,
      };
    }
    return {
      id: crypto.randomUUID(),
      title: "New notification",
      subtitle: "",
      image: null,
      timestamp: new Date().toISOString(),
      href: null,
      unread: true,
    };
  }, []);

  // Listen for realtime notifications
  useRealtimeNotifications(useCallback((n) => {
    console.log('[Navbar] Received realtime notification:', n);
    const item = toItem(n);
    setNotifItems((prev) => {
      // Don't add if already present (by id)
      if (prev.some((p) => p.id === item.id)) return prev;
      // Prepend new item and limit to 50
      return [item, ...prev].slice(0, 50);
    });
    // Force refresh to update badge count
    setNotifRefreshKey(k => k + 1);
  }, [toItem]));

  const unreadCount = useMemo(
    () => notifItems.reduce((acc, it) => acc + (it.unread ? 1 : 0), 0),
    [notifItems]
  );

  // Close account menu on outside click or ESC
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e) => {
      if (menuRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      setMenuOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Focus first item when menu opens
  useEffect(() => {
    if (menuOpen) {
      const first = menuRef.current?.querySelector('button,[href],[tabindex]:not([tabindex="-1"])');
      first?.focus();
    }
  }, [menuOpen]);

  // Avoid overlapping popovers
  useEffect(() => { if (menuOpen) setNotifOpen(false); }, [menuOpen]);

  // Lock body scroll while message modal is open
  useEffect(() => {
    if (!msgOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [msgOpen]);

  // Lock body scroll while Register Artist modal is open
  useEffect(() => {
    if (!registerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [registerOpen]);

  // userData now comes from props (fetched in Layout.jsx)
  // No need to fetch here anymore!

  const goto = (path) => { setMenuOpen(false); navigate(path); };

  const logOut = async () => {
    try {
      console.log('🚪 Navbar: Logging out...');
      
      // 1. Call backend logout endpoint
      const res = await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" });
      if (!res.ok && res.status !== 204) {
        console.error("❌ Navbar: Logout failed", res.status);
      } else {
        console.log('✅ Navbar: Backend logout successful');
      }
      
      // 2. Clear UserContext
      console.log('🧹 Navbar: Clearing UserContext...');
      clearUserData();
      console.log('✅ Navbar: UserContext cleared');
      
    } catch (e) {
      console.error("❌ Navbar: Logout error", e);
    } finally {
      setMenuOpen(false);
      console.log('🚪 Navbar: Redirecting to login...');
      navigate("/");
    }
  };

  return (
    <>
      <nav className="nav">
        {/* Left: brand */}
        <div className="nav__left nav__brand">
          <Link to="/home">
            <img className="nav__logo" src="https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/logo.png" alt="Museo" />
          </Link>
        </div>

        {/* Center: empty to preserve grid balance, keep for future */}
        <div className="nav__center">
          <div className="nav__center-inner" />
        </div>
      

        {/* Right: actions (money + Search button + icons) */}
        <div className="nav__right">

          {/* Search button */}
          <button
            type="button"
            className="nav-btn nav-btn-search"
            aria-label="Go to search"
            onClick={() => navigate("/search")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <span>Search</span>
          </button>

          {/* Visit Museo button */}
          <button
            type="button"
            className="nav-btn nav-btn-visit"
            aria-label="Visit Museo"
            onClick={() => navigate("/visit-museo")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span>Visit Museo</span>
          </button>

          {/* Coins */}
          <button 
            className="nav-btn nav-btn-coin" 
            type="button"
            onClick={() => { setTopupOpen(true); setMenuOpen(false); }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v12"/>
              <path d="M6 12h12"/>
            </svg>
            <span className="count">5042</span>
          </button>

          {/* Notifications */}
          <div className="nav__notif-wrap">
            <button
              className="nav-btn nav-btn-icon"
              aria-label="Notifications"
              aria-haspopup="dialog"
              aria-expanded={notifOpen}
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
              </svg>

              {unreadCount > 0 && (
                <span 
                  className="nav-badge" 
                  aria-label={`${unreadCount} unread`}
                  style={{
                    width: '8px',
                    height: '8px',
                    fontSize: '0', // Hide any text
                    minWidth: '8px',
                    border: 'none', // Remove border
                    background: 'var(--museo-error)', // Solid red background
                    boxShadow: 'none' // Remove shadow
                  }}
                >
                </span>
              )}
            </button>
            {notifOpen && (
              <NotificationsPopover
                key={notifRefreshKey} // Force refresh when new notification arrives
                onClose={() => setNotifOpen(false)}
                items={notifItems}
                setItems={setNotifItems}
              />
            )}
          </div>

          {/* Messages */}
          <div className="nav__msg-wrap">
            <button 
              className="nav-btn nav-btn-icon" 
              aria-label="Messages" 
              type="button" 
              onClick={() => setMsgOpen(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          </div>

          {/* Avatar + dropdown */}
          <div className="nav__account">
            <button
              ref={btnRef}
              className="nav-btn nav-btn-avatar"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls="profile-menu"
              title="Profile menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <img 
                className="nav-btn-avatar-img" 
                src={userData?.avatar || import.meta.env.FALLBACKPHOTO_URL || "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/profilePicture.png"} 
                alt={userData?.fullName || userData?.username || "User Avatar"}
                onError={(e) => {
                  const fallbackUrl = import.meta.env.FALLBACKPHOTO_URL || "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/profilePicture.png";
                  // First fallback to default avatar from env
                  if (e.target.src !== fallbackUrl) {
                    e.target.src = fallbackUrl;
                  } else {
                    // Final fallback to SVG
                    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='%23faf8f5' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E";
                  }
                }}
              />
            </button>

            {menuOpen && (
              <div 
                id="profile-menu" 
                ref={menuRef} 
                className="dropdown-menu profile-dropdown"
                role="menu" 
                aria-label="Profile options"
              >
                {/* Dropdown Arrow */}
                <div className="dropdown-arrow" />
                
                {/* Profile Menu Items */}
                <button 
                  className="dropdown-item"
                  role="menuitem" 
                  onClick={() => goto("/MyProfile")}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <span>{userData?.fullName || userData?.username || "My Profile"}</span>
                </button>
                
                <button 
                  className="dropdown-item"
                  role="menuitem" 
                  onClick={() => { setTopupOpen(true); setMenuOpen(false); }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                    <line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                  <span>Top‑Up</span>
                </button>
                
                {String(role).trim() === "user" ? (
                  <button
                    className="dropdown-item"
                    role="menuitem"
                    onClick={() => { setRegisterOpen(true); setMenuOpen(false); }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    <span>Apply as Artist</span>
                  </button>
                ) : null}
                
                {/* Separator */}
                <hr className="dropdown-separator" />
                
                <button 
                  className="dropdown-item danger"
                  role="menuitem" 
                  onClick={logOut}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16,17 21,12 16,7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  <span>Log‑out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Top‑Up Modal */}
      {topupOpen && (
        <TopUpModal
          onClose={() => setTopupOpen(false)}
          onConfirm={(payload) => {
            console.log("Top‑up confirmed", payload);
            setTopupOpen(false);
          }}
        />
      )}

      {/* Register as Artist Modal */}
      <RegisterArtist
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onSubmitted={() => setRegisterOpen(false)}
      />

      {/* Messages Modal (overlay via portal to body) */}
      {msgOpen && createPortal(
        (
          <div
            className="museo-modal-overlay evmOverlay"
            style={{ zIndex: 3000 }}
            onMouseDown={(e) => {
              if (e.currentTarget === e.target) setMsgOpen(false);
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <article
              role="dialog"
              aria-modal="true"
              aria-label="Messages"
              className="museo-modal evmDialog"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              style={{ width: 'clamp(820px, 92vw, 1100px)', maxHeight: '94vh' }}
            >
              <button aria-label="Close" onClick={() => setMsgOpen(false)} className="evmClose">✕</button>
              <Message />
            </article>
          </div>
        ),
        document.body
      )}
    </>
  );
}
