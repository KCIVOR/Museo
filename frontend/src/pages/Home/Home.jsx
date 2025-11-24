// src/pages/home.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";
import "./css/home.css";
import MuseoComposer from "./museoComposer";
import PostModal from "./PostModal";
import TextModal from "./textModal";
import SetProfileModal from "../Profile/SetProfile";
import InterestsSelection from "../Shared/InterestsSelection";
import AnnouncementCard from "./AnnouncementCard.jsx";
import ConfirmModal from "../Shared/ConfirmModal";
import AlertModal from "../Shared/AlertModal";
import EditPostModal from "./EditPostModal";
import ReportModal from "../../components/ReportModal.jsx";
const API = import.meta.env.VITE_API_BASE;
// Get average color from an image element using canvas
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

function MuseoHero() {
  const navigate = useNavigate();

  const handleBrowseEvents = () => {
    navigate('/Event');
  };

  const handleBrowseGallery = () => {
    navigate('/Gallery');
  };

  return (
    <section className="museoHero">
      <div className="mHero__media"></div>
      <div className="mHero__overlay"></div>
      <div className="mHero__content">
        <div className="mHero__textGroup">
          <div className="mHero__eyebrow">Community Showcase</div>
          <h1 className="mHero__title">Discover, share, and celebrate emerging art</h1>
          <p className="mHero__subtitle">Curated picks, community showcases, and open calls year‑round.</p>
        </div>
        <div className="mHero__ctaRow">
          <button className="btn btn-primary btn-sm" onClick={handleBrowseEvents}>
            Browse Events
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleBrowseGallery}>
            Browse Gallery
          </button>
        </div>
      </div>
    </section>
  );
}

const FALLBACK_AVATAR =
  import.meta.env.FALLBACKPHOTO_URL ||
  "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/profilePicture.png";

// Accept only http(s) URLs, otherwise fallback
function safeAvatar(u) {
  if (u && typeof u === "string" && /^https?:\/\//i.test(u)) return u;
  return FALLBACK_AVATAR;
}

// Detect a hostname; safe against relative URLs
function getHostname(u) {
  try {
    return new URL(u, window.location.origin).hostname;
  } catch {
    return "";
  }
}

// Coerce known-bad hosts to fallback (e.g., via.placeholder.com)
function coerceBrokenAvatar(u) {
  const host = getHostname(u);
  if (/(^|\.)via\.placeholder\.com$/i.test(host)) return FALLBACK_AVATAR;
  return u;
}

function normalizePosts(payload) {
  const fmt = (ts) => {
    try {
      const d = new Date(ts);
      return isNaN(d) ? String(ts ?? "") : d.toLocaleString();
    } catch {
      return String(ts ?? "");
    }
  };
  const rawPosts = payload?.posts || [];
  return rawPosts.map((p) => {
    const avatarRaw =
      p.user?.avatar ??
      p.user?.profilePicture ??
      p.profilePicture ??
      p.authorAvatar ??
      null;

    const name =
      p.user?.name ??
      p.username ??
      p.authorName ??
      "Unknown";

    const safe = safeAvatar(avatarRaw);
    const fixedAvatar = coerceBrokenAvatar(safe);

    return {
      ...p,
      user: {
        id: p.user?.id ?? p.userId ?? "",
        name,
        avatar: fixedAvatar,
      },
      timestamp: fmt(p.timestamp || p.createdAt),
      // Ensure images property exists for carousel
      images: Array.isArray(p.image) ? p.image : (p.image ? [p.image] : []),
    };
  });
}


export default function Home() {
  const { userData, refreshUserData } = useUser();
  const navigate = useNavigate();
  const { postId: routePostId } = useParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Get role and currentUser from UserContext
  const role = userData?.role || null;
  const currentUser = userData ? { id: userData.id, userId: userData.id } : null;
  const [announcements, setAnnouncements] = useState([]);
  

  // Pagination states (Gallery style)
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const POSTS_PER_PAGE = 10;

  const [commenting, setCommenting] = useState({});
  const [liking, setLiking] = useState(false);
  const [comments, setComments] = useState({});
  const [likes, setLikes] = useState({});
  const [likedPosts, setLikedPosts] = useState({}); // Track which posts are liked by current user

  // Image handling states
  const [bg, setBg] = useState({});
  const [ratioClass, setRatioClass] = useState({});

  // Post menu states
  const [openMenus, setOpenMenus] = useState({}); // Track which post menus are open
  const [fit, setFit] = useState({});

  // Modal state
  const [activePost, setActivePost] = useState(null);
  const [activeTextPost, setActiveTextPost] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [reportAlert, setReportAlert] = useState({ show: false, message: '' });
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTarget, setReportTarget] = useState({ type: '', id: '' });

  // profile modal visibility
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // interests selection modal visibility
  const [showInterestsModal, setShowInterestsModal] = useState(false);

  // Expanded posts state
  const [expandedPosts, setExpandedPosts] = useState({});
  const hasOpenedPostRef = useRef(false);

  // Advanced image load handler with CORS/canvas safety
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

    // Guard against tainted canvas
    try {
      // Try-catch remains, but only read pixels if image is anonymous CORS or same-origin
      const imgHost = getHostname(img.currentSrc || img.src);
      const pageHost = window.location.hostname;
      const sameOrigin = imgHost === "" || imgHost === pageHost;
      const isAnon = img.crossOrigin === "anonymous";

      if (sameOrigin || isAnon) {
        const avg = getAverageColorFromImageElement(img);
        setBg((s) => ({ ...s, [idx]: avg }));
      }
    } catch (err) {
      console.warn("Failed to get average color:", err);
    }
  }; 

  // Video metadata handler to set ratio/fit like images
  const onVideoLoaded = (idx, e) => {
    const vid = e.target;
    const ar = (vid.videoWidth || 1) / (vid.videoHeight || 1);

    let rClass = "ratio-1-1";
    if (ar >= 1.6) rClass = "ratio-191-1";
    else if (ar <= 0.9) rClass = "ratio-4-5";
    setRatioClass((s) => ({ ...s, [idx]: rClass }));

    const box = vid.parentElement.getBoundingClientRect();
    const small = (vid.videoWidth || 0) < box.width || (vid.videoHeight || 0) < box.height;
    const useContain = small || ar < 0.9 || ar > 2.2;
    setFit((s) => ({ ...s, [idx]: useContain ? "contain" : "cover" }));
  };


  const handlePopUp = (postId) => {
    const p = posts.find((p) => p.id === postId);
    if (p) {
      // Check if post has images
      if (p.images && p.images.length > 0 && p.images[0]) {
        // Post has images - use PostModal
        setActivePost(p);
      } else {
        // Post has no images - use TextModal
        setActiveTextPost(p);
      }
    }
  }; // pop up para sa pinindot na post

  const toggleExpanded = (postId) => {
    setExpandedPosts(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  }; 

  // Fetch posts from API with pagination (Gallery style)
  const fetchPosts = async (page = 1, append = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      
      const response = await fetch(`${API}/homepage/getPost?page=${page}&limit=${POSTS_PER_PAGE}`, {
        method: "GET",
        credentials: "include",
      });
      
      if (!response.ok) throw new Error(`Failed to fetch posts: ${response.statusText}`);

      const data = await response.json();
      const normalized = normalizePosts(data);
      
      if (data.message === "Posts fetched successfully" && normalized) {
        if (append) {
          // Append to existing posts for infinite scroll, avoiding duplicates
          setPosts(prev => {
            const existingIds = new Set(prev.map(p => String(p.id)).filter(Boolean));
            const newPosts = normalized.filter(p => p && p.id && !existingIds.has(String(p.id)));
            return [...prev, ...newPosts];
          });
        } else {
          setPosts(normalized);
          // Only set announcements on first page
          const anns = Array.isArray(data.announcements)
            ? [...data.announcements].sort((a, b) => {
                const da = new Date(a.datePosted).getTime() || 0;
                const db = new Date(b.datePosted).getTime() || 0;
                return db - da; // newest first
              })
            : [];
          setAnnouncements(anns);
        }

        // Update hasMore based on pagination info or post count
        if (data.pagination) {
          setHasMore(data.pagination.hasMore);
        } else {
          setHasMore(normalized.length === POSTS_PER_PAGE);
        }

        const reactCounts = {};
        (data.reacts || []).forEach((r) => {
          reactCounts[r.postId] = (reactCounts[r.postId] || 0) + 1;
        });
        setLikes(reactCounts);

        // Count comments per post
        const commentCounts = {};
        (data.comments || []).forEach((c) => {
          commentCounts[c.postId] = (commentCounts[c.postId] || 0) + 1;
        });
        
        if (append) {
          // For infinite scroll, merge with existing comment counts
          setComments(prev => ({
            ...prev,
            ...commentCounts
          }));
        } else {
          // For initial load, replace all comment counts
          setComments(commentCounts);
        }

        // Set user's liked posts from backend response
        if (data.userLikedPosts) {
          if (append) {
            // For infinite scroll, merge with existing liked posts
            setLikedPosts(prev => ({
              ...prev,
              ...data.userLikedPosts
            }));
          } else {
            // For initial load, replace all liked posts
            setLikedPosts(data.userLikedPosts);
          }
        }

      } else {
        console.error('Failed to fetch posts:', data.error);
        // Don't clear posts on error - keep existing posts
        if (!append && posts.length === 0) {
          setPosts([]);
        }
      }

      setError(null);
    } catch (err) {
      console.error("Error fetching posts:", err);
      setError(err.message);
      // Don't clear posts on error - keep existing posts
      if (!append && posts.length === 0) {
        setPosts([]);
      }
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Load more posts for infinite scroll (Gallery style)
  const loadMorePosts = useCallback(async () => {
    if (!hasMore || isLoadingMore) {
      return;
    }
    
    // Prevent double-loading
    setIsLoadingMore(true);
    
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    await fetchPosts(nextPage, true);
  }, [hasMore, isLoadingMore, currentPage]); 

  const handleLike = async (postId) => {
    if (liking[postId]) return;
    setLiking((s) => ({ ...s, [postId]: true }));
    try {
      const res = await fetch(`${API}/homepage/createReact`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to react");
      }
      const data = await res.json();
      setLikes((prev) => ({
        ...prev,
        [postId]: (prev[postId] || 0) + (data.removed ? -1 : 1),
      }));
      // Update liked state
      setLikedPosts((prev) => ({
        ...prev,
        [postId]: !data.removed, // true if like was added, false if removed
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLiking((s) => ({ ...s, [postId]: false }));
    }
  }; //para sa likes ni sabi ni ron

  const handleComment = async (postId, text) => {
    if (commenting[postId]) return;
    setCommenting((s) => ({ ...s, [postId]: true }));
    try {
      const body = (text || "").trim();
      if (!body) return;

      const res = await fetch(`${API}/homepage/createComment`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, text: body }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to comment");
      }

      // Update comment count without affecting posts array
      setComments((prev) => ({
        ...prev,
        [postId]: (prev[postId] || 0) + 1,
      }));
    } catch (e) {
      console.error('Comment error:', e);
    } finally {
      setCommenting((s) => ({ ...s, [postId]: false }));
    }
  }; // para sa coment

  const checkProfile = async () => {
    try {
      console.log('🏠 Home: Checking profile status...');
      const res = await fetch(`${API}/profile/profileStatus`, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        // If server error (500), don't show modal - let user continue
        if (res.status >= 500) {
          console.error("⚠️ Home: Server error checking profile:", res.status);
          // Don't show modal on server errors
          return;
        }
        console.warn("⚠️ Home: Profile status request failed:", res.status, res.statusText);
        // For client errors, show profile modal
        setShowProfileModal(true);
        return;
      }

      const data = await res.json();
      console.log('🏠 Home: Profile status:', data);
      
      if (data.profileStatus === false){
        console.log('🏠 Home: Profile incomplete, showing modal');
        setShowProfileModal(true);
        return; // Don't check preferences if profile isn't set up yet
      }

      // If profile is set up, check art preferences
      await checkArtPreferences();

    } catch (err) {
      console.error("❌ Home: Error checking profile:", err);
      // Don't show modal on network errors - let user continue
      // setShowProfileModal(true);
    }
  };  //checking profile kung nakapag setup naba or no

  const checkArtPreferences = async () => {
    try {
      const res = await fetch(`${API}/profile/artPreferenceStatus`, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        console.warn("Art preference status request failed:", res.status, res.statusText);
        // If API fails, show interests modal to be safe
        setShowInterestsModal(true);
        return;
      }

      const data = await res.json();
      
      if (data.preferenceStatus === false || !data.preferenceStatus) {
        setShowInterestsModal(true);
      }

    } catch (err) {
      console.error("Error checking art preferences:", err);
      // If there's an error, show the modal to ensure preferences are set
      setShowInterestsModal(true);
    }
  };

  const handleInterestsComplete = (selectedInterests) => {
    // Only close modal if interests were actually selected (not null)
    if (selectedInterests !== null) {
      setShowInterestsModal(false);
    } else {
      // Modal stays open - user must select interests
    }
  };


  useEffect(() => {
    // NOTE: ProtectedRoutes already checks and redirects to /Home if profile incomplete
    // We still need to check here to show the modals when on /Home
    checkProfile(); 
    
    setCurrentPage(1); // Reset page counter
    fetchPosts(1, false); // Initial load
  }, []);
  
  // Reset currentPage when posts are cleared (e.g., after delete/edit)
  useEffect(() => {
    if (posts.length === 0 && !loading) {
      setCurrentPage(1);
    }
  }, [posts.length, loading]);


  // Intersection Observer for infinite scroll (Gallery style)
  useEffect(() => {
    if (!hasMore || loading) return; // Don't setup observer while initial loading
    
    // Add a small delay to prevent immediate triggering on page load
    const setupTimer = setTimeout(() => {
      const sentinel = document.createElement('div');
      sentinel.id = 'scroll-sentinel';
      sentinel.style.height = '1px';
      sentinel.style.width = '100%';
      
      const feedContainer = document.querySelector('.feed');
      
      if (feedContainer) {
        // Remove any existing sentinel
        const existingSentinel = document.getElementById('scroll-sentinel');
        if (existingSentinel) {
          existingSentinel.remove();
        }
        
        feedContainer.appendChild(sentinel);
        const observer = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            if (entry.isIntersecting && !isLoadingMore) {
              loadMorePosts();
              observer.unobserve(sentinel); // Stop observing after triggering load
            }
          },
          {
            rootMargin: '100px', // Trigger 100px before sentinel becomes visible
            threshold: 0.1
          }
        );
        
        observer.observe(sentinel);
        
        // Store cleanup function
        return () => {
          observer.disconnect();
          if (sentinel.parentNode) {
            sentinel.parentNode.removeChild(sentinel);
          }
        };
      }
    }, 500); // Wait 500ms after initial load
    
    return () => {
      clearTimeout(setupTimer);
      const existingSentinel = document.getElementById('scroll-sentinel');
      if (existingSentinel) {
        existingSentinel.remove();
      }
    };
  }, [hasMore, isLoadingMore, loading, loadMorePosts]);

  const handleNewPost = (newPostData) => {
    // Reset page and reload posts
    setCurrentPage(1);
    // Refetch first page instead of reloading the whole app
    fetchPosts(1, false);
    // Optionally prepend the new post optimistically
    // if (newPostData?.id) setPosts(prev => [newPostData, ...prev]);
  };

  const closeModal = () => {
    setActivePost(null);
    if (routePostId) navigate('/Home', { replace: true });
  };

  const closeTextModal = () => {
    setActiveTextPost(null);
    if (routePostId) navigate('/Home', { replace: true });
  };

  // Menu functions
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
      
      // Otherwise, close all other menus and open this one
      const newState = {};
      Object.keys(prev).forEach(key => {
        newState[key] = false;
      });
      newState[postId] = true;
      
      return newState;
    });
  };

  const closeMenu = (postId) => {
    setOpenMenus(prev => ({
      ...prev,
      [postId]: false
    }));
  };

  const handleDelete = (postId) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      setPostToDelete(post);
      setShowConfirmDelete(true);
      closeMenu(postId);
    }
  };

  const confirmDelete = async () => {
    if (!postToDelete) return;
    
    try {
      const res = await fetch(`${API}/homepage/posts/${postToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (res.ok) {
        setPosts(prev => prev.filter(p => p.id !== postToDelete.id));
        setShowConfirmDelete(false);
        setPostToDelete(null);
        // No full reload; list is already updated above
      } else {
        const errorData = await res.json();
        console.error('Failed to delete post:', errorData.error);
        setShowConfirmDelete(false);
        setPostToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      setShowConfirmDelete(false);
      setPostToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowConfirmDelete(false);
    setPostToDelete(null);
  };

  const handleReport = (postId) => {
    setReportTarget({ type: 'post', id: postId });
    setShowReportModal(true);
    closeMenu(postId);
  };

  const handleEdit = (postId) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      setEditingPost(post);
      setShowEditModal(true);
      closeMenu(postId);
    }
  };

  const handlePostUpdated = (updatedPost) => {
    // Update the specific post in-place to avoid reloading the app
    if (!updatedPost?.id) return;
    setPosts(prev => prev.map(p => (String(p.id) === String(updatedPost.id) ? { ...p, ...updatedPost } : p)));
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside any dropdown container
      const isClickInsideDropdown = event.target.closest('.dropdown-container');
      
      if (!isClickInsideDropdown) {
        setOpenMenus({});
      }
    };
    
    // Only add listener if there are open menus
    if (Object.values(openMenus).some(isOpen => isOpen)) {
      document.addEventListener('click', handleClickOutside, true);
      return () => document.removeEventListener('click', handleClickOutside, true);
    }
  }, [openMenus]);

  // Deep link: open modal when on /Home/:postId
  useEffect(() => {
    const openByRoute = async () => {
      if (!routePostId) {
        hasOpenedPostRef.current = false;
        return;
      }
      if (hasOpenedPostRef.current) return;

      try {
        const found = posts.find(p => String(p.id) === String(routePostId));
        if (found) {
          if (found.images && found.images.length > 0 && found.images[0]) {
            setActivePost(found);
          } else {
            setActiveTextPost(found);
          }
          hasOpenedPostRef.current = true;
          return;
        }

        // If list already has content but not found, fetch larger page to locate
        if (posts.length > 0) {
          const res = await fetch(`${API}/homepage/getPost?page=1&limit=100`, { credentials: 'include' });
          if (!res.ok) throw new Error('Failed to fetch posts');
          const data = await res.json();
          const normalized = normalizePosts(data);
          const byId = normalized.find(p => String(p.id) === String(routePostId));
          if (byId) {
            if (byId.images && byId.images.length > 0 && byId.images[0]) {
              setActivePost(byId);
            } else {
              setActiveTextPost(byId);
            }
            hasOpenedPostRef.current = true;
            return;
          }
          throw new Error('Post not found');
        }
      } catch (e) {
        console.error(e);
        navigate('/Home', { replace: true });
      }
    };
    openByRoute();
  }, [routePostId, posts.length > 0]);

  return (
    <div className="page">
      <div className="feed">
        <MuseoHero />

        {(role === "artist" || role === "admin") && (
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
                <button className="btnPrimary" onClick={fetchPosts}>
                  Retry
                </button>
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

        {/* Unified feed: announcements + regular posts sorted by datePosted desc */}
        {!loading && !error && [...(announcements||[]), ...(posts || [])]
          .filter(item => item && item.id) // Filter out any invalid posts
          .sort((a, b) => {
            const da = new Date(a.datePosted).getTime() || 0;
            const db = new Date(b.datePosted).getTime() || 0;
            return db - da;
          })
          .map((item, idx) => (
            item.isAnnouncement ? (
              <AnnouncementCard key={`ann-${item.id || idx}`} post={item} />
            ) : (
            <div
              key={item.id || `post-${idx}`}
              className="card"
              style={{
                position: 'relative',
                overflow: 'visible',
                zIndex: openMenus[item.id] ? 1001 : 'auto'
              }}
              onClick={() => {
                // Close any open menus when clicking on post
                setOpenMenus({});
                navigate(`/Home/${item.id}`);
              }}
            >
              <div className="cardHeader">
                <img
                  src={item.user?.avatar || FALLBACK_AVATAR}
                  onError={(e) => {
                    if (e.currentTarget.src !== FALLBACK_AVATAR) {
                      e.currentTarget.src = FALLBACK_AVATAR;
                    }
                  }}
                  alt={item.user?.name || 'User'}
                  className="avatar"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                />
                <div className="meta">
                  <div className="name">{item.user?.name || 'Anonymous'}</div>
                  <div className="desc">{item.timestamp}</div>
                </div>
                
                {/* More/Edit Button */}
                <div 
                  style={{ 
                    position: 'relative', 
                    marginLeft: 'auto',
                    zIndex: 1000
                  }}
                  className="dropdown-container"
                >
                  <button
                    className="btn-more"
                    onClick={(e) => toggleMenu(item.id, e)}
                    aria-label="More options"
                  >
                    ⋯
                  </button>
                  
                  {/* Dropdown Menu */}
                  {openMenus[item.id] && (
                    <div 
                      className="dropdown-menu show"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        zIndex: 99999,
                        position: 'absolute',
                        top: '100%',
                        right: '0',
                        marginTop: '8px'
                      }}
                    >
                      {/* Edit option - for admin or post owner */}
                      {(role === 'admin' || currentUser?.id === item.userId) && (
                        <button
                          className="dropdown-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(item.id);
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                          Edit
                        </button>
                      )}

                      {/* Report option - for all users except post owner */}
                      {currentUser?.id !== item.userId && (
                        <button
                          className="dropdown-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReport(item.id);
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                            <line x1="4" y1="22" x2="4" y2="15"/>
                          </svg>
                          Report
                        </button>
                      )}

                      {/* Delete option - for admin or post owner */}
                      {(role === 'admin' || currentUser?.id === item.userId) && (
                        <button
                          className="dropdown-item danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
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
              </div>

              {item.text && (
                <div className="postContent">
                  <p className="ge postText">
                    {(() => {
                      const maxLength = 150;
                      const isExpanded = expandedPosts[item.id];
                      const shouldTruncate = item.text.length > maxLength;
                      
                      if (!shouldTruncate) {
                        return item.text;
                      }
                      
                      if (isExpanded) {
                        return (
                          <>
                            {item.text}
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpanded(item.id);
                              }}
                              className="expandToggle"
                            >
                              see less
                            </span>
                          </>
                        );
                      } else {
                        return (
                          <>
                            {item.text.substring(0, maxLength)}...
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpanded(item.id);
                              }}
                              className="expandToggle"
                            >
                              see more
                            </span>
                          </>
                        );
                      }
                    })()}
                  </p>
                </div>
              )}

              {item.image && (() => {
                const primary = Array.isArray(item.image) ? item.image[0] : item.image;
                const isVideo = typeof primary === 'string' && /\.mp4(\?.*)?$/i.test(primary);
                return (
                  <div
                    className={`imageBox ${ratioClass[idx] || "ratio-1-1"}`}
                    style={{ background: bg[idx] || "#f2f4f7" }}
                  >
                    {isVideo ? (
                      <video
                        src={primary}
                        className={`postVideo ${fit[idx] === 'contain' ? 'postVideo--contain' : 'postVideo--cover'}`}
                        controls
                        preload="metadata"
                        onLoadedMetadata={(e) => onVideoLoaded(idx, e)}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <img
                        src={primary}
                        alt="Post content"
                        className={`postImage ${fit[idx] === 'contain' ? 'postImage--contain' : 'postImage--cover'}`}
                        crossOrigin="anonymous"
                        onLoad={(e) => onImageLoad(idx, e)}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                  </div>
                );
              })()}

              {/* Elegant Action Bar */}
              {/* Like and Stats */}
              <div className="actionBar"
                onClick={(e) => {
                  e.stopPropagation();
                  // Close any open menus when interacting with action bar
                  setOpenMenus({});
                }}
              >
                {/* Like Button 1 - Social Actions */}
                <button
                  className={`btn-social like ${likedPosts[item.id] ? 'active' : ''}`}
                  onClick={() => handleLike(item.id)}
                  disabled={liking[item.id]}
                  aria-label="Like post"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  <span className="count">{likes[item.id] || 0}</span>
                </button>
                {/* Comment Button - Social Actions */}
                <button 
                  className="btn-social comment"
                  onClick={() => navigate(`/Home/${item.id}`)}
                  aria-label="View comments"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                  <span className="count">{comments[item.id] || 0}</span>
                </button>
              </div>
            </div>
            )
          ))}

        {/* Loading more posts indicator */}
        {isLoadingMore && (
          <div className="home__loading-container">
            <div className="home__loading-content">
              <div className="home__loading-spinner"></div>
              Loading more posts...
            </div>
          </div>
        )}


        
        {/* End of feed message */}
        {!hasMore && posts.length > 0 && !loading && !isLoadingMore && (
          <div className="home__end-container" style={{
            borderTop: '1px solid rgba(212, 180, 138, 0.2)',
            marginTop: '20px'
          }}>
            You've reached the end of the feed
          </div>
        )}

        {activePost && (
          <PostModal
            post={activePost}
            onClose={closeModal}
            onLike={handleLike}
            onComment={handleComment}
            likeCount={likes}
            likedPosts={likedPosts}
            currentUser={currentUser}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReport={handleReport}
            role={role}
            totalComments={comments[activePost.id] || 0}
          />
        )}

        {activeTextPost && (
          <TextModal
            post={activeTextPost}
            onClose={closeTextModal}
            onLike={handleLike}
            onComment={handleComment}
            likeCount={likes}
            likedPosts={likedPosts}
            currentUser={currentUser}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReport={handleReport}
            role={role}
            totalComments={comments[activeTextPost.id] || 0}
          />
        )}
      </div>

      {/* Show profile editor conditionally */}
      <SetProfileModal
        open={showProfileModal}
        onClose={async () => {
          setShowProfileModal(false);
          console.log('🏠 Home: Profile modal closed, refreshing UserContext...');
          // Refresh UserContext to get updated profile data
          await refreshUserData();
          // Recheck profile status to see if we need to show interests modal
          checkProfile();
        }}
        initial={null}
      />

      {/* Show interests selection modal conditionally */}
      <InterestsSelection
        isOpen={showInterestsModal}
        onClose={handleInterestsComplete}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        open={showConfirmDelete}
        title="Delete Post"
        message={`Are you sure you want to delete this post? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      {/* Report Alert Modal */}
      <AlertModal
        open={reportAlert.show}
        title="Report Submitted"
        message={reportAlert.message}
        okText="OK"
        onOk={() => setReportAlert({ show: false, message: '' })}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType={reportTarget.type}
        targetId={reportTarget.id}
        onSubmitted={() => {
          setReportAlert({ show: true, message: 'Report submitted. Thank you for helping keep our community safe.' });
        }}
      />

      {/* Edit Post Modal */}
      <EditPostModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingPost(null);
        }}
        post={editingPost}
        onPostUpdated={handlePostUpdated}
      />
    </div>
  );
}
