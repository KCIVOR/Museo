// src/components/Navbar.jsx
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import Message from "../src/pages/subPages/message.jsx";
import RegisterArtist from "../src/pages/subPages/registerArtist.jsx";
import TopUpModal from "./topUpModal";
import NotificationsPopover from "./notificationPopUp";
import { useRealtimeNotifications } from "./useRealtimeNotifications";
import "./Navbar.css";

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

export default function Navbar({ role }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  // User data state
  const [userData, setUserData] = useState({
    avatar: null,
    username: null,
    fullName: null
  });

  // Notifications state lives here so we can receive while popover is closed
  const [notifItems, setNotifItems] = useState([]);


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

  // Subscribe to socket notifications globally
  useRealtimeNotifications(useCallback((payload) => {
    const next = toItem(payload);
    setNotifItems((prev) => {
      if (next.id && prev.some((p) => p.id === next.id)) return prev;
      return [next, ...prev];
    });
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

  // Fetch user data for avatar and profile info
  useEffect(() => {
    let abort = false;
    const fetchUserData = async () => {
      try {
        // Fetch profile picture
        const pictureRes = await fetch(`${window.location.origin.replace(':5173', ':3000')}/api/users/picture`, {
          method: "GET",
          credentials: "include",
        });
        
        // Fetch user info
        const userRes = await fetch(`${window.location.origin.replace(':5173', ':3000')}/api/users/me`, {
          method: "GET",
          credentials: "include",
        });

        let profilePicture = null;
        let userInfo = {};

        if (pictureRes.ok) {
          profilePicture = await pictureRes.json();
        } else {
          console.log('Failed to fetch profile picture:', pictureRes.status, pictureRes.statusText);
        }

        if (userRes.ok) {
          userInfo = await userRes.json();
        } else {
          console.log('Failed to fetch user info:', userRes.status, userRes.statusText);
        }

        if (!abort) {
          setUserData({
            avatar: profilePicture,
            username: userInfo.username || null,
            fullName: userInfo.fullName || userInfo.name || null
          });
        }
      } catch (error) {
        console.log('Failed to fetch user data:', error);
        if (!abort) {
          setUserData({
            avatar: null,
            username: null,
            fullName: null
          });
        }
      }
    };
    fetchUserData();
    return () => { abort = true; };
  }, []);

  const goto = (path) => { setMenuOpen(false); navigate(path); };

  const logOut = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/auth/logout", { method: "POST", credentials: "include" });
      if (!res.ok && res.status !== 204) console.error("Logout failed", res.status);
    } catch (e) {
      console.error("Logout error", e);
    } finally {
      setMenuOpen(false);
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
            className="nav__searchBtn"
            aria-label="Go to search"
            onClick={() => navigate("/search")}
          >
            <SearchIcon />
            <span className="nav__searchLabel">Search</span>
          </button>

          {/* Coins */}
          <button 
            className="nav__coin" 
            type="button"
            onClick={() => { setTopupOpen(true); setMenuOpen(false); }}
          >
            <CoinIcon />
            <span className="nav__coin-count">5042</span>
          </button>

          {/* Notifications */}
          <div className="nav__notif-wrap">
            <button
              className="nav__icon-btn"
              aria-label="Notifications"
              aria-haspopup="dialog"
              aria-expanded={notifOpen}
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
            >
              <BellIcon />

              {unreadCount > 0 && (
                <span 
                  className="nav__notif-badge" 
                  aria-label={`${unreadCount} unread`}
                >
                  {unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <NotificationsPopover
                onClose={() => setNotifOpen(false)}
                items={notifItems}
                setItems={setNotifItems}
              />
            )}
          </div>

          {/* Messages */}
          <button 
            className="nav__icon-btn" 
            aria-label="Messages" 
            type="button" 
            onClick={() => setMsgOpen(true)}
          >
            <MessageIcon /> 
          </button>

          {/* Avatar + dropdown */}
          <div className="nav__account">
            <button
              ref={btnRef}
              className="nav__avatar"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls="profile-menu"
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <img 
                className="nav__avatar-img" 
                src={userData.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format&q=80"} 
                alt={userData.fullName || userData.username || "User Avatar"}
                onError={(e) => {
                  // First fallback to default avatar
                  if (e.target.src !== "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format&q=80") {
                    e.target.src = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format&q=80";
                  } else {
                    // Final fallback to SVG
                    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='%23faf8f5' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E";
                  }
                }}
              />
              <span className="nav__avatar-caret">▾</span>
            </button>

            {menuOpen && (
              <div 
                id="profile-menu" 
                ref={menuRef} 
                className="nav__menu nav__menu--museo" 
                role="menu" 
                aria-label="Profile options"
              >
                <a 
                  className="nav__menu-item" 
                  role="menuitem" 
                  onClick={() => goto("/MyProfile")}
                >
                  <ProfileIcon />
                  <span>{userData.fullName || userData.username || "My Profile"}</span>
                </a>
                <a 
                  className="nav__menu-item" 
                  role="menuitem" 
                  onClick={() => { setTopupOpen(true); setMenuOpen(false); }}
                >
                  <TopUpIcon />
                  <span>Top‑Up</span>
                </a>
                {String(role).trim() === "user" ? (
                  <a
                    className="nav__menu-item"
                    role="menuitem"
                    onClick={() => { setRegisterOpen(true); setMenuOpen(false); }}
                  >
                    <ArtistIcon />
                    <span>Apply as Artist</span>
                  </a>
                ) : null}
                <div className="nav__menu-sep" />
                <a 
                  className="nav__menu-item nav__menu-danger" 
                  role="menuitem" 
                  onClick={logOut}
                >
                  <LogoutIcon />
                  <span>Log‑out</span>
                </a>
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
