import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const API = import.meta.env.VITE_API_BASE;

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

// Artistic Museum Carousel Component
function ImageCarousel({ images, avgBg, ratioClass, fitClass, onModalImgLoad }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoadStates, setImageLoadStates] = useState({});
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);

  const handleImageLoad = (e, index) => {
    setImageLoadStates(prev => ({ ...prev, [index]: true }));
    if (index === currentIndex) {
      onModalImgLoad(e);
    }
  };

  const nextImage = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const prevImage = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const goToImage = (index) => {
    if (isTransitioning || index === currentIndex) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const openFullscreen = () => {
    setShowFullscreen(true);
  };

  const closeFullscreen = () => {
    setShowFullscreen(false);
  };

  if (!images || images.length === 0) return null;

  return (
    <div style={{
      position: 'relative',
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 0,
      overflow: 'hidden'
    }}>
      {/* Simple Museum Frame */}
      <div style={{
        padding: '12px',
        background: 'linear-gradient(145deg, #f8f5f0 0%, #ede7db 100%)',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12), inset 0 1px 2px rgba(255,255,255,0.8)',
        border: '2px solid var(--museo-accent)',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px',
        maxHeight: '600px',
        position: 'relative'
      }}>

        {/* Main Artwork Display */}
        <div
          style={{ 
            background: avgBg || 'linear-gradient(135deg, #f8f5f0, #ede7db)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: `
              0 8px 32px rgba(0,0,0,0.2),
              inset 0 1px 2px rgba(255,255,255,0.8)
            `,
            border: '3px solid var(--museo-white)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            position: 'relative',
            transition: 'all 0.3s ease',
            minHeight: '400px'
          }}
        >
          <img
            className={`m-popup__img postImage ${fitClass}`}
            src={images[currentIndex]}
            alt=""
            crossOrigin="anonymous"
            onLoad={(e) => handleImageLoad(e, currentIndex)}
            onClick={openFullscreen}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              display: 'block',
              transition: 'opacity 0.3s ease',
              opacity: isTransitioning ? 0.7 : 1,
              cursor: 'pointer',
              margin: '0 auto'
            }}
          />

          {/* Simple Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                disabled={isTransitioning}
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%) !important',
                  background: 'rgba(0,0,0,0.6) !important',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isTransitioning ? 'not-allowed' : 'pointer',
                  color: 'white !important',
                  fontSize: '18px',
                  zIndex: 10,
                  opacity: isTransitioning ? 0.3 : 1,
                  transition: 'none !important',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                ‹
              </button>
              <button
                onClick={nextImage}
                disabled={isTransitioning}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%) !important',
                  background: 'rgba(0,0,0,0.6) !important',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isTransitioning ? 'not-allowed' : 'pointer',
                  color: 'white !important',
                  fontSize: '18px',
                  zIndex: 10,
                  opacity: isTransitioning ? 0.3 : 1,
                  transition: 'none !important',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                ›
              </button>
            </>
          )}
        </div>

        {/* Small Progress Dots */}
        {images.length > 1 && (
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '6px',
            background: 'rgba(0,0,0,0.4)',
            padding: '6px 10px',
            borderRadius: '12px',
            zIndex: 10,
            backdropFilter: 'blur(4px)'
          }}>
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => goToImage(index)}
                disabled={isTransitioning}
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  border: 'none',
                  background: index === currentIndex 
                    ? 'var(--museo-accent)' 
                    : 'rgba(255,255,255,0.6)',
                  transition: 'all 0.3s ease',
                  cursor: isTransitioning ? 'not-allowed' : 'pointer',
                  opacity: isTransitioning ? 0.5 : 1
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Image Modal */}
      {showFullscreen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          onClick={closeFullscreen}
        >
          {/* Close button */}
          <button
            onClick={closeFullscreen}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '24px',
              color: 'white',
              zIndex: 10000
            }}
          >
            ✕
          </button>

          {/* Fullscreen Image */}
          <img
            src={images[currentIndex]}
            alt=""
            style={{
              maxWidth: '95vw',
              maxHeight: '95vh',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          />

          {/* Navigation arrows for fullscreen */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                style={{
                  position: 'absolute',
                  left: '30px',
                  top: '50%',
                  transform: 'translateY(-50%) !important',
                  background: 'rgba(255, 255, 255, 0.2) !important',
                  border: 'none',
                  borderRadius: '50%',
                  width: '60px',
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white !important',
                  fontSize: '24px',
                  zIndex: 10000,
                  transition: 'none !important',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                ‹
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                style={{
                  position: 'absolute',
                  right: '30px',
                  top: '50%',
                  transform: 'translateY(-50%) !important',
                  background: 'rgba(255, 255, 255, 0.2) !important',
                  border: 'none',
                  borderRadius: '50%',
                  width: '60px',
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white !important',
                  fontSize: '24px',
                  zIndex: 10000,
                  transition: 'none !important',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                ›
              </button>
            </>
          )}

          {/* Image counter for fullscreen */}
          {images.length > 1 && (
            <div style={{
              position: 'absolute',
              bottom: '30px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '20px',
              fontSize: '16px',
              fontWeight: '600',
              zIndex: 10000
            }}>
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PostModal({
  post,
  onClose,
  onLike,
  onComment,
  likeCount,
  currentUser // signed-in user's {name, avatar} (optional)
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
  const [me, setMe] = useState(null); // {name, avatar} from profile

  const FALLBACK_AVATAR = import.meta.env.FALLBACKPHOTO_URL || "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/fallbackphoto.png";

  // Load current user's profile for optimistic UI when currentUser prop isn't passed
  useEffect(() => {
    let abort = false;
    if (currentUser) {
      setMe(currentUser);
      return;
    }
    const loadMe = async () => {
      try {
        const res = await fetch(`${API}/profile/getProfile`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch profile");
        const data = await res.json();
        const p = data?.profile || {};
        const name = [p.firstName, p.lastName].filter(Boolean).join(" ") || "You";
        const avatar = p.profilePicture || FALLBACK_AVATAR;
        if (!abort) setMe({ name, avatar });
      } catch (e) {
        if (!abort) setMe({ name: "You", avatar: FALLBACK_AVATAR });
      }
    };
    loadMe();
    return () => {
      abort = true;
    };
  }, [currentUser]);

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
          `${API}/homepage/getComments?postId=${post.id}`,
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
        name: (me?.name || currentUser?.name || "You"),
        avatar: (me?.avatar || currentUser?.avatar || FALLBACK_AVATAR),
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
        `${API}/homepage/getComments?postId=${post.id}`,
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

  const modalContent = (
    <div 
      className="m-popup__scrim" 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)',
        padding: '16px'
      }}
    >
      <section
        className="m-popup__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Post details"
        tabIndex={-1}
        ref={dialogRef}
        onClick={stop}
        style={{
          background: 'linear-gradient(145deg, #faf8f5 0%, #f5f1ea 50%, #ede7db 100%)',
          borderRadius: window.innerWidth > 768 ? '20px' : '16px',
          border: '2px solid var(--museo-accent)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.15), 0 4px 12px rgba(212, 180, 138, 0.2)',
          width: window.innerWidth > 768 ? '95vw' : '98vw',
          maxWidth: window.innerWidth > 768 ? '1200px' : 'none',
          height: window.innerWidth > 768 ? '90vh' : '95vh',
          maxHeight: window.innerWidth > 768 ? '800px' : 'none',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        {/* Decorative Corner Ornaments */}
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          width: '40px',
          height: '40px',
          background: 'radial-gradient(circle, var(--museo-accent) 0%, transparent 70%)',
          borderRadius: '50%',
          opacity: '0.3'
        }} />
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          width: '40px',
          height: '40px',
          background: 'radial-gradient(circle, var(--museo-accent) 0%, transparent 70%)',
          borderRadius: '50%',
          opacity: '0.3'
        }} />

        {/* Elegant Header - Museum Placard Style */}
        <header style={{
          padding: window.innerWidth > 768 ? '20px 24px 16px' : '16px 20px 12px',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,245,240,0.8) 100%)',
          borderBottom: '2px solid var(--museo-accent)',
          position: 'relative'
        }}>
          {/* Close Button - Artistic Style */}
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: window.innerWidth > 768 ? '20px' : '12px',
              right: window.innerWidth > 768 ? '24px' : '16px',
              background: 'linear-gradient(135deg, var(--museo-primary) 0%, var(--museo-accent) 100%)',
              border: 'none',
              borderRadius: '50%',
              width: window.innerWidth > 768 ? '40px' : '32px',
              height: window.innerWidth > 768 ? '40px' : '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: window.innerWidth > 768 ? '18px' : '14px',
              color: 'var(--museo-white)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
            }}
          >
            ✕
          </button>

          {/* Artist Information - Gallery Style */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            marginBottom: '8px'
          }}>
            <div style={{
              position: 'relative',
              padding: '2px',
              background: 'linear-gradient(45deg, var(--museo-accent), var(--museo-primary))',
              borderRadius: '50%'
            }}>
              <img
                src={avatarSrc(post.user)}
                alt=""
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_AVATAR;
                }}
                decoding="async"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--museo-white)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
            </div>
            <div>
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--museo-primary)',
                marginBottom: '2px',
                fontFamily: 'serif'
              }}>
                {post.user?.name || "Anonymous Artist"}
              </div>
              <div style={{
                fontSize: '11px',
                color: 'var(--museo-text-muted)',
                fontStyle: 'italic'
              }}>
                {post.timestamp}
              </div>
            </div>
          </div>

          {/* Decorative Divider */}
          <div style={{
            height: '2px',
            background: 'linear-gradient(90deg, transparent 0%, var(--museo-accent) 20%, var(--museo-accent) 80%, transparent 100%)',
            margin: '0 auto',
            width: '60%',
            opacity: '0.6'
          }} />
        </header>

        {/* Modal Body */}
        <div style={{ 
            flex: 1, 
            overflow: 'hidden',
            padding: window.innerWidth > 768 ? '24px' : '16px',
            display: 'flex',
            gap: window.innerWidth > 768 ? '32px' : '16px',
            flexDirection: window.innerWidth > 768 ? 'row' : 'column'
          }}>
            {/* Main Exhibition Area - With Image */}
            <div style={{ 
              flex: window.innerWidth > 768 ? '2' : '1',
              minWidth: 0,
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Artist Statement - Above Image */}
              {(post.text || post.description) && (
                <div style={{
                  background: 'rgba(248, 245, 240, 0.8)',
                  border: '1px solid var(--museo-gray-200)',
                  borderLeft: '3px solid var(--museo-accent)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  marginBottom: '16px',
                  position: 'relative',
                  flexShrink: 0,
                  maxHeight: '80px',
                  overflow: 'auto'
                }}>
                  <p style={{
                    fontSize: '13px',
                    lineHeight: '1.5',
                    color: 'var(--museo-text-secondary)',
                    margin: '0',
                    fontStyle: 'italic'
                  }}>
                    "{post.text || post.description || ''}"
                  </p>
                </div>
              )}

              {/* Artwork Display with Carousel */}
              <ImageCarousel 
                images={post.images || [post.image]} 
                avgBg={avgBg}
                ratioClass={ratioClass}
                fitClass={fitClass}
                onModalImgLoad={onModalImgLoad}
              />
            </div>

            {/* Right Column - Interactions & Comments */}
            <div style={{ 
              flex: window.innerWidth > 768 ? '1' : 'none',
              minWidth: window.innerWidth > 768 ? '380px' : '0',
              width: window.innerWidth > 768 ? 'auto' : '100%',
              height: window.innerWidth > 768 ? 'auto' : '250px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Comments Section - Scrollable */}
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: 'var(--museo-primary)',
                marginBottom: '16px',
                flexShrink: 0
              }}>
                Comments
              </h3>

              {/* Comment Composer - Fixed */}
              <div style={{
                marginBottom: window.innerWidth > 768 ? '20px' : '12px',
                padding: window.innerWidth > 768 ? '16px' : '12px',
                background: 'var(--museo-cream)',
                borderRadius: window.innerWidth > 768 ? '12px' : '8px',
                border: '1px solid var(--museo-gray-200)',
                flexShrink: 0
              }}>
              <textarea
                placeholder="Add comment…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: window.innerWidth > 768 ? '80px' : '60px',
                  padding: window.innerWidth > 768 ? '12px' : '8px',
                  border: '2px solid var(--museo-border)',
                  borderRadius: '8px',
                  fontSize: window.innerWidth > 768 ? '14px' : '13px',
                  background: 'var(--museo-white)',
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--museo-accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--museo-border)'}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '12px'
              }}>
                <button 
                  onClick={submitComment}
                  style={{
                    background: 'var(--museo-accent)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: 'var(--museo-white)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(212, 180, 138, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  Submit
                </button>
              </div>
            </div>

              {/* Comments List - Scrollable Container */}
              <div style={{
                flex: 1,
                overflow: 'auto',
                paddingRight: '8px'
              }}>
                {loadingComments && (
                  <div style={{ 
                    color: 'var(--museo-text-muted)', 
                    textAlign: 'center',
                    padding: '20px' 
                  }}>
                    Loading comments…
                  </div>
                )}
                {commentErr && (
                  <div style={{ 
                    color: '#ef4444', 
                    textAlign: 'center',
                    padding: '20px' 
                  }}>
                    {commentErr}
                  </div>
                )}
                {!loadingComments && !commentErr && comments.length === 0 && (
                  <div style={{ 
                    color: 'var(--museo-text-muted)', 
                    textAlign: 'center',
                    padding: '20px' 
                  }}>
                    No comments yet.
                  </div>
                )}

                {comments.map((c) => (
                  <div key={c.id} style={{
                    display: 'flex',
                    gap: '12px',
                    marginBottom: '16px',
                    padding: '12px',
                    background: 'var(--museo-white)',
                    borderRadius: '8px',
                    border: '1px solid var(--museo-gray-200)'
                  }}>
                    <img
                      src={avatarSrc(c.user)}
                      alt=""
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_AVATAR;
                      }}
                      loading="lazy"
                      decoding="async"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid var(--museo-accent)',
                        flexShrink: 0
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px'
                      }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: 'var(--museo-primary)'
                        }}>
                          {c.user?.name || "Anonymous"}
                        </span>
                        <span style={{ color: 'var(--museo-text-muted)', fontSize: '12px' }}>•</span>
                        <span style={{ 
                          fontSize: '12px', 
                          color: 'var(--museo-text-muted)' 
                        }}>
                          {c.timestamp}
                        </span>
                      </div>
                      <div style={{
                        fontSize: '14px',
                        lineHeight: '1.5',
                        color: 'var(--museo-text-secondary)'
                      }}>
                        {c.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  // Use React Portal to render modal outside the component tree
  return createPortal(modalContent, document.body);
}
