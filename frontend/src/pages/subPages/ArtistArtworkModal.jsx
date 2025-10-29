import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import FullscreenImageViewer from '../../components/FullscreenImageViewer';
import EditArtworkModal from './EditArtworkModal';
import ConfirmModal from '../ConfirmModal';
import './css/ArtworkModal.css';

const API = import.meta.env.VITE_API_BASE;

const ArtistArtworkModal = ({ artwork, isOpen, onClose, onStatsUpdate }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  
  // Comment pagination state
  const [commentPage, setCommentPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [artistInfo, setArtistInfo] = useState(null);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [openMenus, setOpenMenus] = useState({}); // Track which artwork menus are open
  const [role, setRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [artworkToDelete, setArtworkToDelete] = useState(null);
  
  // Comment menu state
  const [openCommentMenus, setOpenCommentMenus] = useState({});
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch(`${API}/users/me`, {
        method: "GET",
        credentials: "include",
      });
      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData.id);
      }
    } catch (error) {
      setCurrentUser(null);
    }
  };

  const fetchMyRole = async () => {
    try {
      // Fetch user role
      const response = await fetch(`${API}/users/role`, {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(`Failed to fetch user: ${response.statusText}`);
      setRole(data);
    } catch (error) {
      setRole(null);
    }
  };

  // Initialize like status and count
  useEffect(() => {
    if (artwork) {
      setCurrentImageIndex(0);
      fetchCurrentUser();
      fetchMyRole();
      fetchLikes();
      fetchComments(); // Load comments when modal opens
      fetchArtistInfo();
      trackView();
    }
  }, [artwork]);

  // Click outside handler for comment menus
  useEffect(() => {
    const handleClickOutside = (e) => {
      const isClickInsideCommentMenu = e.target.closest('.comment-menu-container');
      if (!isClickInsideCommentMenu && Object.values(openCommentMenus).some(isOpen => isOpen)) {
        setOpenCommentMenus({});
      }
    };
    
    document.addEventListener('click', handleClickOutside, true);
    return () => document.removeEventListener('click', handleClickOutside, true);
  }, [openCommentMenus]);

  // Handle artwork updated from edit modal
  const handleArtworkUpdated = (updatedArtwork) => {
    setIsEditModalOpen(false);
    
    // Refresh parent component data
    if (onStatsUpdate) {
      onStatsUpdate();
    }
    
    // Close the artwork modal and refresh the page to show updated data
    onClose();
    
    // Force a page refresh to ensure all components show updated data
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  // Handle delete artwork (show confirmation)
  const handleDeleteArtwork = (artworkId) => {
    setArtworkToDelete(artwork);
    setShowConfirmDelete(true);
    closeMenu(artworkId);
  };

  // Confirm delete artwork
  const confirmDeleteArtwork = async () => {
    if (!artworkToDelete) return;
    
    try {
      const artworkId = artworkToDelete?.id || artworkToDelete?.artId;
      const response = await fetch(`${API}/profile/art/${artworkId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();
      
      if (response.ok) {
        setShowConfirmDelete(false);
        setArtworkToDelete(null);
        
        // Refresh parent component data
        if (onStatsUpdate) {
          onStatsUpdate();
        }
        
        // Close the artwork modal
        onClose();
        
        // Force a page refresh to ensure all components show updated data
        setTimeout(() => {
          window.location.reload();
        }, 100);
      } else {
        setShowConfirmDelete(false);
        setArtworkToDelete(null);
        alert('Failed to delete artwork: ' + data.error);
      }
    } catch (error) {
      setShowConfirmDelete(false);
      setArtworkToDelete(null);
      alert('Error deleting artwork. Please try again.');
    }
  };

  // Cancel delete artwork
  const cancelDeleteArtwork = () => {
    setShowConfirmDelete(false);
    setArtworkToDelete(null);
  };

  // Toggle menu function
  const toggleMenu = (artworkId, event) => {
    event.stopPropagation();
    setOpenMenus(prev => {
      // If clicking the same menu that's already open, close it
      if (prev[artworkId]) {
        return {
          ...prev,
          [artworkId]: false
        };
      }
      // Otherwise, close all other menus and open this one
      return {
        [artworkId]: true
      };
    });
  };

  const closeMenu = (artworkId) => {
    setOpenMenus(prev => ({
      ...prev,
      [artworkId]: false
    }));
  };

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
          setIsLiked(false);
        }
      }
    } catch (error) {
      setLikeCount(0);
      setIsLiked(false);
    }
  };

  const fetchComments = async (page = 1) => {
    const artworkId = artwork?.id || artwork?.artId;
    if (!artworkId) return;
    
    try {
      // Use profile API for artist artwork comments with pagination
      const response = await fetch(`${API}/profile/getComments?page=${page}&limit=10`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ artId: artworkId })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load comments (${response.status})`);
      }
      
      const data = await response.json();
      
      if (page === 1) {
        setComments(data.comments || []);
      } else {
        setComments(prev => [...prev, ...(data.comments || [])]);
      }
      
      setHasMoreComments(data.hasMore || false);
      setCommentPage(page);
    } catch (error) {
      if (page === 1) {
        setComments([]);
      }
    }
  };

  const loadMoreComments = async () => {
    if (loadingMoreComments || !hasMoreComments) return;
    
    setLoadingMoreComments(true);
    await fetchComments(commentPage + 1);
    setLoadingMoreComments(false);
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
      
      // Update the like state based on server response
      setIsLiked(!data.removed);
      
      // Trigger stats update if provided
      if (onStatsUpdate) {
        onStatsUpdate(artwork.id);
      }
      
    } catch (error) {
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
      
      // Clear the input and refresh comments
      setNewComment('');
      await fetchComments();
      
      // Trigger stats update if provided
      if (onStatsUpdate) {
        onStatsUpdate(artwork.id);
      }
      
    } catch (error) {
      // Error submitting comment
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Comment menu handlers
  const toggleCommentMenu = (commentId, event) => {
    event.stopPropagation();
    setOpenCommentMenus(prev => {
      if (prev[commentId]) return {};
      return { [commentId]: true };
    });
  };

  const handleEditComment = (commentId, currentText) => {
    setEditingCommentId(commentId);
    setEditingCommentText(currentText);
    setOpenCommentMenus({});
  };

  const handleUpdateComment = async (commentId) => {
    const text = editingCommentText.trim();
    if (!text) return;
    
    try {
      const res = await fetch(`${API}/profile/updateComment/${commentId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      if (res.ok) {
        setComments(prev => prev.map(c => 
          c.id === commentId 
            ? { ...c, text, updatedAt: new Date().toISOString() }
            : c
        ));
        setEditingCommentId(null);
        setEditingCommentText("");
      }
    } catch (error) {
      console.error('Failed to update comment:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    
    try {
      const res = await fetch(`${API}/profile/deleteComment/${commentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        setOpenCommentMenus({});
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const handleReportComment = async (commentId) => {
    const reason = window.prompt('Why are you reporting this comment?');
    if (!reason) return;
    
    try {
      const res = await fetch(`${API}/profile/reportComment`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, reason })
      });
      
      if (res.ok) {
        alert('Comment reported successfully');
        setOpenCommentMenus({});
      }
    } catch (error) {
      console.error('Failed to report comment:', error);
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
        
        // Trigger stats update if it's a new view
        if (onStatsUpdate && !data.alreadyViewed) {
          onStatsUpdate(artwork.id);
        }
      }
    } catch (error) {
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
          return;
        }
      }
      
      // Fallback to artwork data if API call fails
      setArtistInfo({
        name: artwork.artist || `User ${artwork.userId}`,
        avatar: artwork.artistProfilePicture || null,
        firstName: artwork.artist?.split(' ')[0] || 'Artist'
      });
      
    } catch (error) {
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
        {/* Header Buttons - Same position as PostModal */}
        <div style={{
          position: 'absolute', 
          top: '20px', 
          right: '20px', 
          display: 'flex', 
          gap: '8px', 
          zIndex: 100 
        }}>
          {/* Dropdown Menu - Same as PostModal */}
          <div
            style={{
              position: 'relative',
              zIndex: 1000
            }}
            className="dropdown-container"
          >
            <button
              className="btn-more"
              onClick={(e) => toggleMenu(artwork?.id || artwork?.artId, e)}
              aria-label="More options"
            >
              ⋯
            </button>
            
            {/* Dropdown Menu */}
            {openMenus[artwork?.id || artwork?.artId] && (
              <div 
                className="dropdown-menu show"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Edit option - for admin or artwork owner */}
                {(role === 'admin' || currentUser === artwork?.userId) && (
                  <button
                    className="dropdown-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      const artworkId = artwork?.id || artwork?.artId;
                      setIsEditModalOpen(true);
                      closeMenu(artworkId);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit
                  </button>
                )}

                {/* Report option - for everyone except artwork owner */}
                {currentUser !== artwork?.userId && (
                  <button
                    className="dropdown-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeMenu(artwork?.id || artwork?.artId);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                      <line x1="4" y1="22" x2="4" y2="15"/>
                    </svg>
                    Report
                  </button>
                )}

                {/* Delete option - for admin or artwork owner */}
                {(role === 'admin' || currentUser === artwork?.userId) && (
                  <button
                    className="dropdown-item danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      const artworkId = artwork?.id || artwork?.artId;
                      handleDeleteArtwork(artworkId);
                      closeMenu(artworkId);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3,6 5,6 21,6"/>
                      <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1 2-2h4a2,2 0 0,1 2,2v2"/>
                      <line x1="10" y1="11" x2="10" y2="17"/>
                      <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Close Button */}
          <button 
            className="btn-x" 
            onClick={onClose}
            style={{
              background: 'rgba(44, 24, 16, 0.8)',
              color: '#f4f1ec',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: 'bold'
            }}
          >
            ✕
          </button>
        </div>

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
                  className={`btn-social like ${isLiked ? 'active' : ''}`}
                  onClick={handleLike}
                  disabled={isLiking}
                  aria-label="Like artwork"
                  style={{ 
                    opacity: isLiking ? 0.6 : 1,
                    cursor: isLiking ? 'not-allowed' : 'pointer'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  <span className="count">{likeCount}</span>
                </button>
                <button className="btn-social comment" aria-label="View comments">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                  <span className="count">{comments.length}</span>
                </button>
                <div className="btn-social view" style={{ cursor: 'default', pointerEvents: 'none' }} aria-label="View count">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <span className="count">{viewCount}</span>
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
                    className="btn btn-primary btn-sm"
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
                    <div key={comment.id} className="comment" style={{ position: 'relative', zIndex: openCommentMenus[comment.id] ? 100 : 1 }}>
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
                        <div className="comment-time">
                          {comment.timestamp}
                          {comment.updatedAt && (
                            <span style={{ marginLeft: '6px', fontStyle: 'italic', color: 'var(--museo-text-muted)', fontSize: '12px' }}>
                              (edited)
                            </span>
                          )}
                        </div>
                        
                        {editingCommentId === comment.id ? (
                          <div style={{ marginTop: '8px' }}>
                            <textarea
                              value={editingCommentText}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                              style={{ width: '100%', minHeight: '60px', padding: '8px', border: '1px solid var(--museo-border)', borderRadius: '6px', fontFamily: 'Georgia, Times New Roman, serif', fontSize: '14px', resize: 'vertical' }}
                            />
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                              <button onClick={() => handleUpdateComment(comment.id)} className="btn-primary btn-sm">Save</button>
                              <button onClick={handleCancelEdit} className="btn-secondary btn-sm">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <p className="comment-text" style={{ whiteSpace: 'pre-wrap' }}>
                            {comment.text || comment.comment}
                          </p>
                        )}
                      </div>
                      
                      {/* Comment Menu */}
                      <div className="comment-menu-container" style={{ position: 'absolute', top: '8px', right: '8px' }}>
                        <button onClick={(e) => toggleCommentMenu(comment.id, e)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px', fontSize: '18px', color: 'var(--museo-text-muted)', lineHeight: 1 }}>⋯</button>
                        
                        {openCommentMenus[comment.id] && (
                          <div className="dropdown-menu show" onClick={(e) => e.stopPropagation()} style={{ zIndex: 9999 }}>
                            {/* Edit option - for admin or comment owner */}
                            {(role === 'admin' || currentUser === comment.user?.id) && (
                              <button
                                className="dropdown-item"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditComment(comment.id, comment.text || comment.comment);
                                }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                  <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                                Edit
                              </button>
                            )}
                            
                            {/* Delete option - for admin or comment owner */}
                            {(role === 'admin' || currentUser === comment.user?.id) && (
                              <button
                                className="dropdown-item danger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteComment(comment.id);
                                }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3,6 5,6 21,6"/>
                                  <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                                  <line x1="10" y1="11" x2="10" y2="17"/>
                                  <line x1="14" y1="11" x2="14" y2="17"/>
                                </svg>
                                Delete
                              </button>
                            )}
                            
                            {/* Report option - for all users except artwork owner and comment owner, OR admin */}
                            {((currentUser !== artwork?.userId && currentUser !== comment.user?.id) || role === 'admin') && (
                              <button
                                className="dropdown-item"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReportComment(comment.id);
                                }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                                  <line x1="4" y1="22" x2="4" y2="15"/>
                                </svg>
                                Report
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                
                {/* Load More Button */}
                {hasMoreComments && (
                  <div style={{ 
                    textAlign: 'center',
                    marginTop: '20px',
                    paddingTop: '20px',
                    borderTop: '1px solid rgba(212, 180, 138, 0.15)'
                  }}>
                    <button
                      onClick={loadMoreComments}
                      disabled={loadingMoreComments}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--museo-primary)',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: loadingMoreComments ? 'not-allowed' : 'pointer',
                        opacity: loadingMoreComments ? 0.6 : 1,
                        padding: '8px 16px'
                      }}
                    >
                      {loadingMoreComments ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Fullscreen Image Viewer */}
        <FullscreenImageViewer
          isOpen={showFullscreen}
          images={images}
          onClose={() => setShowFullscreen(false)}
          currentIndex={currentImageIndex}
          onIndexChange={setCurrentImageIndex}
          alt={artwork.title}
        />

        {/* Edit Artwork Modal */}
        <EditArtworkModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          artwork={artwork}
          onArtworkUpdated={handleArtworkUpdated}
        />

        {/* Confirm Delete Modal */}
        <ConfirmModal
          open={showConfirmDelete}
          title="Delete Artwork"
          message={`Are you sure you want to delete "${artworkToDelete?.title || 'this artwork'}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDeleteArtwork}
          onCancel={cancelDeleteArtwork}
        />
      </div>
    </div>,
    document.body
  );
};
export default ArtistArtworkModal;
