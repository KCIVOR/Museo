import "./Sidepanel.css";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
const API = import.meta.env.VITE_API_BASE;


export default function SidePanel2() {
  const navigate = useNavigate();
  const location = useLocation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const lastFetchRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    const fetchEvents = async (force = false) => {
      // simple throttle (avoid spamming if events fire together)
      const now = Date.now();
      if (!force && now - lastFetchRef.current < 2500) return;
      lastFetchRef.current = now;

      try {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setLoading(true);
        setError(null);
        const res = await fetch(`${API}/event/myEvents`, {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        // API returns { events: [...] } for the user's participating events
        const list = Array.isArray(data?.events) ? data.events : [];
        const nowTs = Date.now();
        const upcoming = list
          .filter((e) => {
            const end = new Date(e.endsAt || e.startsAt).getTime();
            return Number.isFinite(end) ? end >= nowTs : false;
          })
          .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
          .slice(0, 3);
        setEvents(upcoming);
      } catch (e) {
        if (!mounted) return;
        if (e?.name !== 'AbortError') setError(e.message || "Failed to load events");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // initial fetch
    fetchEvents(true);

    // refetch when window regains focus or tab becomes visible
    const onFocus = () => fetchEvents();
    const onVisibility = () => { if (!document.hidden) fetchEvents(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      mounted = false;
      abortRef.current?.abort();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [location.pathname]);

  const fmtMonth = (dt) => new Date(dt).toLocaleString(undefined, { month: "long" });
  const fmtDay = (dt) => new Date(dt).toLocaleString(undefined, { day: "numeric" });
  const fmtTime = (dt) => new Date(dt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <aside className="side side--right" aria-label="Right rail widgets">
      <div className="museo-card" style={{ padding: 16 }}>
        <div className="museo-card__title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span className="museo-title-text">UPCOMING EVENTS</span>
          <span className="museo-view-all" onClick={() => navigate('/upcomingevents')}>VIEW ALL</span>
        </div>

        <ul className="museo-event-list">
          {loading && (
            <li className="museo-event-item museo-event-item--loading"><span>Loading…</span></li>
          )}
          {error && !loading && (
            <li className="museo-event-item museo-event-item--error"><span>{error}</span></li>
          )}
          {!loading && !error && events.length === 0 && (
            <li className="museo-event-item museo-event-item--empty"><span>No upcoming events</span></li>
          )}

          {!loading && !error && events.map((ev) => (
            <li
              key={ev.eventId || ev.id}
              className="museo-event-item"
              onClick={() => navigate(`/event/${ev.eventId || ev.id}`)}
              title={`${ev.title} — ${fmtMonth(ev.startsAt)} ${fmtDay(ev.startsAt)}, ${fmtTime(ev.startsAt)} - ${fmtTime(ev.endsAt || ev.startsAt)}`}
            >
              <div className="museo-event-date">
                <div className="museo-event-month">{fmtMonth(ev.startsAt).slice(0,3)}</div>
                <div className="museo-event-day">{fmtDay(ev.startsAt)}</div>
              </div>
              <div className="museo-event-body">
                <div className="museo-event-title" title={ev.title}>{ev.title}</div>
                <div className="museo-event-meta">{fmtTime(ev.startsAt)} – {fmtTime(ev.endsAt || ev.startsAt)}</div>
              </div>
              <div className="museo-event-chevron" aria-hidden>›</div>
            </li>
          ))}
        </ul>
      </div>

      <div
        className="museo-card museo-card--clickable"
        role="button"
        tabIndex={0}
        onClick={() => navigate('/toparts')}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/toparts')}
        aria-label="View Top Arts Of The Week"
        title="View Top Arts Of The Week"
      >
        <div className="museo-card__title museo-card__title--center">
          <span className="museo-title-text">TOP ARTS OF THE WEEK</span>
        </div>
      </div>
      
    </aside>
  );
}
