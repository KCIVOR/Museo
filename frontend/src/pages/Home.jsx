// src/pages/home.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/home.css";
import MuseoComposer from "./museoComposer";
import PostModal from "./PostModal";
import SetProfileModal from "./SetProfile";
import InterestsSelection from "./InterestsSelection";
import AnnouncementCard from "./AnnouncementCard.jsx";
const API = import.meta.env.VITE_API_BASE;
// Get average color from an image element using canvas
function getAverageColorFromImageElement(img) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const w = 16, h = 16;
  canvas.width = w; canvas.height = h;
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  let r = 0, g = 0, b = 0, n = w * h;
  for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i+1]; b += data[i+2]; }
  return `rgb(${Math.round(r/n)}, ${Math.round(g/n)}, ${Math.round(b/n)})`;
}

function MuseoHero() {
  const navigate = useNavigate();

  const handleBrowseEvents = () => {
    navigate('/Event');
  };

  const handleBrowseGallery = () => {
    navigate('/Gallery');
  };

  return (
    <section className="museoHero">
      <div className="mHero__media"></div>
      <div className="mHero__overlay"></div>
      <div className="mHero__content">
        <div className="mHero__eyebrow">Community Showcase</div>
        <h1 className="mHero__title">Discover, share, and celebrate emerging art</h1>
        <p className="mHero__subtitle">Curated picks, community showcases, and open calls year‑round.</p>
        <div className="mHero__ctaRow">
          <button className="btn-hero" onClick={handleBrowseEvents}>
            Browse Events
          </button>
          <button className="btn-hero-ghost" onClick={handleBrowseGallery}>
            Browse Gallery
          </button>
        </div>
      </div>
    </section>
  );
}

const FALLBACK_AVATAR =
  import.meta.env.FALLBACKPHOTO_URL ||
  "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/profilePicture.png";

// Accept only http(s) URLs, otherwise fallback
function safeAvatar(u) {
  if (u && typeof u === "string" && /^https?:\/\//i.test(u)) return u;
  return FALLBACK_AVATAR;
}

// Detect a hostname; safe against relative URLs
function getHostname(u) {
  try {
    return new URL(u, window.location.origin).hostname;
  } catch {
    return "";
  }
}

// Coerce known-bad hosts to fallback (e.g., via.placeholder.com)
function coerceBrokenAvatar(u) {
  const host = getHostname(u);
  if (/(^|\.)via\.placeholder\.com$/i.test(host)) return FALLBACK_AVATAR;
  return u;
}

function normalizePosts(payload) {
  const fmt = (ts) => {
    try {
      const d = new Date(ts);
      return isNaN(d) ? String(ts ?? "") : d.toLocaleString();
    } catch {
      return String(ts ?? "");
    }
  };
  const rawPosts = payload?.posts || [];
  return rawPosts.map((p) => {
    const avatarRaw =
      p.user?.avatar ??
      p.user?.profilePicture ??
      p.profilePicture ??
      p.authorAvatar ??
      null;

    const name =
      p.user?.name ??
      p.username ??
      p.authorName ??
      "Unknown";

    const safe = safeAvatar(avatarRaw);
    const fixedAvatar = coerceBrokenAvatar(safe);

    return {
      ...p,
      user: {
        id: p.user?.id ?? p.userId ?? "",
        name,
        avatar: fixedAvatar,
      },
      timestamp: fmt(p.timestamp || p.createdAt),
      // Ensure images property exists for carousel
      images: Array.isArray(p.image) ? p.image : (p.image ? [p.image] : []),
    };
  });
}


export default function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [announcements, setAnnouncements] = useState([]);

  const [commenting, setCommenting] = useState({});
  const [liking, setLiking] = useState(false);
  const [comments, setComments] = useState({});
  const [likes, setLikes] = useState({});
  const [likedPosts, setLikedPosts] = useState({}); // Track which posts are liked by current user

  // Image handling states
  const [bg, setBg] = useState({});
  const [ratioClass, setRatioClass] = useState({});
  const [fit, setFit] = useState({});

  // Modal state
  const [activePost, setActivePost] = useState(null);

  // profile modal visibility
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // interests selection modal visibility
  const [showInterestsModal, setShowInterestsModal] = useState(false);

  // Expanded posts state
  const [expandedPosts, setExpandedPosts] = useState({});

  // Advanced image load handler with CORS/canvas safety
  const onImageLoad = (idx, e) => {
    const img = e.target;
    const ar = img.naturalWidth / img.naturalHeight;

    let rClass = "ratio-1-1";
    if (ar >= 1.6) rClass = "ratio-191-1";
    else if (ar <= 0.9) rClass = "ratio-4-5";
    setRatioClass((s) => ({ ...s, [idx]: rClass }));

    const box = img.parentElement.getBoundingClientRect();
    const small = img.naturalWidth < box.width || img.naturalHeight < box.height;
    const useContain = small || ar < 0.9 || ar > 2.2;
    setFit((s) => ({ ...s, [idx]: useContain ? "contain" : "cover" }));

    // Guard against tainted canvas
    try {
      // Try-catch remains, but only read pixels if image is anonymous CORS or same-origin
      const imgHost = getHostname(img.currentSrc || img.src);
      const pageHost = window.location.hostname;
      const sameOrigin = imgHost === "" || imgHost === pageHost;
      const isAnon = img.crossOrigin === "anonymous";

      if (sameOrigin || isAnon) {
        const avg = getAverageColorFromImageElement(img);
        setBg((s) => ({ ...s, [idx]: avg }));
      }
    } catch (err) {
      console.warn("Failed to get average color:", err);
    }
  }; 

  const fetchRole = async () => {
    try {
      const response = await fetch(`${API}/users/role`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) throw new Error(`Failed to fetch user: ${response.statusText}`);
      const data = await response.json();
      setRole(data);
      console.log("Fetched user:", data);
    } catch (error) {
      console.error("Error fetching user:", error);
      setUser(null);
    }
  }; // fetch role ng user para malaman kung artist, user or admin

  const handlePopUp = (postId) => {
    const p = posts.find((p) => p.id === postId);
    if (p) setActivePost(p);
  }; // pop up para sa pinindot na post

  const toggleExpanded = (postId) => {
    setExpandedPosts(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  }; 

  // Fetch posts from API
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/homepage/getPost`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) throw new Error(`Failed to fetch posts: ${response.statusText}`);

      const data = await response.json();
      const normalized = normalizePosts(data);
      setPosts(normalized);
      const anns = Array.isArray(data.announcements)
        ? [...data.announcements].sort((a, b) => {
            const da = new Date(a.datePosted).getTime() || 0;
            const db = new Date(b.datePosted).getTime() || 0;
            return db - da; // newest first
          })
        : [];
      setAnnouncements(anns);

      const reactCounts = {};
      (data.reacts || []).forEach((r) => {
        reactCounts[r.postId] = (reactCounts[r.postId] || 0) + 1;
      });
      setLikes(reactCounts);

      const commentCounts = {};
      (data.comments || []).forEach((c) => {
        commentCounts[c.postId] = (commentCounts[c.postId] || 0) + 1;
      });
      setComments(commentCounts);

      setError(null);
    } catch (err) {
      console.error("Error fetching posts:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }; 

  const handleLike = async (postId) => {
    if (liking[postId]) return;
    setLiking((s) => ({ ...s, [postId]: true }));
    try {
      const res = await fetch(`${API}/homepage/createReact`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to react");
      }
      const data = await res.json();
      setLikes((prev) => ({
        ...prev,
        [postId]: (prev[postId] || 0) + (data.removed ? -1 : 1),
      }));
      // Update liked state
      setLikedPosts((prev) => ({
        ...prev,
        [postId]: !data.removed, // true if like was added, false if removed
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLiking((s) => ({ ...s, [postId]: false }));
    }
  }; //para sa likes ni sabi ni ron

  const handleComment = async (postId, text) => {
    if (commenting[postId]) return;
    setCommenting((s) => ({ ...s, [postId]: true }));
    try {
      const body = (text || "").trim();
      if (!body) return;

      const res = await fetch(`${API}/homepage/createComment`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, text: body }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to comment");
      }

      setComments((prev) => ({
        ...prev,
        [postId]: (prev[postId] || 0) + 1,
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setCommenting((s) => ({ ...s, [postId]: false }));
    }
  }; // para sa coment

  const checkProfile = async () => {
    try {
      const res = await fetch(`${API}/profile/profileStatus`, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        console.warn("Profile status request failed:", res.status, res.statusText);
        // Fail-open so the user can set up profile
        setShowProfileModal(true);
        return;
      }

      const data = await res.json();
      console.log("Profile status:", data);
      
      if (data.profileStatus === false){
        console.log("Profile needs setup");
        setShowProfileModal(true);
        return; // Don't check preferences if profile isn't set up yet
      }

      // If profile is set up, check art preferences
      await checkArtPreferences();

    } catch (err) {
      console.error("Error checking profile:", err);
      setShowProfileModal(true);
    }
  };  //checking profile kung nakapag setup naba or no

  const checkArtPreferences = async () => {
    try {
      const res = await fetch(`${API}/profile/artPreferenceStatus`, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        console.warn("Art preference status request failed:", res.status, res.statusText);
        // If API fails, show interests modal to be safe
        setShowInterestsModal(true);
        return;
      }

      const data = await res.json();
      console.log("Art preference status:", data);
      
      if (data.preferenceStatus === false || !data.preferenceStatus) {
        console.log("Art preferences need setup");
        setShowInterestsModal(true);
      }

    } catch (err) {
      console.error("Error checking art preferences:", err);
      // If there's an error, show the modal to ensure preferences are set
      setShowInterestsModal(true);
    }
  };

  const handleInterestsComplete = (selectedInterests) => {
    // Only close modal if interests were actually selected (not null)
    if (selectedInterests !== null) {
      console.log("Interests selection completed:", selectedInterests);
      setShowInterestsModal(false);
    } else {
      console.log("Interests selection cancelled, keeping modal open");
      // Modal stays open - user must select interests
    }
  };

  useEffect(() => {
    checkProfile();
    fetchPosts();
    fetchRole();
  }, []);

  const handleNewPost = (newPostData) => {
    console.log("New post created:", newPostData);
    fetchPosts();
  };

  const closeModal = () => {
    setActivePost(null);
    fetchPosts(); // re-fetch posts after modal closes
  };

  return (
    <div className="page">
      <div className="feed">
        <MuseoHero />

        {(role === "artist" || role === "admin") && (
          <MuseoComposer onSubmit={handleNewPost} />
        )}

        {loading && (
          <div className="card">
            <div className="cardHeader">
              <div className="loading">Loading posts...</div>
            </div>
          </div>
        )}

        {error && (
          <div className="card">
            <div className="cardHeader">
              <div className="error">
                <p>Error: {error}</p>
                <button className="btnPrimary" onClick={fetchPosts}>
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="card">
            <div className="cardHeader">
              <div className="no-posts">
                <p>No posts yet. Be the first to share something!</p>
              </div>
            </div>
          </div>
        )}

        {/* Unified feed: announcements + regular posts sorted by datePosted desc */}
        {!loading && !error && [...(announcements||[]), ...(posts||[])]
          .sort((a, b) => {
            const da = new Date(a.datePosted).getTime() || 0;
            const db = new Date(b.datePosted).getTime() || 0;
            return db - da;
          })
          .map((item, idx) => (
            item.isAnnouncement ? (
              <AnnouncementCard key={`ann-${item.id || idx}`} post={item} />
            ) : (
            <div
              key={item.id}
              className="card"
              onClick={() => handlePopUp(item.id)}
            >
              <div className="cardHeader">
                <img
                  src={item.user.avatar || FALLBACK_AVATAR}
                  onError={(e) => {
                    if (e.currentTarget.src !== FALLBACK_AVATAR) {
                      e.currentTarget.src = FALLBACK_AVATAR;
                    }
                  }}
                  alt={item.user.name}
                  className="avatar"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                />
                <div className="meta">
                  <div className="name">{item.user.name}</div>
                  <div className="desc">{item.timestamp}</div>
                </div>
              </div>

              {item.text && (
                <div
                  style={{
                    padding: "10px 12px",
                    borderTop: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <p
                    className="ge"
                    style={{ margin: 0, color: "#111", lineHeight: 1.5 }}
                  >
                    {(() => {
                      const maxLength = 150;
                      const isExpanded = expandedPosts[item.id];
                      const shouldTruncate = item.text.length > maxLength;
                      
                      if (!shouldTruncate) {
                        return item.text;
                      }
                      
                      if (isExpanded) {
                        return (
                          <>
                            {item.text}
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpanded(item.id);
                              }}
                              style={{
                                color: '#888',
                                cursor: 'pointer',
                                marginLeft: '5px',
                                fontSize: '13px'
                              }}
                            >
                              see less
                            </span>
                          </>
                        );
                      } else {
                        return (
                          <>
                            {item.text.substring(0, maxLength)}...
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpanded(item.id);
                              }}
                              style={{
                                color: '#888',
                                cursor: 'pointer',
                                marginLeft: '5px',
                                fontSize: '13px'
                              }}
                            >
                              see more
                            </span>
                          </>
                        );
                      }
                    })()}
                  </p>
                </div>
              )}

              {item.image && (
                <div
                  className={`imageBox ${ratioClass[idx] || "ratio-1-1"}`}
                  style={{ background: bg[idx] || "#f2f4f7" }}
                >
                  {/* Handle both single image (string) and multiple images (array) */}
                  <img
                    src={Array.isArray(item.image) ? item.image[0] : item.image}
                    alt="Post content"
                    className={`postImage ${
                      fit[idx] === "contain" ? "postImage--contain" : "postImage--cover"
                    }`}
                    crossOrigin="anonymous"
                    onLoad={(e) => onImageLoad(idx, e)}
                    onError={(e) => {
                      // Hide broken content image to keep layout clean
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  {/* Show indicator if multiple images */}
                  {Array.isArray(item.image) && item.image.length > 1 && (
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'rgba(0,0,0,0.8)',
                      color: 'white',
                      padding: '6px 10px',
                      borderRadius: '16px',
                      fontSize: '13px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      backdropFilter: 'blur(4px)'
                    }}>
                      <span style={{ fontSize: '14px', color: 'white' }}>📷</span>
                      <span style={{ color: 'white' }}>{item.image.length}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Elegant Action Bar */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  padding: '12px 16px',
                  borderTop: '1px solid rgba(107, 66, 38, 0.1)',
                  background: 'var(--museo-white)',
                  gap: '12px'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Like Button - PostModal Style */}
                <button
                  className={`museo-btn--pill ${likedPosts[item.id] ? 'liked' : ''}`}
                  onClick={() => handleLike(item.id)}
                  disabled={liking[item.id]}
                  style={{ 
                    opacity: liking[item.id] ? 0.6 : 1,
                    cursor: liking[item.id] ? 'not-allowed' : 'pointer'
                  }}
                  aria-label="Like post"
                >
                  <span className="like-icon">
                    {likedPosts[item.id] ? '❤️' : '🤍'}
                  </span>
                  <span className="like-count">{likes[item.id] || 0}</span>
                </button>

                {/* Comment Stats - PostModal Style */}
                <div 
                  className="museo-btn--pill"
                  onClick={() => handlePopUp(item.id)}
                  style={{ cursor: 'pointer' }}
                  aria-label="View comments"
                >
                  <span style={{ fontSize: '1rem' }}>💬</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                    {comments[item.id] || 0} comments
                  </span>
                </div>
              </div>
            </div>
            )
          ))}

        {activePost && (
          <PostModal
            post={activePost}
            onClose={closeModal}
            onLike={handleLike}
            onComment={handleComment}
            likeCount={likes}
            likedPosts={likedPosts}
            currentUser={currentUser}
          />
        )}
      </div>

      {/* Show profile editor conditionally */}
      <SetProfileModal
        open={showProfileModal}
        onClose={() => {
          setShowProfileModal(false);
          // Recheck profile status after closing
          checkProfile();
        }}
        initial={null}
      />

      {/* Show interests selection modal conditionally */}
      <InterestsSelection
        isOpen={showInterestsModal}
        onClose={handleInterestsComplete}
      />
    </div>
  );
}
