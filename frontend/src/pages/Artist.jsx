import { Link } from "react-router-dom";
import "./css/artist.css";
import { useEffect, useState } from "react";

export default function Artist() {
  const [artists, setArtists] = useState([]);          // fetched list
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState(null);

  const normalize = (row) => {
    // Map server fields to UI fields; adjust keys to match your API
    return {
      id: row.id || row.slug || row.artistId || String(row.name || "unknown").toLowerCase().replace(/\s+/g, "-"),
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
      const res = await fetch("http://localhost:3000/api/artist/getArtist", {
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
        {/* Loading / error states */}
        {loading && (
          <div className="artistGridMessage">Loading artists…</div>
        )}
        {errMsg && !loading && (
          <div className="artistGridMessage">
            {errMsg}
            <button className="artistRetryBtn" onClick={fetchArtist}>Retry</button>
          </div>
        )}

        {!loading && !errMsg && (
          <div className="artistGrid">
            {artists.map((a) => (
              <div key={a.id} className="artistCard">
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
              <div className="artistGridMessage">No artists found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}