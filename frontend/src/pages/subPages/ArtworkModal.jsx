import React, { useState, useEffect } from 'react';
import FullscreenImageViewer from '../../components/FullscreenImageViewer';
import './css/ArtworkModal.css';

const API = import.meta.env.VITE_API_BASE;

const ArtworkModal = ({ artwork, isOpen, onClose, onStatsUpdate }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const [artistProfile, setArtistProfile] = useState(null);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [showFullscreen, setShowFullscreen] = useState(false);

  // Initialize like status and count
  useEffect(() => {
    if (artwork) {
      setCurrentImageIndex(0);
      fetchLikes();
      fetchComments();
      trackView();
      // No need to fetch artist profile separately - it's now included in artwork data
      console.log('Artwork artistProfilePicture:', artwork.artistProfilePicture);
    }
  }, [artwork]);

  const fetchLikes = async () => {
    if (!artwork?.id) return;
    
    try {
      // Fetch reactions for this artwork
      const reactResponse = await fetch(`${API}/gallery/react?galleryArtId=${artwork.id}`, {
        credentials: 'include'
      });
      
      if (reactResponse.ok) {
        const reactData = await reactResponse.json();
        const reactions = reactData.reactions || [];
        setLikeCount(reactions.length);
        
        // Get current user to check if they liked this artwork
        try {
          const userResponse = await fetch(`${API}/profile/getProfile`, {
            credentials: 'include'
          });
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            const currentUserId = userData.profile?.userId;
            
            // Check if current user has liked this artwork
            const userHasLiked = reactions.some(reaction => reaction.userId === currentUserId);
            setIsLiked(userHasLiked);
          }
        } catch (userError) {
          console.error('Error fetching user profile:', userError);
          setIsLiked(false);
        }
      }
    } catch (error) {
      console.error('Error fetching likes:', error);
      setLikeCount(0);
      setIsLiked(false);
    }
  };

  const fetchComments = async () => {
    if (!artwork?.id) return;
    
    try {
      const response = await fetch(`${API}/gallery/comments?galleryArtId=${artwork.id}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    }
  };

  const handleLike = async () => {
    if (!artwork?.id || isLiking) return; // Prevent spam clicking
    
    setIsLiking(true); // Set loading state
    
    // Optimistic update
    const wasLiked = isLiked;
    const prevCount = likeCount;
    
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    
    try {
      const response = await fetch(`${API}/gallery/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          galleryArtId: artwork.id
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle like');
      }
      
      const data = await response.json();
      console.log(`${data.removed ? 'Unliked' : 'Liked'} artwork:`, artwork.title);
      
      // Update the like state based on server response
      setIsLiked(!data.removed);
      
      // Trigger stats update in Gallery component
      if (onStatsUpdate) {
        onStatsUpdate(artwork.id);
      }
      
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert optimistic update on error
      setIsLiked(wasLiked);
      setLikeCount(prevCount);
    } finally {
      setIsLiking(false); // Clear loading state
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !artwork?.id || isSubmittingComment) return; // Prevent spam

    setIsSubmittingComment(true);
    try {
      const response = await fetch(`${API}/gallery/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          galleryArtId: artwork.id,
          content: newComment.trim()
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit comment');
      }
      
      const data = await response.json();
      console.log('Comment submitted successfully:', data);
      
      // Clear the input and refresh comments
      setNewComment('');
      await fetchComments(); // Refresh comments to get the new one with proper formatting
      
      // Trigger stats update in Gallery component
      if (onStatsUpdate) {
        onStatsUpdate(artwork.id);
      }
      
    } catch (error) {
      console.error('Error submitting comment:', error);
      // TODO: Show error message to user
    } finally {
      setIsSubmittingComment(false);
    }
  };


  const trackView = async () => {
    if (!artwork?.id) return;
    
    try {
      const response = await fetch(`${API}/gallery/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          galleryArtId: artwork.id
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setViewCount(data.viewCount);
        console.log(`View tracked for artwork: ${artwork.title}, Total views: ${data.viewCount}`);
        
        // Trigger stats update in Gallery component if it's a new view
        if (onStatsUpdate && !data.alreadyViewed) {
          onStatsUpdate(artwork.id);
        }
      }
    } catch (error) {
      console.error('Error tracking view:', error);
      // Fallback to fetch view count if tracking fails
      fetchViewCount();
    }
  };

  const fetchViewCount = async () => {
    if (!artwork?.id) return;
    
    try {
      const response = await fetch(`${API}/gallery/views?galleryArtId=${artwork.id}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setViewCount(data.viewCount || 0);
      }
    } catch (error) {
      console.error('Error fetching view count:', error);
      setViewCount(0);
    }
  };

  const getImages = () => {
    if (!artwork?.image) return [];
    return Array.isArray(artwork.image) ? artwork.image : [artwork.image];
  };

  // Helper function to format description with proper line breaks
  const formatDescription = (text) => {
    if (!text) return '';
    // Preserve line breaks and format text
    return text.replace(/\n/g, '<br />');
  };

  // Helper function to truncate description
  const getTruncatedDescription = (text, maxLength = 150) => {
    if (!text) return '';
    if (text.length <= maxLength) return formatDescription(text);
    
    // Find a good breaking point (space or punctuation)
    let truncateAt = maxLength;
    const breakPoints = ['. ', '! ', '? ', ', ', ' '];
    
    for (let breakPoint of breakPoints) {
      const lastIndex = text.lastIndexOf(breakPoint, maxLength);
      if (lastIndex > maxLength * 0.7) { // Don't break too early
        truncateAt = lastIndex + breakPoint.length;
        break;
      }
    }
    
    return formatDescription(text.substring(0, truncateAt).trim());
  };

  const images = getImages();

  if (!isOpen || !artwork) return null;

  return (
    <div className="museo-modal-overlay artwork-modal-overlay" onClick={onClose}>
      <div className="museo-modal artwork-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="artwork-modal-close" onClick={onClose}>
          ✕
        </button>

        <div className="artwork-modal-content">
          {/* Left Side - Image Gallery */}
          <div className="artwork-modal-gallery">
            <div className={`artwork-main-image ${images.length === 1 ? 'single-image' : ''} ${!showThumbnails ? 'thumbnails-hidden' : ''}`}>
              <img 
                src={images[currentImageIndex]} 
                alt={artwork.title}
                className="artwork-image"
                onClick={() => setShowFullscreen(true)}
                style={{ cursor: 'pointer' }}
              />
              
              {/* Image Navigation */}
              {images.length > 1 && (
                <>
                  <button 
                    className="artwork-nav-btn artwork-nav-prev"
                    onClick={() => setCurrentImageIndex(prev => 
                      prev === 0 ? images.length - 1 : prev - 1
                    )}
                  >
                    ‹
                  </button>
                  <button 
                    className="artwork-nav-btn artwork-nav-next"
                    onClick={() => setCurrentImageIndex(prev => 
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
                    alt={`${artwork.title} ${index + 1}`}
                    className={`artwork-thumbnail ${index === currentImageIndex ? 'active' : ''}`}
                    onClick={() => setCurrentImageIndex(index)}
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
                <h1 className="artwork-title">{artwork.title}</h1>
                <div className="artwork-meta">
                  <div className="artwork-artist-info">
                    {artwork.artistProfilePicture ? (
                      <img 
                        src={artwork.artistProfilePicture} 
                        alt={artwork.artist}
                        className="artist-avatar"
                      />
                    ) : (
                      <div className="artist-avatar-placeholder">
                        {artwork.artist?.charAt(0)?.toUpperCase() || 'A'}
                      </div>
                    )}
                    <span className="artwork-artist">{artwork.artist}</span>
                  </div>
                  <span className="artwork-year">{artwork.year || new Date(artwork.datePosted).getFullYear()}</span>
                </div>
              </div>

              <div className="artwork-details-grid">
                <div className="artwork-detail">
                  <label>Medium</label>
                  <span>{artwork.medium || 'Mixed Media'}</span>
                </div>
                <div className="artwork-detail">
                  <label>Categories</label>
                  <span>{artwork.categories?.join(', ') || 'Contemporary'}</span>
                </div>
                <div className="artwork-detail">
                  <label>Date Added</label>
                  <span>{new Date(artwork.datePosted).toLocaleDateString()}</span>
                </div>
              </div>

              {artwork.description && (
                <div className="artwork-description">
                  <h3>Description</h3>
                  <div className="description-content">
                    <p 
                      className="description-text"
                      dangerouslySetInnerHTML={{
                        __html: isDescriptionExpanded 
                          ? formatDescription(artwork.description)
                          : getTruncatedDescription(artwork.description)
                      }}
                    />
                    {artwork.description.length > 150 && (
                      <button 
                        className="description-toggle"
                        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                      >
                        {isDescriptionExpanded ? 'Show Less' : 'Show More'}
                      </button>
                    )}
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
                  <span className="like-count">{likeCount}</span>
                </button>
                <div className="artwork-stats">
                  <span>👁️ {viewCount} views</span>
                  <span>💬 {comments.length} comments</span>
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div className="artwork-comments">
              <h3 className="comments-title">Comments ({comments.length})</h3>
              
              {/* Add Comment Form */}
              <form className="comment-form" onSubmit={handleSubmitComment}>
                <div className="comment-input-wrapper">
                  <textarea
                    className="comment-input"
                    placeholder="Share your thoughts about this artwork..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
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
                    disabled={!newComment.trim() || isSubmittingComment}
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
                        {comment.avatar ? (
                          <img src={comment.avatar} alt={comment.user} />
                        ) : (
                          <div className="comment-avatar-placeholder">
                            {comment.user.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="comment-content">
                        <div className="comment-header">
                          <span className="comment-user">{comment.user}</span>
                        </div>
                        <div className="comment-time">{comment.timestamp}</div>
                        <p 
                          className="comment-text"
                          style={{ whiteSpace: 'pre-wrap' }}
                        >
                          {comment.comment}
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
          currentIndex={currentImageIndex}
          onIndexChange={setCurrentImageIndex}
          alt={artwork.title}
        />
      </div>
    </div>
  );
};

export default ArtworkModal;
