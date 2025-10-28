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
  currentUser = null,
  // New pagination props
  enablePagination = false,
  fetchUrl = null,
  userId = null
}) => {
  // Modal state
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [isArtworkModalOpen, setIsArtworkModalOpen] = useState(false);
  const [likes, setLikes] = useState({});
  const [commenting, setCommenting] = useState({});
  const [comments, setComments] = useState({});
  const [liking, setLiking] = useState({});

  // Pagination state
  const [paginatedArts, setPaginatedArts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const ITEMS_PER_PAGE = 10;

  // Fetch paginated artworks
  const fetchArtworks = async (page = 1, append = false) => {
    if (!enablePagination || !fetchUrl) return;
    
    try {
      if (!append) setIsLoadingMore(true);
      
      const url = new URL(fetchUrl, API);
      url.searchParams.set('page', page.toString());
      url.searchParams.set('limit', ITEMS_PER_PAGE.toString());
      if (userId) url.searchParams.set('userId', userId);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch artworks');
      }
      
      const data = await response.json();
      const newArts = data.artworks || data.arts || [];
      
      if (append) {
        setPaginatedArts(prev => [...prev, ...newArts]);
      } else {
        setPaginatedArts(newArts);
      }
      
      setTotalCount(data.total || newArts.length);
      setHasMore(newArts.length === ITEMS_PER_PAGE);
      setCurrentPage(page);
      
    } catch (error) {
      console.error('Error fetching artworks:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Load more artworks
  const loadMoreArtworks = () => {
    if (!isLoadingMore && hasMore) {
      fetchArtworks(currentPage + 1, true);
    }
  };

  // Initial fetch when pagination is enabled
  useEffect(() => {
    if (enablePagination && fetchUrl) {
      fetchArtworks(1, false);
    }
  }, [enablePagination, fetchUrl, userId]);

  const handleArtClick = (art, index) => {
    const artworkData = {
      id: art.id || art.artId,
      artId: art.artId || art.id,
      title: art.title,
      description: art.description,
      medium: art.medium,
      image: art.image,
      images: art.images || (art.image ? [art.image] : []),
      userId: art.userId || art.user?.id,
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

  // Get the current arts array (either paginated or passed as props)
  const currentArts = enablePagination ? paginatedArts : arts;

  // Initialize like counts when arts change
  useEffect(() => {
    let abort = false;
    const init = async () => {
      const entries = await Promise.all(
        (currentArts || []).map(async (art) => {
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
  }, [currentArts]);

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
              <button className="btn btn-primary btn-sm" disabled>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7,10 12,15 17,10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Upload Artwork
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
          {showStats && currentArts.length > 0 && (
            <div className="pArtStats">
              <span className="pArtCount">
                {enablePagination ? `${currentArts.length}${totalCount > currentArts.length ? `/${totalCount}` : ''}` : currentArts.length}
              </span>
              <span className="pArtLabel">
                {currentArts.length === 1 ? 'piece' : 'pieces'}
              </span>
            </div>
          )}
          {showUpload && (
            <button className="btn btn-primary btn-sm" onClick={handleUploadClick}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Upload Artwork
            </button>
          )}
        </div>
      </div>

      {currentArts.length > 0 ? (
        <>
          <div className="pArtGrid">
            {currentArts.map((art, index) => (
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
                            className="btn btn-museo-secondary btn-sm"
                            onClick={(e) => handleViewClick(e, art, index)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                            View
                          </button>
                        )}
                        {onLikeArt && (
                          <button 
                            className={`btn-social like ${likes[(art.artId || art.id)] > 0 ? 'active' : ''}`}
                            onClick={(e) => handleLike(e, (art.artId || art.id))}
                            disabled={!!liking[(art.artId || art.id)]}
                            style={{ 
                              opacity: liking[(art.artId || art.id)] ? 0.6 : 1,
                              cursor: liking[(art.artId || art.id)] ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                            <span className="count">{likes[(art.artId || art.id)] || 0}</span>
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
          
          {/* Load More Button */}
          {enablePagination && hasMore && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              marginTop: '24px' 
            }}>
              <button 
                className="btn btn-museo-secondary"
                onClick={loadMoreArtworks}
                disabled={isLoadingMore}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {isLoadingMore ? (
                  <>
                    <svg 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                      style={{ 
                        marginRight: '8px',
                        animation: 'spin 1s linear infinite' 
                      }}
                    >
                      <path d="M21 12a9 9 0 11-6.219-8.56"/>
                    </svg>
                    Loading...
                  </>
                ) : (
                  <>
                    <svg 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                      style={{ marginRight: '8px' }}
                    >
                      <path d="M12 5v14"/>
                      <path d="m19 12-7 7-7-7"/>
                    </svg>
                    Load More ({ITEMS_PER_PAGE} more)
                  </>
                )}
              </button>
            </div>
          )}
        </>
      ) : (
        showEmptyState && (
          <div className="pEmptyState">
            <div className="pEmptyIcon">{emptyStateIcon}</div>
            <h3>{emptyStateTitle}</h3>
            <p>{emptyStateMessage}</p>
            {showUpload && (
              <button className="btn btn-primary" onClick={handleUploadClick}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
