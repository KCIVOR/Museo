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
      <div className="museo-card" style={{ padding: 16 }}>
        <div className="museo-card__title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
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
      <div className="museo-card" style={{ padding: 16 }}>
        <div className="museo-card__title" style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <span className="museo-title-text" style={{ textAlign: 'center' }}>TOP ARTS OF THE WEEK</span>
        </div>

        {loadingTopArts && (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--museo-text-muted)' }}>
            Loading top arts...
          </div>
        )}

        {!loadingTopArts && topArts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--museo-text-muted)' }}>
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
                className="museo-card"
                style={{
                  padding: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: '8px',
                  position: 'relative'
                }}
                onClick={() => navigate('/gallery')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                {/* Rank badge */}
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
                  color: 'white',
                  borderRadius: '12px',
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: '700',
                  zIndex: 2,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  Top {index + 1}
                </div>
                
                {/* Image */}
                <div style={{
                  width: '100%',
                  aspectRatio: '16/10',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  marginBottom: '8px'
                }}>
                  <img
                    src={imageUrl}
                    alt={artwork.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      e.target.src = 'https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/profilePicture.png';
                    }}
                  />
                </div>
                
                {/* Title */}
                <div style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--museo-text-primary)',
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontFamily: 'var(--museo-font-body)'
                }}>
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
