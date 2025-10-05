import "./Sidepanel.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";


export default function SidePanel2() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let abort = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("http://localhost:3000/api/event/getEvents", {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);
        const data = await res.json();
        if (abort) return;
        const list = Array.isArray(data?.data) ? data.data : [];
        const now = Date.now();
        const upcoming = list
          .filter((e) => {
            const end = new Date(e.endsAt || e.startsAt).getTime();
            return Number.isFinite(end) ? end >= now : false;
          })
          .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
          .slice(0, 3);
        setEvents(upcoming);
      } catch (e) {
        if (!abort) setError(e.message || "Failed to load events");
      } finally {
        if (!abort) setLoading(false);
      }
    };
    run();
    return () => {
      abort = true;
    };
  }, []);

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

        {loading && (
          <div className="event"><div className="event__body"><div className="event__title">Loading…</div></div></div>
        )}
        {error && !loading && (
          <div className="event"><div className="event__body"><div className="event__title">{error}</div></div></div>
        )}
        {!loading && !error && events.length === 0 && (
          <div className="event"><div className="event__body"><div className="event__title">No upcoming events</div></div></div>
        )}
        {!loading && !error && events.map((ev, idx) => (
          <div
            key={ev.eventId || ev.id}
            className="event"
            onClick={() => navigate('/Event', { state: { open: ev.eventId || ev.id } })}
            style={{
              cursor: 'pointer',
              padding: '10px 12px',
              borderRadius: 12,
              background: 'var(--card-bg, #fff)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: idx === 0 ? 8 : 10
            }}
            title={`${ev.title} — ${fmtMonth(ev.startsAt)} ${fmtDay(ev.startsAt)}, ${fmtTime(ev.startsAt)} - ${fmtTime(ev.endsAt || ev.startsAt)}`}
          >
            <div className="event__date" style={{ textAlign: 'center', minWidth: 56 }}>
              <div className="event__month" style={{ fontWeight: 700 }}>{fmtMonth(ev.startsAt).slice(0,3)}</div>
              <div className="event__day" style={{ fontSize: 18 }}>{fmtDay(ev.startsAt)}</div>
            </div>
            <div className="event__body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div className="event__title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</div>
                <div className="event__time" style={{ fontSize: 12, opacity: 0.75 }}>{fmtTime(ev.startsAt)} - {fmtTime(ev.endsAt || ev.startsAt)}</div>
              </div>
              <div aria-hidden style={{ opacity: 0.6 }}>›</div>
            </div>
          </div>
        ))}
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
