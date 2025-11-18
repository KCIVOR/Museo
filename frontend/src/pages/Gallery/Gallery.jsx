import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import { useUser } from '../../contexts/UserContext';
import MuseoLoadingBox from '../../components/MuseoLoadingBox';
import MuseoEmptyState from '../../components/MuseoEmptyState';
import UploadArtModal from './UploadArtModal';
import ArtworkModal from './ArtworkModal';
import "./css/gallery.css";
import { GalleryIcon } from '../../../components/icons';
const API = import.meta.env.VITE_API_BASE;


// SVG Icon Components
function EyeIcon({ size = 24, color = 'currentColor', className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function HeartIcon({ size = 24, color = 'currentColor', className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z"/>
    </svg>
  );
}

function ChatIcon({ size = 24, color = 'currentColor', className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15a4 4 0 01-4 4H7l-4 4V7a4 4 0 014-4h10a4 4 0 014 4z"/>
    </svg>
  );
}

function PaletteIcon({ size = 48, color = 'currentColor', className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22c4.97 0 9-3.582 9-8 0-3.866-3.134-7-7-7H9a7 7 0 000 14h1c.552 0 1 .448 1 1 0 .552.448 1 1 1z"/>
      <circle cx="7.5" cy="11" r="1"/>
      <circle cx="10" cy="7.5" r="1"/>
      <circle cx="14" cy="7.5" r="1"/>
      <circle cx="16.5" cy="11" r="1"/>
    </svg>
  );
}

function TrophyIcon({ size = 16, color = 'currentColor', className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 21h8M12 17v4M7 4h10v3a5 5 0 01-10 0V4z"/>
      <path d="M21 5a4 4 0 01-4 4V5h4zM3 5h4v4A4 4 0 013 5z"/>
    </svg>
  );
}

function MedalIcon({ size = 14, variant = 'gold', className }) {
  const fills = { gold: '#ffd700', silver: '#c0c0c0', bronze: '#cd7f32' };
  const fill = fills[variant] || fills.gold;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} className={className}>
      <circle cx="12" cy="8" r="6" fill={fill} />
      <path d="M8 14l-3 7 7-4 7 4-3-7" fill={fill} opacity="0.8"/>
      <circle cx="12" cy="8" r="3" fill="#fff" opacity="0.6"/>
    </svg>
  );
}

function FireIcon({ size = 14, color = 'currentColor', className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2s4 4 4 7a4 4 0 01-8 0c0-3 4-7 4-7z"/>
      <path d="M12 13a3 3 0 013 3 3 3 0 11-6 0 3 3 0 013-3z"/>
    </svg>
  );
}

function CloseIcon({ size = 14, color = 'currentColor', className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}


export default function Gallery() {
  const { userData } = useUser();
  // Get role from UserContext instead of separate state
  const role = userData?.role || null;
  
  const navigate = useNavigate();
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [viewMode, setViewMode] = useState('masonry'); // masonry, grid, list
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [artworks, setArtworks] = useState([]);
  const [isLoadingArtworks, setIsLoadingArtworks] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(null);
  const [isFetchingArtPreference, setIsFetchingArtPreference] = useState(false);
  const [userArtPreferences, setUserArtPreferences] = useState(null);
  const [currentFeaturedIndex, setCurrentFeaturedIndex] = useState(0);
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [isArtworkModalOpen, setIsArtworkModalOpen] = useState(false);
  const [artworkStats, setArtworkStats] = useState({}); // Store stats for each artwork
  const [statsUpdateTrigger, setStatsUpdateTrigger] = useState(0); // Trigger for stats refresh
  const [topArtsWeekly, setTopArtsWeekly] = useState([]); // New state for weekly top arts
  const [isLoadingTopArts, setIsLoadingTopArts] = useState(true);
  const hasLoadedTopArts = useRef(false); // Track if we've already loaded top arts
  // Get featured artworks for rotation (limit to 6 for better UX)
  const featuredArtworks = artworks.filter(art => art.featured === true).slice(0, 6);
  const hasFeaturedArtworks = featuredArtworks.length > 0;
  
  // Randomize featured artworks order to avoid bias
  const [randomizedFeatured, setRandomizedFeatured] = useState([]);
  
  // Current featured artwork for hero (rotates every 30 seconds)
  const featuredArtwork = randomizedFeatured.length > 0 
    ? randomizedFeatured[currentFeaturedIndex] 
    : (artworks.length > 0 ? artworks[0] : null);

  const fetchCategories = async () => {
    try {
      if (loading) return;
      setLoading(true);

      const res = await fetch(`${API}/gallery/getCategories`, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      
      if (data.success && data.categories) {
        // Categories now come with counts from the backend
        // Add "All" category at the beginning with total count
        const allCategory = { 
          field: 'all', 
          name: 'All', 
          count: data.totalCount || 0 
        };
        
        setCategories([allCategory, ...data.categories]);
        setError(null);
      } else {
        throw new Error('Invalid response format');
      }

    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }


 
  const fetchArtPreference = async() => {
    try{
      if (isFetchingArtPreference) return;
      setIsFetchingArtPreference(true);
      
      const res = await fetch(`${API}/gallery/getArtPreference`, {
        method: "GET",
        credentials: "include",
      });

      const data = await res.json();
      
      if (data.success && data.artPreference) {
        setUserArtPreferences(data.artPreference);
      } else {
        setUserArtPreferences(null);
      }
      
    }catch(error){
      console.error('Error fetching art preference:', error);
    }finally{
      setIsFetchingArtPreference(false);
    }
  }


  // Fetch artworks based on selected categories with pagination
  const fetchArtworks = async (categoryFilter = 'all', page = 1, append = false) => {
    try {
      if (page === 1) {
        setIsLoadingArtworks(true);
      } else {
        setIsLoadingMore(true);
      }
      
      const queryParams = new URLSearchParams();
      if (categoryFilter !== 'all') {
        queryParams.append('categories', categoryFilter);
      }
      queryParams.append('page', page.toString());
      queryParams.append('limit', '20');
      
      const res = await fetch(`${API}/gallery/artworks?${queryParams}`, {
        method: "GET",
        credentials: 'include'
      });

      const data = await res.json();
      
      if (data.success && data.artworks) {
        if (append) {
          // Append to existing artworks for infinite scroll, avoiding duplicates
          setArtworks(prev => {
            const existingIds = new Set(prev.map(art => art.id));
            const newArtworks = data.artworks.filter(art => !existingIds.has(art.id));
            return [...prev, ...newArtworks];
          });
        } else {
          // Replace artworks for new search/filter
          setArtworks(data.artworks);
        }
        
        // Update pagination state
        if (data.pagination) {
          setCurrentPage(data.pagination.page);
          setHasMore(data.pagination.hasMore);
          if (data.pagination.total !== undefined) {
            setTotalCount(data.pagination.total);
          }
        }
        
        // Debug: Check featured status in fetched data
        const featuredCount = data.artworks.filter(art => art.featured === true).length;
        if (featuredCount > 0) {
        }
      } else {
        console.error('Failed to fetch artworks:', data.error);
        if (!append) {
          setArtworks([]);
        }
      }
      
    } catch (error) {
      console.error('Error fetching artworks:', error);
      if (!append) {
        setArtworks([]);
      }
    } finally {
      setIsLoadingArtworks(false);
      setIsLoadingMore(false);
    }
  };

  // Fetch stats for multiple artworks using batch endpoint
  const fetchArtworkStats = async (artworkIds) => {
    try {
      console.log(`📊 Fetching stats for ${artworkIds.length} artwork(s):`, artworkIds);
      const response = await fetch(`${API}/gallery/batch-stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ artworkIds })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.stats) {
        setArtworkStats(prev => ({ ...prev, ...data.stats }));
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching artwork stats:', error);
      
      // ❌ REMOVED EXPENSIVE FALLBACK - Don't make 60 DB requests!
      // If batch API fails, show zero stats instead of hammering the database
      // This prevents database egress explosion (20 artworks × 3 requests = 60 requests!)
      const newStats = {};
      artworkIds.forEach(artworkId => {
        newStats[artworkId] = {
          views: 0,
          likes: 0,
          comments: 0
        };
      });
      
      setArtworkStats(prev => ({ ...prev, ...newStats }));
    }
  };

  // Refresh stats for a specific artwork
  const refreshArtworkStats = async (artworkId) => {
    try {
      // Fetch updated stats for this specific artwork
      const [viewsRes, likesRes, commentsRes] = await Promise.all([
        fetch(`${API}/gallery/views?galleryArtId=${artworkId}`, { credentials: 'include' }),
        fetch(`${API}/gallery/react?galleryArtId=${artworkId}`, { credentials: 'include' }),
        fetch(`${API}/gallery/comments?galleryArtId=${artworkId}`, { credentials: 'include' })
      ]);

      const [viewsData, likesData, commentsData] = await Promise.all([
        viewsRes.ok ? viewsRes.json() : { viewCount: 0 },
        likesRes.ok ? likesRes.json() : { reactions: [] },
        commentsRes.ok ? commentsRes.json() : { comments: [] }
      ]);

      // Update stats for this specific artwork
      setArtworkStats(prev => ({
        ...prev,
        [artworkId]: {
          views: viewsData.viewCount || 0,
          likes: likesData.reactions?.length || 0,
          comments: commentsData.comments?.length || 0
        }
      }));

    } catch (error) {
      console.error(`Error refreshing stats for artwork ${artworkId}:`, error);
    }
  };

  // Global function to trigger stats update (can be called from anywhere)
  const triggerStatsUpdate = (artworkId) => {
    if (artworkId) {
      refreshArtworkStats(artworkId);
    } else {
      // Refresh all stats
      setStatsUpdateTrigger(prev => prev + 1);
    }
  };

  // Fetch weekly top arts from the new API
  const fetchTopArtsWeekly = async () => {
    try {
      setIsLoadingTopArts(true);
      const response = await fetch(`${API}/gallery/top-arts-weekly`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('📊 Top Arts API Response:', {
        success: data.success,
        topArtsCount: data.topArts?.length || 0,
        topArts: data.topArts
      });
      
      if (data.success && data.topArts) {
        // Find which artworks are missing
        const missingIds = data.topArts
          .map(topArt => topArt.galleryArtId)
          .filter(id => !artworks.find(art => art.id === id));
        
        let allArtworks = [...artworks];
        
        // Fetch missing artworks if needed
        if (missingIds.length > 0) {
          console.log('🔍 Fetching missing artworks:', missingIds);
          try {
            // Fetch a larger batch of artworks to find the missing ones
            const artworkResponse = await fetch(`${API}/gallery/artworks?limit=100&categories=all`, {
              method: 'GET',
              credentials: 'include'
            });
            const artworkData = await artworkResponse.json();
            
            if (artworkData.success && artworkData.artworks) {
              // Find the missing artworks from the fetched batch
              const missingArtworks = artworkData.artworks.filter(art => 
                missingIds.includes(art.id)
              );
              
              console.log('✅ Found missing artworks:', missingArtworks.length, 'out of', missingIds.length);
              
              // Merge with existing artworks
              allArtworks = [...artworks, ...missingArtworks];
            }
          } catch (error) {
            console.error('Failed to fetch missing artworks:', error);
          }
        }
        
        // Map the top arts data with full artwork details
        const topArtsWithDetails = data.topArts.map(topArt => {
          const artwork = allArtworks.find(art => art.id === topArt.galleryArtId);
          
          if (artwork) {
            return {
              ...artwork,
              rank_position: topArt.rank_position,
              engagementScore: topArt.engagementScore,
              weekStart: data.weekStart
            };
          } else {
            console.warn('⚠️ Artwork not found for top art:', {
              galleryArtId: topArt.galleryArtId,
              rank: topArt.rank_position
            });
          }
          return null;
        }).filter(Boolean);

        // Sort by rank position
        const validTopArts = topArtsWithDetails.sort((a, b) => a.rank_position - b.rank_position);
        
        console.log('✅ Final Top Arts to display:', {
          count: validTopArts.length,
          arts: validTopArts.map(art => ({ title: art.title, rank: art.rank_position }))
        });
        
        setTopArtsWeekly(validTopArts);
      } else {
        setTopArtsWeekly([]);
      }
    } catch (error) {
      console.error('Error fetching weekly top arts:', error);
      setTopArtsWeekly([]);
    } finally {
      setIsLoadingTopArts(false);
    }
  };

  // Load more artworks for infinite scroll
  const loadMoreArtworks = async () => {
    if (!hasMore || isLoadingMore) return;
    
    

    // Store multiple reference points for better position maintenance
    const currentScrollTop = window.pageYOffset;
    const viewportHeight = window.innerHeight;
    const scrollBottom = currentScrollTop + viewportHeight;
    
    // Find reference elements at different positions
    const referenceElements = [
      document.querySelector('.museo-artwork-card:nth-last-child(10)'),
      document.querySelector('.museo-artwork-card:nth-last-child(5)'),
      document.querySelector('.museo-artwork-card:last-child')
    ].filter(Boolean);
    
    const referenceData = referenceElements.map(el => ({
      element: el,
      offsetTop: el.offsetTop,
      id: el.dataset.artworkId || el.querySelector('img')?.alt || 'unknown'
    }));
    
    
    const categoryFilter = selectedCategories.length === 0 ? 'all' : selectedCategories.join(',');
    await fetchArtworks(categoryFilter, currentPage + 1, true);
    
    // Maintain position using the best available reference
    setTimeout(() => {
      let bestReference = null;
      let smallestChange = Infinity;
      
      referenceData.forEach(ref => {
        if (ref.element && document.contains(ref.element)) {
          const currentOffset = ref.element.offsetTop;
          const change = Math.abs(currentOffset - ref.offsetTop);
          if (change < smallestChange) {
            smallestChange = change;
            bestReference = ref;
          }
        }
      });
      
      if (bestReference && smallestChange > 20) {
        const newOffset = bestReference.element.offsetTop;
        const offsetDifference = newOffset - bestReference.offsetTop;
        
        window.scrollBy(0, offsetDifference);
      }
    }, 200); // Longer delay for masonry to fully settle
  };

  // Infinite scroll with Intersection Observer + Scroll Backup
  useEffect(() => {
    if (!hasMore || isLoadingMore || artworks.length < 20) return;
    
    // Create a sentinel element at the bottom
    const sentinel = document.createElement('div');
    sentinel.style.height = '1px';
    sentinel.style.background = 'transparent';
    sentinel.id = 'scroll-sentinel';
    
    // Add sentinel to the end of the MAIN artworks container (not top arts or other sections)
    const artworksContainers = document.querySelectorAll('.museo-gallery-masonry');
    const mainArtworksContainer = artworksContainers[artworksContainers.length - 1]; // Get the last one (main gallery)
    
    if (mainArtworksContainer) {
      mainArtworksContainer.appendChild(sentinel);
      
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry.isIntersecting && hasMore && !isLoadingMore) {
            loadMoreArtworks();
          }
        },
        {
          rootMargin: '50px', // Trigger only 50px before sentinel becomes visible
          threshold: 0.1
        }
      );
      
      observer.observe(sentinel);
      
      // Disabled scroll listener - using only intersection observer for more precise control
      
      return () => {
        observer.disconnect();
        if (sentinel.parentNode) {
          sentinel.parentNode.removeChild(sentinel);
        }
      };
    }
  }, [hasMore, isLoadingMore, artworks.length, loadMoreArtworks]);

  // Helper function to format numbers (e.g., 1234 -> 1.2k)
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  // Get stats for featured artwork
  const getFeaturedArtworkStats = () => {
    if (!featuredArtwork || !artworkStats[featuredArtwork.id]) {
      return { views: 0, likes: 0, comments: 0 };
    }
    return artworkStats[featuredArtwork.id];
  };

  useEffect(() => {
    fetchCategories();
    fetchArtworks(); // Fetch artworks on component mount
    fetchArtPreference();
  }, []);

  // Reset pagination when categories change
  const handleCategoryChange = (newCategories) => {
    setSelectedCategories(newCategories);
    setCurrentPage(1);
    setHasMore(true);
    setTotalCount(null);
    
    const categoryFilter = newCategories.length === 0 ? 'all' : newCategories.join(',');
    
    // Fetch artworks with new filter
    fetchArtworks(categoryFilter, 1, false);
  };

  // Simplified: Only fetch stats for featured artwork and top 3 arts
  useEffect(() => {
    if (artworks.length === 0) return;

    const statsToFetch = [];
    
    // Fetch stats for featured artwork
    if (featuredArtwork?.id && !artworkStats[featuredArtwork.id]) {
      statsToFetch.push(featuredArtwork.id);
    }
    
    // Fetch stats for top 3 arts (use topArtsWeekly state)
    if (topArtsWeekly.length > 0) {
      topArtsWeekly.slice(0, 3).forEach(art => {
        if (art?.id && !artworkStats[art.id]) {
          statsToFetch.push(art.id);
        }
      });
    }
    
    // Simple fetch (no batching, no Intersection Observer)
    if (statsToFetch.length > 0) {
      console.log(`📊 Fetching stats for featured + top arts (${statsToFetch.length} artworks)`);
      fetchArtworkStats(statsToFetch);
    }
  }, [artworks, featuredArtwork, topArtsWeekly, artworkStats]);

  // Fetch weekly top arts once when artworks are first loaded
  useEffect(() => {
    // Only fetch if we have artworks and haven't loaded top arts yet
    if (artworks.length > 0 && !hasLoadedTopArts.current) {
      console.log('🎯 Fetching top arts for the first time');
      hasLoadedTopArts.current = true; // Mark as loaded to prevent refetch
      fetchTopArtsWeekly();
    }
  }, [artworks.length > 0]); // Only depend on whether artworks exist (boolean), not the actual length

  // Refresh stats when modal updates them
  useEffect(() => {
    if (statsUpdateTrigger > 0) {
      // Refresh featured and top arts stats
      const statsToRefresh = [];
      
      if (featuredArtwork?.id) {
        statsToRefresh.push(featuredArtwork.id);
      }
      
      if (topArtsWeekly.length > 0) {
        topArtsWeekly.slice(0, 3).forEach(art => {
          if (art?.id) statsToRefresh.push(art.id);
        });
      }
      
      if (statsToRefresh.length > 0) {
        console.log('🔄 Refreshing stats after modal update');
        fetchArtworkStats(statsToRefresh);
      }
    }
  }, [statsUpdateTrigger, featuredArtwork, topArtsWeekly]);

  // Periodic refresh for featured and top arts stats (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      const statsToRefresh = [];
      
      if (featuredArtwork?.id) {
        statsToRefresh.push(featuredArtwork.id);
      }
      
      if (topArtsWeekly.length > 0) {
        topArtsWeekly.slice(0, 3).forEach(art => {
          if (art?.id) statsToRefresh.push(art.id);
        });
      }
      
      if (statsToRefresh.length > 0) {
        console.log('⏰ Periodic refresh of featured + top arts stats');
        fetchArtworkStats(statsToRefresh);
      }
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, [featuredArtwork, topArtsWeekly]);

  // Randomize featured artworks when they change
  useEffect(() => {
    if (featuredArtworks.length > 0) {
      // Fisher-Yates shuffle algorithm for true randomization
      const shuffled = [...featuredArtworks];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setRandomizedFeatured(shuffled);
      setCurrentFeaturedIndex(0); // Reset to first item in new random order
    }
  }, [featuredArtworks.length]); // Only depend on length, not entire artworks array

  // Auto-rotate featured artworks every 30 seconds with randomized order
  useEffect(() => {
    if (randomizedFeatured.length > 1) {
      const interval = setInterval(() => {
        setCurrentFeaturedIndex(prevIndex => {
          const nextIndex = (prevIndex + 1) % randomizedFeatured.length;
          
          // If we've completed a full cycle, re-randomize for next round
          if (nextIndex === 0) {
            const shuffled = [...randomizedFeatured];
            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            setRandomizedFeatured(shuffled);
          }
          
          return nextIndex;
        });
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [randomizedFeatured.length]);




  // Function to sort artworks based on user preferences (row-based loading)
  const sortArtworksByPreference = (artworksToSort) => {
    if (!userArtPreferences || !artworksToSort.length) {
      return artworksToSort;
    }

    // Map database preference fields to category names
    const preferenceMapping = {
      'classicalArt': 'Classical Art',
      'abstractArt': 'Abstract Art',
      'digitalArt': 'Digital Art',
      'surrealist': 'Surrealist',
      'contemporaryArt': 'Contemporary Art',
      'sculpture': 'Sculpture',
      'streetArt': 'Street Art',
      'landscape': 'Landscape',
      'impressionist': 'Impressionist',
      'photography': 'Photography',
      'minimalist': 'Minimalist',
      'portrait': 'Portrait',
      'miniature': 'Miniature',
      'expressionist': 'Expressionist',
      'realism': 'Realism',
      'conceptual': 'Conceptual'
    };

    // Get user's preferred categories
    const preferredCategories = Object.keys(preferenceMapping)
      .filter(key => userArtPreferences[key] === true)
      .map(key => preferenceMapping[key]);

    // Separate preferred and non-preferred artworks (handle multiple categories)
    const preferredArtworks = artworksToSort.filter(artwork => {
      if (Array.isArray(artwork.categories)) {
        return artwork.categories.some(cat => preferredCategories.includes(cat));
      }
      return false;
    });
    
    const nonPreferredArtworks = artworksToSort.filter(artwork => {
      // Handle single category (string)
      if (typeof artwork.category === 'string') {
        return !preferredCategories.includes(artwork.category);
      }
      // Handle multiple categories (array)
      if (Array.isArray(artwork.category)) {
        return !artwork.category.some(cat => preferredCategories.includes(cat));
      }
      // Handle categories stored as JSON string
      if (typeof artwork.categories === 'string') {
        try {
          const categoriesArray = JSON.parse(artwork.categories);
          return Array.isArray(categoriesArray) && 
                 !categoriesArray.some(cat => preferredCategories.includes(cat));
        } catch (e) {
          return !preferredCategories.includes(artwork.categories);
        }
      }
      // Handle categories as array
      if (Array.isArray(artwork.categories)) {
        return !artwork.categories.some(cat => preferredCategories.includes(cat));
      }
      return true;
    });

    // Row-based arrangement: 4 columns per row (desktop default)
    const columnsPerRow = 4;
    const arrangedArtworks = [];

    // Calculate how many complete rows of preferred artworks we can make
    const preferredRows = Math.ceil(preferredArtworks.length / columnsPerRow);
    
    // Fill rows with preferred artworks first
    for (let row = 0; row < preferredRows; row++) {
      const rowStart = row * columnsPerRow;
      const rowEnd = Math.min(rowStart + columnsPerRow, preferredArtworks.length);
      
      for (let col = rowStart; col < rowEnd; col++) {
        arrangedArtworks.push(preferredArtworks[col]);
      }
    }

    // Then add non-preferred artworks to fill remaining space
    arrangedArtworks.push(...nonPreferredArtworks);

    return arrangedArtworks;
  };

  // Function to get all categories for an artwork
  const getArtworkCategories = (artwork) => {
    // Handle single category (string)
    if (typeof artwork.category === 'string') {
      return [artwork.category];
    }
    // Handle multiple categories (array)
    if (Array.isArray(artwork.category)) {
      return artwork.category;
    }
    // Handle categories stored as JSON string
    if (typeof artwork.categories === 'string') {
      try {
        const categoriesArray = JSON.parse(artwork.categories);
        return Array.isArray(categoriesArray) ? categoriesArray : [artwork.categories];
      } catch (e) {
        return [artwork.categories];
      }
    }
    // Handle categories as array
    if (Array.isArray(artwork.categories)) {
      return artwork.categories;
    }
    // Fallback
    return ['Uncategorized'];
  };

  // Function to render categories as list items (for card displays)
  const renderCategoriesList = (artwork) => {
    const categories = getArtworkCategories(artwork);
    return categories.map((category, index) => (
      <li key={index} className="museo-artwork-category-item">
        {category}
      </li>
    ));
  };


  // Top Arts of the Week - Featured artworks first, then preference-sorted
  const getFeaturedAndTopArts = () => {
    const featuredArts = artworks.filter(art => art.featured === true);
    const nonFeaturedArts = artworks.filter(art => art.featured !== true);
    const sortedNonFeatured = sortArtworksByPreference(nonFeaturedArts);
    
    // Combine featured artworks first, then fill with preference-sorted non-featured
    const combined = [...featuredArts, ...sortedNonFeatured];
    return combined.slice(0, 6);
  };
  
  const topArtsOfWeek = getFeaturedAndTopArts();
  
  // User preference sections
  const userSections = [
    { name: 'Recently Added', artworks: sortArtworksByPreference([...artworks]).slice(6, 12) }
  ];

  // Artworks are now filtered on the server side, so we use them directly
  const filteredArtworks = sortArtworksByPreference([...artworks]);

  // Helper function to open artwork modal
  const openArtworkModal = (artwork, context = 'ARTWORK') => {
    setSelectedArtwork(artwork);
    setIsArtworkModalOpen(true);
  };

  // Helper function to close artwork modal
  const closeArtworkModal = () => {
    setIsArtworkModalOpen(false);
    setSelectedArtwork(null);
  };

  // Handle artwork upload
  const handleArtworkUpload = async (formData) => {
    try {
      const response = await fetch(`${API}/gallery/upload`, {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        body: formData, // FormData object from modal
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Upload failed');
      }

      
      // Refresh artworks list after successful upload (reset to first page)
      setCurrentPage(1);
      setHasMore(true);
      setTotalCount(null);
      const categoryFilter = selectedCategories.length === 0 ? 'all' : selectedCategories.join(',');
      
      // Force a fresh fetch to get the new featured artwork
      setArtworks([]); // Clear existing artworks to force re-render
      await fetchArtworks(categoryFilter, 1, false);
      
      // Refresh categories to update counts after new upload
      await fetchCategories();
      
      // If the uploaded artwork is featured, it should appear in the hero section
      if (result.artwork?.featured) {
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      throw error; // Re-throw to let modal handle the error
    }
  };

  return (
    <div className="museo-gallery-container">
      {/* Loading State */}
      <MuseoLoadingBox 
        show={isLoadingArtworks} 
        message={MuseoLoadingBox.messages.gallery} 
      />

      {/* Main Content - Only show when not loading */}
      {!isLoadingArtworks && (
        <>
          {/* Artistic Museum Hero Section */}
      <div className="museo-gallery-hero">
        {/* Artistic Decorative Elements */}
        {/* Golden Ornamental Corners */}
        <div className="museo-hero-ornament-1"></div>
        <div className="museo-hero-ornament-2"></div>
        <div className="museo-hero-ornament-3"></div>
        <div className="museo-hero-ornament-4"></div>
        
        {/* Museum Texture Overlay */}
        <div className="museo-hero-texture"></div>
        
        {/* Artistic Border Frame */}
        <div className="museo-hero-border-outer"></div>
        <div className="museo-hero-border-inner"></div>
        
        <div className="museo-hero-content">
          {featuredArtwork ? (
            <>
              {/* Featured artwork image */}
              <div className="museo-hero-artwork">
                <div 
                  className="museo-hero-artwork-frame"
                  onClick={() => openArtworkModal(featuredArtwork, 'FEATURED ARTWORK FRAME')}
                  onMouseOver={(e) => {
                    const container = e.currentTarget;
                    const badge = container.parentElement.querySelector('.featured-badge');
                    
                    container.style.transform = 'rotate(-0.5deg) scale(1.03) translateY(-8px)';
                    container.style.boxShadow = `
                      0 50px 140px rgba(44, 24, 16, 0.4),
                      0 25px 80px rgba(139, 115, 85, 0.3),
                      0 12px 40px rgba(212, 180, 138, 0.2),
                      inset 0 1px 0 rgba(255, 255, 255, 0.9),
                      inset 0 -1px 0 rgba(212, 180, 138, 0.3)
                    `;
                    
                    if (badge) {
                      badge.style.transform = 'translateX(-50%) rotate(-2deg) translateY(-8px) scale(1.05)';
                      badge.style.boxShadow = `
                        0 16px 40px rgba(44, 24, 16, 0.6),
                        0 6px 20px rgba(139, 115, 85, 0.4),
                        inset 0 1px 0 rgba(212, 180, 138, 0.4),
                        inset 0 -1px 0 rgba(44, 24, 16, 0.3)
                      `;
                    }
                  }}
                  onMouseOut={(e) => {
                    const container = e.currentTarget;
                    const badge = container.parentElement.querySelector('.featured-badge');
                    
                    container.style.transform = 'rotate(-0.5deg) scale(1) translateY(0)';
                    container.style.boxShadow = `
                      0 40px 120px rgba(44, 24, 16, 0.3),
                      0 20px 60px rgba(139, 115, 85, 0.2),
                      0 8px 32px rgba(212, 180, 138, 0.15),
                      inset 0 1px 0 rgba(255, 255, 255, 0.8),
                      inset 0 -1px 0 rgba(212, 180, 138, 0.2)
                    `;
                    
                    if (badge) {
                      badge.style.transform = 'translateX(-50%) rotate(-2deg) translateY(0) scale(1)';
                      badge.style.boxShadow = `
                        0 12px 32px rgba(44, 24, 16, 0.5),
                        0 4px 16px rgba(139, 115, 85, 0.3),
                        inset 0 1px 0 rgba(212, 180, 138, 0.3),
                        inset 0 -1px 0 rgba(44, 24, 16, 0.2)
                      `;
                    }
                  }}
                >
                  {/* Inner Frame */}
                  <div className="museo-hero-artwork-inner-frame">
                    <img 
                      src={Array.isArray(featuredArtwork.image) ? featuredArtwork.image[0] : featuredArtwork.image}
                      alt={featuredArtwork.title}
                      className="museo-hero-artwork-image"
                    />
                  </div>
                </div>
                {/* Elegant Featured Badge */}
                <div className="featured-badge museo-hero-featured-badge">
                  Featured Masterpiece
                </div>
                
              </div>

              {/* Featured artwork info */}
              <div className="museo-hero-info">
                {/* Decorative Title Background */}
                <div className="museo-hero-title-bg"></div>
                
                <h1 className="museo-hero-title">
                  <span className="museo-hero-title-gradient">
                    {featuredArtwork.title}
                  </span>
                </h1>
                {/* Artist Information Card */}
                <div className="museo-hero-artist-card">
                  {featuredArtwork.artistProfilePicture ? (
                    <div className="museo-hero-artist-avatar-frame">
                      <img 
                        src={featuredArtwork.artistProfilePicture} 
                        alt={featuredArtwork.artist}
                        className="museo-hero-artist-avatar"
                      />
                    </div>
                  ) : (
                    <div className="museo-hero-artist-avatar-fallback">
                      {featuredArtwork.artist?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                  )}
                  <div>
                    <p className="museo-hero-artist-name">
                      {featuredArtwork.artist || 'Gallery Artist'}
                    </p>
                    <p className="museo-hero-artist-date">
                      {new Date(featuredArtwork.datePosted).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                {/* Enhanced Stats Section */}
                <div className="museo-hero-stats-grid">
                  <div className="museo-hero-stat-card">
                    <div className="museo-hero-stat-icon" aria-hidden="true"><EyeIcon size={24} /></div>
                    <div className="museo-hero-stat-number">
                      {formatNumber(getFeaturedArtworkStats().views)}
                    </div>
                    <div className="museo-hero-stat-label">
                      Views
                    </div>
                  </div>
                  <div className="museo-hero-stat-card">
                    <div className="museo-hero-stat-icon" aria-hidden="true"><HeartIcon size={24} /></div>
                    <div className="museo-hero-stat-number">
                      {formatNumber(getFeaturedArtworkStats().likes)}
                    </div>
                    <div className="museo-hero-stat-label">
                      Likes
                    </div>
                  </div>
                  <div className="museo-hero-stat-card">
                    <div className="museo-hero-stat-icon" aria-hidden="true"><ChatIcon size={24} /></div>
                    <div className="museo-hero-stat-number">
                      {formatNumber(getFeaturedArtworkStats().comments)}
                    </div>
                    <div className="museo-hero-stat-label">
                      Comments
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="museo-hero-empty-container">
              {/* Decorative Empty State Background */}
              <div className="museo-hero-empty-bg"></div>
              
              <div className="museo-hero-empty-card">
                <div className="museo-hero-empty-icon">
                  <PaletteIcon size={48} color="#f4f1ec" />
                </div>
                
                <h2 className="museo-hero-empty-title">Awaiting Your Masterpiece</h2>
                
                <p className="museo-hero-empty-desc">The gallery canvas awaits your artistic vision.<br/>Share your first creation to illuminate this space.</p>
                
                {(role === 'admin' || role === 'artist') && (
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="museo-hero-empty-upload-btn"
                  >
                    Begin Your Gallery
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="museo-page museo-page--gallery">
        <div className="museo-feed">
          
          {/* Top Arts of the Week - New API-based system */}
          {!isLoadingTopArts && topArtsWeekly.length > 0 && (
          <div className="museo-top-arts-container">
            <div className="museo-gallery-header">
              <h1 className="museo-heading museo-heading--gallery">
                Top Arts of the Week
              </h1>
              <p className="museo-gallery-subtitle">
                The most celebrated masterpieces this week
              </p>
            </div>
            
            {/* Creative Podium Container */}
            <div className="museo-top-arts-bg-container">
              {/* Enhanced decorative background elements */}
              <div className="museo-top-arts-deco-1"></div>
              <div className="museo-top-arts-deco-2"></div>
              <div className="museo-top-arts-glow"></div>
              
              {/* Podium Layout */}
              <div className="museo-top-arts-podium gallery__podium">
                {(() => {
                  // Use the topArtsWeekly data from the new API
                  const topArts = topArtsWeekly; // Already sorted by rank_position from API
                  
                  // Helper function to format numbers (e.g., 1000 -> 1K)
                  const formatNumber = (num) => {
                    if (num >= 1000000) {
                      return (num / 1000000).toFixed(1) + 'M';
                    } else if (num >= 1000) {
                      return (num / 1000).toFixed(1) + 'K';
                    }
                    return num.toString();
                  };
                  return (
                    <>
                      {/* Second Place - Left */}
                      {topArts[1] && (
                        <div 
                          className="gallery__podium-card gallery__podium-card--second"
                          onClick={() => openArtworkModal(topArts[1], 'TOP ARTS #2 (SILVER)')}
                        >
                          <div className="gallery__rank-badge gallery__rank-badge--silver">
                            <span style={{display:'inline-flex',alignItems:'center',gap:'6px'}}>
                              <MedalIcon variant="silver" size={14} />
                              <span>#2</span>
                            </span>
                          </div>
                          <img
                            src={Array.isArray(topArts[1].image) ? topArts[1].image[0] : topArts[1].image}
                            alt={topArts[1].title}
                            className="gallery__podium-img gallery__podium-img--second"
                          />
                          <h4 className="gallery__podium-title gallery__podium-title--second">
                            {topArts[1].title}
                          </h4>
                          <p className="gallery__podium-artist gallery__podium-artist--second">
                            {topArts[1].artist}
                          </p>
                        </div>
                      )}

                      {/* First Place - Center (Champion) */}
                      {topArts[0] && (
                        <div 
                          className="gallery__podium-card gallery__podium-card--first"
                          onClick={() => openArtworkModal(topArts[0], 'TOP ARTS #1 (GOLD CHAMPION)')}
                        >
                          <div className="gallery__champion-badge">
                            <span style={{display:'inline-flex',alignItems:'center',gap:'8px'}}>
                              <TrophyIcon size={16} color="#ffd700" />
                              <span>TOP ART OF THE WEEK</span>
                            </span>
                          </div>
                          <img
                            src={Array.isArray(topArts[0].image) ? topArts[0].image[0] : topArts[0].image}
                            alt={topArts[0].title}
                            className="gallery__podium-img gallery__podium-img--first"
                          />
                          <h3 className="gallery__podium-title gallery__podium-title--first">
                            {topArts[0].title}
                          </h3>
                          <p className="gallery__podium-artist gallery__podium-artist--first">
                            {topArts[0].artist}
                          </p>
                          <div className="gallery__views-badge">
                            <span style={{display:'inline-flex',alignItems:'center',gap:'6px'}}>
                              <FireIcon size={14} color="#ff4500" />
                              <span>{formatNumber(artworkStats[topArts[0].id]?.views || 0)} views</span>
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Third Place - Right */}
                      {topArts[2] && (
                        <div 
                          className="gallery__podium-card gallery__podium-card--third"
                          onClick={() => openArtworkModal(topArts[2], 'TOP ARTS #3 (BRONZE)')}
                        >
                          <div className="gallery__rank-badge gallery__rank-badge--bronze">
                            <span style={{display:'inline-flex',alignItems:'center',gap:'6px'}}>
                              <MedalIcon variant="bronze" size={14} />
                              <span>#3</span>
                            </span>
                          </div>
                          <img
                            src={Array.isArray(topArts[2].image) ? topArts[2].image[0] : topArts[2].image}
                            alt={topArts[2].title}
                            className="gallery__podium-img gallery__podium-img--third"
                          />
                          <h5 className="gallery__podium-title gallery__podium-title--third">
                            {topArts[2].title}
                          </h5>
                          <p className="gallery__podium-artist gallery__podium-artist--third">
                            {topArts[2].artist}
                          </p>
                        </div>
                      )}

                      {/* Bottom Row - Notable Acquisitions (4-6) */}
                      {topArts.length > 3 && (
                        <div className="gallery__notable-section">
                          <div className="gallery__notable-header">
                            <h3 className="gallery__notable-title">
                              Notable Acquisitions
                            </h3>
                            <p className="gallery__notable-subtitle">
                              Positions 4-6 in our weekly rankings
                            </p>
                          </div>
                          
                          <div className="gallery__notable-grid">
                            {topArts.slice(3).map((artwork, index) => (
                              <div
                                key={artwork.id}
                                className="gallery__notable-card"
                                onClick={() => openArtworkModal(artwork, `NOTABLE MENTION #${index + 4}`)}
                              >
                                <div className="gallery__notable-img-wrapper">
                                  <img
                                    src={Array.isArray(artwork.image) ? artwork.image[0] : artwork.image}
                                    alt={artwork.title}
                                    className="gallery__notable-img"
                                  />
                                  <div className="gallery__notable-rank">
                                    #{index + 4}
                                  </div>
                                </div>
                                
                                <div className="gallery__notable-content">
                                  <h5 className="gallery__notable-card-title">
                                    {artwork.title}
                                  </h5>
                                  <p className="gallery__notable-card-artist">
                                    {artwork.artist}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
          )}

          {/* Gallery Header with Filter */}
          <div style={{ marginBottom: '60px' }}>
            {/* Refined Museo Filter System */}
            <div style={{
              background: 'linear-gradient(135deg, #faf8f5 0%, #f8f5f0 100%)',
              padding: '28px 36px',
              borderRadius: '20px',
              border: '1px solid rgba(107,66,38,0.15)',
              boxShadow: '0 6px 24px rgba(107,66,38,0.08), 0 2px 8px rgba(0,0,0,0.04)',
              marginBottom: '40px',
              maxWidth: '1200px',
              margin: '0 auto 40px'
            }}>
              {/* Elegant Header */}
              <div style={{
                textAlign: 'center',
                marginBottom: '24px'
              }}>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#2c1810',
                  margin: '0 0 8px 0',
                  fontFamily: 'Georgia, serif',
                  letterSpacing: '0.3px'
                }}>
                  Filter Collection
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: '#6b4226',
                  margin: 0,
                  opacity: 0.8
                }}>
                  Select art styles to explore your curated gallery
                </p>
              </div>

              {/* Filter Buttons */}
              {loading ? (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '20px'
                }}>
                  <div style={{
                    color: '#6b4226',
                    fontSize: '14px'
                  }}>
                    Loading categories...
                  </div>
                </div>
              ) : error ? (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '20px'
                }}>
                  <div style={{
                    color: '#d32f2f',
                    fontSize: '14px'
                  }}>
                    {error}
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                  justifyContent: 'center',
                  marginBottom: selectedCategories.length > 0 ? '24px' : '0'
                }}>
                  {categories.filter(cat => cat.name !== 'All').map(category => (
                  <button
                    key={category.name}
                    className={`btn-filter ${selectedCategories.includes(category.name) ? 'active' : ''}`}
                    onClick={() => {
                      let newCategories;
                      if (selectedCategories.includes(category.name)) {
                        newCategories = selectedCategories.filter(cat => cat !== category.name);
                      } else {
                        newCategories = [...selectedCategories, category.name];
                      }
                      
                      // Use the new handler that resets pagination
                      handleCategoryChange(newCategories);
                    }}
                  >
                    {category.name}
                  </button>
                ))}
                </div>
              )}

              {/* Active Filters Summary */}
              {selectedCategories.length > 0 && (
                <div style={{
                  background: 'rgba(44,24,16,0.06)',
                  border: '1px solid rgba(44,24,16,0.12)',
                  borderRadius: '16px',
                  padding: '20px 24px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{
                        fontSize: '15px',
                        color: '#2c1810',
                        fontWeight: '600',
                        fontFamily: 'Georgia, serif'
                      }}>
                        Showing {filteredArtworks.length} of {artworks.length} artworks
                      </span>
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        flexWrap: 'wrap'
                      }}>
                        {selectedCategories.map((category) => (
                          <span
                            key={category}
                            className="btn-chip"
                            onClick={() => {
                              const newCategories = selectedCategories.filter(cat => cat !== category);
                              handleCategoryChange(newCategories);
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            {category}
                            <span style={{ marginLeft: '6px', opacity: 0.7, display: 'inline-flex' }} aria-hidden="true">
                              <CloseIcon size={14} />
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <button
                      className="btn btn-museo-ghost btn-sm"
                      onClick={() => {
                        handleCategoryChange([]); // Clear all filters and reset pagination
                        setPage(1); // Reset pagination
                      }}
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

            
          {/* User Preference Sections - Classic Masonry Style */}
          {selectedCategories.length === 0 && userSections.map(section => (
            <div key={section.name} style={{ marginBottom: '80px' }}>
              <div className="museo-gallery-header">
                <h1 className="museo-heading museo-heading--gallery">
                  {section.name}
                </h1>
                <p className="museo-gallery-subtitle">
                  Discover {section.artworks.length} carefully selected pieces
                </p>
              </div>
              
              <div className="museo-gallery-masonry" style={{ 
                columnCount: '4 !important',
                columnGap: '2rem !important',
                columnFill: 'balance !important'
              }}>
                {section.artworks.map((artwork, index) => (
                  <div 
                    key={artwork?.id || `section-artwork-${index}`} 
                    className="museo-event-card"
                    data-artwork-id={artwork?.id}
                    style={{ 
                      animationDelay: `${index * 0.02}s`,
                      cursor: 'pointer'
                    }}
                    onClick={() => openArtworkModal(artwork, `RECENTLY ADDED #${index + 1}`)}
                  >
                    <img 
                      src={Array.isArray(artwork.image) ? artwork.image[0] : artwork.image} 
                      alt={artwork.title}
                      className="museo-event-image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <div className="museo-event-content">
                      <h3 className="museo-title">
                        {artwork.title}
                      </h3>
                      
                      <div className="museo-artwork-artist-info">
                        {artwork.artistProfilePicture ? (
                          <img 
                            src={artwork.artistProfilePicture} 
                            alt={artwork.artist}
                            className="museo-artist-avatar"
                          />
                        ) : (
                          <div className="museo-artist-avatar-placeholder">
                            {artwork.artist?.charAt(0)?.toUpperCase() || 'A'}
                          </div>
                        )}
                        <span className="museo-artwork-artist">
                          {artwork.artist}
                        </span>
                      </div>
                      
                      <p className="museo-desc">
                        {getArtworkCategories(artwork).join(', ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Main Gallery - Classic Masonry Layout */}
          <div className="museo-gallery-header">
            <h1 className="museo-heading museo-heading--gallery">
              {selectedCategories.length === 0 
                ? 'Curated Collection' 
                : selectedCategories.length === 1 
                  ? `${selectedCategories[0]} Collection`
                  : 'Mixed Style Collection'
              }
            </h1>
            <p className="museo-gallery-subtitle">
              {selectedCategories.length === 0 
                ? userArtPreferences 
                  ? 'Personalized selection based on your art preferences, featuring your favorite styles first'
                  : 'Discover masterpieces from across centuries and movements'
                : selectedCategories.length === 1
                  ? `Explore ${filteredArtworks.length} artworks in ${selectedCategories[0]} style`
                  : `Explore ${filteredArtworks.length} artworks across ${selectedCategories.length} selected styles`
              }
            </p>
          </div>
          
          {/* Loading State */}
          {isLoadingArtworks && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              minHeight: '400px',
              width: '100%'
            }}>
              <MuseoLoadingBox show={true} />
            </div>
          )}

          {/* Empty State */}
          {!isLoadingArtworks && filteredArtworks.length === 0 && (
            <div style={{ 
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '400px',
              padding: '60px 20px',
              textAlign: 'center'
            }}>
              <MuseoEmptyState 
                title={selectedCategories.length > 0 ? "No artworks match your filters" : "No artworks found"}
                subtitle={selectedCategories.length > 0 
                  ? `No artworks found in ${selectedCategories.join(', ')}. Try different categories or clear filters to see all artworks.`
                  : 'No artworks have been uploaded yet. Be the first to share your art with the community!'
                }
              />
            </div>
          )}

          {/* Artworks Grid - Only show when we have artworks */}
          {!isLoadingArtworks && filteredArtworks.length > 0 && (
            <>
              <div className="museo-gallery-masonry">
                {filteredArtworks.map((artwork, index) => (
                  <div 
                    key={`artwork-${artwork?.id || index}-${index}`} 
                    className="museo-event-card"
                    data-artwork-id={artwork?.id}
                    style={{ 
                      animationDelay: `${index * 0.02}s`,
                      cursor: 'pointer'
                    }}
                    onClick={() => openArtworkModal(artwork, `GALLERY ARTWORK #${index + 1}`)}
                  >
                    <img 
                      src={Array.isArray(artwork.image) ? artwork.image[0] : artwork.image} 
                      alt={artwork.title}
                      className="museo-event-image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                      loading="lazy"
                    />
                    
                    <div className="museo-event-content">
                      <h3 className="museo-title">
                        {artwork.title}
                      </h3>
                      
                      <div className="museo-artwork-artist-info">
                        {artwork.artistProfilePicture ? (
                          <img 
                            src={artwork.artistProfilePicture} 
                            alt={artwork.artist}
                            className="museo-artist-avatar"
                          />
                        ) : (
                          <div className="museo-artist-avatar-placeholder">
                            {artwork.artist?.charAt(0)?.toUpperCase() || 'A'}
                          </div>
                        )}
                        <span className="museo-artwork-artist">
                          {artwork.artist}
                        </span>
                      </div>
                      
                      <p className="museo-desc">
                        {getArtworkCategories(artwork).join(', ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Load More Indicator */}
              {isLoadingMore && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  padding: '40px 20px',
                  gridColumn: '1 / -1'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px 24px',
                    background: 'var(--museo-bg-secondary)',
                    borderRadius: '12px',
                    border: '1px solid var(--museo-border)',
                    color: 'var(--museo-text-secondary)',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid var(--museo-border)',
                      borderTop: '2px solid var(--museo-primary)',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    Loading more artworks...
                  </div>
                </div>
              )}
              
              
              {/* End of Collection Indicator */}
              {!hasMore && artworks.length > 20 && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  padding: '40px 20px',
                  gridColumn: '1 / -1'
                }}>
                  <div style={{
                    padding: '16px 24px',
                    background: 'var(--museo-bg-secondary)',
                    borderRadius: '12px',
                    border: '1px solid var(--museo-border)',
                    color: 'var(--museo-text-muted)',
                    fontSize: '14px',
                    textAlign: 'center'
                  }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <PaletteIcon size={16} color="var(--museo-primary)" />
                      <span>You've reached the end of the collection</span>
                    </div>
                    {totalCount && (
                      <div style={{ marginTop: '4px', fontSize: '12px' }}>
                        Showing all {totalCount} artworks
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}


          <div className="museo-gallery-stats">
            <h3 className="museo-gallery-stats-title">Gallery Collection</h3>
            <p className="museo-gallery-stats-text">
              Featuring {filteredArtworks.length} carefully curated masterpieces spanning multiple centuries and artistic movements. 
              Each piece represents a significant moment in art history, from classical Renaissance works to modern abstract expressions.
            </p>
          </div>
        </div>
      </div>

      {/* Floating Action Button - Bottom Right - Only for admin/artist */}
      {(role === 'admin' || role === 'artist') && (
        <button
          className="btn btn-primary museo-floating-btn"
          onClick={() => setIsUploadModalOpen(true)}
          title="Add Artwork"
        >
          +
        </button>
      )}
        </>
      )}

      {/* Upload Art Modal */}
      <UploadArtModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSubmit={handleArtworkUpload}
      />

      {/* Artwork Detail Modal */}
      <ArtworkModal
        artwork={selectedArtwork}
        isOpen={isArtworkModalOpen}
        onClose={closeArtworkModal}
        onStatsUpdate={triggerStatsUpdate}
      />
    </div>
  );
}
