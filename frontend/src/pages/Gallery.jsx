import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import MuseoLoadingBox from '../components/MuseoLoadingBox';
import MuseoEmptyState from '../components/MuseoEmptyState';
import UploadArtModal from './subPages/UploadArtModal';
import ArtworkModal from './subPages/ArtworkModal';
import "./css/gallery.css";
const API = import.meta.env.VITE_API_BASE;


export default function Gallery() {
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
  const [role, setRole] = useState(null);
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


  const fetchRole = async () => {
    try {
      const response = await fetch(`${API}/users/role`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) throw new Error(`Failed to fetch user: ${response.statusText}`);
      const data = await response.json();
      setRole(data);
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };
 
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
      
      // Fallback to individual calls if batch fails
      const statsPromises = artworkIds.map(async (artworkId) => {
        try {
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

          return {
            artworkId,
            views: viewsData.viewCount || 0,
            likes: likesData.reactions?.length || 0,
            comments: commentsData.comments?.length || 0
          };
        } catch (error) {
          console.error(`Error fetching stats for artwork ${artworkId}:`, error);
          return {
            artworkId,
            views: 0,
            likes: 0,
            comments: 0
          };
        }
      });

      const statsResults = await Promise.all(statsPromises);
      
      const newStats = {};
      statsResults.forEach(stat => {
        newStats[stat.artworkId] = {
          views: stat.views,
          likes: stat.likes,
          comments: stat.comments
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
      
      if (data.success && data.topArts) {
        // Find which artworks are missing
        const missingIds = data.topArts
          .map(topArt => topArt.galleryArtId)
          .filter(id => !artworks.find(art => art.id === id));
        
        let allArtworks = [...artworks];
        
        // Fetch missing artworks if needed
        if (missingIds.length > 0) {
          try {
            // Fetch only what we need: top 6 + buffer = 20 artworks
            const artworkResponse = await fetch(`${API}/gallery/artworks?limit=20&categories=all`, {
              method: 'GET',
              credentials: 'include'
            });
            const artworkData = await artworkResponse.json();
            if (artworkData.success && artworkData.artworks) {
              // Merge with existing artworks
              allArtworks = [...artworks, ...artworkData.artworks];
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
          }
          return null;
        }).filter(Boolean);

        // Sort by rank position
        const validTopArts = topArtsWithDetails.sort((a, b) => a.rank_position - b.rank_position);
        
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
    fetchRole()
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
    fetchArtworks(categoryFilter, 1, false);
  };

  // Fetch stats when artworks are loaded (with debounce)
  useEffect(() => {
    if (artworks.length > 0) {
      // Debounce stats fetching to prevent excessive calls - only for visible artworks
      const timeoutId = setTimeout(() => {
        // Only fetch stats for first 30 artworks (visible on screen)
        const visibleArtworks = artworks.slice(0, 30);
        const artworkIds = visibleArtworks.map(artwork => artwork.id);
        fetchArtworkStats(artworkIds);
      }, 500); // Wait 500ms before fetching stats

      return () => clearTimeout(timeoutId);
    }
  }, [artworks]);

  // Fetch weekly top arts once when artworks are first loaded
  useEffect(() => {
    // Only fetch if we have artworks and haven't loaded top arts yet
    if (artworks.length > 0 && !hasLoadedTopArts.current) {
      console.log('🎯 Fetching top arts for the first time');
      hasLoadedTopArts.current = true; // Mark as loaded to prevent refetch
      fetchTopArtsWeekly();
    }
  }, [artworks.length > 0]); // Only depend on whether artworks exist (boolean), not the actual length

  // Refresh stats for visible artworks only (not all artworks)
  useEffect(() => {
    if (statsUpdateTrigger > 0 && artworks.length > 0) {
      // Only fetch stats for first 30 artworks (visible on screen)
      const visibleArtworks = artworks.slice(0, 30);
      const visibleArtworkIds = visibleArtworks.map(artwork => artwork.id);
      fetchArtworkStats(visibleArtworkIds);
    }
  }, [statsUpdateTrigger]); // Remove artworks dependency

  // Reduced frequency stats refresh to save Supabase usage (every 5 minutes)
  useEffect(() => {
    if (artworks.length === 0) return;

    const interval = setInterval(() => {
      if (artworks.length > 0) {
        // Only refresh stats for first 30 visible artworks
        const visibleArtworks = artworks.slice(0, 30);
        const visibleArtworkIds = visibleArtworks.map(artwork => artwork.id);
        fetchArtworkStats(visibleArtworkIds);
      }
    }, 300000); // 5 minutes instead of 30 seconds (90% reduction!)

    return () => clearInterval(interval);
  }, []); // Remove artworks dependency to prevent interval reset

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

  // Function to generate varied heights for masonry effect
  const getArtworkHeight = (artwork, index) => {
    // If artwork has a specific height, use it
    if (artwork.height && artwork.height !== 300) {
      return artwork.height;
    }
    
    // Create varied heights for masonry effect (200-450px range)
    const heightVariations = [220, 280, 320, 380, 240, 350, 300, 420, 260, 400];
    
    // Use artwork ID or index to ensure consistent heights for same artwork
    const artworkId = artwork.id || artwork.galleryArtId || index;
    const heightIndex = typeof artworkId === 'string' 
      ? artworkId.length % heightVariations.length 
      : artworkId % heightVariations.length;
    
    return heightVariations[heightIndex];
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
      <li key={index} style={{ 
        fontSize: '14px',
        color: '#6b4226',
        marginBottom: '4px'
      }}>
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
    <div style={{ 
      background: 'transparent',
      minHeight: '100vh'
    }}>
      {/* Loading State */}
      <MuseoLoadingBox 
        show={isLoadingArtworks} 
        message={MuseoLoadingBox.messages.gallery} 
      />

      {/* Main Content - Only show when not loading */}
      {!isLoadingArtworks && (
        <>
          {/* Artistic Museum Hero Section */}
      <div style={{
        background: `
          linear-gradient(145deg, #2c1810 0%, #4a2c1a 15%, #6e4a2e 35%, #8b6f47 60%, #a67c52 85%, #d4b48a 100%),
          radial-gradient(ellipse 800px 400px at 20% 30%, rgba(212, 180, 138, 0.3) 0%, transparent 50%),
          radial-gradient(ellipse 600px 300px at 80% 70%, rgba(139, 115, 85, 0.2) 0%, transparent 50%),
          linear-gradient(0deg, rgba(26, 15, 10, 0.8) 0%, transparent 40%)
        `,
        color: '#f4f1ec',
        padding: '140px 20px 120px',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '85vh',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 20px 60px rgba(44, 24, 16, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      }}>
        {/* Artistic Decorative Elements */}
        {/* Golden Ornamental Corners */}
        <div style={{
          position: 'absolute',
          top: '40px',
          left: '40px',
          width: '120px',
          height: '120px',
          background: 'conic-gradient(from 45deg, #d4b48a, #a67c52, #8b6f47, #d4b48a)',
          borderRadius: '50%',
          opacity: 0.15,
          filter: 'blur(2px)'
        }}></div>
        <div style={{
          position: 'absolute',
          top: '40px',
          right: '40px',
          width: '80px',
          height: '80px',
          background: 'radial-gradient(circle, rgba(212, 180, 138, 0.3) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(1px)'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '40px',
          left: '40px',
          width: '100px',
          height: '100px',
          background: 'linear-gradient(45deg, rgba(139, 115, 85, 0.2), rgba(212, 180, 138, 0.1))',
          borderRadius: '50%',
          filter: 'blur(1.5px)'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '40px',
          right: '40px',
          width: '140px',
          height: '140px',
          background: 'conic-gradient(from 225deg, rgba(166, 124, 82, 0.2), rgba(139, 115, 85, 0.1), rgba(212, 180, 138, 0.15))',
          borderRadius: '50%',
          filter: 'blur(2px)'
        }}></div>
        
        {/* Museum Texture Overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            linear-gradient(45deg, transparent 48%, rgba(212, 180, 138, 0.03) 49%, rgba(212, 180, 138, 0.03) 51%, transparent 52%),
            linear-gradient(-45deg, transparent 48%, rgba(139, 115, 85, 0.02) 49%, rgba(139, 115, 85, 0.02) 51%, transparent 52%),
            radial-gradient(circle at 30% 20%, rgba(244, 241, 236, 0.08) 1px, transparent 1px),
            radial-gradient(circle at 70% 80%, rgba(212, 180, 138, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '120px 120px, 120px 120px, 80px 80px, 60px 60px',
          opacity: 0.4
        }}></div>
        
        {/* Artistic Border Frame */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          right: '20px',
          bottom: '20px',
          border: '2px solid rgba(212, 180, 138, 0.2)',
          borderRadius: '30px',
          pointerEvents: 'none'
        }}></div>
        <div style={{
          position: 'absolute',
          top: '30px',
          left: '30px',
          right: '30px',
          bottom: '30px',
          border: '1px solid rgba(244, 241, 236, 0.1)',
          borderRadius: '25px',
          pointerEvents: 'none'
        }}></div>
        
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '60px', alignItems: 'center' }}>
          {featuredArtwork ? (
            <>
              {/* Featured artwork image */}
              <div style={{
                flex: '1',
                position: 'relative'
              }}>
                <div 
                  style={{
                    background: `
                      linear-gradient(145deg, #f4f1ec 0%, #ffffff 20%, #faf8f5 40%, #f7f4ef 60%, #f4f1ec 80%, #f0ebe4 100%),
                      radial-gradient(ellipse at top left, rgba(212, 180, 138, 0.1) 0%, transparent 50%)
                    `,
                    padding: '32px',
                    borderRadius: '20px',
                    transform: 'rotate(-0.5deg)',
                    boxShadow: `
                      0 40px 120px rgba(44, 24, 16, 0.3),
                      0 20px 60px rgba(139, 115, 85, 0.2),
                      0 8px 32px rgba(212, 180, 138, 0.15),
                      inset 0 1px 0 rgba(255, 255, 255, 0.8),
                      inset 0 -1px 0 rgba(212, 180, 138, 0.2)
                    `,
                    border: '4px solid rgba(212, 180, 138, 0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative'
                  }}
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
                  <div style={{
                    background: 'linear-gradient(45deg, #8b6f47 0%, #a67c52 50%, #d4b48a 100%)',
                    padding: '3px',
                    borderRadius: '12px',
                    transform: 'rotate(0.3deg)'
                  }}>
                    <img 
                      src={Array.isArray(featuredArtwork.image) ? featuredArtwork.image[0] : featuredArtwork.image}
                      alt={featuredArtwork.title}
                      style={{
                        width: '100%',
                        height: '450px',
                        objectFit: 'cover',
                        borderRadius: '10px',
                        transform: 'rotate(-0.2deg)',
                        boxShadow: `
                          0 12px 32px rgba(44, 24, 16, 0.2),
                          inset 0 1px 0 rgba(255, 255, 255, 0.1)
                        `,
                        pointerEvents: 'none',
                        filter: 'contrast(1.05) saturate(1.1)'
                      }}
                    />
                  </div>
                </div>
                {/* Elegant Featured Badge */}
                <div className="featured-badge" style={{
                  position: 'absolute',
                  top: '-20px',
                  left: '50%',
                  transform: 'translateX(-50%) rotate(-2deg)',
                  background: `
                    linear-gradient(135deg, #2c1810 0%, #4a2c1a 30%, #6e4a2e 70%, #8b6f47 100%),
                    radial-gradient(ellipse at center, rgba(212, 180, 138, 0.2) 0%, transparent 70%)
                  `,
                  color: '#f4f1ec',
                  padding: '16px 32px',
                  borderRadius: '25px',
                  fontSize: '15px',
                  fontWeight: '700',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  boxShadow: `
                    0 12px 32px rgba(44, 24, 16, 0.5),
                    0 4px 16px rgba(139, 115, 85, 0.3),
                    inset 0 1px 0 rgba(212, 180, 138, 0.3),
                    inset 0 -1px 0 rgba(44, 24, 16, 0.2)
                  `,
                  border: '2px solid rgba(212, 180, 138, 0.4)',
                  fontFamily: 'Georgia, serif',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                }}>
                  Featured Masterpiece
                </div>
                
              </div>

              {/* Featured artwork info */}
              <div style={{ flex: '1', position: 'relative', zIndex: 10 }}>
                {/* Decorative Title Background */}
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  left: '-40px',
                  right: '-20px',
                  height: '120px',
                  background: 'linear-gradient(135deg, rgba(212, 180, 138, 0.1) 0%, rgba(139, 115, 85, 0.05) 50%, transparent 100%)',
                  borderRadius: '20px',
                  filter: 'blur(1px)',
                  zIndex: -1
                }}></div>
                
                <h1 style={{
                  fontSize: '4.2rem',
                  fontWeight: '800',
                  marginBottom: '24px',
                  color: '#f4f1ec',
                  lineHeight: '1.05',
                  textShadow: `
                    0 4px 12px rgba(44, 24, 16, 0.8),
                    0 2px 6px rgba(26, 15, 10, 0.6),
                    0 1px 3px rgba(0, 0, 0, 0.4)
                  `,
                  fontFamily: 'Georgia, serif',
                  letterSpacing: '-0.02em',
                  position: 'relative'
                }}>
                  <span style={{
                    background: 'linear-gradient(135deg, #f4f1ec 0%, #d4b48a 50%, #a67c52 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    {featuredArtwork.title}
                  </span>
                </h1>
                {/* Artist Information Card */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginBottom: '32px',
                  background: 'linear-gradient(135deg, rgba(244, 241, 236, 0.15) 0%, rgba(212, 180, 138, 0.1) 100%)',
                  padding: '20px 24px',
                  borderRadius: '16px',
                  border: '1px solid rgba(212, 180, 138, 0.2)',
                  backdropFilter: 'blur(10px)'
                }}>
                  {featuredArtwork.artistProfilePicture ? (
                    <div style={{
                      position: 'relative',
                      padding: '3px',
                      background: 'linear-gradient(45deg, #d4b48a 0%, #a67c52 50%, #8b6f47 100%)',
                      borderRadius: '50%'
                    }}>
                      <img 
                        src={featuredArtwork.artistProfilePicture} 
                        alt={featuredArtwork.artist}
                        style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid #f4f1ec',
                          transition: 'all 0.3s ease'
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{
                      width: '58px',
                      height: '58px',
                      borderRadius: '50%',
                      background: `
                        linear-gradient(135deg, #2c1810 0%, #4a2c1a 30%, #6e4a2e 70%, #8b6f47 100%),
                        radial-gradient(ellipse at center, rgba(212, 180, 138, 0.2) 0%, transparent 70%)
                      `,
                      color: '#f4f1ec',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '800',
                      fontSize: '1.4rem',
                      border: '3px solid rgba(212, 180, 138, 0.3)',
                      boxShadow: '0 4px 16px rgba(44, 24, 16, 0.3)',
                      fontFamily: 'Georgia, serif'
                    }}>
                      {featuredArtwork.artist?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                  )}
                  <div>
                    <p style={{
                      fontSize: '1.6rem',
                      color: '#f4f1ec',
                      margin: '0 0 4px 0',
                      fontWeight: '600',
                      textShadow: '0 2px 4px rgba(44, 24, 16, 0.5)',
                      fontFamily: 'Georgia, serif'
                    }}>
                      {featuredArtwork.artist || 'Gallery Artist'}
                    </p>
                    <p style={{
                      fontSize: '1.1rem',
                      color: 'rgba(244, 241, 236, 0.8)',
                      margin: '0',
                      fontStyle: 'italic',
                      fontWeight: '400',
                      textShadow: '0 1px 2px rgba(44, 24, 16, 0.3)'
                    }}>
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
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '20px',
                  marginBottom: '40px',
                  marginTop: '8px'
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(244, 241, 236, 0.1) 0%, rgba(212, 180, 138, 0.05) 100%)',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid rgba(212, 180, 138, 0.15)',
                    textAlign: 'center',
                    backdropFilter: 'blur(5px)'
                  }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>👁️</div>
                    <div style={{
                      fontSize: '1.8rem',
                      fontWeight: '700',
                      color: '#f4f1ec',
                      marginBottom: '4px',
                      textShadow: '0 2px 4px rgba(44, 24, 16, 0.5)'
                    }}>
                      {formatNumber(getFeaturedArtworkStats().views)}
                    </div>
                    <div style={{
                      fontSize: '0.9rem',
                      color: 'rgba(244, 241, 236, 0.7)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontWeight: '500'
                    }}>
                      Views
                    </div>
                  </div>
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(244, 241, 236, 0.1) 0%, rgba(212, 180, 138, 0.05) 100%)',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid rgba(212, 180, 138, 0.15)',
                    textAlign: 'center',
                    backdropFilter: 'blur(5px)'
                  }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>❤️</div>
                    <div style={{
                      fontSize: '1.8rem',
                      fontWeight: '700',
                      color: '#f4f1ec',
                      marginBottom: '4px',
                      textShadow: '0 2px 4px rgba(44, 24, 16, 0.5)'
                    }}>
                      {formatNumber(getFeaturedArtworkStats().likes)}
                    </div>
                    <div style={{
                      fontSize: '0.9rem',
                      color: 'rgba(244, 241, 236, 0.7)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontWeight: '500'
                    }}>
                      Likes
                    </div>
                  </div>
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(244, 241, 236, 0.1) 0%, rgba(212, 180, 138, 0.05) 100%)',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid rgba(212, 180, 138, 0.15)',
                    textAlign: 'center',
                    backdropFilter: 'blur(5px)'
                  }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>💬</div>
                    <div style={{
                      fontSize: '1.8rem',
                      fontWeight: '700',
                      color: '#f4f1ec',
                      marginBottom: '4px',
                      textShadow: '0 2px 4px rgba(44, 24, 16, 0.5)'
                    }}>
                      {formatNumber(getFeaturedArtworkStats().comments)}
                    </div>
                    <div style={{
                      fontSize: '0.9rem',
                      color: 'rgba(244, 241, 236, 0.7)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontWeight: '500'
                    }}>
                      Comments
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{
              width: '100%',
              textAlign: 'center',
              padding: '100px 40px',
              position: 'relative',
              zIndex: 10
            }}>
              {/* Decorative Empty State Background */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '400px',
                height: '400px',
                background: 'radial-gradient(circle, rgba(212, 180, 138, 0.1) 0%, rgba(139, 115, 85, 0.05) 50%, transparent 100%)',
                borderRadius: '50%',
                filter: 'blur(2px)',
                zIndex: -1
              }}></div>
              
              <div style={{
                background: 'linear-gradient(135deg, rgba(244, 241, 236, 0.15) 0%, rgba(212, 180, 138, 0.1) 100%)',
                padding: '60px 40px',
                borderRadius: '30px',
                border: '2px solid rgba(212, 180, 138, 0.2)',
                backdropFilter: 'blur(10px)',
                maxWidth: '600px',
                margin: '0 auto'
              }}>
                <div style={{
                  fontSize: '4rem',
                  marginBottom: '24px',
                  opacity: 0.6
                }}>🎨</div>
                
                <h2 style={{ 
                  fontSize: '3.2rem', 
                  marginBottom: '24px', 
                  fontFamily: 'Georgia, serif',
                  fontWeight: '800',
                  color: '#f4f1ec',
                  textShadow: '0 4px 12px rgba(44, 24, 16, 0.8)',
                  letterSpacing: '-0.02em'
                }}>Awaiting Your Masterpiece</h2>
                
                <p style={{ 
                  fontSize: '1.4rem', 
                  marginBottom: '40px',
                  color: 'rgba(244, 241, 236, 0.8)',
                  lineHeight: '1.6',
                  textShadow: '0 2px 4px rgba(44, 24, 16, 0.5)',
                  fontStyle: 'italic'
                }}>The gallery canvas awaits your artistic vision.<br/>Share your first creation to illuminate this space.</p>
                
                {(role === 'admin' || role === 'artist') && (
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    style={{
                      background: `
                        linear-gradient(135deg, #d4b48a 0%, #a67c52 30%, #8b6f47 70%, #6e4a2e 100%),
                        radial-gradient(ellipse at center, rgba(244, 241, 236, 0.2) 0%, transparent 70%)
                      `,
                      color: '#2c1810',
                      border: '3px solid rgba(244, 241, 236, 0.3)',
                      padding: '20px 40px',
                      borderRadius: '25px',
                      fontSize: '18px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: `
                        0 12px 32px rgba(44, 24, 16, 0.4),
                        0 4px 16px rgba(139, 115, 85, 0.3),
                        inset 0 1px 0 rgba(244, 241, 236, 0.4)
                      `,
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      fontFamily: 'Georgia, serif'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.transform = 'translateY(-6px) scale(1.05)';
                      e.target.style.boxShadow = `
                        0 20px 50px rgba(44, 24, 16, 0.5),
                        0 8px 25px rgba(139, 115, 85, 0.4),
                        inset 0 1px 0 rgba(244, 241, 236, 0.5)
                      `;
                    }}
                    onMouseOut={(e) => {
                      e.target.style.transform = 'translateY(0) scale(1)';
                      e.target.style.boxShadow = `
                        0 12px 32px rgba(44, 24, 16, 0.4),
                        0 4px 16px rgba(139, 115, 85, 0.3),
                        inset 0 1px 0 rgba(244, 241, 236, 0.4)
                      `;
                    }}
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
          <div style={{ marginBottom: '80px' }}>
            <div className="museo-gallery-header">
              <h1 className="museo-heading museo-heading--gallery">
                Top Arts of the Week
              </h1>
              <p className="museo-gallery-subtitle">
                The most celebrated masterpieces this week
              </p>
            </div>
            
            {/* Creative Podium Container */}
            <div style={{
              position: 'relative',
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 30%, #0f3460 60%, #533483 100%)',
              borderRadius: '30px',
              padding: '60px 40px',
              overflow: 'hidden',
              boxShadow: '0 25px 80px rgba(26, 26, 46, 0.4), 0 10px 40px rgba(0,0,0,0.3)'
            }}>
              {/* Enhanced decorative background elements */}
              <div style={{
                position: 'absolute',
                top: '-80px',
                left: '-80px',
                width: '300px',
                height: '300px',
                background: 'radial-gradient(circle, rgba(255,215,0,0.15) 0%, rgba(212,175,55,0.08) 40%, transparent 70%)',
                borderRadius: '50%'
              }}></div>
              <div style={{
                position: 'absolute',
                bottom: '-60px',
                right: '-60px',
                width: '250px',
                height: '250px',
                background: 'radial-gradient(circle, rgba(248,245,240,0.1) 0%, rgba(255,255,255,0.05) 50%, transparent 70%)',
                borderRadius: '50%'
              }}></div>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '600px',
                height: '400px',
                background: 'radial-gradient(ellipse, rgba(212,175,55,0.08) 0%, transparent 60%)',
                borderRadius: '50%',
                zIndex: 1
              }}></div>
              
              {/* Podium Layout */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gridTemplateRows: 'auto auto',
                gap: '20px',
                alignItems: 'end',
                maxWidth: '1200px',
                margin: '0 auto',
                position: 'relative',
                zIndex: 2,
                padding: '0 20px'
              }}>
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
                          style={{
                            gridColumn: '1',
                            gridRow: '1',
                            background: 'linear-gradient(145deg, rgba(255,255,255,0.15), rgba(255,255,255,0.08))',
                            borderRadius: '20px',
                            padding: '20px',
                            backdropFilter: 'blur(15px)',
                            border: '2px solid #c0c0c0',
                            boxShadow: '0 15px 40px rgba(192, 192, 192, 0.2), 0 8px 20px rgba(0,0,0,0.15)',
                            width: '100%',
                            maxWidth: '300px',
                            margin: '0 auto',
                            position: 'relative',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                          }}
                          onClick={() => openArtworkModal(topArts[1], 'TOP ARTS #2 (SILVER)')}
                        >
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            background: '#c0c0c0',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '15px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            🥈 #2
                          </div>
                          <img
                            src={Array.isArray(topArts[1].image) ? topArts[1].image[0] : topArts[1].image}
                            alt={topArts[1].title}
                            style={{
                              width: '100%',
                              height: '200px',
                              objectFit: 'cover',
                              borderRadius: '12px',
                              marginBottom: '15px'
                            }}
                          />
                          <h4 style={{
                            color: 'white',
                            fontSize: '16px',
                            fontWeight: '700',
                            marginBottom: '8px',
                            textAlign: 'center'
                          }}>
                            {topArts[1].title}
                          </h4>
                          <p style={{
                            color: 'rgba(255,255,255,0.8)',
                            fontSize: '14px',
                            textAlign: 'center',
                            fontStyle: 'italic',
                            margin: '0'
                          }}>
                            {topArts[1].artist}
                          </p>
                        </div>
                      )}

                      {/* First Place - Center (Champion) */}
                      {topArts[0] && (
                        <div 
                          style={{
                            gridColumn: '2',
                            gridRow: '1',
                            background: 'linear-gradient(145deg, rgba(255,255,255,0.2), rgba(255,255,255,0.1))',
                            borderRadius: '25px',
                            padding: '25px',
                            boxShadow: '0 20px 60px rgba(255,215,0,0.4), 0 10px 30px rgba(0,0,0,0.3)',
                            border: '4px solid #d4af37',
                            width: '100%',
                            maxWidth: '350px',
                            margin: '0 auto',
                            position: 'relative',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                          }}
                          onClick={() => openArtworkModal(topArts[0], 'TOP ARTS #1 (GOLD CHAMPION)')}
                        >
                          <div style={{
                            position: 'absolute',
                            top: '-15px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'linear-gradient(45deg, #ffd700, #ffed4e)',
                            padding: '10px 20px',
                            borderRadius: '25px',
                            fontSize: '15px',
                            fontWeight: 'bold',
                            color: '#2c1810',
                            boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                            marginTop: '25px',
                            textAlign: 'center',
                            whiteSpace: 'nowrap'
                          }}>
                            🏆 TOP ART OF THE WEEK
                          </div>
                          <img
                            src={Array.isArray(topArts[0].image) ? topArts[0].image[0] : topArts[0].image}
                            alt={topArts[0].title}
                            style={{
                              width: '100%',
                              height: '250px',
                              objectFit: 'cover',
                              borderRadius: '15px',
                              marginBottom: '20px',
                              marginTop: '30px'
                            }}
                          />
                          <h3 style={{
                            color: 'white',
                            fontSize: '20px',
                            fontWeight: '800',
                            marginBottom: '10px',
                            textAlign: 'center'
                          }}>
                            {topArts[0].title}
                          </h3>
                          <p style={{
                            color: '#ffd700',
                            fontSize: '16px',
                            textAlign: 'center',
                            fontStyle: 'italic',
                            margin: '0 0 15px 0'
                          }}>
                            {topArts[0].artist}
                          </p>
                          <div style={{
                            background: 'rgba(255,215,0,0.2)',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            textAlign: 'center',
                            color: '#2c1810',
                            fontWeight: 'bold',
                            fontSize: '13px'
                          }}>
                            🔥 {formatNumber(artworkStats[topArts[0].id]?.views || 0)} views
                          </div>
                        </div>
                      )}

                      {/* Third Place - Right */}
                      {topArts[2] && (
                        <div 
                          style={{
                            gridColumn: '3',
                            gridRow: '1',
                            background: 'linear-gradient(145deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))',
                            borderRadius: '18px',
                            padding: '18px',
                            backdropFilter: 'blur(12px)',
                            border: '2px solid #cd7f32',
                            boxShadow: '0 12px 35px rgba(205, 127, 50, 0.2), 0 6px 18px rgba(0,0,0,0.12)',
                            width: '100%',
                            maxWidth: '280px',
                            margin: '0 auto',
                            position: 'relative',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                          }}
                          onClick={() => openArtworkModal(topArts[2], 'TOP ARTS #3 (BRONZE)')}
                        >
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            background: '#cd7f32',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '15px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>
                            🥉 #3
                          </div>
                          <img
                            src={Array.isArray(topArts[2].image) ? topArts[2].image[0] : topArts[2].image}
                            alt={topArts[2].title}
                            style={{
                              width: '100%',
                              height: '180px',
                              objectFit: 'cover',
                              borderRadius: '10px',
                              marginBottom: '12px'
                            }}
                          />
                          <h5 style={{
                            color: 'white',
                            fontSize: '15px',
                            fontWeight: '700',
                            marginBottom: '6px',
                            textAlign: 'center'
                          }}>
                            {topArts[2].title}
                          </h5>
                          <p style={{
                            color: 'rgba(255,255,255,0.8)',
                            fontSize: '13px',
                            textAlign: 'center',
                            fontStyle: 'italic',
                            margin: '0'
                          }}>
                            {topArts[2].artist}
                          </p>
                        </div>
                      )}

                      {/* Bottom Row - Notable Acquisitions (4-6) */}
                      {topArts.length > 3 && (
                        <div style={{
                          gridColumn: '1 / -1',
                          gridRow: '2',
                          marginTop: '50px'
                        }}>
                          <div style={{
                            textAlign: 'center',
                            marginBottom: '35px'
                          }}>
                            <h3 style={{
                              color: '#ffd700',
                              fontSize: '1.6rem',
                              fontWeight: '600',
                              marginBottom: '8px'
                            }}>
                              Notable Acquisitions
                            </h3>
                            <p style={{
                              color: 'rgba(255,255,255,0.6)',
                              fontSize: '14px'
                            }}>
                              Positions 4-6 in our weekly rankings
                            </p>
                          </div>
                          
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '25px',
                            maxWidth: '800px',
                            margin: '0 auto'
                          }}>
                            {topArts.slice(3).map((artwork, index) => (
                              <div
                                key={artwork.id}
                                style={{
                                  background: 'linear-gradient(145deg, rgba(255,255,255,0.12), rgba(255,255,255,0.08))',
                                  borderRadius: '20px',
                                  padding: '20px',
                                  backdropFilter: 'blur(15px)',
                                  border: '1px solid rgba(255,255,255,0.25)',
                                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                                  transition: 'all 0.3s ease',
                                  cursor: 'pointer'
                                }}
                                onClick={() => openArtworkModal(artwork, `NOTABLE MENTION #${index + 4}`)}
                              >
                                <div style={{ position: 'relative', marginBottom: '15px' }}>
                                  <img
                                    src={Array.isArray(artwork.image) ? artwork.image[0] : artwork.image}
                                    alt={artwork.title}
                                    style={{
                                      width: '100%',
                                      height: '140px',
                                      objectFit: 'cover',
                                      borderRadius: '12px'
                                    }}
                                  />
                                  <div style={{
                                    position: 'absolute',
                                    top: '10px',
                                    left: '10px',
                                    background: 'rgba(255,255,255,0.9)',
                                    color: '#2c1810',
                                    padding: '6px 10px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                  }}>
                                    #{index + 4}
                                  </div>
                                </div>
                                
                                <div style={{ textAlign: 'center' }}>
                                  <h5 style={{
                                    color: 'white',
                                    fontSize: '15px',
                                    fontWeight: '700',
                                    marginBottom: '6px'
                                  }}>
                                    {artwork.title}
                                  </h5>
                                  <p style={{
                                    color: 'rgba(255,255,255,0.8)',
                                    fontSize: '13px',
                                    fontStyle: 'italic',
                                    margin: '0'
                                  }}>
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
                    {category.name} ({category.count || 0})
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
                            <span style={{ marginLeft: '6px', fontSize: '16px', opacity: 0.7 }}>×</span>
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
                    className="museo-artwork-card"
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
                      className="museo-artwork-image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                      style={{ 
                        height: `${getArtworkHeight(artwork, index)}px !important`,
                        objectFit: 'cover'
                      }}
                    />
                    <div className="museo-artwork-placard">
                      <h3 className="museo-artwork-title">
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
                      <div className="museo-artwork-meta">
                        <span className="museo-artwork-year">{artwork.year}</span>
                        <span>•</span>
                        <span>{getArtworkCategories(artwork).join(', ')}</span>
                      </div>
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
                className="museo-artwork-card"
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
                  className="museo-artwork-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                  style={{ 
                    height: `${getArtworkHeight(artwork, index)}px !important`,
                    objectFit: 'cover'
                  }}
                />
                <div className="museo-artwork-placard">
                  <h3 className="museo-artwork-title">
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
                  <div className="museo-artwork-meta">
                    <span className="museo-artwork-year">{artwork.year}</span>
                    <span>•</span>
                    <span>{getArtworkCategories(artwork).join(', ')}</span>
                  </div>
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
                    🎨 You've reached the end of the collection
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
          className="museo-btn museo-btn--primary museo-floating-btn"
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
