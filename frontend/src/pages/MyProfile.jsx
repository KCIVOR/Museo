// src/pages/MyProfile.jsx
import "./css/MyProfile.css";

const IMG =
  "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/random-l.jpg";

const ME = {
  id: "me",
  name: "Kcivor",
  avatar: IMG,
  cover: IMG,
  gender: "Male",
  address: "Brgy. Bagong Bayan, Mauban Quezon",
  bio: "“Love never fails.” — 1 Corinthians 13:8",
  about:
    "This sculptor creates thought‑provoking works that explore the complex relationship between humanity and technology, often incorporating industrial materials and organic forms. Pieces aim for tactile contrast and quiet intensity.",
  arts: [
    { id: "a1", src: IMG },
    { id: "a2", src: IMG },
    { id: "a3", src: IMG },
    { id: "a4", src: IMG },
    { id: "a5", src: IMG },
    { id: "a6", src: IMG },
  ],
};

export default function MyProfile() {
  const user = ME;

  return (
    <div className="profilePage">
      <div className="profileFeed">
        {/* Main profile card */}
        <section className="pCard">
          {/* Top-right options button */}

          {/* Cover with overlapping avatar */}
          <div className="pCover">
            <img className="pCoverImg" src={user.cover} alt="" />
            <div className="pAvatarWrap">
              <img className="pAvatar" src={user.avatar} alt="" />
            </div>
          </div>
            <button
                type="button"
                className="pKebab"
                aria-label="Profile options"
                onClick={() => console.log("Open profile menu")}
            >
                ⋯
            </button>

          {/* Header */}
          <header className="pHeader">
            <h1 className="pName">{user.name}</h1>
            <div className="pMeta">
              <div>Gender: {user.gender}</div>
              <div>Address: {user.address}</div>
              <div>Bio: {user.bio}</div>
            </div>
            {/* Own profile: no Follow/Message buttons */}
          </header>

          {/* About */}
          <div className="pBio">{user.about}</div>
        </section>

        {/* Arts grid (non-compressing responsive grid) */}
        <section className="pCard">
          <div className="pSectionBar">
            <h2 className="pSectionTitle">Arts</h2>
          </div>

          <div className="pGrid">
            {user.arts.map((a) => (
              <article key={a.id} className="pTile">
                <img src={a.src} alt="" />
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
