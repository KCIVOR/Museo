import React, { useEffect, useState } from 'react';
import ProfileModal from "./ProfileModal";
const API = import.meta.env.VITE_API_BASE;

const ArtistArtGallery = ({
  arts = [],
  title = "Gallery",
  showStats = true,
  showActions = true,
  showEmptyState = true,
  emptyStateIcon = "🎨",
  emptyStateTitle = "No artwork yet",
  onViewArt = null,
  onLikeArt = null,
  onArtClick = null,
  className = "",
  loading = false,
  fallbackImage = null,
  currentUser = null
}) => {
  const [activePost, setActivePost] = useState(null);
  const [likes, setLikes] = useState({});
  const [commenting, setCommenting] = useState({});
  const [comments, setComments] = useState({});
  const [liking, setLiking] = useState({});

  const handleArtClick = (art, index) => {
    const postData = {
      id: art.artId || art.id || `art-${index}`,
      image: art.image || art.src || art.url,
      title: art.title || art.description,
      text: art.description || art.medium,
      medium: art.medium || null,
      timestamp:
        art.timestamp ||
        (art.datePosted ? new Date(art.datePosted).toLocaleString() : "Recently"),
      user: art.user || {
        name: art.artistName || currentUser?.name || "Artist",
        avatar: art.artistAvatar || currentUser?.avatar || null,
      },
      avgBg: art.avgBg || "#f3f4f6",
    };

    setActivePost(postData);
    if (onArtClick) onArtClick(art, index);
  };

  const handleViewClick = (e, art, index) => {
    e.stopPropagation();
    handleArtClick(art, index);
    if (onViewArt) onViewArt(art, index);
  };

  const handleImageError = (e) => {
    if (fallbackImage) e.target.src = fallbackImage;
  };

  const closeModal = () => setActivePost(null);

  useEffect(() => {
    let abort = false;
    (async () => {
      const entries = await Promise.all(
        (arts || []).map(async (art) => {
          const artId = art.artId || art.id;
          if (!artId) return [null, 0];
          try {
            const res = await fetch(`${API}/profile/getReact`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ artId }),
            });
            if (!res.ok) throw new Error("failed");
            const data = await res.json();
            return [artId, Array.isArray(data.reactions) ? data.reactions.length : 0];
          } catch {
            return [artId, 0];
          }
        })
      );
      if (abort) return;
      const next = {};
      for (const [id, count] of entries) if (id) next[id] = count;
      setLikes(next);
    })();
    return () => {
      abort = true;
    };
  }, [arts]);

  const handleLike = async (e, artId) => {
    e.stopPropagation();
    if (liking[artId]) return;
    setLiking((s) => ({ ...s, [artId]: true }));
    try {
      const res = await fetch(`${API}/profile/createReact`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artId }),
      });
      if (!res.ok) throw new Error("Failed to react");
      const data = await res.json();

      setLikes((prev) => {
        const next = (prev[artId] || 0) + (data.removed ? -1 : 1);
        return { ...prev, [artId]: Math.max(0, next) };
      });

      try {
        const res2 = await fetch(`${API}/profile/getReact`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ artId }),
        });
        if (res2.ok) {
          const d2 = await res2.json();
          const exact = Array.isArray(d2.reactions) ? d2.reactions.length : 0;
          setLikes((prev) => ({ ...prev, [artId]: exact }));
        }
      } catch {}
    } catch (err) {
      console.error(err);
    } finally {
      setLiking((s) => ({ ...s, [artId]: false }));
    }
  };

  const handleComment = async (artId, text) => {
    if (commenting[artId]) return;
    setCommenting((s) => ({ ...s, [artId]: true }));
    try {
      const body = (text || "").trim();
      if (!body) return;
      const res = await fetch(`${API}/profile/createComment`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artId, text: body }),
      });
      if (!res.ok) throw new Error("Failed to comment");
      setComments((prev) => ({ ...prev, [artId]: (prev[artId] || 0) + 1 }));
    } catch (e) {
      console.error(e);
    } finally {
      setCommenting((s) => ({ ...s, [artId]: false }));
    }
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="pSectionBar">
          <h2 className="pSectionTitle">{title}</h2>
          {showStats && (
            <div className="pArtStats">
              <span className="pArtCount">...</span>
              <span className="pArtLabel">loading</span>
            </div>
          )}
        </div>
        <div className="pArtGrid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="pArtCard loading">
              <div className="pArtImageWrapper">
                <div className="pArtSkeleton"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="pSectionBar">
        <h2 className="pSectionTitle">{title}</h2>
      </div>

      {arts.length > 0 ? (
        <div className="pArtGrid">
          {arts.map((art, index) => (
            <div
              key={art.artId || art.id || index}
              className="pArtCard"
              onClick={() => handleArtClick(art, index)}
            >
              <div className="pArtImageWrapper">
                <img
                  src={art.image || art.src || art.url}
                  alt={art.description || art.title || art.alt || `Artwork ${index + 1}`}
                  className="pArtImage"
                  loading="lazy"
                  onError={handleImageError}
                />
                <div className="pArtOverlay">
                  <div className="pArtInfo">
                    <h3 className="pArtTitle">
                      {art.title || art.description || `Artwork #${index + 1}`}
                    </h3>
                    <p className="pArtDescription">
                      {art.medium || art.description || "Digital Art"}
                    </p>
                    {showActions && (
                      <div className="pArtActions">
                        {onViewArt && (
                          <button
                            className="pArtBtn pArtBtn--view"
                            onClick={(e) => handleViewClick(e, art, index)}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            View
                          </button>
                        )}
                        {onLikeArt && (
                          <button
                            className="pArtBtn pArtBtn--like"
                            onClick={(e) => handleLike(e, art.artId || art.id)}
                            disabled={!!liking[art.artId || art.id]}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                            <span style={{ marginLeft: 6 }}>
                              {likes[art.artId || art.id] || 0}
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        showEmptyState && (
          <div className="pEmptyState">
            <div className="pEmptyIcon">{emptyStateIcon}</div>
            <h3>{emptyStateTitle}</h3>
          </div>
        )
      )}

      {activePost && (
        <ProfileModal
          post={activePost}
          onClose={closeModal}
          onLike={handleLike}
          onComment={handleComment}
          likeCount={likes}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default ArtistArtGallery;
