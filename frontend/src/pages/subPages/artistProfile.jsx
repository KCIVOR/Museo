import { useParams } from "react-router-dom";
import "./css/artistProfile.css";

/* Replace with real per-artist assets or fetch; placeholders for now */
const IMG = "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/random-l.jpg";

/* Dictionary-style artist data */
const ARTISTS = {
  "james-morgan-mcgill": {
    id: "james-morgan-mcgill",
    name: "James Morgan McGill",
    avatar: IMG,
    cover: IMG,
    gender: "Male",
    address: "9800 Montgomery Blvd NE, Albuquerque, NM 87111",
    bio: "Need an artist? Facing creative injustice? Better Call Saul!",
    about:
      "Once a courtroom legend, Saul Goodman now dominates the art scene with bold colors, sharp lines, and striking messages. His work is loud, unapologetic, and unforgettable—just like his legal career. Need art with attitude? Better Call Saul.",
    /* Virtual Galleries removed as requested */
    arts: [
      { id: "a1", src: IMG },

    ]
  }
  // Add more keys for other artists if needed
};

export default function ArtistDetail() {
  const { id } = useParams();
  const artist = ARTISTS[id] || ARTISTS["james-morgan-mcgill"];

  return (
    <div className="artistDetailPage">
      <div className="artistDetailFeed">
        <div className="adCard">
          {/* Cover + Avatar */}
          <div className="adCover">
            <img className="adCoverImg" src={"https://png.pngtree.com/thumb_back/fh260/background/20231231/pngtree-random-pattern-of-low-poly-textured-triangle-shapes-on-abstract-gray-image_13883731.png"} alt="" />
            <div className="adAvatarWrap">
              <img className="adAvatar" src={artist.avatar} alt="" />
            </div>
          </div>

          {/* Header text, meta, actions */}
          <div className="adHeader">
            <div className="adName">{artist.name}</div>
            <div className="adMeta">
              <div>Gender: {artist.gender}</div>
              <div>Address: {artist.address}</div>
              <div>Bio: {artist.bio}</div>
            </div>
            <div className="adActions">
              <button className="adBtn">Follow</button>
              <button className="adBtn">Message</button>
            </div>
            <div className="adBio">{artist.about}</div>
          </div>

          {/* Arts (masonry collage using CSS Grid dense) */}
          <div className="adSectionTitle" style={{ marginTop: 18 }}>Arts</div>
          <div className="adMasonryGrid">
            {artist.arts.map((a) => (
              <div key={a.id} className="adGItem">
                <img
                  className="adGImg"
                  src={a.src}
                  alt=""
                  onLoad={(e) => {
                    // compute row span from rendered height to pack tightly
                    const el = e.currentTarget.parentElement;
                    const h = e.currentTarget.getBoundingClientRect().height;
                    const rowH = 8; // must match grid-auto-rows
                    const span = Math.max(20, Math.round(h / rowH));
                    el.style.gridRowEnd = `span ${span}`;
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
