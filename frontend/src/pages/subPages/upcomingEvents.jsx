import React from "react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { 
  MuseoPage, 
  MuseoFeed, 
  MuseoHeading, 
  MuseoGrid, 
  MuseoCard, 
  MuseoMedia, 
  MuseoBody, 
  MuseoTitle, 
  MuseoDesc, 
  MuseoBadge, 
  MuseoActions, 
  MuseoBtn,
  MuseoMessage 
} from '../../components/MuseoGalleryContainer.jsx';
import MuseoLoadingBox from '../../components/MuseoLoadingBox.jsx';
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
  if (diffDays <= 7) return "This Week";
  if (diffDays <= 14) return "Next Week";
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
    return y === nextMonthYM.y && m === nextMonthYM.m;
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
  const orderedLabels = ["This Week", "Next Week", "Later"];

  const openDetails = (ev) => {
    navigate(`/event/${ev.id}`);
  };

  return (
    <MuseoPage>
      <MuseoFeed>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <MuseoHeading>Upcoming Events</MuseoHeading>
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
              style={{
                padding: '10px 20px',
                borderRadius: '25px',
                border: `2px solid ${activeFilter === filter ? 'var(--museo-gold)' : 'var(--museo-border)'}`,
                background: activeFilter === filter ? 'var(--museo-gold)' : 'var(--museo-ivory)',
                color: activeFilter === filter ? 'white' : 'var(--museo-charcoal)',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                minWidth: '80px',
                whiteSpace: 'nowrap'
              }}
            >
              {filter}
            </button>
          ))}
        </div>
        )}

        {/* Empty State */}
        {Object.keys(grouped).length === 0 && !loading && (
          <MuseoMessage>
            No upcoming events found.
            <br />
            <small style={{ opacity: 0.7, fontSize: '14px', marginTop: '8px', display: 'block' }}>
              Check back soon or browse all events to find something interesting.
            </small>
          </MuseoMessage>
        )}

        {/* Event Buckets */}
        {!loading && activeFilter === 'Done'
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
              <MuseoGrid columns={3}>
                {filteredUi.map((ev, i) => (
                  <MuseoCard
                    key={ev.id}
                    variant="event"
                    animationDelay={i * 80}
                    onClick={() => openDetails(ev)}
                  >
                    <MuseoMedia src={ev.cover} alt={ev.title} />
                    <MuseoBadge style={{ background: 'var(--museo-sage)', borderColor: 'var(--museo-sage)' }}>
                      Completed
                    </MuseoBadge>
                    <MuseoBody>
                      <MuseoTitle>{ev.title}</MuseoTitle>
                      <div style={{ 
                        fontSize: '13px', 
                        color: 'var(--museo-navy)', 
                        marginBottom: '8px',
                        fontWeight: '500',
                        lineHeight: '1.3'
                      }}>
                        <div style={{ marginBottom: '2px' }}>
                          📅 {fmtRange(ev.start, ev.end)}
                        </div>
                        {ev.venue && (
                          <div style={{ color: 'var(--museo-charcoal)', opacity: 0.8 }}>
                            📍 {ev.venue}
                          </div>
                        )}
                      </div>
                      <MuseoDesc>
                        {ev.desc}
                      </MuseoDesc>
                      <MuseoActions onClick={(e) => e.stopPropagation()}>
                        <MuseoBtn onClick={() => openDetails(ev)}>
                          View Details
                        </MuseoBtn>
                      </MuseoActions>
                    </MuseoBody>
                  </MuseoCard>
                ))}
              </MuseoGrid>
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
                  <MuseoGrid columns={3}>
                    {grouped[label].map((ev, i) => (
                      <MuseoCard
                        key={ev.id}
                        variant="event"
                        animationDelay={i * 80}
                        onClick={() => openDetails(ev)}
                      >
                        <MuseoMedia src={ev.cover} alt={ev.title} />
                        <MuseoBadge>
                          Saved
                        </MuseoBadge>
                        <MuseoBody>
                          <MuseoTitle>{ev.title}</MuseoTitle>
                          <div style={{ 
                            fontSize: '13px', 
                            color: 'var(--museo-navy)', 
                            marginBottom: '8px',
                            fontWeight: '500',
                            lineHeight: '1.3'
                          }}>
                            <div style={{ marginBottom: '2px' }}>
                              📅 {fmtRange(ev.start, ev.end)}
                            </div>
                            {ev.venue && (
                              <div style={{ color: 'var(--museo-charcoal)', opacity: 0.8 }}>
                                📍 {ev.venue}
                              </div>
                            )}
                          </div>
                          <MuseoDesc>
                            {ev.desc}
                          </MuseoDesc>
                          <MuseoActions onClick={(e) => e.stopPropagation()}>
                            <MuseoBtn onClick={() => openDetails(ev)}>
                              View Details
                            </MuseoBtn>
                          </MuseoActions>
                        </MuseoBody>
                      </MuseoCard>
                    ))}
                  </MuseoGrid>
                </div>
              ))
          )}
      </MuseoFeed>
    </MuseoPage>
  );
}
