import { useMemo, useState } from "react";
import "./css/marketplaceItem.css";

const IMG = "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/images%20(6).jpg";

const PRODUCT = {
  id: "the-mountains",
  title: "“The Mountains” by Dhalia Ford",
  price: 2500,
  currency: "M",
  images: [IMG, IMG, IMG, IMG],
  description:
    "“The Mountains” is a vibrant landscape artwork that showcases bold lines, rich textures, and layered watercolor tones. The piece features snow-capped peaks, a glowing sun radiating through soft skies, and a serene alpine lake surrounded by rocky terrain. The dynamic composition and harmonious color palette create a sense of movement and depth, capturing the majestic stillness of mountain scenery.",
  medium: "Watercolor & Ink on Cold-Pressed Paper",
  size: "24 x 36 inches (Unframed)",
  status: "Original artwork available | Limited edition prints also offered",
  shipping: "Ships within 7–10 business days anywhere in the Philippines.",
  localDelivery: "Local delivery via LBC, J&T Express, or GrabExpress (for Metro Manila).",
  rating: 4.8,
  reviewsCount: 37,
  editions: [
    { key: "orig", label: "Original (1/1)", priceMul: 1 },
    { key: "print", label: "Limited Print (x50)", priceMul: 0.18 },
  ],
  frames: [
    { key: "none", label: "No Frame", add: 0 },
    { key: "blk", label: "Black Frame", add: 120 },
    { key: "oak", label: "Oak Frame", add: 140 },
  ],
  sizes: [
    { key: "24x36", label: "24×36 in", mul: 1 },
    { key: "18x24", label: "18×24 in", mul: 0.7 },
    { key: "12x16", label: "12×16 in", mul: 0.45 },
  ],
};

function formatPrice(base, currency = "M") {
  return `${currency}${Math.round(base).toLocaleString()}`;
}

export default function MarketplaceItem() {
  const [active, setActive] = useState(0);
  const [edition, setEdition] = useState(PRODUCT.editions.key);
  const [frame, setFrame] = useState(PRODUCT.frames.key);
  const [size, setSize] = useState(PRODUCT.sizes.key);
  const [qty, setQty] = useState(1);

  const price = useMemo(() => {
    const e = PRODUCT.editions.find(e => e.key === edition) || PRODUCT.editions;
    const f = PRODUCT.frames.find(f => f.key === frame) || PRODUCT.frames;
    const s = PRODUCT.sizes.find(s => s.key === size) || PRODUCT.sizes;
    return (PRODUCT.price * e.priceMul * s.mul + f.add) * qty;
  }, [edition, frame, size, qty]);

  const handleBuy = () => {
    alert(`Buying ${qty} × ${PRODUCT.title} (${edition}, ${size}, ${frame}) for ${formatPrice(price, PRODUCT.currency)}`);
  };
  const addToCart = () => {
    alert(`Added to cart: ${qty} × ${PRODUCT.title}`);
  };

  return (
    <div className="mpPage">
      <div className="mpFeed">
        {/* HERO + BUY */}
        <section className="mpCard mpCard--hero">
          <div>
            <div className="heroWrap" aria-live="polite">
              <img className="heroImg" src={PRODUCT.images[active]} alt={PRODUCT.title} />
            </div>

            <div className="rowBar" role="group" aria-label="Gallery thumbnails and buy">
              <div className="thumbRow" aria-label="Thumbnails">
                {PRODUCT.images.map((src, i) => (
                  <button
                    key={i}
                    className={`thumb ${i === active ? "thumb--active" : ""}`}
                    onClick={() => setActive(i)}
                    aria-label={`View image ${i + 1}`}
                  >
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>

            </div>
          </div>

          {/* BUY PANEL (right) */}
          <aside className="buyPanel" aria-label="Purchase panel">
            
            <div className="buyPrice">₱35000</div>

            <div className="optionGroup">
              <div className="optionLabel">Edition</div>
              <div className="optionRow">
                <select className="select" value={edition} onChange={e => setEdition(e.target.value)}>
                  {PRODUCT.editions.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
                </select>
                <select className="select" value={size} onChange={e => setSize(e.target.value)}>
                  {PRODUCT.sizes.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div className="optionGroup">
              <div className="optionLabel">Frame & Qty</div>
              <div className="optionRow">
                <select className="select" value={frame} onChange={e => setFrame(e.target.value)}>
                  {PRODUCT.frames.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
                <input
                  className="qtyInput"
                  type="number" min={1} max={9}
                  value={qty}
                  onChange={e => setQty(Math.max(1, Math.min(9, Number(e.target.value) || 1)))}
                />
              </div>
            </div>

            <div className="buyActions">
              <button className="btnPrimary" onClick={handleBuy}>Buy Now</button>
            </div>



      
          </aside>
        </section>

        {/* TITLE */}
        <section className="titleCard">
          <h1 className="mpTitle">{PRODUCT.title}</h1>
        </section>

        {/* DETAILS */}
        <section className="mpCard" id="description">
          <div className="descGrid">
            <div className="descLeft">
              <div className="emojiTitle">📝 Description:</div>
              <p className="mpText">{PRODUCT.description}</p>
            </div>

            <div className="descRight">
              <ul className="mpBullets">
                <li><span className="emojiTitle">🎨 Medium:</span> {PRODUCT.medium}</li>
                <li><span className="emojiTitle">📐 Size:</span> {PRODUCT.size}</li>
                <li><span className="emojiTitle">✅ Status:</span> {PRODUCT.status}</li>
                <li id="shipping"><span className="emojiTitle">🚚 Shipping & Handling:</span> {PRODUCT.shipping}</li>
                <li><span className="emojiTitle">📦</span> {PRODUCT.localDelivery}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ARTIST BIO + GUARANTEE */}
        <section className="mpCard" id="artist">
          <h3 style={{marginTop:0}}>About the Artist</h3>
          <p className="mpText">Dhalia Ford is a contemporary watercolor artist focusing on alpine landscapes and abstract natural forms. Her works are held by 100+ private collectors worldwide.</p>
          <div className="badges" style={{marginTop:8}}>
            <div className="badge">Certified Artist</div>
            <div className="badge">test</div>
            <div className="badge">test</div>
          </div>
        </section>

        {/* RECOMMENDATIONS */}
        <section className="mpCard">
          <h3 style={{marginTop:0}}>You may also like</h3>
          <div className="recos">
            {[1,2,3,4].map(i => (
              <a className="recoCard" key={i} href="#">
                <img src={IMG} alt="" />
                <div className="recoMeta">
                  <div className="recoTitle">Abstract Circle #{i}</div>
                  <div className="recoPrice">{formatPrice(1200 + i*50, PRODUCT.currency)}</div>
                </div>
              </a>
            ))}
          </div>
        </section>


        
      </div>
    </div>
  );
}
