import { useEffect, useRef, useState } from "react";
import ConfirmModal from "./ConfirmModal.jsx";

import "./css/events.css";
const API = import.meta.env.VITE_API_BASE;

export default function EventModal({ open, event, onClose }) {
  const overlayRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joined, setJoined] = useState(false);
  const [role, setRole] = useState(null);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [pLoading, setPLoading] = useState(false);
  const [pError, setPError] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // { userId, label }


  // (removed leftover unused getParticipants helper)

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
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

  // Fetch role of current user when modal opens
  useEffect(() => {
    let abort = false;
    const run = async () => {
      try {
        if (!open) return;
        const response = await fetch(`${API}/users/role`, {
          method: "GET",
          credentials: "include",
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!abort) setRole(data);
      } catch {}
    };
    run();
    return () => { abort = true; };
  }, [open]);

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
      return Number.isFinite(t) ? t < Date.now() : false;
    } catch { return false; }
  })();

  return (
    <div
      className="evmOverlay"
      ref={overlayRef}
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose?.(); e.stopPropagation(); }}
      onClick={(e) => e.stopPropagation()}
    >
      <article
        role="dialog"
        aria-modal="true"
        aria-label={event.title}
        className="evmDialog"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button aria-label="Close" onClick={onClose} className="evmClose">
          ✕
        </button>

        <div className="evmHeroWrap">
          <img src={event.hero} alt="" className="evmHero" />
          <div className="evmHeroOverlay">
            <div className="evmHeroTitle">{event.title}</div>
            <div className="evmHeroBadges">
              <span className="evmBadge">🗓️ {fmt(event.start)}</span>
              <span className="evmBadge">📍 {event.venueName}</span>
            </div>
          </div>
        </div>

        <div className="evmHeader">
          <h1 className="evmTitle">{event.title}</h1>
          <div className="evmHeaderBtns">
            {(role === 'admin' || role?.role === 'admin') && (
              <button
                className="evmCalBtn"
                style={{ marginRight: 8 }}
                onClick={() => setParticipantsOpen(true)}
              >
                View Participants
              </button>
            )}
            <button onClick={() => { if (!isEventPast) joinEvent(); }} className="evmCalBtn" disabled={isSubmitting || isEventPast} title={isEventPast ? 'This event has already passed' : undefined}>
              {isEventPast
                ? 'Event Ended'
                : (isSubmitting ? (joined ? 'Cancelling…' : 'Joining…') : (joined ? 'Cancel' : 'Join Event'))}
            </button>
          </div>
        </div>

        <div className="evmShell">
          <div className="evmMain">
            <section className="evmSection evmCard">
              <p className="evmP">{event.lead}</p>

              {event.activities?.length > 0 && (
                <div>
                  <div className="evmSectionTitle">🎨 Activities Include</div>
                  <ul className="evmList evmChips">
                    {event.activities.map((a, i) => (
                      <li className="evmChip" key={i}>
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {event.admission && (
                <div className="evmInline">
                  <div className="evmSectionTitle">🎟️ Admission</div>
                  <p className="evmP evmMuted">{event.admission}</p>
                  {event.admissionNote && <p className="evmP evmMuted">{event.admissionNote}</p>}
                </div>
              )}
            </section>
          </div>

          <aside className="evmSide">
            <section className="evmSection evmCard">
              <div className="evmSectionTitle">📍 Venue</div>
              <p className="evmP">
                {event.venueName}
                <br />
                {event.venueAddress}
              </p>
            </section>

            <section className="evmSection evmCard">
              <div className="evmSectionTitle">🗓️ Date & Time</div>
              <p className="evmP">
                <b>Start:</b> {fmt(event.start)}
              </p>
              <p className="evmP">
                <b>End:</b> {fmt(event.end)}
              </p>
            </section>
          </aside>
        </div>
      </article>

      {participantsOpen && (
        <div
          className="evmOverlay"
          onMouseDown={(e) => { if (e.currentTarget === e.target) setParticipantsOpen(false); e.stopPropagation(); }}
          onClick={(e) => e.stopPropagation()}
          style={{ background: 'rgba(0,0,0,0.4)' }}
        >
          <article
            role="dialog"
            aria-modal="true"
            aria-label="Participants"
            className="evmDialog"
            style={{ maxWidth: 760, width: 'min(92vw, 760px)' }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="evmHeader" style={{ marginBottom: 12 }}>
              <h2 className="evmTitle" style={{ fontSize: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                Participants({participants.length})
              </h2>
              <button className="evmCalBtn" onClick={() => setParticipantsOpen(false)}>Close</button>
            </div>
            <section className="evmSection evmCard" style={{ maxHeight: 'min(75vh, 520px)', overflowY: 'auto', overflowX: 'hidden', padding: '8px 16px' }}>
              {pLoading && <p className="evmP">Loading…</p>}
              {pError && !pLoading && <p className="evmP evmMuted">{pError}</p>}
              {!pLoading && !pError && (
                participants.length > 0 ? (
                  <ul className="evmList" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {participants.map((u, i) => {
                      // Order: firstName, lastName, middleName (if present)
                      const fullName = [u.firstName, u.lastName, u.middleName].filter(Boolean).join(' ').trim();
                      const username = u.username ? `@${u.username}` : '';
                      const avatar = u.profilePicture || '/assets/user-placeholder.png';
                      const fmtJoined = (dt) => dt ? new Date(dt).toLocaleString(undefined, { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                      return (
                        <li key={u.userId || u.id || i} className="evmP" style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', flexWrap: 'nowrap', padding: '6px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1, maxWidth: 'calc(100% - 260px)', marginRight: 12 }}>
                            <img
                              src={avatar}
                              alt={fullName || username || 'User'}
                              style={{ width: 36, height: 36, borderRadius: '999px', objectFit: 'cover', flex: '0 0 auto' }}
                              onError={(e) => { e.currentTarget.src = '/assets/user-placeholder.png'; }}
                            />
                            <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <span style={{ fontWeight: 600 }}>
                                {fullName || username || 'Unknown'}
                              </span>
                              {username && fullName && (
                                <span className="evmMuted" style={{ marginLeft: 8 }}>
                                  {username}
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '0 0 auto', whiteSpace: 'nowrap' }}>
                            {u.joinedAt && (
                              <div className="evmMuted" style={{ fontSize: 12, flex: '0 0 auto' }}>Joined: {fmtJoined(u.joinedAt)}</div>
                            )}
                            {(role === 'admin' || role?.role === 'admin') && (
                              <button
                                aria-label="Remove"
                                title="Remove"
                                className="evmCalBtn"
                                style={{ padding: '4px 8px' }}
                                disabled={removingId === (u.userId || u.id)}
                                onClick={() => {
                                  setConfirmTarget({ userId: (u.userId || u.id), label: fullName || username || 'this user' });
                                  setConfirmOpen(true);
                                }}
                              >
                                {removingId === (u.userId || u.id) ? 'Removing…' : '✕'}
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="evmP evmMuted">No participants yet.</p>
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
