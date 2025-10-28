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
  const [topArts, setTopArts] = useState([]);
  const [loadingTopArts, setLoadingTopArts] = useState(false);
  const [topArtsError, setTopArtsError] = useState(null);
  const abortRef = useRef(null);
  const lastFetchRef = useRef(0);

  const fetchTopArts = async () => {
    try {
      setLoadingTopArts(true);
      setTopArtsError(null);
      
      console.log('Fetching top arts from:', `${API}/gallery/top-arts-weekly`);
      
      // Fetch top arts data
      const topArtsRes = await fetch(`${API}/gallery/top-arts-weekly`, {
        credentials: 'include'
      });
      
      if (!topArtsRes.ok) {
        throw new Error(`Failed to fetch top arts: ${topArtsRes.status}`);
      }
      
      const topArtsData = await topArtsRes.json();
      console.log('Top arts data received:', topArtsData);
      
      // Check if topArts exists and has data
      if (!topArtsData.topArts || !Array.isArray(topArtsData.topArts) || topArtsData.topArts.length === 0) {
        console.log('No top arts data available');
        setTopArts([]);
        return;
      }
      

      const queryParams = new URLSearchParams();
      queryParams.append('page', '1');
      queryParams.append('limit', '100'); // Get more artworks to ensure we find matches
      
      console.log('Fetching artworks from:', `${API}/gallery/artworks?${queryParams}`);
      const artworksRes = await fetch(`${API}/gallery/artworks?${queryParams}`, {
        method: "GET",
        credentials: 'include'
      });
      
      if (!artworksRes.ok) {
        throw new Error(`Failed to fetch artworks: ${artworksRes.status}`);
      }
      
      const artworksData = await artworksRes.json();
      console.log('Artworks response structure:', artworksData);
      
      // Use Gallery's response structure
      const allArtworks = (artworksData.success && artworksData.artworks) 
        ? artworksData.artworks 
        : (Array.isArray(artworksData) ? artworksData : []);
      console.log('All artworks count:', allArtworks.length);
      console.log('Sample artwork IDs:', allArtworks.slice(0, 3).map(art => art.id));
      
      // If we have no artworks, try to use the top arts data directly
      if (allArtworks.length === 0) {
        console.log('No artworks found, using top arts data directly');
        // Create minimal artwork objects from top arts data
        const directTopArts = topArtsData.topArts.map(topArt => ({
          id: topArt.galleryArtId,
          title: `Top Art #${topArt.rank_position}`,
          image: 'https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/profilePicture.png',
          rank_position: topArt.rank_position,
          total_score: topArt.total_score,
          views_count: topArt.views_count,
          likes_count: topArt.likes_count,
          comments_count: topArt.comments_count
        })).slice(0, 6);
        
        setTopArts(directTopArts);
        return;
      }
      
      // Map the top arts data to include artwork details
      const topArtsWithDetails = topArtsData.topArts.map(topArt => {
        const artwork = allArtworks.find(art => art.id === topArt.galleryArtId);
        if (artwork) {
          return {
            ...artwork,
            rank_position: topArt.rank_position,
            total_score: topArt.total_score,
            views_count: topArt.views_count,
            likes_count: topArt.likes_count,
            comments_count: topArt.comments_count
          };
        }
        console.log('Artwork not found for galleryArtId:', topArt.galleryArtId);
        return null;
      }).filter(Boolean);
      
      console.log('Top arts with details:', topArtsWithDetails);
      
      // Sort by rank position and take top 6
      const sortedTopArts = topArtsWithDetails
        .sort((a, b) => a.rank_position - b.rank_position)
        .slice(0, 6);
      
      console.log('Final sorted top arts:', sortedTopArts);
      
      setTopArts(sortedTopArts);
    } catch (e) {
      console.error('Error fetching top arts:', e);
      setTopArtsError(e.message || "Failed to load top arts");
    } finally {
      setLoadingTopArts(false);
    }
  };

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

  // Fetch top arts only once when component mounts
  useEffect(() => {
    fetchTopArts();
  }, []); // Empty dependency array - only run once on mount

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

        {topArtsError && !loadingTopArts && (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--museo-error)' }}>
            {topArtsError}
          </div>
        )}

        {!loadingTopArts && !topArtsError && topArts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--museo-text-muted)' }}>
            No top arts this week
          </div>
        )}
      </div>

      {/* Individual Artwork Cards */}
      {!loadingTopArts && !topArtsError && topArts.length > 0 && (
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
