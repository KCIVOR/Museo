// src/pages/Home.jsx
import React, { useEffect, useRef, useState } from "react";
import "./css/home.css";
import MuseoComposer from "./museoComposer"; // <-- add this import

function getAverageColorFromImageElement(img) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const w = 16, h = 16;
  canvas.width = w; canvas.height = h;
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  let r = 0, g = 0, b = 0, n = w * h;
  for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i+1]; b += data[i+2]; }
  return `rgb(${Math.round(r/n)}, ${Math.round(g/n)}, ${Math.round(b/n)})`;
}

function AnnouncementCard({
  id,
  eyebrow,
  title,
  meta,
  primaryHref = "/event",
  primaryLabel = "View details",
  secondaryHref = "/home",
  secondaryLabel = "RSVP",
}) {
  const storageKey = `museo_announce_hidden_${id}`;
  const [hidden, setHidden] = useState(() => localStorage.getItem(storageKey) === "1");

  useEffect(() => { if (hidden) localStorage.setItem(storageKey, "1"); }, [hidden, storageKey]);

  if (hidden) return null;

  const onKey = (e) => {
    if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setHidden(true);
    }
  };

  return (
    <div className="announce" role="region" aria-label={`${eyebrow} announcement`}>
      <div className="announce__left">
        <div className="announce__eyebrow">{eyebrow}</div>
        <div className="announce__title">{title}</div>
        <div className="announce__meta">{meta}</div>
        <div className="announce__ctaRow">
          <a className="btnPrimary" href={primaryHref}>{primaryLabel}</a>
          <a className="btnGhost" href={secondaryHref}>{secondaryLabel}</a>
        </div>
      </div>
      <button
        className="announce__close"
        aria-label="Dismiss announcement"
        onClick={() => setHidden(true)}
        onKeyDown={onKey}
      >✕</button>
    </div>
  );
}

export default function Home() {
  const initial = [
    { name: "Rovick Romasanta", pPicture: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/2ooze2k90v5e1.jpeg", description: "I like egg", picture: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/random-l.jpg" },
    { name: "Ron iverson",       pPicture: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/2ooze2k90v5e1.jpeg", description: "test",      picture: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/images%20(4).jpg" },
    { name: "Dwayne tan",        pPicture: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/2ooze2k90v5e1.jpeg", description: "padre nuestro que estas", picture: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/images%20(2).jpg" },
    { name: "Ron iverson",       pPicture: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/2ooze2k90v5e1.jpeg", description: "test",      picture: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/images%20(3).jpg" }
  ];
  const [posts, setPosts] = useState(initial);

  const [bg, setBg] = useState({});
  const [ratioClass, setRatioClass] = useState({});
  const [fit, setFit] = useState({});

  const onImageLoad = (idx, e) => {
    const img = e.target;
    const ar = img.naturalWidth / img.naturalHeight;

    let rClass = "ratio-1-1";
    if (ar >= 1.6) rClass = "ratio-191-1";
    else if (ar <= 0.9) rClass = "ratio-4-5";
    setRatioClass((s) => ({ ...s, [idx]: rClass }));

    const box = img.parentElement.getBoundingClientRect();
    const small = img.naturalWidth < box.width || img.naturalHeight < box.height;
    const useContain = small || ar < 0.9 || ar > 2.2;
    setFit((s) => ({ ...s, [idx]: useContain ? "contain" : "cover" }));

    try {
      const avg = getAverageColorFromImageElement(img);
      setBg((s) => ({ ...s, [idx]: avg }));
    } catch {}
  };

  const announcements = [
        { id: "a1", eyebrow: "Museo Event", title: "Upcoming “Museo Nights: Contemporary Visions”", meta: "Oct 18, 7:00 PM • Museo Main Hall" },
    { id: "a2", eyebrow: "Open Call", title: "Submissions now open for Emerging Artists 2025", meta: "Deadline Nov 10 • Top picks get featured in the December showcase" },
    { id: "a3", eyebrow: "Workshop", title: "Watercolor Masterclass with Dhalia Ford", meta: "Oct 25, 2:00 PM • Limited seats • Materials included" },
  ];

  const afterIndex = { 1: 1, 3: 2 };

  return (
    <div className="page">
      <div className="feed">
        {/* New, original Museo composer */}
        <MuseoComposer onSubmit={(card) => setPosts((p) => [card, ...p])} />

        {/* First announcement before posts */}
        <AnnouncementCard {...announcements} />

        {posts.map((item, idx) => (
          <React.Fragment key={`row-${idx}`}>
            <div className="card">
              <div className="cardHeader">
                <img src={item.pPicture} alt="" className="avatar" />
                <div className="meta">
                  <div className="name">{item.name}</div>
                  <div className="desc">{item.description}</div>
                </div>
              </div>

              {item.text && (
                <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  <p style={{ margin: 0, color: "#111", lineHeight: 1.5 }}>{item.text}</p>
                </div>
              )}

              {item.picture && (
                <div
                  className={`imageBox ${ratioClass[idx] || "ratio-1-1"}`}
                  style={{ background: bg[idx] || "#f2f4f7" }}
                >
                  <img
                    src={item.picture}
                    alt=""
                    className={`postImage ${fit[idx] === "contain" ? "postImage--contain" : "postImage--cover"}`}
                    crossOrigin="anonymous"
                    onLoad={(e) => onImageLoad(idx, e)}
                  />
                </div>
              )}

              <div className="actions">
                <button className="actionBtn" aria-label="Like">❤️ <span className="actionText">123</span></button>
                <button className="actionBtn" aria-label="Comment">💬 <span className="actionText">11</span></button>
              </div>
            </div>

            {afterIndex[idx] !== undefined && (
              <AnnouncementCard {...announcements[afterIndex[idx]]} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
