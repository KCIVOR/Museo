// src/pages/Search.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "./css/search.css";

const MOCK = [
  { id: "p1", title: "Sunset Curve", author: "L. Serra", tag: "Landscape", src: "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1200&auto=format&fit=crop" },
  { id: "p2", title: "Green Forest", author: "G. Fring", tag: "Nature", src: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/images%20(6).jpg" },
  { id: "p3", title: "Morning Fields", author: "Mina Cole", tag: "Landscape", src: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1200&auto=format&fit=crop" },
  { id: "p4", title: "Dunes", author: "R. Vega", tag: "Abstract", src: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/images%20(6).jpg" },
  { id: "p5", title: "River Mist", author: "P. Chen", tag: "Nature", src: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1200&auto=format&fit=crop" },
  { id: "p6", title: "City Lights", author: "A. Bennett", tag: "Urban", src: "https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?q=80&w=1200&auto=format&fit=crop" },
  { id: "p7", title: "Dunes", author: "R. Vega", tag: "Abstract", src: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/images%20(6).jpg" },
  { id: "p8", title: "River Mist", author: "P. Chen", tag: "Nature", src: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1200&auto=format&fit=crop" },
  { id: "p9", title: "City Lights", author: "A. Bennett", tag: "Urban", src: "https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?q=80&w=1200&auto=format&fit=crop" },
  { id: "p10", title: "Dunes", author: "R. Vega", tag: "Abstract", src: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/images%20(6).jpg" },
  { id: "p11", title: "River Mist", author: "P. Chen", tag: "Nature", src: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1200&auto=format&fit=crop" },
  { id: "p12", title: "City Lights", author: "A. Bennett", tag: "Urban", src: "https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?q=80&w=1200&auto=format&fit=crop" },
  { id: "p13", title: "Dunes", author: "R. Vega", tag: "Abstract", src: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/images%20(6).jpg" },
  { id: "p14", title: "River Mist", author: "P. Chen", tag: "Nature", src: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1200&auto=format&fit=crop" },
  { id: "p15", title: "City Lights", author: "A. Bennett", tag: "Urban", src: "https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?q=80&w=1200&auto=format&fit=crop" },
];

export default function Search() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [tag, setTag] = useState(params.get("tag") ?? "All");
  const [sort, setSort] = useState(params.get("sort") ?? "relevance");

  useEffect(() => {
    const next = new URLSearchParams();
    if (query) next.set("q", query);
    if (tag && tag !== "All") next.set("tag", tag);
    if (sort && sort !== "relevance") next.set("sort", sort);
    setParams(next, { replace: true });
  }, [query, tag, sort, setParams]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let items = MOCK.filter(
      (i) =>
        (!q ||
          i.title.toLowerCase().includes(q) ||
          i.author.toLowerCase().includes(q) ||
          i.tag.toLowerCase().includes(q)) &&
        (tag === "All" || i.tag === tag)
    );
    if (sort === "alpha") items = items.slice().sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "author") items = items.slice().sort((a, b) => a.author.localeCompare(b.author));
    return items;
  }, [query, tag, sort]);

  const onSubmit = (e) => { e.preventDefault(); };

  return (
    <div className="searchPage">
      <header className="searchHero" role="banner" aria-label="Search Museo">
        <div className="sHero__bg" aria-hidden="true" />
        <div className="sHero__overlay" aria-hidden="true" />
        <div className="sHero__content">
          <h1 className="sHero__title">Search Museo</h1>
          <p className="sHero__subtitle">Find artworks, creators, and themes</p>

          <form className="sBar" role="search" aria-label="Site search" onSubmit={onSubmit}>
            <label className="visually-hidden" htmlFor="search-input">Search</label>
            <div className="sBar__box" role="combobox" aria-haspopup="listbox" aria-expanded="false">
              <input
                id="search-input"
                className="sBar__input"
                type="search"
                placeholder='Try “landscape”, “abstract”, or an artist'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-autocomplete="list"
              />
            </div>
            <button className="sBar__btn" type="submit">Search</button>
          </form>

          <div className="sFilters" role="group" aria-label="Filters">
            <div className="chipRow">
              {["All", "Landscape", "Nature", "Abstract", "Urban"].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`chip ${t === tag ? "is-on" : ""}`}
                  onClick={() => setTag(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="selectRow">
              <label className="selectLabel" htmlFor="sort">Sort</label>
              <select id="sort" className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="relevance">Relevance</option>
                <option value="alpha">Title A–Z</option>
                <option value="author">Author A–Z</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Summary stays above the scrollable pane */}
      <div className="sSummary">
        <div className="sSummary__left">
          <strong>{results.length}</strong> results {query ? <> for “{query}”</> : null}
          {tag !== "All" ? <> in {tag}</> : null}
        </div>
      </div>

      {/* Scrollable results pane */}
      <div className="sPane">
        <main className="sGrid" aria-live="polite">
          {results.map((item) => (
            <Link key={item.id} to={`/art/${item.id}`} className="sCard">
              <div className="sCard__mediaWrap">
                <img className="sCard__img" src={item.src} alt="" loading="lazy" />
              </div>
              <div className="sCard__meta">
                <div className="sCard__title">{item.title}</div>
                <div className="sCard__sub">{item.author} • {item.tag}</div>
              </div>
            </Link>
          ))}
          {results.length === 0 && (
            <div className="sEmpty">
              <div className="sEmpty__icon">🔎</div>
              <div className="sEmpty__title">No results</div>
              <div className="sEmpty__tip">Try a different keyword or remove filters.</div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
