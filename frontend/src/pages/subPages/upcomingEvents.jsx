import React from "react";
import "./css/upcomingEvents.css";
import "../css/events.css"; // for eActions/eBtn/eBtnGhost to match Event.jsx
import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";


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
      const res = await fetch("http://localhost:3000/api/event/myEvents", {
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
    return diff > 14; // matches bucketLabel "Later"
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
    navigate('/Event', { state: { open: ev.id } });
  };

  return (
    <div className="uePage">
      <div className="ueFeed">
        {/* Header */}
        <div className="ueHead">
          <div className="ueTitle">
            <h1>Upcoming Events</h1>
            <span className="ueCount">{loading ? 'Loading…' : `${total} saved`}</span>
          </div>
          <div className="ueActions">
            <div className="ueFilters">
              <button className={`ueChip ${activeFilter === 'All' ? 'is-active' : ''}`} onClick={() => setActiveFilter('All')}>All</button>
              <button className={`ueChip ${activeFilter === 'This Week' ? 'is-active' : ''}`} onClick={() => setActiveFilter('This Week')}>This Week</button>
              <button className={`ueChip ${activeFilter === 'Next Week' ? 'is-active' : ''}`} onClick={() => setActiveFilter('Next Week')}>Next Week</button>
              <button className={`ueChip ${activeFilter === 'Next Month' ? 'is-active' : ''}`} onClick={() => setActiveFilter('Next Month')}>Next Month</button>
              <button className={`ueChip ${activeFilter === 'Later' ? 'is-active' : ''}`} onClick={() => setActiveFilter('Later')}>Later</button>
              <button className={`ueChip ${activeFilter === 'Done' ? 'is-active' : ''}`} onClick={() => setActiveFilter('Done')}>Done</button>
            </div>
          </div>
        </div>

        {/* Buckets */}
        {Object.keys(grouped).length === 0 && !loading && (
          <section className="ueBucket"><h2 className="ueBucketTitle">No upcoming events</h2></section>
        )}
        {activeFilter === 'Done'
          ? (
            <section className="ueBucket">
              <div className="ueGrid">
                {filteredUi.map((ev, i) => (
                  <article
                    key={ev.id}
                    className="ueCard eCard eReveal"
                    style={{ animationDelay: `${i * 60}ms` }}
                    onClick={() => openDetails(ev)}
                  >
                    <div className="ueImgWrap">
                      <img src={ev.cover} alt="" />
                      <span className="ueTag">Done</span>
                    </div>

                    <div className="ueBody">
                      <div className="ueName" title={ev.title}>{ev.title}</div>
                      <div className="ueMeta">
                        <span className="ueDate">{fmtRange(ev.start, ev.end)}</span>
                        <span className="ueDot">•</span>
                        <span className="ueVenue">{ev.venue}</span>
                      </div>
                      <p className="ueDesc">{ev.desc}</p>

                      <div className="ueGrow" />

                      <div className="eActions" onClick={(e) => e.stopPropagation()}>
                        <NavLink className="eBtn" style={{ textDecoration: 'none' }} to="/Event" state={{ open: ev.id }}>
                          View More
                        </NavLink>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )
          : (
            orderedLabels
              .filter(label => Array.isArray(grouped[label]) && grouped[label].length > 0)
              .map(label => (
                <section key={label} className="ueBucket">
                  <h2 className="ueBucketTitle">{label}</h2>
                  <div className="ueGrid">
                    {grouped[label].map((ev, i) => (
                      <article
                        key={ev.id}
                        className="ueCard eCard eReveal"
                        style={{ animationDelay: `${i * 60}ms` }}
                        onClick={() => openDetails(ev)}
                      >
                        <div className="ueImgWrap">
                          <img src={ev.cover} alt="" />
                          <span className="ueTag">Added</span>
                        </div>

                        <div className="ueBody">
                          <div className="ueName" title={ev.title}>{ev.title}</div>
                          <div className="ueMeta">
                            <span className="ueDate">{fmtRange(ev.start, ev.end)}</span>
                            <span className="ueDot">•</span>
                            <span className="ueVenue">{ev.venue}</span>
                          </div>
                          <p className="ueDesc">{ev.desc}</p>

                          {/* spacer to push buttons down */}
                          <div className="ueGrow" />

                          <div className="eActions" onClick={(e) => e.stopPropagation()}>
                            <NavLink className="eBtn" style={{ textDecoration: 'none' }} to="/Event" state={{ open: ev.id }}>
                              View More
                            </NavLink>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))
          )}
      </div>
    </div>
  );
}
