import "./css/blindAuction.css";

const IMG =
  "https://img.freepik.com/free-vector/pastel-coloured-hand-drawn-doodle-pattern-design_1048-19887.jpg?semt=ais_hybrid&w=740&q=80";

const AUCTION = {
  title: "“The Mountains” by Dhalia Ford",
  images: [IMG, IMG, IMG, IMG],
  guidePriceLabel: "₱35000",
  closingLabel: "Closing in: 04:50:23",
  minBid: "₱20,000",
  maxBid: "₱80,000",
  description:
    "Captures a woman’s intense gaze amid abstract strokes and earthy textures. Emotive brushwork and a moody palette create an intimate, contemplative atmosphere.",
  specs: {
    artist: "Dhalia Ford",
    medium: "Watercolor & Ink on Cold-Pressed Paper",
    dimensions: "24 × 36 in (unframed)",
    year: "2025",
    condition: "New, signed by artist",
    certificate: "Certificate of Authenticity included",
    shipping: "Ships in 7–10 business days (PH); framed adds 2–3 days",
    returns: "7-day returns, buyer pays return shipping",
  },
};

export default function BlindAuction() {
  return (
    <div className="baPDP">
      <div className="baWrap">
        {/* LEFT: gallery */}
        <section className="baGallery">
          <div className="baHero">
            <img src={IMG} alt={AUCTION.title} />
          </div>
          <div className="baThumbs">
            {AUCTION.images.map((src, i) => (
              <button
                key={i}
                className={`baThumb ${i === 0 ? "is-active" : ""}`}
                aria-label={`Image ${i + 1}`}
              >
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        </section>

        {/* RIGHT: info + controls */}
        <section className="baPanel">
          <h1 className="baTitle">{AUCTION.title}</h1>
          <div className="baCountdown">{AUCTION.closingLabel}</div>

          {/* Bid input */}
          <div className="baField baField--full">
            <label className="baLabel">Place Bid</label>
            <div className="baBidInput">
              <span className="baPrefix">₱</span>
              <input
                className="baInput"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter your blind bid"
                aria-label="Enter your blind bid amount"
              />
            </div>
            <div className="baLimits">
              <div className="baLimit">
                <span>Minimum</span>
                <b>{AUCTION.minBid}</b>
              </div>
              <div className="baLimit">
                <span>Maximum</span>
                <b>{AUCTION.maxBid}</b>
              </div>
            </div>
            <p className="baHelp">
              Bids are hidden until closing. Highest valid bid wins. A valid bid
              must be between the minimum and maximum shown.
            </p>
          </div>

          {/* Primary CTA */}
          <div className="baCTARow baCTARow--single">
            <button className="baBuy">Place Blind Bid</button>
          </div>

          {/* DETAILS */}
          <div className="baDetails">
            <div className="baSectionTitle">Details</div>
            <p className="baLead">{AUCTION.description}</p>
            <ul className="baSpecs">
              <li>
                <span>Artist</span>
                <b>{AUCTION.specs.artist}</b>
              </li>
              <li>
                <span>Medium</span>
                <b>{AUCTION.specs.medium}</b>
              </li>
              <li>
                <span>Dimensions</span>
                <b>{AUCTION.specs.dimensions}</b>
              </li>
              <li>
                <span>Year</span>
                <b>{AUCTION.specs.year}</b>
              </li>
              <li>
                <span>Condition</span>
                <b>{AUCTION.specs.condition}</b>
              </li>
              <li>
                <span>Certificate</span>
                <b>{AUCTION.specs.certificate}</b>
              </li>
              <li>
                <span>Shipping</span>
                <b>{AUCTION.specs.shipping}</b>
              </li>
              <li>
                <span>Returns</span>
                <b>{AUCTION.specs.returns}</b>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
