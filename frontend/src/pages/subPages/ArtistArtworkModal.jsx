import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import FullscreenImageViewer from '../../components/FullscreenImageViewer';
import './css/ArtworkModal.css';

const API = import.meta.env.VITE_API_BASE;

const ArtistArtworkModal = ({ artwork, isOpen, onClose, onStatsUpdate }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [artistInfo, setArtistInfo] = useState(null);
  const [showFullscreen, setShowFullscreen] = useState(false);

  // Initialize like status and count
  useEffect(() => {
    if (artwork) {
      setCurrentImageIndex(0);
      fetchLikes();
      fetchComments();
      fetchArtistInfo();
      trackView();
      console.log('Artist Artwork Modal opened for:', artwork);
      console.log('Artwork ID:', artwork.id || artwork.artId);
      console.log('Artwork title:', artwork.title);
    }
  }, [artwork]);

  const fetchLikes = async () => {
    const artworkId = artwork?.id || artwork?.artId;
    if (!artworkId) return;
    
    try {
      // Use profile API for artist artworks
      const reactResponse = await fetch(`${API}/profile/getReact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          artId: artworkId
        })
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
    const artworkId = artwork?.id || artwork?.artId;
    if (!artworkId) return;
    
    try {
      // Use profile API for artist artwork comments (same as ProfileModal)
      const response = await fetch(`${API}/profile/getComments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          artId: artworkId
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load comments (${response.status})`);
      }
      
      const data = await response.json();
      console.log('Comments data received:', data);
      setComments(data.comments || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    }
  };

  const handleLike = async () => {
    const artworkId = artwork?.id || artwork?.artId;
    if (!artworkId || isLiking) return;
    
    setIsLiking(true);
    
    // Optimistic update
    const wasLiked = isLiked;
    const prevCount = likeCount;
    
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    
    try {
      const response = await fetch(`${API}/profile/createReact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          artId: artworkId
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle like');
      }
      
      const data = await response.json();
      console.log(`${data.removed ? 'Unliked' : 'Liked'} artist artwork:`, artwork.title);
      
      // Update the like state based on server response
      setIsLiked(!data.removed);
      
      // Trigger stats update if provided
      if (onStatsUpdate) {
        onStatsUpdate(artwork.id);
      }
      
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert optimistic update on error
      setIsLiked(wasLiked);
      setLikeCount(prevCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    const artworkId = artwork?.id || artwork?.artId;
    if (!newComment.trim() || !artworkId || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const response = await fetch(`${API}/profile/createComment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          artId: artworkId,
          text: newComment.trim()
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit comment');
      }
      
      const data = await response.json();
      console.log('Comment submitted successfully:', data);
      
      // Clear the input and refresh comments
      setNewComment('');
      await fetchComments();
      
      // Trigger stats update if provided
      if (onStatsUpdate) {
        onStatsUpdate(artwork.id);
      }
      
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const trackView = async () => {
    const artworkId = artwork?.id || artwork?.artId;
    if (!artworkId) return;
    
    try {
      const response = await fetch(`${API}/profile/trackView`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          artId: artworkId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setViewCount(data.viewCount);
        console.log(`View tracked for artist artwork: ${artwork.title}, Total views: ${data.viewCount}`);
        
        // Trigger stats update if it's a new view
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
    const artworkId = artwork?.id || artwork?.artId;
    if (!artworkId) return;
    
    try {
      const response = await fetch(`${API}/profile/getViews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          artId: artworkId
        })
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

  const fetchArtistInfo = async () => {
    // First try to use existing artwork data if available
    if (artwork?.artist && artwork?.artistProfilePicture) {
      setArtistInfo({
        name: artwork.artist,
        avatar: artwork.artistProfilePicture,
        firstName: artwork.artist.split(' ')[0] || 'Artist'
      });
      return;
    }
    
    if (!artwork?.userId) {
      console.log('No userId found in artwork:', artwork);
      // Set fallback info
      setArtistInfo({
        name: artwork?.artist || 'Anonymous Artist',
        avatar: null,
        firstName: artwork?.artist?.split(' ')[0] || 'Artist'
      });
      return;
    }
    
    try {
      // Fetch artist profile from the new getUserProfile endpoint
      console.log('Fetching artist info for userId:', artwork.userId);
      
      const response = await fetch(`${API}/profile/getUserProfile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: artwork.userId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const profile = data.profile;
        if (profile) {
          const fullName = [profile.firstName, profile.middleName, profile.lastName]
            .filter(Boolean)
            .join(' ') || 'Anonymous Artist';
          
          setArtistInfo({
            name: fullName,
            avatar: profile.profilePicture,
            firstName: profile.firstName
          });
          console.log('Artist info fetched from API:', { name: fullName, avatar: profile.profilePicture });
          return;
        }
      }
      
      // Fallback to artwork data if API call fails
      setArtistInfo({
        name: artwork.artist || `User ${artwork.userId}`,
        avatar: artwork.artistProfilePicture || null,
        firstName: artwork.artist?.split(' ')[0] || 'Artist'
      });
      
      console.log('Artist info set from artwork fallback:', {
        name: artwork.artist || `User ${artwork.userId}`,
        avatar: artwork.artistProfilePicture
      });
      
    } catch (error) {
      console.error('Error fetching artist info:', error);
      setArtistInfo({
        name: artwork.artist || 'Anonymous Artist',
        avatar: artwork.artistProfilePicture || null,
        firstName: artwork.artist?.split(' ')[0] || 'Artist'
      });
    }
  };

  const getImages = () => {
    if (!artwork?.image) return [];
    return Array.isArray(artwork.image) ? artwork.image : [artwork.image];
  };

  // Helper function to format description with proper line breaks
  const formatDescription = (text) => {
    if (!text) return '';
    return text.replace(/\n/g, '<br />');
  };

  // Helper function to truncate description
  const getTruncatedDescription = (text, maxLength = 150) => {
    if (!text) return '';
    if (text.length <= maxLength) return formatDescription(text);
    
    let truncateAt = maxLength;
    const breakPoints = ['. ', '! ', '? ', ', ', ' '];
    
    for (let breakPoint of breakPoints) {
      const lastIndex = text.lastIndexOf(breakPoint, maxLength);
      if (lastIndex > maxLength * 0.7) {
        truncateAt = lastIndex + breakPoint.length;
        break;
      }
    }
    
    return formatDescription(text.substring(0, truncateAt).trim());
  };

  const images = getImages();

  if (!isOpen || !artwork) return null;

  return createPortal(
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
                    {artistInfo?.avatar ? (
                      <img 
                        src={artistInfo.avatar} 
                        alt={artistInfo.name}
                        className="artist-avatar"
                        onError={(e) => {
                          e.currentTarget.src = 'https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/fallbackphoto.png';
                        }}
                      />
                    ) : (
                      <div className="artist-avatar-placeholder">
                        {artistInfo?.firstName?.charAt(0)?.toUpperCase() || 
                         artwork.artist?.charAt(0)?.toUpperCase() || 'A'}
                      </div>
                    )}
                    <span className="artwork-artist">
                      by {artistInfo?.name || artwork.artist || 'Anonymous Artist'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="artwork-details-grid">
                <div className="artwork-detail">
                  <label>Medium</label>
                  <span>{artwork.medium || 'Mixed Media'}</span>
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
                        {comment.user?.avatar ? (
                          <img 
                            src={comment.user.avatar} 
                            alt={comment.user?.name || 'User'}
                            onError={(e) => {
                              e.currentTarget.src = 'https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/fallbackphoto.png';
                            }}
                          />
                        ) : (
                          <div className="comment-avatar-placeholder">
                            {comment.user?.name ? comment.user.name.charAt(0).toUpperCase() : '?'}
                          </div>
                        )}
                      </div>
                      <div className="comment-content">
                        <div className="comment-header">
                          <span className="comment-user">{comment.user?.name || 'Anonymous User'}</span>
                        </div>
                        <div className="comment-time">{comment.timestamp}</div>
                        <p 
                          className="comment-text"
                          style={{ whiteSpace: 'pre-wrap' }}
                        >
                          {comment.text || comment.comment}
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
    </div>,
    document.body
  );
};

export default ArtistArtworkModal;
