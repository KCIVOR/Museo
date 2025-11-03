import { useEffect, useRef, useState } from "react";
import { useUser } from "../contexts/UserContext";
import ConfirmModal from "./ConfirmModal.jsx";

const API = import.meta.env.VITE_API_BASE;

export default function EventModal({ open, event, onClose }) {
  const { userData } = useUser();
  // Get role from UserContext instead of fetching
  const role = userData?.role || null;
  
  const overlayRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joined, setJoined] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [pLoading, setPLoading] = useState(false);
  const [pError, setPError] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // { userId, label }
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);


  // (removed leftover unused getParticipants helper)

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    const onResize = () => setIsMobile(window.innerWidth <= 900);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const removeParticipantReq = async (userId) => {
    try {
      setRemovingId(userId);
      const res = await fetch(`${API}/event/removeParticipant`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.eventId || event.id, userId })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to remove participant');
      }
      // Optimistically update list
      setParticipants(prev => prev.filter(p => (p.userId || p.id) !== userId));
    } catch (e) {
      setPError(e.message || 'Failed to remove participant');
    } finally {
      setRemovingId(null);
    }
  };

  const pad = (n) => String(n).padStart(2, "0");
  const toICSDate = (dt) => {
    const d = new Date(dt);
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  };
  const esc = (s) => String(s || "").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
  const buildICS = (e) => [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Museo//Event//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@museo.app`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(e.start)}`,
    `DTEND:${toICSDate(e.end)}`,
    `SUMMARY:${esc(e.title)}`,
    `LOCATION:${esc(`${e.venueName || ""} ${e.venueAddress || ""}`.trim())}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  // Check if user already joined this event
  useEffect(() => {
    let abort = false;
    const check = async () => {
      try {
        if (!open) return;
        const res = await fetch(`${API}/event/isJoined?eventId=${encodeURIComponent(event.eventId || event.id)}` ,{
          method: 'GET',
          credentials: 'include',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!abort) setJoined(!!data.joined);
      } catch {}
    };
    check();
    return () => { abort = true; };
  }, [open, event?.eventId, event?.id]);


  // Load participants when the participants modal is opened
  useEffect(() => {
    let abort = false;
    const run = async () => {
      try {
        if (!open || !participantsOpen) return;
        setPLoading(true);
        setPError(null);
        const res = await fetch(`${API}/event/eventParticipants`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId: event.eventId || event.id })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Failed to fetch participants (${res.status})`);
        }
        const data = await res.json();
        if (!abort) setParticipants(Array.isArray(data.participants) ? data.participants : []);
      } catch (e) {
        if (!abort) setPError(e.message || 'Failed to load participants');
      } finally {
        if (!abort) setPLoading(false);
      }
    };
    run();
    return () => { abort = true; };
  }, [open, participantsOpen, event?.eventId, event?.id]);

  const joinEvent = async () => {
    try{
        setIsSubmitting(true);
        const res = await fetch(`${API}/event/joinEvent`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({eventId: event.eventId || event.id }),
        });
        if (!res.ok) {
            throw new Error("Failed to join event");
        }
        const data = await res.json();
        if (data.removed) setJoined(false);
        if (data.joined) setJoined(true);
    }catch(err){
        console.error('joinEvent: unexpected error:', err);
    }finally{
        setIsSubmitting(false);
    }
  };

  const fmt = (dt) =>
    new Date(dt).toLocaleString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // Guard after hooks to keep hook order stable
  if (!open || !event) return null;

  // Disable join if event already ended (fallback to start if no end)
  const isEventPast = (() => {
    try {
      const t = new Date(event.end || event.start).getTime();
    } catch { return false; }
  })();

  return (
    <div
      className="event-modal"
      ref={overlayRef}
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose?.(); e.stopPropagation(); }}
      onClick={(e) => e.stopPropagation()}
    >
      <article
        role="dialog"
        aria-modal="true"
        aria-label={event.title}
        className="event-modal__dialog"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button aria-label="Close" onClick={onClose} className="btn btn-icon btn-ghost event-modal__close">
          ✕
        </button>

        {/* Hero Section */}
        <div className="event-modal__hero">
          <img 
            src={event.hero} 
            alt="" 
            className="event-modal__hero-image"
          />
          <div className="event-modal__hero-overlay">
            <div className="event-modal__badges">
              <span className="museo-badge museo-badge--primary">
                🗓️ {fmt(event.start)}
              </span>
              {event.venueName && (
                <span className="museo-badge museo-badge--primary">
                  📍 {event.venueName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="event-modal__content">
          {/* Title Section */}
          <div className="event-modal__title-section">
            <h1 className="event-modal__title">{event.title}</h1>
            {event.lead && (
              <p className="event-modal__subtitle">{event.lead}</p>
            )}
          </div>

          {/* Content Grid */}
          <div className="event-modal__grid">
            <div className="event-modal__main">
              {/* Main Description */}
              <section className="event-modal__section">
                <h3 className="event-modal__section-title">
                  ℹ️ About This Event
                </h3>
                <div className="event-modal__section-content">
                  <p>{event.lead || 'Join us for this exciting event!'}</p>
                  {event.description && (
                    <p style={{ marginTop: '16px' }}>
                      {event.description}
                    </p>
                  )}
                </div>
              </section>

              {/* Activities Section */}
              {event.activities?.length > 0 && (
                <section className="event-modal__section">
                  <h3 className="event-modal__section-title">
                    🎨 Activities
                  </h3>
                  <div className="event-modal__activities">
                    {event.activities.map((a, i) => (
                      <span key={i} className="museo-badge museo-badge--sm">
                        {a}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Admission Details */}
              {event.admission && (
                <section className="event-modal__section">
                  <h3 className="event-modal__section-title">
                    🎫️ Admission Details
                  </h3>
                  <div className="event-modal__section-content">
                    <p>{event.admission}</p>
                    {event.admissionNote && (
                      <p style={{ marginTop: '8px', fontSize: '14px', color: '#6b6b6b' }}>
                        {event.admissionNote}
                      </p>
                    )}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <aside className="event-modal__sidebar">
              {/* Venue Information */}
              <div className="event-modal__info-card">
                <p className="event-modal__info-label">Venue</p>
                <p className="event-modal__info-value">
                  {event.venueName || 'Venue TBA'}
                </p>
                {event.venueAddress && (
                  <p style={{ fontSize: '14px', color: '#6b6b6b', marginTop: '4px' }}>
                    {event.venueAddress}
                  </p>
                )}
              </div>

              {/* Date & Time Information */}
              <div className="event-modal__info-card">
                <p className="event-modal__info-label">Date & Time</p>
                <p className="event-modal__info-value">
                  Starts: {fmt(event.start)}
                </p>
                <p className="event-modal__info-value" style={{ marginTop: '8px' }}>
                  Ends: {fmt(event.end)}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="event-modal__actions">
                <button 
                  onClick={() => { if (!isEventPast) joinEvent(); }} 
                  disabled={isSubmitting || isEventPast} 
                  title={isEventPast ? 'This event has already passed' : undefined}
                  className={`btn ${joined ? 'btn-danger' : 'btn-primary'} btn-block`}
                >
                  {isEventPast
                    ? 'Event Ended'
                    : (isSubmitting ? (joined ? 'Cancelling…' : 'Joining…') : (joined ? 'Cancel Reservation' : 'Join Event'))}
                </button>

                {(role === 'admin' || role?.role === 'admin') && (
                  <button
                    onClick={() => setParticipantsOpen(true)}
                    className="btn btn-secondary btn-block"
                  >
                    View Participants
                  </button>
                )}
              </div>
            </aside>
          </div>
        </div>
      </article>

      {participantsOpen && (
        <div
          className="event-modal"
          onMouseDown={(e) => { if (e.currentTarget === e.target) setParticipantsOpen(false); e.stopPropagation(); }}
          onClick={(e) => e.stopPropagation()}
        >
          <article
            role="dialog"
            aria-modal="true"
            aria-label="Participants"
            className="event-modal__dialog event-modal__participants"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Participants Header */}
            <div className="event-modal__participants-header">
              <h2 className="event-modal__participants-title">
                Participants ({participants.length})
              </h2>
              <button 
                onClick={() => setParticipantsOpen(false)}
                className="btn btn-ghost btn-sm"
                style={{ background: 'rgba(255, 255, 255, 0.2)' }}
              >
                Close
              </button>
            </div>
            <section className="event-modal__participants-list">
              {pLoading && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px',
                  color: '#6e4a2e',
                  fontSize: '16px'
                }}>
                  Loading participants...
                </div>
              )}
              {pError && !pLoading && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px',
                  color: '#dc2626',
                  fontSize: '16px',
                  textAlign: 'center'
                }}>
                  {pError}
                </div>
              )}
              {!pLoading && !pError && (
                participants.length > 0 ? (
                  <div>
                    {participants.map((u, i) => {
                      // Order: firstName, lastName, middleName (if present)
                      const fullName = [u.firstName, u.lastName, u.middleName].filter(Boolean).join(' ').trim();
                      const username = u.username ? `@${u.username}` : '';
                      const avatar = u.profilePicture || '/assets/user-placeholder.png';
                      const fmtJoined = (dt) => dt ? new Date(dt).toLocaleString(undefined, { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                      return (
                        <div key={u.userId || u.id || i} className="event-modal__participant">
                          <img
                            src={avatar}
                            alt={fullName || username || 'User'}
                            className="event-modal__participant-avatar"
                            onError={(e) => { e.currentTarget.src = '/assets/user-placeholder.png'; }}
                          />
                          <div className="event-modal__participant-info">
                            <div className="event-modal__participant-name">
                              {fullName || username || 'Unknown'}
                            </div>
                            {username && fullName && (
                              <div className="event-modal__participant-username">
                                {username}
                              </div>
                            )}
                          </div>
                          {u.joinedAt && (
                            <span className="event-modal__participant-joined">
                              Joined: {fmtJoined(u.joinedAt)}
                            </span>
                          )}
                          {(role === 'admin' || role?.role === 'admin') && (
                            <button
                              aria-label="Remove"
                              title="Remove"
                              className="btn btn-danger btn-sm"
                              disabled={removingId === (u.userId || u.id)}
                              onClick={() => {
                                setConfirmTarget({ userId: (u.userId || u.id), label: fullName || username || 'this user' });
                                setConfirmOpen(true);
                              }}
                            >
                              {removingId === (u.userId || u.id) ? 'Removing…' : 'Remove'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '60px 40px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: '#f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '16px'
                    }}>
                      <span style={{ fontSize: '24px' }}>👥</span>
                    </div>
                    <div style={{
                      color: '#2c1810',
                      fontSize: '18px',
                      fontWeight: '600',
                      marginBottom: '8px'
                    }}>
                      No Participants Yet
                    </div>
                    <div style={{
                      color: '#6b6b6b',
                      fontSize: '14px',
                      maxWidth: '300px',
                      lineHeight: '1.5'
                    }}>
                      Be the first to join this event!
                    </div>
                  </div>
                )
              )}
            </section>
          </article>
        </div>
      )}
      <ConfirmModal
        open={confirmOpen}
        title="Remove participant"
        message={`Are you sure you want to remove ${confirmTarget?.label || 'this user'} from this event?`}
        confirmText="Remove"
        cancelText="Cancel"
        onCancel={() => { setConfirmOpen(false); setConfirmTarget(null); }}
        onConfirm={() => { setConfirmOpen(false); if (confirmTarget?.userId) removeParticipantReq(confirmTarget.userId); }}
      />
    </div>
  );
}
