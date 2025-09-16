// src/pages/Home.jsx

import React, { useEffect, useRef, useState } from "react";
import "./css/home.css";
import MuseoComposer from "./museoComposer";

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
  
  // Image handling states
  const [bg, setBg] = useState({});
  const [ratioClass, setRatioClass] = useState({});
  const [fit, setFit] = useState({});

  // Advanced image load handler
  const onImageLoad = (idx, e) => {
    const img = e.target;
    const ar = img.naturalWidth / img.naturalHeight;
    
    // Determine ratio class based on aspect ratio
    let rClass = "ratio-1-1";
    if (ar >= 1.6) rClass = "ratio-191-1";
    else if (ar <= 0.9) rClass = "ratio-4-5";
    
    setRatioClass((s) => ({ ...s, [idx]: rClass }));
    
    // Determine fit based on image size and aspect ratio
    const box = img.parentElement.getBoundingClientRect();
    const small = img.naturalWidth < box.width || img.naturalHeight < box.height;
    const useContain = small || ar < 0.9 || ar > 2.2;
    
    setFit((s) => ({ ...s, [idx]: useContain ? "contain" : "cover" }));
    
    // Get average color for background
    try {
      const avg = getAverageColorFromImageElement(img);
      setBg((s) => ({ ...s, [idx]: avg }));
    } catch (err) {
      console.warn('Failed to get average color:', err);
    }
  };

  // Fetch posts from API
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/api/homepage/getPost', {
        method: 'GET',
        credentials: 'include', // Include cookies for auth
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch posts: ${response.statusText}`);
      }

      const data = await response.json();
      setPosts(data.posts);
      setError(null);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch posts on component mount
  useEffect(() => {
    fetchPosts();
  }, []);

  // Handle new post creation
  const handleNewPost = (newPostData) => {
    console.log('New post created:', newPostData);
    // Refresh posts after creating new post
    fetchPosts();
  };

  return (
    <div className="page">
      <div className="feed">
        <MuseoHero />
        
        <MuseoComposer onSubmit={handleNewPost} />
        
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
          <div key={post.id} className="card">
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
                <p style={{ margin: 0, color: "#111", lineHeight: 1.5 }}>{post.text}</p>
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
            
            <div className="actions">
              <button className="actionBtn" aria-label="Like">
                <span>❤️</span>
                <span className="actionText">Like</span>
              </button>
              <button className="actionBtn" aria-label="Comment">
                <span>💬</span>
                <span className="actionText">Comment</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
