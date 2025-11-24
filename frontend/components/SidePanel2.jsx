import "./Sidepanel.css";
import { useNavigate } from "react-router-dom";

export default function SidePanel2({ 
  role, 
  topArts = [], 
  events = [], 
  loadingTopArts = false,
  loadingEvents = false
}) {
  const navigate = useNavigate();
  
  // All data now comes from props (fetched in Layout.jsx)
  // No need to fetch here anymore!

  const fmtMonth = (dt) => new Date(dt).toLocaleString(undefined, { month: "long" });
  const fmtDay = (dt) => new Date(dt).toLocaleString(undefined, { day: "numeric" });
  const fmtTime = (dt) => new Date(dt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <aside className="side side--right" aria-label="Right rail widgets">
      <div className="museo-card">
        <div className="museo-card__title">
          <span className="museo-title-text">UPCOMING EVENTS</span>
          <span className="museo-view-all" onClick={() => navigate('/upcomingevents')}>VIEW ALL</span>
        </div>

        <ul className="museo-event-list">
          {loadingEvents && (
            <li className="museo-event-item museo-event-item--loading"><span>Loading…</span></li>
          )}
          {!loadingEvents && events.length === 0 && (
            <li className="museo-event-item museo-event-item--empty"><span>No upcoming events</span></li>
          )}

          {!loadingEvents && events.map((ev) => (
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

      {/* Header Card */}
      <div className="museo-card">
        <div className="museo-card__title">
          <span className="museo-title-text">TOP ARTS OF THE WEEK</span>
        </div>

        {loadingTopArts && (
          <div className="museo-loading-state">
            Loading top arts...
          </div>
        )}

        {!loadingTopArts && topArts.length === 0 && (
          <div className="museo-empty-state">
            No top arts this week
          </div>
        )}
      </div>

      {/* Individual Artwork Cards */}
      {!loadingTopArts && topArts.length > 0 && (
        <>
          {topArts.map((artwork, index) => {
            const imageUrl = Array.isArray(artwork.image) ? artwork.image[0] : artwork.image;
            return (
              <div
                key={artwork.id}
                className="museo-card museo-artwork-card"
                onClick={() => navigate(`/Gallery/${artwork.id}`)}
              >
                {/* Rank badge - themed */}
                <div className="museo-badge museo-badge--primary museo-badge--sm museo-badge--corner">
                  Top {index + 1}
                </div>
                
                {/* Image */}
                <div className="museo-artwork-image">
                  <img
                    src={imageUrl}
                    alt={artwork.title}
                    onError={(e) => {
                      e.target.src = 'https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/profilePicture.png';
                    }}
                  />
                </div>
                
                {/* Title */}
                <div className="museo-artwork-title">
                  {artwork.title}
                </div>
              </div>
            );
          })}
        </>
      )}
      
    </aside>
  );
}
