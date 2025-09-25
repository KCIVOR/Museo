import React, { useEffect, useRef, useState } from "react";
import "./css/home.css";
import MuseoComposer from "./museoComposer";
import PostModal from "./postModal";

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

/* New: Museo hero banner */
function MuseoHero() {
  return (
    <section className="museoHero">
      <div className="mHero__media"></div>
      <div className="mHero__overlay"></div>
      <div className="mHero__content">
        <div className="mHero__eyebrow">Community Showcase</div>
        <h1 className="mHero__title">Discover, share, and celebrate emerging art</h1>
        <p className="mHero__subtitle">Curated picks, community showcases, and open calls year‑round.</p>
        <div className="mHero__ctaRow">
          <button className="mHero__btnPrimary">Join Community</button>
          <button className="mHero__btnGhost">Browse Gallery</button>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const [commenting, setCommenting] = useState({});
  const [liking, setLiking] = useState(false);
  const [comments, setComments] = useState({});
  const [likes, setLikes] = useState({});


  // Image handling states
  const [bg, setBg] = useState({});
  const [ratioClass, setRatioClass] = useState({});
  const [fit, setFit] = useState({});

  // Modal state
  const [activePost, setActivePost] = useState(null);

  // Advanced image load handler
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

    try {
      const avg = getAverageColorFromImageElement(img);
      setBg((s) => ({ ...s, [idx]: avg }));
    } catch (err) {
      console.warn('Failed to get average color:', err);
    }
  };

  const fetchRole = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/users/role", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user: ${response.statusText}`);
      }

      const data = await response.json();
      setRole(data);
      console.log("Fetched user:", data);
    } catch (error) {
      console.error("Error fetching user:", error);
      setUser(null);
    }
  };

  const handlePopUp = (postId) => {
    const p = posts.find(p => p.id === postId);
    if (p) setActivePost(p);
  };


  // Fetch posts from API
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/api/homepage/getPost', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch posts: ${response.statusText}`);
      }

      const data = await response.json();
      setPosts(data.posts);
      
      const reactCounts = {};
      data.reacts?.forEach(r => {
        reactCounts[r.postId] = (reactCounts[r.postId] || 0) + 1;
      });

      setLikes(reactCounts);  

      const commentCounts = {};
      data.comments?.forEach(c => {
        commentCounts[c.postId] = (commentCounts[c.postId] || 0) + 1;
      });
    
      setComments(commentCounts);

      setError(null);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId) => {
    if (liking[postId]) return;

    setLiking((s) => ({ ...s, [postId]: true }));
    try {
      const res = await fetch(
        "http://localhost:3000/api/homepage/createReact",
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to react");
      }

      const data = await res.json();
      console.log("Reaction saved:", data.removed);
      setLikes(prev => ({
        ...prev,
        [postId]: (prev[postId] || 0) + (data.removed ? -1 : 1),
      }));

    } catch (err) {
      console.error(err);
    } finally {
      setLiking((s) => ({ ...s, [postId]: false }));
    }
  };

  const handleComment = async (postId, text) => {
    if (commenting[postId]) return;
    setCommenting(s => ({ ...s, [postId]: true }));

    try {
      const body = (text || "").trim();
      if (!body) return;

      const res = await fetch("http://localhost:3000/api/homepage/createComment", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, text: body }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to comment");
      }

      // Optimistically increment the badge in the feed
      setComments(prev => ({
        ...prev,
        [postId]: (prev[postId] || 0) + 1,
      }));

      // Optionally: ping a lightweight count endpoint if you add one
      // or ignore, since PostModal already refetches full comments.

    } catch (e) {
      console.error(e);
    } finally {
      setCommenting(s => ({ ...s, [postId]: false }));
    }
  };


  useEffect(() => {
    fetchPosts();
    fetchRole();
  }, []);

  const handleNewPost = (newPostData) => {
    console.log('New post created:', newPostData);
    fetchPosts();
  };

  const closeModal = () => setActivePost(null);

  const fetchReactCount = (postId) => {
    alert('getLikeCount not implemented yet');
  }
  return (
    <div className="page">
      <div className="feed">
        <MuseoHero />

        {(role === 'artist' || role === 'admin') && (
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
                <button className="btnPrimary" onClick={fetchPosts}>Retry</button>
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

        {!loading && !error && posts.map((post, idx) => (
          <div
            key={post.id}
            className="card"
            onClick={() => handlePopUp(post.id)}
          >
            <div className="cardHeader">
              <img
                src={post.user.avatar}
                alt={post.user.name}
                className="avatar"
              />
              <div className="meta">
                <div className="name">{post.user.name}</div>
                <div className="desc">{post.timestamp}</div>
              </div>
            </div>

            {post.text && (
              <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                <p class="ge" style={{ margin: 0, color: "#111", lineHeight: 1.5, }}>{post.text}</p>
              </div>
            )}

            {post.image && (
              <div
                className={`imageBox ${ratioClass[idx] || "ratio-1-1"}`}
                style={{ background: bg[idx] || "#f2f4f7" }}
              >
                <img
                  src={post.image}
                  alt="Post content"
                  className={`postImage ${fit[idx] === "contain" ? "postImage--contain" : "postImage--cover"}`}
                  crossOrigin="anonymous"
                  onLoad={(e) => onImageLoad(idx, e)}
                />
              </div>
            )}

            <div className="actions" onClick={(e) => e.stopPropagation()}>
              <button className="actionBtn" aria-label="Like" onClick={() => handleLike(post.id)}>
                <span>❤️{likes[post.id] || 0}</span>

              </button>
              <button className="actionBtn" aria-label="Comment"onClick={() => handlePopUp(post.id)} >
                <span>💬{comments[post.id] || 0}</span>
              </button>
            </div>
          </div>
        ))}

        {activePost && (
        <PostModal
          post={activePost}
          onClose={closeModal}
          onLike={handleLike}
          onComment={handleComment}
          likeCount={likes}
          currentUser={currentUser}
        />
        )}
      </div>
    </div>
  );
}
