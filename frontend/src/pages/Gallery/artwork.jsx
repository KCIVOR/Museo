import { useState } from "react";
import "./css/artwork.css";

const IMG = "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/images%20(6).jpg";

const ARTWORK = {
  id: "blind",
  title: "“Blind” by Kylan Gentry",
  titlePlain: "Blind",
  artist: "Kylan Gentry",
  year: "1928 (original inspiration)",
  description:
    "A portrayal of emotional distance in intimacy, where veiled faces represent barriers to true connection and hidden isolation.",
  medium: ["Oil paint", "Canvas"],
  images: [IMG, IMG, IMG, IMG, IMG]
};

const INITIAL_COMMENTS = [
  { id: "c1", name: "Travis Langdon", avatar: IMG, time: "2025-05-14 09:12 AM", text: "This painting gives me chills. The way their faces are veiled yet they’re so close—it speaks volumes about emotional distance in relationships. Hauntingly beautiful." },
  { id: "c2", name: "Eric Langford", avatar: IMG, time: "2025-05-13 08:47 AM", text: "The contrast between the warm embrace and the faceless connection hits hard. Beautifully unsettling." },
  { id: "c3", name: "Dylan Hawthorne", avatar: IMG, time: "2025-05-13 01:37 AM", text: "I can’t stop staring at this. It’s like love in the modern world—present, close, but somehow always slightly hidden." },
  { id: "c4", name: "Jared Ellison", avatar: IMG, time: "2025-05-11 02:15 PM", text: "This piece really stopped me in my tracks. The symbolism is powerful and the execution is flawless." }
];

export default function Artwork() {
  const [active, setActive] = useState(0);
  const [comments, setComments] = useState(INITIAL_COMMENTS);
  const [draft, setDraft] = useState("");

  // Artwork like state
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(123);

  // Optional: comment like state map
  const [commentLikes, setCommentLikes] = useState({}); // { [commentId]: { liked: bool, count: number } }

  const toggleArtworkLike = () => {
    setLiked((v) => {
      const next = !v;
      setLikeCount((c) => c + (next ? 1 : -1));
      return next;
    });
  };

  const toggleCommentLike = (id) => {
    setCommentLikes((prev) => {
      const cur = prev[id] || { liked: false, count: 0 };
      const nextLiked = !cur.liked;
      return { ...prev, [id]: { liked: nextLiked, count: cur.count + (nextLiked ? 1 : -1) } };
    });
  };

  const submitComment = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const newComment = {
      id: `c${Date.now()}`,
      name: "You",
      avatar: IMG,
      time: new Date().toISOString().replace("T", " ").slice(0, 16),
      text
    };
    setComments((prev) => [newComment, ...prev]);
    setDraft("");
  };

  return (
    <div className="artPage">
      <div className="artFeed">
        {/* Hero image card */}
        <section className="artCard">
          <div className="heroWrap">
            <img className="heroImg" src={ARTWORK.images[active]} alt={ARTWORK.titlePlain} />
          </div>

          {/* Thumbnail strip */}
          <div className="thumbRow">
            {ARTWORK.images.slice(0, 5).map((src, i) => (
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

          {/* Artwork like row */}
          <div className="likeRow">
            <button
              type="button"
              className={`likeBtn ${liked ? "is-on" : ""}`}
              aria-pressed={liked}
              aria-label={liked ? "Unlike artwork" : "Like artwork"}
              onClick={toggleArtworkLike}
            >
              <span className="likeIcon" aria-hidden="true">❤️</span>
              <span className="likeText">{liked ? "" : ""}</span>
              <span className="likeCount">{likeCount}</span>
            </button>
          </div>
        </section>

        {/* Title */}
        <section className="titleCard">
          <h1 className="artTitle">{ARTWORK.title}</h1>
        </section>

        {/* Description + details */}
        <section className="artCard">
          <p className="artLead">{ARTWORK.description}</p>
          <p className="artLead">Details:</p>
          <ul className="artBullets">
            <li>Title: {ARTWORK.titlePlain}</li>
            <li>Artist: {ARTWORK.artist}</li>
            <li>
              Medium:
              <ul className="artBullets inner">
                {ARTWORK.medium.map((m, idx) => (
                  <li key={idx}>{m}</li>
                ))}
              </ul>
            </li>
            <li>Year: {ARTWORK.year}</li>
          </ul>
        </section>

        {/* Comment composer */}
        <section className="artCard">
          <form onSubmit={submitComment}>
            <div className="composer">
              <textarea
                className="composerInput"
                placeholder="Add comment…."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
              />
              <div className="composerToolbar">
                <button type="button" title="Bold" className="tBtn">B</button>
                <button type="button" title="Italic" className="tBtn">I</button>
                <button type="button" title="Underline" className="tBtn">U</button>
                <button type="button" title="Attach image" className="tBtn">🖼️</button>
              </div>
              <div className="composerActions">
                <button className="submitBtn" type="submit">Submit</button>
              </div>
            </div>
          </form>
        </section>

        {/* Comments list */}
        <section className="artComments">
          <h2 className="commentsTitle">Comments</h2>
          <div className="commentsList">
            {comments.map((c) => {
              const st = commentLikes[c.id] || { liked: false, count: 0 };
              return (
                <article key={c.id} className="commentItem">
                  <img className="cAvatar" src={c.avatar} alt="" />
                  <div className="cBody">
                    <div className="cMeta">
                      <span className="cName">{c.name}</span>
                      <span className="cTime">{c.time}</span>
                    </div>
                    <p className="cText">{c.text}</p>
                    <div className="cActions">
                      <button
                        type="button"
                        className={`likeBtn likeBtn--sm ${st.liked ? "is-on" : ""}`}
                        aria-pressed={st.liked}
                        aria-label={st.liked ? "Unlike comment" : "Like comment"}
                        onClick={() => toggleCommentLike(c.id)}
                      >
                        <span className="likeIcon" aria-hidden="true">❤️</span>
                        <span className="likeText">{st.liked ? "" : ""}</span>
                        <span className="likeCount">{st.count}</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
