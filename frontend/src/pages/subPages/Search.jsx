// src/pages/Search.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "./css/search.css";

// Example data (keep or replace with real results)
const MOCK = [
  { id: "p1", title: "Sunset Curve", author: "L. Serra", tag: "Landscape", src: "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1200&auto=format&fit=crop" },
  { id: "p2", title: "Green Forest", author: "G. Fring", tag: "Nature", src: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/images%20(6).jpg" },
  { id: "p3", title: "Morning Fields", author: "Mina Cole", tag: "Landscape", src: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1200&auto=format&fit=crop" },
  { id: "p4", title: "Dunes", author: "R. Vega", tag: "Abstract", src: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/images%20(6).jpg" },
  { id: "p5", title: "River Mist", author: "P. Chen", tag: "Nature", src: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1200&auto=format&fit=crop" },
  { id: "p2q", title: "Green Forest", author: "G. Fring", tag: "Nature", src: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/images%20(6).jpg" },
  { id: "p3q", title: "Morning Fields", author: "Mina Cole", tag: "Landscape", src: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1200&auto=format&fit=crop" },
  { id: "p4q", title: "Dunes", author: "R. Vega", tag: "Abstract", src: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/images%20(6).jpg" },
  
];

export default function Search() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(() => params.get("q") || "");
  const [tag, setTag] = useState(() => params.get("tag") || "");

  useEffect(() => {
    const next = new URLSearchParams(params);
    if (q) next.set("q", q); else next.delete("q");
    if (tag) next.set("tag", tag); else next.delete("tag");
    setParams(next, { replace: true });
  }, [q, tag]); // eslint-disable-line react-hooks/exhaustive-deps

  const results = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return MOCK.filter(it => {
      const okQ = !ql || it.title.toLowerCase().includes(ql) || it.author.toLowerCase().includes(ql);
      const okTag = !tag || it.tag.toLowerCase() === tag.toLowerCase();
      return okQ && okTag;
    });
  }, [q, tag]);

  return (
    <div className="searchPage">
      {/* Wrapper matches GalleryAll’s .ga width and padding */}
      <div className="searchWrap">
        {/* Hero */}
        <section className="searchHero">
          <div className="sHero__bg" />
          <div className="sHero__overlay" />
          <div className="sHero__content">
            <h1 className="sHero__title">Search artworks</h1>
            <p className="sHero__subtitle">Discover pieces by title, artist, or tag.</p>
            <div className="sHero__controls">
              <input
                className="sField"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by title or artist…"
                aria-label="Search"
              />
              <select
                className="sSelect"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                aria-label="Filter by tag"
              >
                <option value="">All tags</option>
                <option value="Landscape">Landscape</option>
                <option value="Nature">Nature</option>
                <option value="Abstract">Abstract</option>
              </select>
            </div>
          </div>
        </section>

        {/* Summary */}
        <div className="sSummary">
          <div className="sSummary__left">
            <span className="sCount">{results.length}</span>
            <span className="sLabel">results</span>
            {q && <span className="sQuery">for “{q}”</span>}
            {tag && <span className="sQuery"> • tag: {tag}</span>}
          </div>
          {(q || tag) && (
            <button className="sClear" onClick={() => { setQ(""); setTag(""); }}>
              Clear
            </button>
          )}
        </div>

        {/* Grid */}
        <div className="sGrid">
          {results.map((it) => (
            <Link key={it.id} to={`/detail/${it.id}`} className="sCard">
              <div className="sThumb">
                <img src={it.src} alt={it.title} loading="lazy" />
              </div>
              <div className="sMeta">
                <div className="sTitle">{it.title}</div>
                <div className="sAuthor">{it.author}</div>
                <div className="sTag">{it.tag}</div>
              </div>
            </Link>
          ))}
          {results.length === 0 && (
            <div className="sEmpty">No results found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
