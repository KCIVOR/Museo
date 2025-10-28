import { useNavigate } from "react-router-dom";
import "./css/marketplace.css";

/* Shared image for all cards (replace with real per-item images later) */
const IMG = "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/gallery/761ea7b7-f9fb-42da-b0c3-411192d87704/1760981208339-eventfallback.png";

/* Dictionary data with prices */
const MARKET = {
  activeAuctions: {
    title: "Active Auctions",
    items: [
      { id: "golden-silence", title: '"Golden Silence" by Elara Mendez', src: IMG, price: "M9000" },
      { id: "sakura-haze",    title: '"Sakura Haze" Owen Bellamy',       src: IMG, price: "M1000" },
      { id: "winter-glow",    title: '"Winter Glow" by Iryna K.',        src: IMG, price: "M1400" }
    ]
  },
  paintings: {
    title: "Paintings",
    items: [
      { id: "sun-peaks",      title: '"Sun Peaks" by J. Rowe',           src: IMG, price: "M680" },
      { id: "alpine-blue",    title: '"Alpine Blue" by K. Reyes',        src: IMG, price: "M720" },
      { id: "riverlight",     title: '"Riverlight" by J. Cho',           src: IMG, price: "M540" },
      { id: "meadow-rise",    title: '"Meadow Rise" by A. Singh',        src: IMG, price: "M610" }
    ]
  },
  sculptures: {
    title: "Sculptures",
    items: [
      { id: "bronze-form",    title: '"Bronze Form" by I. Calder',       src: IMG, price: "M2200" },
      { id: "marble-drape",   title: '"Marble Drape" by G. Bern',        src: IMG, price: "M4100" },
      { id: "wire-figure",    title: '"Wire Figure" by R. Moore',        src: IMG, price: "M1600" }
    ]
  },
  photography: {
    title: "Photography",
    items: [
      { id: "city-neon",      title: '"City Neon" by K. Ito',            src: IMG, price: "M300" },
      { id: "silent-dunes",   title: '"Silent Dunes" by R. Vega',        src: IMG, price: "M260" },
      { id: "fog-pines",      title: '"Fog Pines" by M. Ruiz',           src: IMG, price: "M240" }
    ]
  }
};

export default function Marketplace() {
  const navigate = useNavigate();
  const sections = Object.values(MARKET); // dict -> array

  return (
    <div className="marketPage">
      <div className="marketFeed">
        {sections.map((sec) => (
          <section key={sec.title} className="mSection">
            <div className="mHead">
              <h2 className="mTitle">{sec.title}</h2>
              <a className="mMore" href="#" onClick={() => navigate(`/marketplace/category`)}>
                View more
              </a>
            </div>

            {/* Horizontal row */}
            <div className="mRow">
              {sec.items.map((it) => (
                <article
                  key={it.id}
                  className="mCard"
                  onClick={() => navigate(`/marketplace/${it.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <img className="mMedia" src={it.src} alt="" />
                  <div className="mCaption">{it.title}</div>
                  <div className="mPrice">{it.price}</div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
