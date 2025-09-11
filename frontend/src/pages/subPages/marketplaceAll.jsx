// src/pages/ViewAllCategory.jsx
import React from "react";
import "./css/marketplaceAll.css";

const IMG = "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/images%20(6).jpg";

const ITEMS = Array.from({ length: 24 }).map((_, i) => ({
  id: `p${i + 1}`,
  title: i % 2 ? "“Fire Flower” by Aria Bennett" : "“Blind” by Kylan Gentry",
  img: IMG,
  price: i % 3 === 0 ? "₱12,500" : "₱9,800",
  badge: i % 5 === 0 ? "Auction" : "For Sale",
}));

export default function MarketplaceAll() {
  const category = "Paintings";
  const total = ITEMS.length;

  return (
    <div className="vaPage">
      <div className="vaWrap">
        {/* Header row */}
        <div className="vaHead">
          <div className="vaTitle">
            <h1>{category}</h1>
            <span className="vaCount">{total} items</span>
          </div>
          <div className="vaActions">
            <div className="vaChips">
              <button className="vaChip is-active">All</button>
              <button className="vaChip">Originals</button>
              <button className="vaChip">Prints</button>
            </div>
            <select className="vaSort" defaultValue="popular">
              <option value="popular">Most popular</option>
              <option value="new">Newest</option>
              <option value="priceAsc">Price: low to high</option>
              <option value="priceDesc">Price: high to low</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        <div className="vaGrid">
          {ITEMS.map((it) => (
            <a key={it.id} className="vaCard" href={`/item/${it.id}`}>
              <div className="vaImgWrap">
                <img src={it.img} alt={it.title} />
                <span className={`vaBadge ${it.badge === "Auction" ? "vaBadge--accent" : ""}`}>{it.badge}</span>
              </div>
              <div className="vaMeta">
                <div className="vaName">{it.title}</div>
                <div className="vaPrice">{it.price}</div>
              </div>
            </a>
          ))}
        </div>

        {/* Pagination */}
        <div className="vaPager">
          <button className="vaPageBtn" disabled>Prev</button>
          <button className="vaPageBtn is-active">1</button>
          <button className="vaPageBtn">2</button>
          <button className="vaPageBtn">3</button>
          <button className="vaPageBtn">Next</button>
        </div>
      </div>
    </div>
  );
}
