import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import FullscreenImageViewer from "../components/FullscreenImageViewer";
import "./subPages/css/ArtworkModal.css";

const API = import.meta.env.VITE_API_BASE;


export default function PostModal({
  post,
  onClose,
  onLike,
  onComment,
  likeCount,
  likedPosts, // liked posts from homepage
  currentUser // signed-in user's {name, avatar} (optional)
}) {
  const dialogRef = useRef(null);

  // Local comments state
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentErr, setCommentErr] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [me, setMe] = useState(null); // {name, avatar} from profile
  
  // Like state
  const [isLiked, setIsLiked] = useState(likedPosts?.[post.id] || false);
  const [localLikeCount, setLocalLikeCount] = useState(likeCount?.[post.id] || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [showFullscreen, setShowFullscreen] = useState(false);

  const FALLBACK_AVATAR = import.meta.env.FALLBACKPHOTO_URL || "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/fallbackphoto.png";

  // Update local like count and liked state when homepage data changes
  useEffect(() => {
    setLocalLikeCount(likeCount?.[post.id] || 0);
    setIsLiked(likedPosts?.[post.id] || false);
  }, [likeCount, likedPosts, post.id]);

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

  // Like handler
  const handleLike = async () => {
    if (isLiking) return;
    
    setIsLiking(true);
    try {
      // Optimistic update
      setIsLiked(!isLiked);
      setLocalLikeCount(prev => isLiked ? Number(prev) - 1 : Number(prev) + 1);
      
      // Call parent like handler
      await onLike(post.id);
    } catch (error) {
      // Revert on error
      setIsLiked(likedPosts?.[post.id] || false);
      setLocalLikeCount(likeCount?.[post.id] || 0);
      console.error('Failed to like post:', error);
    } finally {
      setIsLiking(false);
    }
  };

  // Avatar helper + fallback
  const avatarSrc = (u) => {
    const url = u?.avatar;
    return url && /^https?:\/\//i.test(url) ? url : FALLBACK_AVATAR;
  };

  const images = post.images || [post.image];
  
  if (!post) return null;

  const modalContent = (
    <div className="museo-modal-overlay artwork-modal-overlay" onClick={onClose}>
      <div className="museo-modal artwork-modal" onClick={stop}>
        {/* Close Button */}
        <button className="artwork-modal-close" onClick={onClose}>
          ✕
        </button>

        <div className="artwork-modal-content">
          {/* Left Side - Image Gallery */}
          <div className="artwork-modal-gallery">
            <div className={`artwork-main-image ${images.length === 1 ? 'single-image' : ''} ${!showThumbnails ? 'thumbnails-hidden' : ''}`}>
              <img 
                src={images[currentIndex]} 
                alt={post.text || "Post"}
                className="artwork-image"
                onClick={() => setShowFullscreen(true)}
                style={{ cursor: 'pointer' }}
              />
              
              {/* Image Navigation */}
              {images.length > 1 && (
                <>
                  <button 
                    className="artwork-nav-btn artwork-nav-prev"
                    onClick={() => setCurrentIndex(prev => 
                      prev === 0 ? images.length - 1 : prev - 1
                    )}
                  >
                    ‹
                  </button>
                  <button 
                    className="artwork-nav-btn artwork-nav-next"
                    onClick={() => setCurrentIndex(prev => 
                      prev === images.length - 1 ? 0 : prev + 1
                    )}
                  >
                    ›
                  </button>
                  
                  {/* Thumbnail Toggle Button */}
                  <button 
                    className="thumbnail-toggle-btn"
                    onClick={() => setShowThumbnails(!showThumbnails)}
                    title={showThumbnails ? 'Hide thumbnails' : 'Show thumbnails'}
                  >
                    ⋯
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && showThumbnails && (
              <div className={`artwork-thumbnails ${images.length === 1 ? 'single-image' : ''} ${!showThumbnails ? 'hidden' : ''}`}>
                {images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`${post.text || 'Post'} ${index + 1}`}
                    className={`artwork-thumbnail ${index === currentIndex ? 'active' : ''}`}
                    onClick={() => setCurrentIndex(index)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Side - Details and Comments */}
          <div className="artwork-modal-details">
            {/* Artwork Info */}
            <div className="artwork-info">
              <div className="artwork-header">
                <div className="artwork-meta">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="artwork-artist-info">
                      {post.user?.avatar ? (
                        <img 
                          src={avatarSrc(post.user)} 
                          alt={post.user?.name}
                          className="artist-avatar"
                          onError={(e) => {
                            e.currentTarget.src = FALLBACK_AVATAR;
                          }}
                        />
                      ) : (
                        <div className="artist-avatar-placeholder">
                          {post.user?.name?.charAt(0)?.toUpperCase() || 'A'}
                        </div>
                      )}
                      <span className="artwork-artist">{post.user?.name || "Anonymous Artist"}</span>
                    </div>
                    <div style={{ 
                      fontSize: '0.9rem', 
                      color: '#6b4226', 
                      fontWeight: '400',
                      marginLeft: '58px' // Align with name (48px avatar + 10px gap)
                    }}>
                      {post.timestamp}
                    </div>
                  </div>
                </div>
              </div>

              {(post.text || post.description) && (
                <div className="artwork-description">
                  <div className="description-content">
                    <p className="description-text">
                      {post.text || post.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Like and Stats */}
              <div className="artwork-actions">
                <button 
                  className={`museo-btn--pill ${isLiked ? 'liked' : ''}`}
                  onClick={handleLike}
                  disabled={isLiking}
                  style={{ 
                    opacity: isLiking ? 0.6 : 1,
                    cursor: isLiking ? 'not-allowed' : 'pointer'
                  }}
                >
                  <span className="like-icon">
                    {isLiked ? '❤️' : '🤍'}
                  </span>
                  <span className="like-count">{localLikeCount}</span>
                </button>
                <div className="artwork-stats">
                  <span>💬 {comments.length} comments</span>
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div className="artwork-comments">
              <h3 className="comments-title">Comments ({comments.length})</h3>
              
              {/* Add Comment Form */}
              <form className="comment-form" onSubmit={submitComment}>
                <div className="comment-input-wrapper">
                  <textarea
                    className="comment-input"
                    placeholder="Share your thoughts about this post..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows="3"
                    disabled={isSubmittingComment}
                    style={{ 
                      opacity: isSubmittingComment ? 0.6 : 1,
                      cursor: isSubmittingComment ? 'not-allowed' : 'text',
                      resize: 'vertical'
                    }}
                  />
                  <button 
                    type="submit" 
                    className="comment-submit"
                    disabled={!commentText.trim() || isSubmittingComment}
                  >
                    {isSubmittingComment ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </form>

              {/* Comments List */}
              <div className="comments-list">
                {comments.length === 0 ? (
                  <div className="no-comments">
                    <p>No comments yet. Be the first to share your thoughts!</p>
                  </div>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="comment">
                      <div className="comment-avatar">
                        {comment.user?.avatar ? (
                          <img src={avatarSrc(comment.user)} alt={comment.user?.name} />
                        ) : (
                          <div className="comment-avatar-placeholder">
                            {comment.user?.name?.charAt(0)?.toUpperCase() || 'A'}
                          </div>
                        )}
                      </div>
                      <div className="comment-content">
                        <div className="comment-header">
                          <span className="comment-user">{comment.user?.name || "Anonymous"}</span>
                        </div>
                        <div className="comment-time">{comment.timestamp}</div>
                        <p 
                          className="comment-text"
                          style={{ whiteSpace: 'pre-wrap' }}
                        >
                          {comment.text}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Fullscreen Image Viewer */}
        <FullscreenImageViewer
          isOpen={showFullscreen}
          onClose={() => setShowFullscreen(false)}
          images={images}
          currentIndex={currentIndex}
          onIndexChange={setCurrentIndex}
          alt={post.text || "Post"}
        />
      </div>
    </div>
  );

  // Use React Portal to render modal outside the component tree
  return createPortal(modalContent, document.body);
}
