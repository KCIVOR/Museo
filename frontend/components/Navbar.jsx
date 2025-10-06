// src/components/Navbar.jsx
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import Message from "../src/pages/subPages/message.jsx";
import TopUpModal from "./topUpModal";
import NotificationsPopover from "./notificationPopUp";
import { useRealtimeNotifications } from "./useRealtimeNotifications";
import "./Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

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
        href: n.eventId ? `/events/${n.eventId}` : null,
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

          {/* Search button moved here next to money */}
          <button
            type="button"
            className="nav__searchBtn nav__searchBtn--compact"
            aria-label="Go to search"
            onClick={() => navigate("/search")}
          >
            <span className="nav__searchIcon" aria-hidden="true">🔎</span>
            <span className="nav__searchLabel">Search</span>
          </button>

          {/* Coins */}
          <button className="nav__coin" type="button">
            <span className="nav__coin-icon">🟡</span>
            <span className="nav__coin-count" onClick={() => { setTopupOpen(true); setMenuOpen(false); }}>5042</span>
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
              🔔
              {unreadCount > 0 && (
                <span className="nav__notif-badge" aria-label={`${unreadCount} unread`}>{unreadCount}</span>
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
          <button className="nav__icon-btn" aria-label="Messages" type="button" onClick={() => setMsgOpen(true)}>💬</button>

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
              <img className="nav__avatar-img" src="https://pleated-jeans.com/wp-content/uploads/2024/12/funny-random-pictures-12-1-24-10.jpg" alt="" />
              <span className="nav__avatar-caret">▾</span>
            </button>

            {menuOpen && (
              <div id="profile-menu" ref={menuRef} className="nav__menu" role="menu" aria-label="Profile options">
                <button className="nav__menu-item" role="menuitem" onClick={() => goto("/MyProfile")}>My Profile</button>
                <button className="nav__menu-item" role="menuitem" onClick={() => { setTopupOpen(true); setMenuOpen(false); }}>Top‑Up</button>
                <button className="nav__menu-item" role="menuitem" onClick={() => goto("/registerasartist")}>Register as artist</button>
                <div className="nav__menu-sep" />
                <button className="nav__menu-item nav__menu-danger" role="menuitem" onClick={logOut}>Log‑out</button>
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

      {/* Messages Modal (overlay via portal to body) */}
      {msgOpen && createPortal(
        (
          <div
            className="evmOverlay"
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
              className="evmDialog"
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
