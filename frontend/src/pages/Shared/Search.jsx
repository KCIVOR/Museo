// src/pages/Search.jsx
import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ProductDetailModal from "../Marketplace/ProductDetailModal";
import ArtworkModal from "../Gallery/ArtworkModal";
import EventModal from "../Events/EventModal";
import ProductAuctionModal from "../Marketplace/ProductAuctionModal";
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
  const [auctions, setAuctions] = useState([]);
  const [counts, setCounts] = useState({ artists: 0, products: 0, events: 0, auctions: 0 });
  
  // Modal states
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedAuction, setSelectedAuction] = useState(null);

  // Abort controller for in-flight searches
  const abortRef = useRef(null);
  const inputRef = useRef(null);

  // Update URL params
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (q) next.set("q", q); else next.delete("q");
    if (tab !== "all") next.set("tab", tab); else next.delete("tab");
    setParams(next, { replace: true });
  }, [q, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts: '/' focus, Esc clear when focused
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        setQ("");
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [q]);

  // Fetch search results (debounced, server-side)
  useEffect(() => {
    const query = q.trim();
    if (!query) {
      setArtists([]); setProducts([]); setEvents([]); setAuctions([]);
      setCounts({ artists: 0, products: 0, events: 0, auctions: 0 });
      return;
    }

    let timer = null;
    const run = async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const makeUrl = (t, lim) => {
          const url = new URL(`${API}/search`);
          url.searchParams.set('q', query);
          url.searchParams.set('tab', t);
          url.searchParams.set('page', '1');
          url.searchParams.set('limit', String(lim));
          return url.toString();
        };

        if (tab === 'all') {
          // Single request: items + counts
          const res = await fetch(makeUrl('all', 12), { credentials: 'include', signal: controller.signal });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          setCounts({
            artists: Number(data?.counts?.artists || 0),
            products: Number(data?.counts?.products || 0),
            events: Number(data?.counts?.events || 0),
            auctions: Number(data?.counts?.auctions || 0),
          });
          setArtists(Array.isArray(data?.artists?.items) ? data.artists.items : []);
          setProducts(Array.isArray(data?.products?.items) ? data.products.items : []);
          setEvents(Array.isArray(data?.events?.items) ? data.events.items : []);
          setAuctions(Array.isArray(data?.auctions?.items) ? data.auctions.items : []);
        } else {
          // Two requests in parallel:
          // 1) counts from tab=all (limit=1) to keep all tab counts populated
          // 2) items for active tab (limit=12)
          const [countsRes, tabRes] = await Promise.all([
            fetch(makeUrl('all', 1), { credentials: 'include', signal: controller.signal }),
            fetch(makeUrl(tab, 12), { credentials: 'include', signal: controller.signal }),
          ]);
          if (!countsRes.ok) throw new Error(`HTTP ${countsRes.status}`);
          if (!tabRes.ok) throw new Error(`HTTP ${tabRes.status}`);
          const countsData = await countsRes.json();
          const tabData = await tabRes.json();

          setCounts({
            artists: Number(countsData?.counts?.artists || 0),
            products: Number(countsData?.counts?.products || 0),
            events: Number(countsData?.counts?.events || 0),
            auctions: Number(countsData?.counts?.auctions || 0),
          });

          // Populate only the active tab items
          if (tab === 'artists') {
            setArtists(Array.isArray(tabData?.artists?.items) ? tabData.artists.items : []);
            setProducts([]); setEvents([]); setAuctions([]);
          } else if (tab === 'products') {
            setProducts(Array.isArray(tabData?.products?.items) ? tabData.products.items : []);
            setArtists([]); setEvents([]); setAuctions([]);
          } else if (tab === 'events') {
            setEvents(Array.isArray(tabData?.events?.items) ? tabData.events.items : []);
            setArtists([]); setProducts([]); setAuctions([]);
          } else if (tab === 'auctions') {
            setAuctions(Array.isArray(tabData?.auctions?.items) ? tabData.auctions.items : []);
            setArtists([]); setProducts([]); setEvents([]);
          }
        }
      } catch (e) {
        if (e?.name !== 'AbortError') {
          console.error('Search fetch failed:', e);
          setArtists([]); setProducts([]); setEvents([]); setAuctions([]);
          setCounts({ artists: 0, products: 0, events: 0, auctions: 0 });
        }
      } finally {
        setLoading(false);
      }
    };

    timer = setTimeout(run, 350);
    return () => { if (timer) clearTimeout(timer); if (abortRef.current) abortRef.current.abort(); };
  }, [q, tab]);

  // Simple highlighter for matching query within text
  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  function highlight(text) {
    const query = q.trim();
    if (!query) return text;
    try {
      const parts = String(text || '').split(new RegExp(`(${escapeRegExp(query)})`, 'ig'));
      return parts.map((p, i) => p.toLowerCase() === query.toLowerCase() ? <mark key={i}>{p}</mark> : <span key={i}>{p}</span>);
    } catch {
      return text;
    }
  }

  // Map item status to Museo event-status variants
  function getStatusClass(status) {
    const s = String(status || '').toLowerCase();
    if (s === 'active' || s === 'happening' || s === 'ongoing') return 'event-status--happening';
    if (s === 'ended' || s === 'closed' || s === 'finished') return 'event-status--ended';
    return 'event-status--upcoming';
  }

  const totalResults = (counts.artists + counts.products + counts.events + counts.auctions);

  return (
    <div className="searchPage">
      <div className="searchWrap">
        {/* Hero */}
        <section className="museoHero">
          <div className="mHero__media" />
          <div className="mHero__overlay" />
          <div className="mHero__content">
            <div className="mHero__textGroup">
              <h1 className="mHero__title">Search Museo</h1>
              <p className="mHero__subtitle">Discover artists, products, and events</p>
            </div>
            <div className="mHero__ctaRow">
              <div className="museo-input-group" style={{ flex: 1 }}>
                <div className="museo-search" style={{ flex: 1 }}>
                  <svg className="museo-search__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                  </svg>
                  <input
                    className="museo-input museo-search__input"
                    ref={inputRef}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search artists, products, events…"
                    aria-label="Search"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tabs */}
        {q && (
          <div className="museo-tabs museo-tabs--scrollable">
            <button
              className={`museo-tab ${tab === "all" ? "museo-tab--active" : ""}`}
              onClick={() => setTab("all")}
            >
              All <span className="museo-tab__badge">{totalResults}</span>
            </button>
            <button
              className={`museo-tab ${tab === "artists" ? "museo-tab--active" : ""}`}
              onClick={() => setTab("artists")}
            >
              Artists <span className="museo-tab__badge">{counts.artists}</span>
            </button>
            <button
              className={`museo-tab ${tab === "products" ? "museo-tab--active" : ""}`}
              onClick={() => setTab("products")}
            >
              Products <span className="museo-tab__badge">{counts.products}</span>
            </button>
            <button
              className={`museo-tab ${tab === "events" ? "museo-tab--active" : ""}`}
              onClick={() => setTab("events")}
            >
              Events <span className="museo-tab__badge">{counts.events}</span>
            </button>
            <button
              className={`museo-tab ${tab === "auctions" ? "museo-tab--active" : ""}`}
              onClick={() => setTab("auctions")}
            >
              Auctions <span className="museo-tab__badge">{counts.auctions}</span>
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
              <button className="btn btn-secondary btn-sm" onClick={() => setQ("")}>Clear</button>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="museo-grid museo-grid--auto" aria-live="polite" aria-busy="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="sCard sCard--skeleton">
                <div className="sThumb sThumb--skeleton swave" />
                <div className="sMeta">
                  <div className="sSkel-line swave" style={{ width: '70%' }} />
                  <div className="sSkel-line swave" style={{ width: '40%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results Grid */}
        {!loading && q && (
          <div className="museo-grid museo-grid--auto">
            {/* Artists */}
            {(tab === "all" || tab === "artists") && artists.length > 0 && (
              <>
                {tab === "all" && (
                  <div className="sSection__header">
                    <h2 className="sSection__title">Artists</h2>
                    <button className="btn btn-ghost btn-sm" onClick={() => setTab('artists')}>View all ({counts.artists})</button>
                  </div>
                )}
                {artists.map((artist) => (
                  <div 
                    key={artist.id || artist.username} 
                    className="museo-card museo-card--artist"
                    onClick={() => navigate(`/artist/${artist.username || artist.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <img className="museo-avatar" src={artist.hero || artist.avatar || "https://via.placeholder.com/200"} alt={artist.name} loading="lazy" />
                    <div className="museo-body">
                      <div className="museo-title">{highlight(artist.name || artist.displayName)}</div>
                      <div className="museo-desc">{artist.username || "Artist"}</div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Products */}
            {(tab === "all" || tab === "products") && products.length > 0 && (
              <>
                {tab === "all" && (
                  <div className="sSection__header">
                    <h2 className="sSection__title">Products</h2>
                    <button className="btn btn-ghost btn-sm" onClick={() => setTab('products')}>View all ({counts.products})</button>
                  </div>
                )}
                {products.map((product) => (
                  <div 
                    key={product.id} 
                    className="museo-event-card"
                    onClick={() => setSelectedProduct(product)}
                    style={{ cursor: 'pointer' }}
                  >
                    <img className="museo-event-image" src={product.image || product.primary_image || "https://via.placeholder.com/200"} alt={product.title} loading="lazy" />
                    <div className="museo-event-content">
                      <div className="museo-title">{highlight(product.title)}</div>
                      <div className="museo-desc">{product.seller?.shopName || "Unknown Seller"}</div>
                      <div className="event-price">${product.price || "N/A"}</div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Events */}
            {(tab === "all" || tab === "events") && events.length > 0 && (
              <>
                {tab === "all" && (
                  <div className="sSection__header">
                    <h2 className="sSection__title">Events</h2>
                    <button className="btn btn-ghost btn-sm" onClick={() => setTab('events')}>View all ({counts.events})</button>
                  </div>
                )}
                {events.map((event) => (
                  <div 
                    key={event.eventId || event.id} 
                    className="museo-event-card"
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
                    <img className="museo-event-image" src={event.image || "https://via.placeholder.com/200"} alt={event.title} loading="lazy" />
                    <div className="museo-event-content">
                      <div className="museo-title">{highlight(event.title)}</div>
                      <div className="museo-desc">{event.venueName}</div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Auctions */}
            {(tab === "all" || tab === "auctions") && auctions.length > 0 && (
              <>
                {tab === "all" && (
                  <div className="sSection__header">
                    <h2 className="sSection__title">Auctions</h2>
                    <button className="btn btn-ghost btn-sm" onClick={() => setTab('auctions')}>View all ({counts.auctions})</button>
                  </div>
                )}
                {auctions.map((auc) => (
                  <div
                    key={auc.auctionId || auc.id}
                    className="museo-event-card"
                    onClick={() => setSelectedAuction({
                      auctionId: auc.auctionId || auc.id,
                      title: auc.title,
                      description: auc.description,
                      primary_image: auc.primary_image || auc.image,
                      images: Array.isArray(auc.images) ? auc.images : (auc.primary_image ? [auc.primary_image] : []),
                      startPrice: auc.startPrice,
                      reservePrice: auc.reservePrice,
                      minIncrement: auc.minIncrement,
                      startAt: auc.startAt,
                      endAt: auc.endAt,
                      status: auc.status,
                    })}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className={`event-status ${getStatusClass(auc.status)}`}>{auc.status || 'Auction'}</span>
                    <img className="museo-event-image" src={auc.primary_image || auc.image || "https://via.placeholder.com/200"} alt={auc.title} loading="lazy" />
                    <div className="museo-event-content">
                      <div className="museo-title">{highlight(auc.title)}</div>
                      <div className="museo-desc">Ends {auc.endAt ? new Date(auc.endAt).toLocaleString() : ''}</div>
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

      {selectedAuction && (
        <ProductAuctionModal
          isOpen={!!selectedAuction}
          item={selectedAuction}
          onClose={() => setSelectedAuction(null)}
          onPlaceBid={async (item, amount, userAddressId) => {
            try {
              const res = await fetch(`${API}/auctions/${item.auctionId}/bids`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, userAddressId }),
              });
              if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                return { success: false, error: body?.error || `HTTP ${res.status}` };
              }
              const body = await res.json().catch(() => ({}));
              return { success: true, data: body };
            } catch (e) {
              return { success: false, error: e?.message || 'Network error' };
            }
          }}
        />
      )}
    </div>
  );
}
