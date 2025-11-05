// src/components/TopArts.jsx
import "./css/topArts.css";

const ARTS = [
  { id: "a1", title: "“Lovers” by Aria Bennett", src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop", rank: 1 },
  { id: "a2", title: "“Green Forest” by Gustavo Fring", src: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/images%20(6).jpg", rank: 2 },
  { id: "a3", title: "“Morning Fields” by Mina Cole", src: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1600&auto=format&fit=crop", rank: 3 },
  { id: "a4", title: "“Dunes” by R. Vega", src: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/images%20(6).jpg", rank: 4 },
  { id: "a5", title: "“Sunset Curve” by L. Serra", src: "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1600&auto=format&fit=crop", rank: 5 },
  { id: "a6", title: "“River Mist” by P. Chen", src: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1600&auto=format&fit=crop", rank: 6 },
];

export default function TopArts() {
  const winner = ARTS.find(a => a.rank === 1);
  const featured = ARTS.filter(a => a.rank === 2 || a.rank === 3);
  const rest = ARTS.filter(a => a.rank > 3);

  return (
    <div className="taPage">
      <div className="taFeed">
        {/* Banner header */}
        <div className="taHeroHeader">
          <div className="taHeroBg" aria-hidden="true" />
          <div className="taHeroContent">
            <h3 className="taHeroTitle">Top Arts of the Week</h3>
            <span className="taHeroCount">{ARTS.length}</span>
          </div>
        </div>

        {/* Rank #1 winner */}
        {winner && (
          <a className="taWinner" href={`/art/${winner.id}`} aria-label={winner.title}>
            <div className="taWinnerMediaWrap">
              <img className="taWinnerMedia" src={winner.src} alt={winner.title} />
              <span className="taBadge taBadgeGold">#1</span>
            </div>
            <div className="taWinnerInfo">
              <div className="taWinnerTitle" title={winner.title}>{winner.title}</div>
              <div className="taWinnerMeta">
                <span className="taChip taChipGold">Winner</span>
                <span className="taChip">This week</span>
              </div>
            </div>
          </a>
        )}

        {/* Rank #2–#3 featured row */}
        {featured.length > 0 && (
          <div className="taFeaturedRow">
            {featured.map(art => (
              <a key={art.id} className="taFeaturedCard" href={`/art/${art.id}`} aria-label={art.title}>
                <div className="taMediaWrap">
                  <img className="taMedia" src={art.src} alt={art.title} />
                  <span className={`taBadge ${art.rank === 2 ? "taBadgeSilver" : "taBadgeBronze"}`}>#{art.rank}</span>
                </div>
                <div className="taInfo">
                  <div className="taTitle" title={art.title}>{art.title}</div>
                  <div className="taMeta">
                    <span className="taChip">This week</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* The rest (auto-fit responsive grid) */}
        <div className="taGrid">
          {rest.map(art => (
            <a key={art.id} className="taCard" href={`/art/${art.id}`} aria-label={art.title}>
              <div className="taMediaWrap">
                <img className="taMedia" src={art.src} alt={art.title} />
                <span className="taBadge">#{art.rank}</span>
              </div>
              <div className="taInfo">
                <div className="taTitle" title={art.title}>{art.title}</div>
                <div className="taMeta">
                  <span className="taChip">This week</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
