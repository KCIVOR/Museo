import "./Sidepanel.css";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";


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
        const res = await fetch("http://localhost:3000/api/event/myEvents", {
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
      <div className="card" style={{ padding: 12 }}>
        <div className="card__title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span>Upcoming Events</span>
          <button className="eBtn" onClick={() => navigate('/upcomingevents')} style={{ margin: 0 }}>View all</button>
        </div>

        <ul className="spEvList">
          {loading && (
            <li className="spEvItem is-loading"><span>Loading…</span></li>
          )}
          {error && !loading && (
            <li className="spEvItem is-error"><span>{error}</span></li>
          )}
          {!loading && !error && events.length === 0 && (
            <li className="spEvItem is-empty"><span>No upcoming events</span></li>
          )}

          {!loading && !error && events.map((ev) => (
            <li
              key={ev.eventId || ev.id}
              className="spEvItem"
              onClick={() => navigate('/Event', { state: { open: ev.eventId || ev.id } })}
              title={`${ev.title} — ${fmtMonth(ev.startsAt)} ${fmtDay(ev.startsAt)}, ${fmtTime(ev.startsAt)} - ${fmtTime(ev.endsAt || ev.startsAt)}`}
            >
              <div className="spEvDate">
                <div className="spEvMonth">{fmtMonth(ev.startsAt).slice(0,3)}</div>
                <div className="spEvDay">{fmtDay(ev.startsAt)}</div>
              </div>
              <div className="spEvBody">
                <div className="spEvTitle" title={ev.title}>{ev.title}</div>
                <div className="spEvMeta">{fmtTime(ev.startsAt)} – {fmtTime(ev.endsAt || ev.startsAt)}</div>
              </div>
              <div className="spEvChevron" aria-hidden>›</div>
            </li>
          ))}
        </ul>
      </div>

      <div
        className="card"
        style={{ cursor: "pointer" }}
      >
        <div className="card__title">Top Arts Of The Week</div>
      </div>
      <div className="card">
        <img className="card__image" src="https://picsum.photos/seed/art1/600/240" alt="" />
        <div className="card__caption">“Lovers” by Aria Bennett</div>
      </div>

      <div className="card">
        <img className="card__image" src="https://picsum.photos/seed/art2/600/240" alt="" />
        <div className="card__caption">“Green Forest” by Gustavo Fring</div>
      </div>
    </aside>
  );
}
