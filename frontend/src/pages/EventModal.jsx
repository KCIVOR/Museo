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
      className="museo-modal-overlay evmOverlay"
      ref={overlayRef}
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose?.(); e.stopPropagation(); }}
      onClick={(e) => e.stopPropagation()}
    >
      <article
        role="dialog"
        aria-modal="true"
        aria-label={event.title}
        className="museo-modal evmDialog"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button aria-label="Close" onClick={onClose} className="evmClose">
          ✕
        </button>

        {/* Museum Exhibition Hero */}
        <div style={{ 
          position: 'relative',
          background: 'linear-gradient(135deg, #8b6f47 0%, #d4b48a 100%)',
          borderBottom: '6px solid #8b6f47'
        }}>
          <img 
            src={event.hero} 
            alt="" 
            style={{
              width: '100%',
              height: '320px',
              objectFit: 'cover',
              display: 'block',
              transition: 'transform 0.3s ease'
            }}
          />
          
          {/* Museum overlay gradient */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(180deg, transparent 0%, rgba(139, 111, 71, 0.1) 70%, rgba(110, 74, 46, 0.4) 100%)',
            pointerEvents: 'none'
          }} />
          
          {/* Museum placard badges */}
          <div style={{
            position: 'absolute',
            bottom: '24px',
            left: '24px',
            right: '24px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            zIndex: 3
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #faf8f5 0%, #ffffff 100%)',
              backdropFilter: 'blur(16px)',
              border: '3px solid #8b6f47',
              borderRadius: '16px',
              padding: '12px 20px',
              boxShadow: '0 8px 24px rgba(110, 74, 46, 0.3), 0 4px 12px rgba(139, 111, 71, 0.2)',
              fontSize: '14px',
              fontWeight: '600',
              color: '#8b6f47',
              fontFamily: 'Georgia, Times New Roman, serif',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🗓️ {fmt(event.start)}
            </div>
            {event.venueName && (
              <div style={{
                background: 'linear-gradient(135deg, #faf8f5 0%, #ffffff 100%)',
                backdropFilter: 'blur(16px)',
                border: '3px solid #8b6f47',
                borderRadius: '16px',
                padding: '12px 20px',
                boxShadow: '0 8px 24px rgba(110, 74, 46, 0.3), 0 4px 12px rgba(139, 111, 71, 0.2)',
                fontSize: '14px',
                fontWeight: '600',
                color: '#8b6f47',
                fontFamily: 'Georgia, Times New Roman, serif',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                📍 {event.venueName}
              </div>
            )}
          </div>
          
          {/* Decorative corner ornaments */}
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '16px',
            height: '16px',
            background: 'radial-gradient(circle, #d4b48a 0%, #8b6f47 100%)',
            borderRadius: '50%',
            border: '3px solid #faf8f5',
            boxShadow: '0 4px 12px rgba(110, 74, 46, 0.4)',
            zIndex: 3
          }} />
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            width: '16px',
            height: '16px',
            background: 'radial-gradient(circle, #d4b48a 0%, #8b6f47 100%)',
            borderRadius: '50%',
            border: '3px solid #faf8f5',
            boxShadow: '0 4px 12px rgba(110, 74, 46, 0.4)',
            zIndex: 3
          }} />
        </div>

        {/* Museum Exhibition Title Section */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          padding: '32px 40px 28px',
          background: 'linear-gradient(135deg, #faf8f5 0%, #ffffff 100%)',
          borderBottom: '4px solid #d4b48a',
          position: 'relative'
        }}>
          {/* Decorative accent line */}
          <div style={{
            position: 'absolute',
            bottom: '-2px',
            left: '32px',
            right: '32px',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #8b6f47, #d4b48a, #8b6f47, transparent)',
            borderRadius: '1px'
          }} />
          
          {/* Exhibition Title */}
          <h1 style={{
            fontFamily: 'Georgia, Times New Roman, serif',
            fontSize: 'clamp(28px, 4vw, 42px)',
            fontWeight: '600',
            color: '#8b6f47',
            margin: '0',
            lineHeight: '1.2',
            letterSpacing: '-0.02em',
            textShadow: '0 2px 4px rgba(139, 111, 71, 0.1)',
            textAlign: 'center'
          }}>
            {event.title}
          </h1>
          
        </div>

        {/* Museum Exhibition Content */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1.6fr 1fr',
          gap: '32px',
          padding: isMobile ? '24px' : '40px',
          background: 'linear-gradient(135deg, #faf8f5 0%, #ffffff 100%)'
        }}>
          <div style={{ display: 'grid', gap: '28px' }}>
            {/* Main Exhibition Description */}
            <section style={{
              background: 'linear-gradient(135deg, #faf8f5 0%, #ffffff 100%)',
              border: '4px solid #d4b48a',
              borderRadius: '20px',
              padding: '32px',
              boxShadow: '0 8px 24px rgba(110, 74, 46, 0.15), 0 4px 12px rgba(139, 111, 71, 0.1)',
              position: 'relative'
            }}>
              {/* Inner frame detail */}
              <div style={{
                position: 'absolute',
                top: '3px',
                left: '3px',
                right: '3px',
                bottom: '3px',
                border: '1px solid rgba(212, 180, 138, 0.4)',
                borderRadius: '16px',
                pointerEvents: 'none'
              }} />
              
              <p style={{
                fontSize: '18px',
                lineHeight: '1.7',
                color: '#6b5b47',
                margin: '0 0 24px',
                fontFamily: 'Georgia, Times New Roman, serif',
                fontStyle: 'italic'
              }}>
                {event.lead}
              </p>

              {event.activities?.length > 0 && (
                <div style={{ marginTop: '28px' }}>
                  <div style={{
                    fontFamily: 'Georgia, Times New Roman, serif',
                    fontWeight: '700',
                    color: '#8b6f47',
                    fontSize: '20px',
                    marginBottom: '16px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    borderBottom: '2px solid #d4b48a',
                    paddingBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    🎨 Exhibition Activities
                  </div>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    {event.activities.map((a, i) => (
                      <span key={i} style={{
                        padding: '10px 16px',
                        borderRadius: '16px',
                        border: '2px solid #8b6f47',
                        background: 'linear-gradient(135deg, #faf8f5 0%, #ffffff 100%)',
                        color: '#8b6f47',
                        fontSize: '14px',
                        fontWeight: '600',
                        fontFamily: 'Georgia, Times New Roman, serif',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        boxShadow: '0 2px 8px rgba(110, 74, 46, 0.1)'
                      }}>
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {event.admission && (
                <div style={{ marginTop: '28px' }}>
                  <div style={{
                    fontFamily: 'Georgia, Times New Roman, serif',
                    fontWeight: '700',
                    color: '#8b6f47',
                    fontSize: '20px',
                    marginBottom: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    borderBottom: '2px solid #d4b48a',
                    paddingBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    🎟️ Admission Details
                  </div>
                  <p style={{
                    fontSize: '16px',
                    color: '#6b5b47',
                    margin: '0 0 12px',
                    fontFamily: 'Georgia, Times New Roman, serif',
                    fontStyle: 'italic',
                    lineHeight: '1.6'
                  }}>
                    {event.admission}
                  </p>
                  {event.admissionNote && (
                    <p style={{
                      fontSize: '16px',
                      color: '#6b5b47',
                      margin: '0',
                      fontFamily: 'Georgia, Times New Roman, serif',
                      fontStyle: 'italic',
                      lineHeight: '1.6'
                    }}>
                      {event.admissionNote}
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* Museum Information Sidebar */}
          <aside style={{ display: 'grid', gap: '24px', alignSelf: 'start' }}>
            {/* Venue Information */}
            <section style={{
              background: 'linear-gradient(135deg, #faf8f5 0%, #ffffff 100%)',
              border: '3px solid #d4b48a',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 6px 20px rgba(110, 74, 46, 0.12), 0 3px 10px rgba(139, 111, 71, 0.08)',
              position: 'relative'
            }}>
              {/* Inner frame detail */}
              <div style={{
                position: 'absolute',
                top: '2px',
                left: '2px',
                right: '2px',
                bottom: '2px',
                border: '1px solid rgba(212, 180, 138, 0.4)',
                borderRadius: '16px',
                pointerEvents: 'none'
              }} />
              
              <div style={{
                fontFamily: 'Georgia, Times New Roman, serif',
                fontWeight: '700',
                color: '#8b6f47',
                fontSize: '18px',
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                borderBottom: '2px solid #d4b48a',
                paddingBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                📍 Exhibition Venue
              </div>
              <p style={{
                fontSize: '16px',
                color: '#6b5b47',
                margin: '0',
                lineHeight: '1.6',
                fontFamily: 'Georgia, Times New Roman, serif',
                fontStyle: 'italic'
              }}>
                {event.venueName}
                <br />
                {event.venueAddress}
              </p>
            </section>

            {/* Date & Time Information */}
            <section style={{
              background: 'linear-gradient(135deg, #faf8f5 0%, #ffffff 100%)',
              border: '3px solid #d4b48a',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 6px 20px rgba(110, 74, 46, 0.12), 0 3px 10px rgba(139, 111, 71, 0.08)',
              position: 'relative'
            }}>
              {/* Inner frame detail */}
              <div style={{
                position: 'absolute',
                top: '2px',
                left: '2px',
                right: '2px',
                bottom: '2px',
                border: '1px solid rgba(212, 180, 138, 0.4)',
                borderRadius: '16px',
                pointerEvents: 'none'
              }} />
              
              <div style={{
                fontFamily: 'Georgia, Times New Roman, serif',
                fontWeight: '700',
                color: '#8b6f47',
                fontSize: '18px',
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                borderBottom: '2px solid #d4b48a',
                paddingBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                🗓️ Exhibition Schedule
              </div>
              <p style={{
                fontSize: '16px',
                color: '#6b5b47',
                margin: '0 0 12px',
                lineHeight: '1.6',
                fontFamily: 'Georgia, Times New Roman, serif',
                fontStyle: 'italic'
              }}>
                <strong style={{ color: '#8b6f47', fontStyle: 'normal' }}>Opening:</strong> {fmt(event.start)}
              </p>
              <p style={{
                fontSize: '16px',
                color: '#6b5b47',
                margin: '0',
                lineHeight: '1.6',
                fontFamily: 'Georgia, Times New Roman, serif',
                fontStyle: 'italic'
              }}>
                <strong style={{ color: '#8b6f47', fontStyle: 'normal' }}>Closing:</strong> {fmt(event.end)}
              </p>
            </section>

            {/* Museum Action Buttons - Horizontal Layout */}
            <div style={{
              display: 'grid',
              gap: '12px'
            }}>
              {/* Join Event Button */}
              <button 
                onClick={() => { if (!isEventPast) joinEvent(); }} 
                disabled={isSubmitting || isEventPast} 
                title={isEventPast ? 'This event has already passed' : undefined}
                style={{
                  padding: '14px 20px',
                  borderRadius: '16px',
                  border: '3px solid #8b6f47',
                  background: isEventPast ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)' : 
                             joined ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' :
                             'linear-gradient(135deg, #8b6f47 0%, #6b5b47 100%)',
                  color: '#ffffff',
                  fontFamily: 'Georgia, Times New Roman, serif',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: isSubmitting || isEventPast ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  opacity: isSubmitting || isEventPast ? 0.7 : 1,
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  boxShadow: '0 4px 16px rgba(110, 74, 46, 0.2), 0 2px 8px rgba(139, 111, 71, 0.1)',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting && !isEventPast) {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 8px 24px rgba(110, 74, 46, 0.3), 0 4px 12px rgba(139, 111, 71, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 16px rgba(110, 74, 46, 0.2), 0 2px 8px rgba(139, 111, 71, 0.1)';
                }}
              >
                {isEventPast
                  ? 'Event Ended'
                  : (isSubmitting ? (joined ? 'Cancelling…' : 'Joining…') : (joined ? 'Cancel' : 'Join Event'))}
              </button>

              {/* View Participants Button */}
              {(role === 'admin' || role?.role === 'admin') && (
                <button
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '2px solid #8b6f47',
                    background: 'linear-gradient(135deg, #faf8f5 0%, #ffffff 100%)',
                    color: '#8b6f47',
                    fontFamily: 'Georgia, Times New Roman, serif',
                    fontWeight: '600',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    boxShadow: '0 2px 8px rgba(110, 74, 46, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  onClick={() => setParticipantsOpen(true)}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, #ffffff 0%, #faf8f5 100%)';
                    e.target.style.borderColor = '#d4b48a';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(110, 74, 46, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, #faf8f5 0%, #ffffff 100%)';
                    e.target.style.borderColor = '#8b6f47';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 8px rgba(110, 74, 46, 0.1)';
                  }}
                >
                  View Participants
                </button>
              )}
            </div>
          </aside>
        </div>
      </article>

      {participantsOpen && (
        <div
          className="museo-modal-overlay evmOverlay"
          onMouseDown={(e) => { if (e.currentTarget === e.target) setParticipantsOpen(false); e.stopPropagation(); }}
          onClick={(e) => e.stopPropagation()}
          style={{ 
            background: 'rgba(44, 24, 16, 0.8)',
            backdropFilter: 'blur(8px)'
          }}
        >
          <article
            role="dialog"
            aria-modal="true"
            aria-label="Participants"
            className="museo-modal evmDialog"
            style={{ 
              maxWidth: 760, 
              width: 'min(92vw, 760px)',
              background: 'linear-gradient(135deg, #faf8f5 0%, #ffffff 100%)',
              border: '4px solid #8b6f47',
              borderRadius: '24px',
              boxShadow: '0 20px 60px rgba(110, 74, 46, 0.4), 0 8px 24px rgba(139, 111, 71, 0.3)',
              overflow: 'hidden'
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Museum-style header */}
            <div style={{
              background: 'linear-gradient(135deg, #8b6f47 0%, #d4b48a 100%)',
              padding: '24px 32px',
              borderBottom: '4px solid #6e4a2e',
              position: 'relative'
            }}>
              {/* Decorative corner ornaments */}
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '12px',
                height: '12px',
                background: 'radial-gradient(circle, #faf8f5 0%, #d4b48a 100%)',
                borderRadius: '50%',
                border: '2px solid #faf8f5',
                boxShadow: '0 2px 8px rgba(110, 74, 46, 0.3)'
              }} />
              <div style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                width: '12px',
                height: '12px',
                background: 'radial-gradient(circle, #faf8f5 0%, #d4b48a 100%)',
                borderRadius: '50%',
                border: '2px solid #faf8f5',
                boxShadow: '0 2px 8px rgba(110, 74, 46, 0.3)'
              }} />
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{
                  fontFamily: 'Georgia, Times New Roman, serif',
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#faf8f5',
                  margin: '0',
                  textShadow: '0 2px 4px rgba(44, 24, 16, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  Participants ({participants.length})
                </h2>
                <button 
                  onClick={() => setParticipantsOpen(false)}
                  style={{
                    background: 'linear-gradient(135deg, #faf8f5 0%, #ffffff 100%)',
                    border: '3px solid #8b6f47',
                    borderRadius: '12px',
                    padding: '8px 16px',
                    color: '#8b6f47',
                    fontFamily: 'Georgia, Times New Roman, serif',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    boxShadow: '0 2px 8px rgba(110, 74, 46, 0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, #ffffff 0%, #faf8f5 100%)';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(110, 74, 46, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, #faf8f5 0%, #ffffff 100%)';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 8px rgba(110, 74, 46, 0.2)';
                  }}
                >
                  Close
                </button>
              </div>
            </div>
            <section style={{ 
              maxHeight: 'min(75vh, 520px)', 
              overflowY: 'auto', 
              overflowX: 'hidden', 
              padding: '24px 32px',
              background: 'linear-gradient(135deg, #faf8f5 0%, #ffffff 100%)'
            }}>
              {pLoading && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px',
                  color: '#8b6f47',
                  fontFamily: 'Georgia, Times New Roman, serif',
                  fontSize: '16px',
                  fontStyle: 'italic'
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
                  fontFamily: 'Georgia, Times New Roman, serif',
                  fontSize: '16px',
                  fontStyle: 'italic',
                  textAlign: 'center'
                }}>
                  {pError}
                </div>
              )}
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
                        <li key={u.userId || u.id || i} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '16px', 
                          justifyContent: 'space-between', 
                          flexWrap: 'nowrap', 
                          padding: '16px 20px',
                          marginBottom: '12px',
                          background: 'linear-gradient(135deg, #ffffff 0%, #faf8f5 100%)',
                          border: '2px solid #d4b48a',
                          borderRadius: '16px',
                          boxShadow: '0 4px 12px rgba(110, 74, 46, 0.1)',
                          transition: 'all 0.3s ease'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0, flex: 1, maxWidth: 'calc(100% - 260px)', marginRight: '12px' }}>
                            <img
                              src={avatar}
                              alt={fullName || username || 'User'}
                              style={{ 
                                width: '48px', 
                                height: '48px', 
                                borderRadius: '50%', 
                                objectFit: 'cover', 
                                flex: '0 0 auto',
                                border: '3px solid #8b6f47',
                                boxShadow: '0 2px 8px rgba(110, 74, 46, 0.2)'
                              }}
                              onError={(e) => { e.currentTarget.src = '/assets/user-placeholder.png'; }}
                            />
                            <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <div style={{ 
                                fontWeight: '600',
                                fontSize: '16px',
                                color: '#8b6f47',
                                fontFamily: 'Georgia, Times New Roman, serif',
                                marginBottom: '4px'
                              }}>
                                {fullName || username || 'Unknown'}
                              </div>
                              {username && fullName && (
                                <div style={{ 
                                  color: '#6b5b47',
                                  fontSize: '14px',
                                  fontFamily: 'Georgia, Times New Roman, serif',
                                  fontStyle: 'italic'
                                }}>
                                  {username}
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '0 0 auto', whiteSpace: 'nowrap' }}>
                            {u.joinedAt && (
                              <div style={{ 
                                fontSize: '12px', 
                                flex: '0 0 auto',
                                color: '#6b5b47',
                                fontFamily: 'Georgia, Times New Roman, serif',
                                fontStyle: 'italic',
                                background: 'linear-gradient(135deg, #faf8f5 0%, #ffffff 100%)',
                                padding: '6px 12px',
                                borderRadius: '12px',
                                border: '1px solid #d4b48a'
                              }}>
                                Joined: {fmtJoined(u.joinedAt)}
                              </div>
                            )}
                            {(role === 'admin' || role?.role === 'admin') && (
                              <button
                                aria-label="Remove"
                                title="Remove"
                                style={{ 
                                  padding: '8px 12px',
                                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                                  border: '2px solid #991b1b',
                                  borderRadius: '8px',
                                  color: '#ffffff',
                                  fontFamily: 'Georgia, Times New Roman, serif',
                                  fontWeight: '600',
                                  fontSize: '12px',
                                  cursor: removingId === (u.userId || u.id) ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.3s ease',
                                  opacity: removingId === (u.userId || u.id) ? 0.7 : 1,
                                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.2)'
                                }}
                                disabled={removingId === (u.userId || u.id)}
                                onClick={() => {
                                  setConfirmTarget({ userId: (u.userId || u.id), label: fullName || username || 'this user' });
                                  setConfirmOpen(true);
                                }}
                                onMouseEnter={(e) => {
                                  if (removingId !== (u.userId || u.id)) {
                                    e.target.style.transform = 'translateY(-1px)';
                                    e.target.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.3)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.transform = 'translateY(0)';
                                  e.target.style.boxShadow = '0 2px 8px rgba(220, 38, 38, 0.2)';
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
                      background: 'linear-gradient(135deg, #d4b48a 0%, #8b6f47 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '16px',
                      opacity: 0.6,
                      border: '3px solid #8b6f47'
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: '#faf8f5'
                      }} />
                    </div>
                    <div style={{
                      color: '#8b6f47',
                      fontFamily: 'Georgia, Times New Roman, serif',
                      fontSize: '18px',
                      fontWeight: '600',
                      marginBottom: '8px'
                    }}>
                      No Participants Yet
                    </div>
                    <div style={{
                      color: '#6b5b47',
                      fontFamily: 'Georgia, Times New Roman, serif',
                      fontSize: '14px',
                      fontStyle: 'italic',
                      maxWidth: '300px',
                      lineHeight: '1.5'
                    }}>
                      This exhibition is waiting for its first visitors to join.
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
