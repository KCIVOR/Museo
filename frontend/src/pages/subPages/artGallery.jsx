import React, { useEffect, useState } from 'react';
import ArtistArtworkModal from "./ArtistArtworkModal";
const API = import.meta.env.VITE_API_BASE;

const ArtGallery = ({
  arts = [],
  title = "Gallery",
  showStats = true,
  showActions = true,
  showEmptyState = true,
  showUpload = false,
  onUploadRequest = null,
  emptyStateIcon = "🎨",
  emptyStateTitle = "No artwork yet",
  emptyStateMessage = "Start creating and upload your first masterpiece!",
  onViewArt = null,
  onLikeArt = null,
  onArtClick = null,
  onModalClose = null,
  className = "",
  loading = false,
  fallbackImage = null,
  currentUser = null
}) => {
  // Modal state
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [isArtworkModalOpen, setIsArtworkModalOpen] = useState(false);
  const [likes, setLikes] = useState({});
  const [commenting, setCommenting] = useState({});
  const [comments, setComments] = useState({});
  const [liking, setLiking] = useState(false);


  const handleArtClick = (art, index) => {
    // Convert art data to artwork format for ArtistArtworkModal
    const artworkData = {
      id: art.artId || art.id || `art-${index}`,
      title: art.title || art.description || `Artwork #${index + 1}`,
      description: art.description || art.medium || "",
      image: Array.isArray(art.image) ? art.image : [art.image || art.src || art.url],
      medium: art.medium || "Mixed Media",
      datePosted: art.datePosted || art.timestamp || new Date().toISOString(),
      artist: art.artistName || currentUser?.name || "Artist",
      artistProfilePicture: art.artistAvatar || currentUser?.avatar || null,
      views: art.views || 0
    };
    
    setSelectedArtwork(artworkData);
    setIsArtworkModalOpen(true);
    
    if (onArtClick) {
      onArtClick(art, index);
    }
  };

  const handleViewClick = (e, art, index) => {
    e.stopPropagation();
    handleArtClick(art, index); // Open modal on view click too
    
    if (onViewArt) {
      onViewArt(art, index);
    }
  };



  const handleImageError = (e) => {
    if (fallbackImage) {
      e.target.src = fallbackImage;
    }
  };

  const handleUploadClick = () => {
    if (onUploadRequest) onUploadRequest();
    else console.log('Upload button clicked');
  };

  const closeModal = () => {
    setSelectedArtwork(null);
    setIsArtworkModalOpen(false);
    
    // Notify parent component that modal closed (for data refresh)
    if (onModalClose) {
      onModalClose();
    }
  };

  const handleStatsUpdate = async (artworkId) => {
    // Refresh like count for this artwork
    try {
      const res = await fetch(`${API}/profile/getReact`, {
        method: "POST",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artId: artworkId }),
      });
      if (res.ok) {
        const data = await res.json();
        const exactCount = Array.isArray(data.reactions) ? data.reactions.length : 0;
        setLikes((prev) => ({ ...prev, [artworkId]: exactCount }));
      }
    } catch (error) {
      console.error('Error refreshing stats:', error);
    }
  };

  // Initialize like counts when arts change
  useEffect(() => {
    let abort = false;
    const init = async () => {
      const entries = await Promise.all(
        (arts || []).map(async (art) => {
          const artId = art.artId || art.id;
          if (!artId) return [null, 0];
          try {
            const res = await fetch(`${API}/profile/getReact`, {
              method: "POST",
              credentials: 'include',
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ artId }),
            });
            if (!res.ok) throw new Error('failed');
            const data = await res.json();
            return [artId, Array.isArray(data.reactions) ? data.reactions.length : 0];
          } catch {
            return [artId, 0];
          }
        })
      );
      if (abort) return;
      const next = {};
      for (const [id, count] of entries) {
        if (id) next[id] = count;
      }
      setLikes(next);
    };
    init();
    return () => { abort = true; };
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
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to react");
      }
      const data = await res.json();
      // Optimistic update with clamp
      setLikes((prev) => {
        const next = (prev[artId] || 0) + (data.removed ? -1 : 1);
        return { ...prev, [artId]: Math.max(0, next) };
      });

      // Reconcile exact count from backend
      await handleStatsUpdate(artId);
    } catch (err) {
      console.error(err);
    } finally {
      setLiking((s) => ({ ...s, [artId]: false }));
    }
  }; //para sa likes ni sabi ni ron

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
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to comment");
      }

      setComments((prev) => ({
        ...prev,
        [artId]: (prev[artId] || 0) + 1,
      }));

      // Trigger stats update for the modal
      await handleStatsUpdate(artId);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {showStats && (
              <div className="pArtStats">
                <span className="pArtCount">...</span>
                <span className="pArtLabel">loading</span>
              </div>
            )}
            {showUpload && (
              <button className="btn-upload btn-lg" disabled>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7,10 12,15 17,10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Upload
              </button>
            )}
          </div>
        </div>
        <div className="pArtGrid">
          {[...Array(6)].map((_, index) => (
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {showStats && arts.length > 0 && (
            <div className="pArtStats">
              <span className="pArtCount">{arts.length}</span>
              <span className="pArtLabel">
                {arts.length === 1 ? 'piece' : 'pieces'}
              </span>
            </div>
          )}
          {showUpload && (
            <button className="btn-upload btn-lg" onClick={handleUploadClick}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Upload
            </button>
          )}
        </div>
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
                  src={Array.isArray(art.image) ? art.image[0] : (art.image || art.src || art.url)} 
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
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                            View
                          </button>
                        )}
                        {onLikeArt && (
                          <button 
                            className={`museo-btn--pill ${likes[(art.artId || art.id)] > 0 ? 'liked' : ''}`}
                            onClick={(e) => handleLike(e, (art.artId || art.id))}
                            disabled={!!liking[(art.artId || art.id)]}
                            style={{ 
                              opacity: liking[(art.artId || art.id)] ? 0.6 : 1,
                              cursor: liking[(art.artId || art.id)] ? 'not-allowed' : 'pointer'
                            }}
                            onMouseEnter={(e) => {
                              if (!liking[(art.artId || art.id)]) {
                                e.target.style.backgroundColor = '#eae3dc';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!liking[(art.artId || art.id)]) {
                                e.target.style.backgroundColor = '';
                              }
                            }}
                          >
                            <span className="like-icon">
                              {likes[(art.artId || art.id)] > 0 ? '❤️' : '🤍'}
                            </span>
                            <span className="like-count">{likes[(art.artId || art.id)] || 0}</span>
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
            <p>{emptyStateMessage}</p>
            {showUpload && (
              <button className="pEmptyUploadBtn" onClick={handleUploadClick}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7,10 12,15 17,10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Upload Your First Artwork
              </button>
            )}
          </div>
        )
      )}

      {/* ArtistArtworkModal Integration */}
      {selectedArtwork && isArtworkModalOpen && (
        <ArtistArtworkModal
          artwork={selectedArtwork}
          isOpen={isArtworkModalOpen}
          onClose={closeModal}
          onStatsUpdate={handleStatsUpdate}
          onLike={handleLike}
          onComment={handleComment}
          likeCount={likes}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default ArtGallery;
