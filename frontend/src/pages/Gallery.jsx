import { useNavigate } from "react-router-dom";
import "./css/gallery.css";

/* Single image used across all containers */
const IMG = "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/random-l.jpg";

/* Dictionary-style data (all items point to IMG) */
const GALLERY = {
  paintings: {
    title: "Paintings",
    items: [
      { id: "blind",        title: '"Blind" by Kylan Gentry',      src: IMG },
      { id: "fire-flower",  title: '"Fire Flower" by Aria Bennett', src: IMG },
      { id: "sunset-lake",  title: '"Sunset Lake" by Mina Cole',    src: IMG },
      { id: "blind-2",      title: '"Blind" by Kylan Gentry',       src: IMG },
      { id: "blind-3",      title: '"Blind" by Kylan Gentry',       src: IMG }
    ]
  },
  sculptures: {
    title: "Sculptures",
    items: [
      { id: "bronze-form",  title: '"Bronze Form" by I. Calder',    src: IMG },
      { id: "marble-drape", title: '"Marble Drape" by G. Bern',     src: IMG },
      { id: "wire-figure",  title: '"Wire Figure" by R. Moore',     src: IMG },
      { id: "stone-arc",    title: '"Stone Arc" by L. Serra',       src: IMG }
    ]
  },
  photography: {
    title: "Photography",
    items: [
      { id: "city-neon",    title: '"City Neon" by K. Ito',         src: IMG },
      { id: "silent-dunes", title: '"Silent Dunes" by R. Vega',     src: IMG },
      { id: "fog-pines",    title: '"Fog Pines" by M. Ruiz',        src: IMG },
      { id: "night-river",  title: '"Night River" by P. Chen',      src: IMG }
    ]
  },
  installations: {
    title: "Installations",
    items: [
      { id: "light-room",   title: '"Light Room" by N. Yam',        src: IMG },
      { id: "mirror-hall",  title: '"Mirror Hall" by S. Park',      src: IMG },
      { id: "woven-space",  title: '"Woven Space" by A. Khan',      src: IMG }
    ]
  },
  virtual: {
    title: "Virtual Galleries",
    items: [
      { id: "neon-minds",   title: "Neon Minds",                    src: IMG },
      { id: "classic-hall", title: "Classic Hall",                  src: IMG },
      { id: "modern-spaces",title: "Modern Spaces",                 src: IMG }
    ]
  }
};

export default function Gallery() {
  const navigate = useNavigate();
  const sections = Object.values(GALLERY); // dict -> array

  return (
    <div className="galleryPage">
      <div className="galleryFeed">
        {sections.map((sec) => (
          <section key={sec.title} className="gSection">
            <div className="gHead">
              <h2 className="gTitle">{sec.title}</h2>
              <a className="gMore" href="#"  onClick={() => navigate(`/gallery/category`)}>
                View more
              </a>
            </div>

            {/* Horizontal row */}
            <div className="gRow">
              {sec.items.map((it) => (
                <article
                  key={it.id}
                  className="gCard"
                  onClick={() => navigate(`/gallery/${it.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <img className="gMedia" src={IMG} alt="" />
                  <div className="gCaption">{it.title}</div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
