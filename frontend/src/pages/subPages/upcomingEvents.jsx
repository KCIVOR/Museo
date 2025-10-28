import React from "react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
// Using CSS classes from design-system.css instead of components
import MuseoLoadingBox from '../../components/MuseoLoadingBox.jsx';
import MuseoEmptyState from '../../components/MuseoEmptyState.jsx';
const API = import.meta.env.VITE_API_BASE;


function fmtRange(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  const sameDay =
    s.getFullYear() === e.getFullYear() &&
    s.getMonth() === e.getMonth() &&
    s.getDate() === e.getDate();

  const dOpt = { weekday: "short", month: "short", day: "numeric" };
  const tOpt = { hour: "2-digit", minute: "2-digit" };

  if (sameDay) {
    return `${s.toLocaleDateString(undefined, dOpt)} · ${s.toLocaleTimeString(
      undefined,
      tOpt
    )}–${e.toLocaleTimeString(undefined, tOpt)}`;
  }
  return `${s.toLocaleDateString(
    undefined,
    dOpt
  )} ${s.toLocaleTimeString(undefined, tOpt)} – ${e.toLocaleDateString(
    undefined,
    dOpt
  )} ${e.toLocaleTimeString(undefined, tOpt)}`;
}

// Manila timezone-aware bucketing
const MANILA_TZ = "Asia/Manila";
const manilaMidnightMs = (dateLike) => {
  const d = new Date(dateLike);
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: MANILA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d); // YYYY-MM-DD in Manila time
  // Construct midnight at Manila (+08:00) and parse to UTC ms
  return Date.parse(`${ymd}T00:00:00+08:00`);
};

function bucketLabel(dateLike) {
  const nowMs = manilaMidnightMs(new Date());
  const evMs = manilaMidnightMs(dateLike);
  const diffDays = Math.floor((evMs - nowMs) / 86400000);
  
  // Get Manila year/month for event and current date
  const { y: nowY, m: nowM } = (() => {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
    const y = Number(parts.find(p => p.type === 'year')?.value);
    const m = Number(parts.find(p => p.type === 'month')?.value);
    return { y, m };
  })();
  
  const { y: evY, m: evM } = (() => {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit' }).formatToParts(new Date(dateLike));
    const y = Number(parts.find(p => p.type === 'year')?.value);
    const m = Number(parts.find(p => p.type === 'month')?.value);
    return { y, m };
  })();
  
  // Check if it's next month
  let nextMonthY = nowY; 
  let nextMonthM = nowM + 1;
  if (nextMonthM > 12) { 
    nextMonthM = 1; 
    nextMonthY += 1; 
  }
  
  // Prioritize time-based buckets over month-based buckets
  if (diffDays <= 7) return "This Week";
  if (diffDays <= 14) return "Next Week";
  if (evY === nextMonthY && evM === nextMonthM) return "Next Month";
  return "Later";
}

export default function UpcomingEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All'); // All | This Week | Next Week | Next Month

  const fetchMyEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/event/myEvents`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Failed to fetch events: ${res.status} ${res.statusText} ${txt || ""}`);
      }
      const data = await res.json();
      setEvents(Array.isArray(data?.events) ? data.events : []);
    } catch (err) {
      console.error('fetchMyEvents: unexpected error:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyEvents();
  }, []);

  // Normalize fetched events into UI items
  const uiEvents = useMemo(() => (events || []).map(ev => ({
    id: ev.eventId,
    title: ev.title,
    desc: ev.details,
    cover: ev.image,
    start: ev.startsAt,
    end: ev.endsAt,
    venue: [ev.venueName, ev.venueAddress].filter(Boolean).join(', '),
  })), [events]);

  // Manila date helpers for filtering
  const getManilaYMD = (dateLike) => new Intl.DateTimeFormat('en-CA', {
    timeZone: MANILA_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(dateLike));
  const getManilaYearMonth = (dateLike) => {
    const d = new Date(dateLike);
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: MANILA_TZ, year: 'numeric', month: '2-digit' }).formatToParts(d);
    const y = Number(parts.find(p => p.type === 'year')?.value);
    const m = Number(parts.find(p => p.type === 'month')?.value);
    return { y, m };
  };
  const todayYM = (() => {
    const { y, m } = getManilaYearMonth(new Date());
    return { y, m };
  })();
  const nextMonthYM = (() => {
    let y = todayYM.y; let m = todayYM.m + 1;
    if (m > 12) { m = 1; y += 1; }
    return { y, m };
  })();
  const isThisWeek = (dateLike) => {
    const nowMs = manilaMidnightMs(new Date());
    const evMs = manilaMidnightMs(dateLike);
    const diff = Math.floor((evMs - nowMs) / 86400000);
    return diff >= 0 && diff <= 7;
  };
  const isNextWeek = (dateLike) => {
    const nowMs = manilaMidnightMs(new Date());
    const evMs = manilaMidnightMs(dateLike);
    const diff = Math.floor((evMs - nowMs) / 86400000);
    return diff > 7 && diff <= 14;
  };
  const isNextMonth = (dateLike) => {
    const { y, m } = getManilaYearMonth(dateLike);
    const isInNextMonth = y === nextMonthYM.y && m === nextMonthYM.m;
    
    // Only return true if it's in next month AND not in this week or next week
    if (!isInNextMonth) return false;
    
    const nowMs = manilaMidnightMs(new Date());
    const evMs = manilaMidnightMs(dateLike);
    const diff = Math.floor((evMs - nowMs) / 86400000);
    
    // Exclude if it's within 14 days (This Week or Next Week)
    return diff > 14;
  };
  const isLater = (dateLike) => {
    const nowMs = manilaMidnightMs(new Date());
    const evMs = manilaMidnightMs(dateLike);
    const diff = Math.floor((evMs - nowMs) / 86400000);
    // Later means more than 14 days AND not in next month
    return diff > 14 && !isNextMonth(dateLike);
  };
  const isDone = (startLike, endLike) => {
    // Consider event done if its end is strictly before now; fallback to start if end missing
    const endMs = endLike ? new Date(endLike).getTime() : new Date(startLike).getTime();
    return endMs < Date.now();
  };

  // Apply filter
  const filteredUi = useMemo(() => {
    switch (activeFilter) {
      case 'This Week':
        return uiEvents.filter(ev => isThisWeek(ev.start));
      case 'Next Week':
        return uiEvents.filter(ev => isNextWeek(ev.start));
      case 'Next Month':
        return uiEvents.filter(ev => isNextMonth(ev.start));
      case 'Later':
        return uiEvents.filter(ev => isLater(ev.start));
      case 'Done':
        return uiEvents.filter(ev => isDone(ev.start, ev.end));
      default:
        return uiEvents;
    }
  }, [activeFilter, uiEvents]);


  const grouped = useMemo(() => {
    const list = (activeFilter === 'Done')
      ? filteredUi
      : filteredUi.filter(ev => !isDone(ev.start, ev.end));
    return list.reduce((acc, ev) => {
      const b = bucketLabel(ev.start);
      acc[b] = acc[b] || [];
      acc[b].push(ev);
      return acc;
    }, {});
  }, [filteredUi, activeFilter]);

  const total = filteredUi.length;
  const orderedLabels = ["This Week", "Next Week", "Next Month", "Later"];

  const openDetails = (ev) => {
    navigate(`/event/${ev.id}`);
  };

  return (
    <div className="museo-page">
      <div className="museo-feed">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 className="museo-heading">Upcoming Events</h1>
          {!loading && (
            <p style={{ 
              color: 'var(--museo-navy)', 
              fontSize: '16px',
              marginTop: '-24px',
              marginBottom: '0'
            }}>
              {`${total} saved events`}
            </p>
          )}
        </div>

        {/* Loading State */}
        <MuseoLoadingBox 
          show={loading} 
          message={MuseoLoadingBox.messages.events} 
        />

        {/* Filter Chips */}
        {!loading && (
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '12px', 
          marginBottom: '48px',
          justifyContent: 'center',
          padding: '0 20px'
        }}>
          {['All', 'This Week', 'Next Week', 'Next Month', 'Later', 'Done'].map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`btn-filter ${activeFilter === filter ? 'active' : ''}`}
            >
              {filter}
            </button>
          ))}
        </div>
        )}

        {/* Empty State */}
        {Object.keys(grouped).length === 0 && !loading && (
          <MuseoEmptyState 
            title={activeFilter === 'All' ? "No upcoming events found" : `No events found for "${activeFilter}"`}
            subtitle={activeFilter === 'All' 
              ? "Check back soon or browse all events to find something interesting."
              : `Try selecting a different time period or browse all events.`
            }
          />
        )}

        {/* Event Buckets */}
        {!loading && activeFilter === 'Done' && filteredUi.length > 0
          ? (
            <div>
              <h2 style={{ 
                color: 'var(--museo-charcoal)', 
                fontSize: '1.8rem', 
                marginBottom: '32px',
                textAlign: 'center',
                fontWeight: '700',
                letterSpacing: '-0.01em'
              }}>
                Completed Events
              </h2>
              <div style={{
                width: '60px',
                height: '3px',
                background: 'linear-gradient(90deg, var(--museo-gold) 0%, var(--museo-gold-dark) 100%)',
                margin: '-24px auto 32px',
                borderRadius: '2px'
              }} />
              <div className="museo-grid museo-grid--3">
                {filteredUi.map((ev, i) => (
                  <div
                    key={ev.id}
                    className="museo-event-card"
                    style={{ animationDelay: `${i * 0.02}s` }}
                    onClick={() => openDetails(ev)}
                  >
                    <img className="museo-event-image" src={ev.cover} alt={ev.title} />
                    
                    {/* Event status indicator */}
                    <div className="event-status event-status--ended">
                      Completed
                    </div>

                    {/* Attendance badge - hide for completed events */}
                    
                    <div className="museo-event-content">
                      <h3 className="museo-title">{ev.title}</h3>
                      
                      {/* Event metadata */}
                      <div className="event-metadata">
                        <div className="event-metadata-item">
                          <span>📅</span>
                          <span>{new Date(ev.start).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: new Date(ev.start).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                          })}</span>
                        </div>
                        {ev.venue && (
                          <div className="event-metadata-item">
                            <span>📍</span>
                            <span>{ev.venue}</span>
                          </div>
                        )}
                      </div>

                      <p className="museo-desc">
                        {(() => {
                          const text = typeof ev.desc === 'string' ? ev.desc : '';
                          const limit = 85;
                          if (text.length <= limit) return text;
                          const clipped = text.slice(0, limit);
                          const trimmed = clipped.replace(/\s+\S*$/, "");
                          return trimmed + "...";
                        })()}
                      </p>
                      
                      <div 
                        className="museo-actions" 
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '6px',
                          marginTop: 'auto',
                          paddingTop: '12px',
                          opacity: 0,
                          transform: 'translateY(8px)',
                          pointerEvents: 'none',
                          transition: 'opacity 300ms ease, transform 300ms ease',
                          alignSelf: 'stretch'
                        }}
                      >
                        <button className="btn btn-primary btn-sm" onClick={() => openDetails(ev)}>
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
          : (
            orderedLabels
              .filter(label => Array.isArray(grouped[label]) && grouped[label].length > 0)
              .map(label => (
                <div key={label} style={{ marginBottom: '64px' }}>
                  <h2 style={{ 
                    color: 'var(--museo-charcoal)', 
                    fontSize: '1.8rem', 
                    marginBottom: '32px',
                    textAlign: 'center',
                    fontWeight: '700',
                    letterSpacing: '-0.01em'
                  }}>
                    {label}
                  </h2>
                  <div style={{
                    width: '60px',
                    height: '3px',
                    background: 'linear-gradient(90deg, var(--museo-gold) 0%, var(--museo-gold-dark) 100%)',
                    margin: '-24px auto 32px',
                    borderRadius: '2px'
                  }} />
                  <div className="museo-grid museo-grid--3">
                    {grouped[label].map((ev, i) => (
                      <div
                        key={ev.id}
                        className="museo-event-card"
                        style={{ animationDelay: `${i * 0.02}s` }}
                        onClick={() => openDetails(ev)}
                      >
                        <img className="museo-event-image" src={ev.cover} alt={ev.title} />
                        
                        {/* Event status indicator */}
                        <div className={`event-status ${
                          (() => {
                            const now = new Date();
                            const startDate = new Date(ev.start);
                            const endDate = new Date(ev.end);
                            
                            if (now < startDate) return 'event-status--upcoming';
                            if (now >= startDate && now <= endDate) return 'event-status--happening';
                            return 'event-status--ended';
                          })()
                        }`}>
                          {(() => {
                            const now = new Date();
                            const startDate = new Date(ev.start);
                            const endDate = new Date(ev.end);
                            
                            if (now < startDate) return 'Upcoming';
                            if (now >= startDate && now <= endDate) return 'Live';
                            return 'Ended';
                          })()}
                        </div>

                        {/* Saved badge */}
                        <div className="event-attendance-badge">
                          Saved
                        </div>

                        <div className="museo-event-content">
                          <h3 className="museo-title">{ev.title}</h3>
                          
                          {/* Event metadata */}
                          <div className="event-metadata">
                            <div className={`event-metadata-item ${
                              new Date(ev.start).toDateString() === new Date().toDateString() ? 'urgent' : ''
                            }`}>
                              <span>📅</span>
                              <span>{new Date(ev.start).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: new Date(ev.start).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                              })}</span>
                            </div>
                            {ev.venue && (
                              <div className="event-metadata-item">
                                <span>📍</span>
                                <span>{ev.venue}</span>
                              </div>
                            )}
                            <div className="event-metadata-item">
                              <span>🕐</span>
                              <span>{new Date(ev.start).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}</span>
                            </div>
                          </div>

                          <p className="museo-desc">
                            {(() => {
                              const text = typeof ev.desc === 'string' ? ev.desc : '';
                              const limit = 85;
                              if (text.length <= limit) return text;
                              const clipped = text.slice(0, limit);
                              const trimmed = clipped.replace(/\s+\S*$/, "");
                              return trimmed + "...";
                            })()}
                          </p>
                          
                          <div 
                            className="museo-actions" 
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '6px',
                              marginTop: 'auto',
                              paddingTop: '12px',
                              opacity: 0,
                              transform: 'translateY(8px)',
                              pointerEvents: 'none',
                              transition: 'opacity 300ms ease, transform 300ms ease',
                              alignSelf: 'stretch'
                            }}
                          >
                            <button className="btn btn-primary btn-sm" onClick={() => openDetails(ev)}>
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
          )}
      </div>
    </div>
  );
}
