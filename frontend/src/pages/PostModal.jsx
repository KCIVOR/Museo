import React, { useEffect, useRef, useState } from "react";

// Helper (unchanged)
function getAverageColorFromImageElement(img) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const w = 16,
    h = 16;
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  let r = 0,
    g = 0,
    b = 0,
    n = w * h;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  return `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`;
}

export default function PostModal({
  post,
  onClose,
  onLike,
  onComment,
  likeCount,
  currentUser // NEW: signed-in user's {name, avatar}
}) {
  const dialogRef = useRef(null);
  const [avgBg, setAvgBg] = useState(post.avgBg || "#f3f4f6");
  const [fitClass, setFitClass] = useState("postImage--contain");
  const [ratioClass, setRatioClass] = useState("ratio-1-1");

  // Local comments state
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentErr, setCommentErr] = useState(null);
  const [commentText, setCommentText] = useState("");

  const FALLBACK_AVATAR = import.meta.env.FALLBACKPHOTO_URL || "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/fallbackphoto.png";

  // Lock scroll / ESC close
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Load comments when opened
  useEffect(() => {
    let abort = false;
    const load = async () => {
      setLoadingComments(true);
      setCommentErr(null);
      try {
        const res = await fetch(
          `http://localhost:3000/api/homepage/getComments?postId=${post.id}`,
          { credentials: "include" }
        );
        if (!res.ok) throw new Error(`Failed to load comments (${res.status})`);
        const data = await res.json();
        if (!abort) setComments(data.comments || []);
      } catch (e) {
        if (!abort) setCommentErr(e.message);
      } finally {
        if (!abort) setLoadingComments(false);
      }
    };
    load();
    return () => {
      abort = true;
    };
  }, [post.id]);

  const stop = (e) => e.stopPropagation();

  const onModalImgLoad = (e) => {
    const img = e.currentTarget;
    const ar = img.naturalWidth / img.naturalHeight;

    if (ar >= 1.6) setRatioClass("ratio-191-1");
    else if (ar <= 0.9) setRatioClass("ratio-4-5");
    else setRatioClass("ratio-1-1");

    const box = img.parentElement.getBoundingClientRect();
    const small = img.naturalWidth < box.width || img.naturalHeight < box.height;
    const useContain = small || ar < 0.9 || ar > 2.2;
    setFitClass(useContain ? "postImage--contain" : "postImage--cover");

    try {
      setAvgBg(getAverageColorFromImageElement(img));
    } catch {}
  };

  const submitComment = async (e) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;

    try {
      await onComment(post.id, text);

      // Optimistic prepend using currentUser to prevent avatar swap
      const optimisticUser = {
        name: currentUser?.name || "You",
        avatar: currentUser?.avatar || FALLBACK_AVATAR
      };
      setComments((prev) => [
        {
          id: `temp-${Date.now()}`,
          text,
          timestamp: new Date().toLocaleString(),
          user: optimisticUser
        },
        ...prev
      ]);

      setCommentText("");

      // Reconcile with server (ensures final IDs/order)
      const res = await fetch(
        `http://localhost:3000/api/homepage/getComments?postId=${post.id}`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (e2) {
      setCommentErr(e2.message || "Failed to add comment");
    }
  };

  // Avatar helper + fallback
  const avatarSrc = (u) => {
    const url = u?.avatar;
    return url && /^https?:\/\//i.test(url) ? url : FALLBACK_AVATAR;
  };

  return (
    <div className="m-popup__scrim" onClick={onClose}>
      <section
        className="m-popup__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Post details"
        tabIndex={-1}
        ref={dialogRef}
        onClick={stop}
      >
        <header className="m-popup__header">
          <div className="m-popup__author">
            <img
              className="m-popup__avatar"
              src={avatarSrc(post.user)}
              alt=""
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = FALLBACK_AVATAR;
              }}
              decoding="async"
            />
            <div className="m-popup__meta">
              <div className="m-popup__name">
                {post.user?.name || "Anonymous"}
              </div>
              <div className="m-popup__time">{post.timestamp}</div>
            </div>
          </div>
          <button
            className="m-popup__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        {post.title && (
          <h2 className="m-popup__title">
            “{post.title}” by {post.user?.name}
          </h2>
        )}

        {post.text && <p className="m-popup__desc">{post.text}</p>}

        {post.image && (
          <div
            className={`m-popup__media imageBox ${ratioClass}`}
            style={{ background: avgBg }}
          >
            <img
              className={`m-popup__img postImage ${fitClass}`}
              src={post.image}
              alt=""
              crossOrigin="anonymous"
              onLoad={onModalImgLoad}
            />
          </div>
        )}

        <div className="m-popup__actions">
          <button
            className="m-popup__btn"
            onClick={(e) => {
              e.stopPropagation();
              onLike(post.id);
            }}
          >
            <span>❤️{likeCount[post.id] || 0}</span>
          </button>
        </div>

        {/* ===== Comments ===== */}
        <div className="m-popup__comments">
          <div className="mcm__composer">
            <textarea
              className="mcm__input"
              placeholder="Add comment…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <div className="mcm__tools">
              <div className="mcm__spacer" />
              <button className="mcm__submit" onClick={submitComment}>
                Submit
              </button>
            </div>
          </div>

          <h3 className="mcm__title">Comments</h3>

          {loadingComments && (
            <div className="mcm__text" style={{ color: "#6b7280" }}>
              Loading comments…
            </div>
          )}
          {commentErr && (
            <div className="mcm__text" style={{ color: "#b91c1c" }}>
              {commentErr}
            </div>
          )}
          {!loadingComments && !commentErr && comments.length === 0 && (
            <div className="mcm__text" style={{ color: "#6b7280" }}>
              No comments yet.
            </div>
          )}

          {comments.map((c) => (
            <div key={c.id} className="mcm__item">
              <img
                className="mcm__avatar"
                src={avatarSrc(c.user)}
                alt=""
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_AVATAR;
                }}
                loading="lazy"
                decoding="async"
              />
              <div className="mcm__body">
                <div className="mcm__head">
                  <span className="mcm__name">
                    {c.user?.name || "Anonymous"}
                  </span>
                  <span className="mcm__dot">•</span>
                  <span className="mcm__time">{c.timestamp}</span>
                </div>
                <div className="mcm__text">{c.text}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
