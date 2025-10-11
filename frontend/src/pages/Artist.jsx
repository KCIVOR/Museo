import { Link } from "react-router-dom";
import "./css/artist.css";
import { useEffect, useState } from "react";
import MuseoLoadingBox from "../components/MuseoLoadingBox.jsx";
const API = import.meta.env.VITE_API_BASE;

export default function Artist() {
  const [artists, setArtists] = useState([]);          // fetched list
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState(null);

  const normalize = (row) => {
    // Map server fields to UI fields; adjust keys to match your API
    return {
      // Prefer username for public URL
      id: row.username || row.id || row.slug || row.artistId || String(row.name || "unknown").toLowerCase().replace(/\s+/g, "-"),
      name: row.name || row.displayName || "Untitled Artist",
      hero:
        row.hero ||
        row.avatar ||
        row.image ||
        row.coverUrl ||
        "/assets/artist-placeholder.jpg", // local fallback
    };
  };

  const fetchArtist = async () => {
    try {
      setLoading(true);
      setErrMsg(null);
      const res = await fetch(`${API}/artist/getArtist`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to fetch (${res.status})`);
      }
      const data = await res.json();
      const list = Array.isArray(data.artists) ? data.artists.map(normalize) : [];
      setArtists(list);
    } catch (error) {
      console.error("Error fetching artists:", error);
      setErrMsg(error.message || "Failed to load artists");
      setArtists([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtist();
  }, []);

  return (
    <div className="artistPage">
      <div className="artistFeed">
        {/* Gallery Header */}
        <h1>Artists</h1>
        
        {/* Loading / error states */}
        <MuseoLoadingBox 
          show={loading} 
          message={MuseoLoadingBox.messages.artists} 
        />
        {errMsg && !loading && (
          <div className="artistGridMessage">
            Unable to load artist gallery
            <br />
            <small style={{ opacity: 0.7, fontSize: '14px' }}>{errMsg}</small>
            <br />
            <button className="artistRetryBtn" onClick={fetchArtist}>Retry</button>
          </div>
        )}

        {!loading && !errMsg && (
          <div className="artistGrid">
            {artists.map((a, i) => (
              <div
                key={a.id}
                className="artistCard"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <Link
                  to={`/artist/${a.id}`}
                  className="artistCard__link"
                  style={{ display: "block", textDecoration: "none", color: "inherit" }}
                >
                  <img
                    src={a.hero}
                    alt={a.name}
                    className="artistAvatar"
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.currentTarget.src = "/assets/artist-placeholder.jpg"; }}
                  />
                  <div className="artistName">{a.name}</div>
                </Link>
              </div>
            ))}
            {artists.length === 0 && (
              <div className="artistGridMessage">
                No artists in our gallery yet.
                <br />
                <small style={{ opacity: 0.7, fontSize: '14px', marginTop: '8px', display: 'block' }}>
                  Check back soon for featured artists and their collections.
                </small>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}