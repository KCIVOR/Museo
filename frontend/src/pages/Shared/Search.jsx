// src/pages/Search.jsx
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ProductDetailModal from "../Marketplace/ProductDetailModal";
import ArtworkModal from "../Gallery/ArtworkModal";
import EventModal from "../Events/EventModal";
import "./css/search.css";

const API = import.meta.env.VITE_API_BASE;

export default function Search() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(() => params.get("q") || "");
  const [tab, setTab] = useState(() => params.get("tab") || "all");
  const [loading, setLoading] = useState(false);
  const [artists, setArtists] = useState([]);
  const [products, setProducts] = useState([]);
  const [events, setEvents] = useState([]);
  
  // Modal states
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Update URL params
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (q) next.set("q", q); else next.delete("q");
    if (tab !== "all") next.set("tab", tab); else next.delete("tab");
    setParams(next, { replace: true });
  }, [q, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch search results
  useEffect(() => {
    if (!q.trim()) {
      setArtists([]);
      setProducts([]);
      setEvents([]);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const ql = q.trim();

        // Always fetch all categories to show counts in tabs
        // Search products (from marketplace)
        try {
          const res = await fetch(`${API}/marketplace/items`, {
            credentials: "include",
          });
          if (res.ok) {
            const data = await res.json();
            const allProducts = Array.isArray(data?.data) ? data.data : [];
            const filtered = allProducts.filter(product => 
              product.title?.toLowerCase().includes(ql.toLowerCase()) ||
              product.description?.toLowerCase().includes(ql.toLowerCase()) ||
              product.category?.toLowerCase().includes(ql.toLowerCase()) ||
              product.seller?.shopName?.toLowerCase().includes(ql.toLowerCase())
            );
            setProducts(filtered);
          }
        } catch (e) {
          console.error("Error searching products:", e);
          setProducts([]);
        }

        // Search events
        try {
          const res = await fetch(`${API}/event/getEvents?page=1&limit=50`, {
            credentials: "include",
          });
          if (res.ok) {
            const data = await res.json();
            const allEvents = Array.isArray(data?.data) ? data.data : [];
            const filtered = allEvents.filter(event => 
              event.title?.toLowerCase().includes(ql.toLowerCase()) ||
              event.details?.toLowerCase().includes(ql.toLowerCase()) ||
              event.venueName?.toLowerCase().includes(ql.toLowerCase())
            );
            setEvents(filtered);
          }
        } catch (e) {
          console.error("Error searching events:", e);
          setEvents([]);
        }

        // Search artists - fetch from artist page
        try {
          const res = await fetch(`${API}/artist/getArtist`, {
            credentials: "include",
          });
          if (res.ok) {
            const data = await res.json();
            const allArtists = Array.isArray(data?.artists) ? data.artists : [];
            const filtered = allArtists.filter(artist => 
              artist.name?.toLowerCase().includes(ql.toLowerCase()) ||
              artist.displayName?.toLowerCase().includes(ql.toLowerCase()) ||
              artist.username?.toLowerCase().includes(ql.toLowerCase()) ||
              artist.bio?.toLowerCase().includes(ql.toLowerCase())
            );
            setArtists(filtered);
          }
        } catch (e) {
          console.error("Error searching artists:", e);
          setArtists([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [q, tab]);

  const totalResults = artists.length + products.length + events.length;

  return (
    <div className="searchPage">
      <div className="searchWrap">
        {/* Hero */}
        <section className="searchHero">
          <div className="sHero__bg" />
          <div className="sHero__overlay" />
          <div className="sHero__content">
            <h1 className="sHero__title">Search Museo</h1>
            <p className="sHero__subtitle">Discover artists, products, and events</p>
            <div className="sHero__controls">
              <input
                className="sField"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search artists, products, events…"
                aria-label="Search"
              />
            </div>
          </div>
        </section>

        {/* Tabs */}
        {q && (
          <div className="sTabs">
            <button
              className={`sTab ${tab === "all" ? "sTab--active" : ""}`}
              onClick={() => setTab("all")}
            >
              All ({totalResults})
            </button>
            <button
              className={`sTab ${tab === "artists" ? "sTab--active" : ""}`}
              onClick={() => setTab("artists")}
            >
              Artists ({artists.length})
            </button>
            <button
              className={`sTab ${tab === "products" ? "sTab--active" : ""}`}
              onClick={() => setTab("products")}
            >
              Products ({products.length})
            </button>
            <button
              className={`sTab ${tab === "events" ? "sTab--active" : ""}`}
              onClick={() => setTab("events")}
            >
              Events ({events.length})
            </button>
          </div>
        )}

        {/* Summary */}
        {q && (
          <div className="sSummary">
            <div className="sSummary__left">
              <span className="sCount">{totalResults}</span>
              <span className="sLabel">results for "{q}"</span>
            </div>
            {q && (
              <button className="sClear" onClick={() => setQ("")}>
                Clear
              </button>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && <div className="sLoading">Searching…</div>}

        {/* Results Grid */}
        {!loading && q && (
          <div className="sGrid">
            {/* Artists */}
            {(tab === "all" || tab === "artists") && artists.length > 0 && (
              <>
                {tab === "all" && <h2 className="sSection__title">Artists</h2>}
                {artists.map((artist) => (
                  <div 
                    key={artist.id || artist.username} 
                    className="sCard sCard--artist"
                    onClick={() => navigate(`/artist/${artist.username || artist.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="sThumb">
                      <img src={artist.hero || artist.avatar || "https://via.placeholder.com/200"} alt={artist.name} loading="lazy" />
                    </div>
                    <div className="sMeta">
                      <div className="sTitle">{artist.name || artist.displayName}</div>
                      <div className="sAuthor">{artist.username || "Artist"}</div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Products */}
            {(tab === "all" || tab === "products") && products.length > 0 && (
              <>
                {tab === "all" && <h2 className="sSection__title">Products</h2>}
                {products.map((product) => (
                  <div 
                    key={product.id} 
                    className="sCard sCard--product"
                    onClick={() => setSelectedProduct(product)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="sThumb">
                      <img src={product.image || product.primary_image || "https://via.placeholder.com/200"} alt={product.title} loading="lazy" />
                    </div>
                    <div className="sMeta">
                      <div className="sTitle">{product.title}</div>
                      <div className="sAuthor">{product.seller?.shopName || "Unknown Seller"}</div>
                      <div className="sPrice">${product.price || "N/A"}</div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Events */}
            {(tab === "all" || tab === "events") && events.length > 0 && (
              <>
                {tab === "all" && <h2 className="sSection__title">Events</h2>}
                {events.map((event) => (
                  <div 
                    key={event.id} 
                    className="sCard sCard--event"
                    onClick={() => setSelectedEvent({
                      eventId: event.eventId || event.id,
                      slug: event.eventId || event.id || event.title,
                      title: event.title,
                      hero: event.image,
                      lead: event.details,
                      activities: Array.isArray(event.activities) ? event.activities : (event.activities ? [event.activities] : []),
                      admission: event.admission,
                      admissionNote: event.admissionNote,
                      venueName: event.venueName,
                      venueAddress: event.venueAddress,
                      start: event.startsAt,
                      end: event.endsAt,
                    })}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="sThumb">
                      <img src={event.image || "https://via.placeholder.com/200"} alt={event.title} loading="lazy" />
                    </div>
                    <div className="sMeta">
                      <div className="sTitle">{event.title}</div>
                      <div className="sAuthor">{event.venueName}</div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {totalResults === 0 && (
              <div className="sEmpty">No results found for "{q}"</div>
            )}
          </div>
        )}

        {!q && (
          <div className="sEmpty">Start typing to search…</div>
        )}
      </div>

      {/* Modals */}
      <ProductDetailModal 
        isOpen={!!selectedProduct}
        item={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={() => setSelectedProduct(null)}
        onPlaceBid={() => setSelectedProduct(null)}
      />

      {selectedEvent && (
        <EventModal 
          open={!!selectedEvent} 
          event={selectedEvent} 
          onClose={() => setSelectedEvent(null)} 
        />
      )}
    </div>
  );
}
