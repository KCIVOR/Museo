// src/pages/GalleryAll.jsx
import React from "react";
import "./css/galleryAll.css";

const IMG =
  "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/images%20(6).jpg";

const items = Array.from({ length: 24 }).map((_, i) => ({
  id: `g${i + 1}`,
  title: i % 2 ? "“Fire Flower” by Aria Bennett" : "“Blind” by Kylan Gentry",
  src: IMG,
  // badge removed
}));

export default function GalleryAll() {
  const category = "Paintings";
  const total = items.length;

  return (
    <section className="ga">
      {/* Header */}
      <div className="gaHead">
        <div className="gaTitle">
          <h2>{category}</h2>
          <span className="gaCount">{total} items</span>
        </div>
        <div className="gaActions">
          <div className="gaChips">
            <button className="gaChip is-active">All</button>
            <button className="gaChip">Abstract</button>
            <button className="gaChip">Portraits</button>
            <button className="gaChip">Landscapes</button>
          </div>
          <select className="gaSort" defaultValue="popular">
            <option value="popular">Most popular</option>
            <option value="new">Newest</option>
            <option value="titleAsc">Title A–Z</option>
            <option value="titleDesc">Title Z–A</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="gaGrid">
        {items.map((it) => (
          <a key={it.id} className="gaCard" href={`/gallery/${it.id}`}>
            <div className="gaImgWrap">
              <img src={it.src} alt={it.title} loading="lazy" />
              {/* Badge removed */}
            </div>
            <div className="gaMeta">
              <div className="gaName">{it.title}</div>
            </div>
          </a>
        ))}
      </div>

      {/* Pagination */}
      <div className="gaPager">
        <button className="gaPageBtn" disabled>Prev</button>
        <button className="gaPageBtn is-active">1</button>
        <button className="gaPageBtn">2</button>
        <button className="gaPageBtn">3</button>
        <button className="gaPageBtn">Next</button>
      </div>
    </section>
  );
}
