import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../Gallery/css/ArtworkModal.css";
import "./css/textModal.css";

const API = import.meta.env.VITE_API_BASE;
const FALLBACK_AVATAR = "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/profilePicture.png";

export default function TextModal({
  post,
  onClose,
  onLike,
  onComment,
  likeCount,
  likedPosts,
  currentUser,
  onEdit,
  onDelete,
  onReport,
  role,
  totalComments
}) {
  const dialogRef = useRef(null);

  // Local comments state
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentErr, setCommentErr] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [me, setMe] = useState(null);
  
  // Pagination state
  const [commentPage, setCommentPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  
  // Comment menu state
  const [openCommentMenus, setOpenCommentMenus] = useState({});
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  
  // Like state
  const [isLiked, setIsLiked] = useState(likedPosts?.[post.id] || false);
  const [localLikeCount, setLocalLikeCount] = useState(likeCount?.[post.id] || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  
  // Menu state for post options
  const [openMenus, setOpenMenus] = useState({});

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Load comments when opened (exact same as PostModal)
  useEffect(() => {
    let abort = false;
    const load = async () => {
      setLoadingComments(true);
      setCommentErr(null);
      try {
        console.log('🔍 Fetching comments for post:', post.id);
        const res = await fetch(
          `${API}/homepage/getComments?postId=${post.id}&page=1&limit=10`,
          { credentials: "include" }
        );
        if (!res.ok) throw new Error(`Failed to load comments (${res.status})`);
        const data = await res.json();
        console.log('📦 Received comments:', data);
        if (!abort) {
          setComments(data.comments || []);
          setCommentPage(1);
          setHasMoreComments(data.hasMore || false);
        }
      } catch (e) {
        console.error('❌ Error loading comments:', e);
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

  const fetchUserProfile = async () => {
    try {
      const res = await fetch(`${API}/profile/me`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.profile) {
          setMe({
            name: data.profile.fullName || data.profile.username,
            avatar: data.profile.profilePicture
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Fetch user profile when modal opens
  useEffect(() => {
    if (post?.id) {
      fetchUserProfile();
    }
  }, [post?.id]);

  const handleLike = async () => {
    if (isLiking) return;
    
    setIsLiking(true);
    const wasLiked = isLiked;
    
    // Optimistic update
    setIsLiked(!wasLiked);
    setLocalLikeCount(prev => wasLiked ? prev - 1 : prev + 1);
    
    try {
      if (onLike) {
        await onLike(post.id);
      }
    } catch (error) {
      // Revert on error
      setIsLiked(wasLiked);
      setLocalLikeCount(prev => wasLiked ? prev + 1 : prev - 1);
      console.error('Error liking post:', error);
    } finally {
      setIsLiking(false);
    }
  };

  // Menu functions (exact same as PostModal)
  const toggleMenu = (postId, event) => {
    event.stopPropagation();
    setOpenMenus(prev => {
      // If clicking the same menu that's already open, close it
      if (prev[postId]) {
        return {
          ...prev,
          [postId]: false
        };
      }
      
      // Close all other menus and open this one
      return {
        [postId]: true
      };
    });
  };

  const closeMenu = (postId) => {
    setOpenMenus(prev => ({
      ...prev,
      [postId]: false
    }));
  };

  const submitComment = async (e) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;

    try {
      // Call parent's handleComment first
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
      try {
        const res = await fetch(
          `${API}/homepage/getComments?postId=${post.id}&page=1&limit=10`,
          { credentials: "include" }
        );
        if (res.ok) {
          const data = await res.json();
          setComments(data.comments || []);
          setCommentPage(1);
          setHasMoreComments(data.hasMore || false);
        } else {
          console.error('Failed to refetch comments:', res.status);
        }
      } catch (reconcileError) {
        console.error('Reconcile error:', reconcileError);
        // Keep the optimistic update even if reconciliation fails
      }
    } catch (e2) {
      setCommentErr(e2.message || "Failed to add comment");
      // Remove the optimistic comment on error
      setComments((prev) => prev.filter(c => !c.id.startsWith('temp-')));
    }
  };

  // Load more comments (exact same as PostModal)
  const loadMoreComments = async () => {
    if (loadingMoreComments) return;
    
    setLoadingMoreComments(true);
    try {
      const nextPage = commentPage + 1;
      const res = await fetch(
        `${API}/homepage/getComments?postId=${post.id}&page=${nextPage}&limit=10`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error(`Failed to load more comments`);
      const data = await res.json();
      
      setComments(prev => [...prev, ...(data.comments || [])]);
      setCommentPage(nextPage);
      setHasMoreComments(data.hasMore || false);
    } catch (e) {
      console.error('Load more comments error:', e);
    } finally {
      setLoadingMoreComments(false);
    }
  };

  // Comment menu functions (exact same as PostModal)
  const toggleCommentMenu = (commentId, event) => {
    event.stopPropagation();
    setOpenCommentMenus(prev => {
      if (prev[commentId]) {
        return {};
      }
      return { [commentId]: true };
    });
  };

  const handleEditComment = (commentId, text) => {
    setEditingCommentId(commentId);
    setEditingCommentText(text);
    setOpenCommentMenus({});
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const handleUpdateComment = async (commentId) => {
    const text = editingCommentText.trim();
    if (!text) return;
    
    try {
      const res = await fetch(`${API}/homepage/updateComment/${commentId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      if (res.ok) {
        // Update the comment in the list with updatedAt flag
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

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    
    try {
      const res = await fetch(`${API}/homepage/deleteComment/${commentId}`, {
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
      const res = await fetch(`${API}/homepage/reportComment`, {
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

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenus({});
      setOpenCommentMenus({});
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const stop = (e) => e.stopPropagation();

  const avatarSrc = (user) => {
    return user?.avatar || user?.profilePicture || FALLBACK_AVATAR;
  };

  const formatDescription = (text) => {
    if (!text) return '';
    return text.replace(/\n/g, '<br>');
  };

  const getTruncatedDescription = (text) => {
    if (!text || text.length <= 150) return formatDescription(text);
    
    let truncateAt = 150;
    const breakPoints = ['. ', '! ', '? ', '\n'];
    
    for (const breakPoint of breakPoints) {
      const lastIndex = text.lastIndexOf(breakPoint, 150);
      if (lastIndex > 150 * 0.7) {
        truncateAt = lastIndex + breakPoint.length;
        break;
      }
    }
    
    return formatDescription(text.substring(0, truncateAt).trim());
  };
  
  if (!post) return null;

  const modalContent = (
    <div className="museo-modal-overlay artwork-type-overlay artwork-modal-overlay" onClick={onClose}>
      <div className="museo-modal artwork-type-modal artwork-modal text-only-modal" onClick={stop}>
        {/* Header Controls */}
        <div style={{ 
          position: 'absolute', 
          top: '20px', 
          right: '20px', 
          display: 'flex', 
          gap: '8px', 
          zIndex: 100 
        }}>
          {/* Dropdown Menu */}
          <div
            style={{
              position: 'relative',
              zIndex: 1000
            }}
            className="dropdown-container"
          >
            <button
              className="btn-more"
              onClick={(e) => toggleMenu(post.id, e)}
              aria-label="More options"
            >
              ⋯
            </button>
            
            {/* Dropdown Menu */}
            {openMenus[post.id] && (
              <div 
                className="dropdown-menu show"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Edit option */}
                {onEdit && (role === 'admin' || currentUser?.id === post.userId) && (
                  <button
                    className="dropdown-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(post.id);
                      closeMenu(post.id);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit
                  </button>
                )}

                {/* Report option */}
                {onReport && currentUser?.id !== post.userId && (
                  <button
                    className="dropdown-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReport(post.id);
                      closeMenu(post.id);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                      <line x1="4" y1="22" x2="4" y2="15"/>
                    </svg>
                    Report
                  </button>
                )}

                {/* Delete option */}
                {onDelete && (role === 'admin' || currentUser?.id === post.userId) && (
                  <button
                    className="dropdown-item danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(post.id);
                      closeMenu(post.id);
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
              fontWeight: 'bold',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease'
            }}
          >
            ✕
          </button>
        </div>

        <div className="artwork-modal-content text-modal-content">
          {/* Text Content - No Image Gallery */}
          <div className="artwork-modal-details text-modal-details">
            {/* Post Info */}
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
                      <span className="artwork-artist">{post.user?.name || "Anonymous"}</span>
                    </div>
                    <div style={{ 
                      fontSize: '0.9rem', 
                      color: '#6b4226', 
                      fontWeight: '400',
                      marginLeft: '58px'
                    }}>
                      {post.timestamp}
                    </div>
                  </div>
                </div>
              </div>

              {(post.text || post.description) && (
                <div className="artwork-description">
                  <div className="description-content">
                  <p
                    className="description-text"
                    style={{ whiteSpace: 'pre-wrap' }}
                  >
                    {isDescriptionExpanded
                      ? formatDescription(post.text || post.description)
                      : getTruncatedDescription(post.text || post.description)}
                  </p>
                    {(post.text || post.description).length > 150 && (
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
                  style={{ 
                    opacity: isLiking ? 0.6 : 1,
                    cursor: isLiking ? 'not-allowed' : 'pointer'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  <span className="count">{localLikeCount}</span>
                </button>
                <button 
                  className="btn-social comment"
                  aria-label="View comments"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                  <span className="count">{totalComments || comments.length}</span>
                </button>
              </div>
            </div>

            {/* Comments Section */}
            <div className="artwork-comments">
              <h3 className="comments-title">
                Comments ({totalComments || comments.length})
              </h3>
              
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
                    className="btn btn-primary btn-sm"
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
                  <>
                    {comments.map(comment => (
                      <div 
                        key={comment.id} 
                        className="comment" 
                        style={{ 
                          position: 'relative',
                          zIndex: openCommentMenus[comment.id] ? 100 : 1
                        }}
                      >
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
                          <div className="comment-time">
                            {comment.timestamp}
                            {comment.updatedAt && (
                              <span style={{ 
                                marginLeft: '6px', 
                                fontStyle: 'italic',
                                color: 'var(--museo-text-muted)',
                                fontSize: '12px'
                              }}>
                                (edited)
                              </span>
                            )}
                          </div>
                          
                          {editingCommentId === comment.id ? (
                            <div style={{ marginTop: '8px' }}>
                              <textarea
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                style={{
                                  width: '100%',
                                  minHeight: '60px',
                                  padding: '8px',
                                  border: '1px solid var(--museo-border)',
                                  borderRadius: '6px',
                                  fontFamily: 'Georgia, Times New Roman, serif',
                                  fontSize: '14px',
                                  resize: 'vertical'
                                }}
                              />
                              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                <button
                                  onClick={() => handleUpdateComment(comment.id)}
                                  className="btn-primary btn-sm"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="btn-secondary btn-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p 
                              className="comment-text"
                              style={{ whiteSpace: 'pre-wrap' }}
                            >
                              {comment.text}
                            </p>
                          )}
                        </div>
                        
                        {/* Comment Menu */}
                        <div className="comment-menu-container" style={{ position: 'absolute', top: '8px', right: '8px' }}>
                          <button
                            onClick={(e) => toggleCommentMenu(comment.id, e)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px 8px',
                              fontSize: '18px',
                              color: 'var(--museo-text-muted)',
                              lineHeight: 1
                            }}
                            aria-label="Comment options"
                          >
                            ⋯
                          </button>
                          
                          {openCommentMenus[comment.id] && (
                            <div 
                              className="dropdown-menu show"
                              onClick={(e) => e.stopPropagation()}
                              style={{ zIndex: 9999 }}
                            >
                              {/* Edit option - for admin or comment owner */}
                              {(role === 'admin' || currentUser?.id === comment.user?.id) && (
                                <button
                                  className="dropdown-item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditComment(comment.id, comment.text);
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
                              {(role === 'admin' || currentUser?.id === comment.user?.id) && (
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
                              
                              {/* Report option - for all users except post owner */}
                              {currentUser?.id !== post.userId && (
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
                    ))}
                    
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
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}