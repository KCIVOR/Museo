import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import MuseoLoadingBox from "../components/MuseoLoadingBox.jsx";
import MuseoEmptyState from "../components/MuseoEmptyState.jsx";
import "./css/artist.css";
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
    <div className="museo-page">
      <div className="museo-feed">
        {/* Gallery Header */}
        <div className="artist__header">
          <h1 className="museo-heading">Artists</h1>
        </div>
        
        {/* Loading / error states */}
        <MuseoLoadingBox 
          show={loading} 
          message={MuseoLoadingBox.messages.artists} 
        />
        {errMsg && !loading && (
          <div className="museo-message">
            Unable to load artist gallery
            <br />
            <small className="artist__error-detail">{errMsg}</small>
            <br />
            <button className="museo-retry-btn" onClick={fetchArtist}>Retry</button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !errMsg && artists.length === 0 && (
          <MuseoEmptyState {...MuseoEmptyState.presets.artists} />
        )}

        {/* Artists Grid */}
        {!loading && !errMsg && artists.length > 0 && (
          <div className="museo-grid museo-grid--3">
            {artists.map((a, i) => (
              <div
                key={a.id}
                className="museo-card museo-card--artist artist__card"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <NavLink
                  to={`/artist/${a.id}`}
                  className="artist__card-link"
                >
                  <img
                    className="museo-avatar"
                    src={a.hero}
                    alt={a.name}
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.currentTarget.src = "/assets/artist-placeholder.jpg"; }}
                  />
                  <h3 className="museo-title museo-title--artist">{a.name}</h3>
                </NavLink>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

