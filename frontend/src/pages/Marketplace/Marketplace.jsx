import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";
import ProductDetailModal from "./ProductDetailModal";
import ProductAuctionModal from "./ProductAuctionModal";
import "./css/marketplace.css";
import AlertModal from "../Shared/AlertModal.jsx";

const API = import.meta.env.VITE_API_BASE;

export default function Marketplace() {
  const navigate = useNavigate();
  const { userData } = useUser();
  const { productId: routeProductId } = useParams();
  
  // State management
  const [marketplaceItems, setMarketplaceItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [listingType, setListingType] = useState("all"); // all, buy-now, auction
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100000 });
  const [sortBy, setSortBy] = useState("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showAuctionModal, setShowAuctionModal] = useState(false);
  const hasOpenedProductRef = useRef(false);
  const loadMoreRef = useRef(null);

  // DB-driven categories for sidebar
  const [dbCategoryOptions, setDbCategoryOptions] = useState([]); // [{ value: slug, label: name }]
  const [isLoadingDbCategories, setIsLoadingDbCategories] = useState(false);
  const [categoryPage, setCategoryPage] = useState(1);
  const [categoriesHasMore, setCategoriesHasMore] = useState(true);
  const [loadingMoreCategories, setLoadingMoreCategories] = useState(false);

  // Items pagination
  const [itemsPage, setItemsPage] = useState(1);
  const [itemsHasMore, setItemsHasMore] = useState(true);
  const [loadingMoreItems, setLoadingMoreItems] = useState(false);

  // Saved preferences (from /gallery/preferences)
  const [savedCategorySlugs, setSavedCategorySlugs] = useState(new Set());
  const [savedCategoryNames, setSavedCategoryNames] = useState(new Set());

  // Global alert modal state (uses pages/Shared/AlertModal.jsx)
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState('Notice');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertOkText, setAlertOkText] = useState('OK');
  const showAlert = (message, title = 'Notice', okText = 'OK') => {
    setAlertMessage(message);
    setAlertTitle(title);
    setAlertOkText(okText);
    setAlertOpen(true);
  };

  // Preference helpers
  const getItemCategories = (item) => {
    const arr = Array.isArray(item?.categories) ? item.categories : [];
    return arr.map((v) => String(v || '').toLowerCase()).filter(Boolean);
  };

  const reorderByPreference = (items) => {
    if (!items || !Array.isArray(items) || (!savedCategorySlugs.size && !savedCategoryNames.size)) {
      return items;
    }
    const preferred = [];
    const others = [];
    for (const it of items) {
      const cats = getItemCategories(it);
      const hasMatch = cats.some((c) => savedCategorySlugs.has(c) || savedCategoryNames.has(c));
      if (hasMatch) preferred.push(it); else others.push(it);
    }
    return [...preferred, ...others];
  };

  const fetchSavedCategories = async () => {
    try {
      const res = await fetch(`${API}/gallery/preferences`, { method: 'GET', credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json().catch(() => ({}));
      const list = Array.isArray(json?.categories) ? json.categories : [];
      const slugs = new Set(list.map((c) => String(c?.slug || '').toLowerCase()).filter(Boolean));
      const names = new Set(list.map((c) => String(c?.name || '').toLowerCase()).filter(Boolean));
      setSavedCategorySlugs(slugs);
      setSavedCategoryNames(names);
    } catch (e) {
      // On 401 or any failure, keep preferences empty
      setSavedCategorySlugs(new Set());
      setSavedCategoryNames(new Set());
    }
  };

  // Fetch marketplace items from API (includes both buy-now and auctions)
  const fetchMarketplaceItems = async (pageToLoad = 1, append = false) => {
    const isFirstPage = pageToLoad === 1 && !append;
    if (isFirstPage) setLoading(true); else setLoadingMoreItems(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(pageToLoad));
      params.set('limit', '12');
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (priceRange.min > 0) params.set('minPrice', String(priceRange.min));
      if (priceRange.max < 100000) params.set('maxPrice', String(priceRange.max));
      if (listingType !== 'all') params.set('listingType', listingType);
      const response = await fetch(`${API}/marketplace/items?${params.toString()}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch marketplace items');
      }

      const result = await response.json();
      
      // Get items from response (now includes both buy-now and auctions)
      let items = result.data || [];
      
      // Ensure all items have a listingType
      items = items.map(item => ({
        ...item,
        listingType: item.listingType || 'buy-now'
      }));
      
      // All filtering (category, listing type, price) is now done server-side
      
      // Sort items
      switch (sortBy) {
        case 'price-low':
          items.sort((a, b) => a.price - b.price);
          break;
        case 'price-high':
          items.sort((a, b) => b.price - a.price);
          break;
        case 'newest':
          items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          break;
        case 'popular':
          items.sort((a, b) => (b.views || 0) - (a.views || 0));
          break;
      }
      
      // Reorder by user preferences (preferred first, stable within groups)
      items = reorderByPreference(items);
      
      if (append) {
        setMarketplaceItems(prev => [...prev, ...items]);
      } else {
        setMarketplaceItems(items);
      }

      // Pagination flags from backend response
      const hasMore = result?.pagination?.hasMore ?? (Array.isArray(result.data) && result.data.length === 12);
      setItemsHasMore(Boolean(hasMore));
      setItemsPage(pageToLoad);
    } catch (error) {
      console.error('Error loading marketplace:', error);
      setMarketplaceItems([]);
    } finally {
      if (isFirstPage) setLoading(false); else setLoadingMoreItems(false);
    }
  };
  // Paginated category loader
  const loadCategoriesPage = async (pageToLoad = 1) => {
    try {
      if (pageToLoad === 1) setIsLoadingDbCategories(true); else setLoadingMoreCategories(true);
      const res = await fetch(`${API}/gallery/categories?page=${pageToLoad}&limit=10&nocache=1`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to fetch categories (${res.status})`);
      const data = await res.json();
      const list = Array.isArray(data?.categories) ? data.categories : [];
      const sorted = list.sort((a, b) => {
        if (a.slug === 'other') return 1;
        if (b.slug === 'other') return -1;
        return 0;
      });
      const opts = sorted.map(c => ({
        value: String(c.slug ?? c.categoryId ?? c.name),
        label: String(c.name ?? c.slug ?? c.categoryId)
      }));
      setDbCategoryOptions(prev => {
        const map = new Map(prev.map(o => [o.value, o]));
        opts.forEach(o => { if (!map.has(o.value)) map.set(o.value, o); });
        return Array.from(map.values());
      });
      setCategoriesHasMore(list.length === 10);
      setCategoryPage(pageToLoad);
    } catch (e) {
      console.error('Failed to load categories for Marketplace:', e);
      if (pageToLoad === 1) setDbCategoryOptions([]);
      setCategoriesHasMore(false);
    } finally {
      if (pageToLoad === 1) setIsLoadingDbCategories(false); else setLoadingMoreCategories(false);
    }
  };

  useEffect(() => {
    // initial category load
    setDbCategoryOptions([]);
    setCategoryPage(1);
    loadCategoriesPage(1);
  }, []);

  // Load user saved preferences on mount and when user changes
  useEffect(() => {
    fetchSavedCategories();
  }, [userData?.id]);

  // Reorder currently loaded items when preferences become available
  useEffect(() => {
    if ((savedCategorySlugs.size || savedCategoryNames.size) && marketplaceItems.length > 0) {
      setMarketplaceItems((prev) => reorderByPreference([...prev]));
    }
  }, [savedCategorySlugs, savedCategoryNames]);

  // Sidebar categories: All + DB categories
  const genericIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  );
  const categories = useMemo(() => {
    const base = [{ id: 'all', name: 'All Categories', icon: genericIcon }];
    const dyn = dbCategoryOptions.map(o => ({ id: o.value, name: o.label, icon: genericIcon }));
    return [...base, ...dyn];
  }, [dbCategoryOptions]);

  const handleLoadMoreCategories = () => {
    if (loadingMoreCategories || !categoriesHasMore) return;
    loadCategoriesPage(categoryPage + 1);
  };

  const handleAddToCart = async (item, quantityToAdd = 1) => {
    // Buy Now go to checkout page with selected item & quantity
    const qty = Number(quantityToAdd) > 0 ? Number(quantityToAdd) : 1;
    navigate('/marketplace/checkout', {
      state: {
        marketItemId: item.marketItemId || item.id,
        quantity: qty
      }
    });
  };

  const openProduct = (product) => {
    // Derive if this is an auction even when listingType is absent
    const isAuction = (product?.listingType === 'auction')
      || product?.isAuction
      || typeof product?.currentBid === 'number'
      || typeof product?.startingPrice === 'number'
      || !!product?.endTime || !!product?.endAt;

    const normalized = {
      ...product,
      listingType: isAuction ? 'auction' : (product?.listingType || 'buy-now')
    };

    setSelectedProduct(normalized);
    if (normalized.listingType === 'auction') {
      setShowAuctionModal(true);
    } else {
      setShowProductModal(true);
    }
  };

  // Close modal(s) and return to /marketplace when opened via deep link
  const closeProductModal = () => {
    setSelectedProduct(null);
    setShowProductModal(false);
    setShowAuctionModal(false);
    if (routeProductId) {
      navigate('/marketplace', { replace: true });
    }
  };

  // When navigated to /marketplace/product/:productId, fetch that product and open the modal
  useEffect(() => {
    const openByRoute = async () => {
      if (!routeProductId) {
        hasOpenedProductRef.current = false;
        return;
      }
      
      // If we already opened this product, don't do it again
      if (hasOpenedProductRef.current) return;
      
      try {
        // Try find in current list first
        const found = marketplaceItems.find(p => (p.marketItemId || p.id) == routeProductId);
        if (found) { 
          openProduct(found);
          hasOpenedProductRef.current = true;
          return;
        }
        
        // If not found in list, fetch the specific product
        if (marketplaceItems.length > 0) {
          const res = await fetch(`${API}/marketplace/items/${routeProductId}`, { 
            credentials: 'include',
            method: 'GET'
          });
          if (!res.ok) throw new Error('Product not found');
          const result = await res.json();
          const product = result.data || result;
          if (product) { 
            // Ensure auction detection on deep link too
            openProduct(product);
            hasOpenedProductRef.current = true;
            return;
          }
          throw new Error('Product not found');
        }
      } catch (e) {
        console.error(e);
        // If failed, navigate back to marketplace
        navigate('/marketplace', { replace: true });
      }
    };
    openByRoute();
  }, [routeProductId, marketplaceItems.length > 0]);

  // Effects
  useEffect(() => {
    setItemsPage(1);
    setItemsHasMore(true);
    fetchMarketplaceItems(1, false);
    // Cart disabled by P2P migration
  }, [userData, selectedCategory, listingType, priceRange.min, priceRange.max]);

  // Infinite scroll: observe sentinel and load next page when in view
  useEffect(() => {
    if (!itemsHasMore) return;
    const node = loadMoreRef.current;
    if (!node) return;
    let fetching = false;
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !fetching && !loadingMoreItems && !loading) {
          fetching = true;
          fetchMarketplaceItems(itemsPage + 1, true).finally(() => {
            fetching = false;
          });
        }
      },
      { root: null, rootMargin: '200px', threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [itemsHasMore, itemsPage, loadingMoreItems, loading, selectedCategory]);

  const handleProductClick = (item) => {
    navigate(`/marketplace/product/${item.marketItemId || item.id}`);
  };

  const handlePlaceBid = async (item, bidAmount, userAddressId) => {
    try {
      const auctionId = item?.auctionId || item?.id || item?.marketItemId;
      if (!auctionId) return { success: false, error: 'Missing auction ID' };

      // Auth guard: require logged-in user to bid
      if (!userData?.id) return { success: false, error: 'Please log in to place a bid.' };

      const idempotencyKey = (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
        ? globalThis.crypto.randomUUID()
        : `bid-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const res = await fetch(`${API}/auctions/${auctionId}/bids`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(bidAmount), userAddressId, idempotencyKey })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        return { success: false, error: json?.error || `Failed to place bid (HTTP ${res.status})` };
      }

      // Optionally update local state (e.g., refresh auctions) — skipping for now
      return { success: true, data: json?.data };
    } catch (e) {
      return { success: false, error: e?.message || 'Failed to place bid' };
    }
  };

  return (
    <div className="mp-page">
      {/* Cart UI removed by P2P migration */}

      {/* Main Content */}
      <div className="mp-content">
        <aside className={`mp-sidebar ${sidebarCollapsed ? "mp-sidebar--collapsed" : ""} ${showFilters ? "mp-sidebar--open" : ""}`}>
          {/* Collapsed State Tab */}
          {sidebarCollapsed && (
            <button 
              className="mp-sidebar-tab"
              onClick={() => setSidebarCollapsed(false)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              <span>Filters</span>
            </button>
          )}
          
          <div className={`mp-sidebar-content ${sidebarCollapsed ? "hidden" : ""}`}>
            <div className="mp-sidebar-header">
              <h3>Filters</h3>
              <div className="mp-sidebar-actions">
                <button 
                  className="mp-collapse-btn"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  title={sidebarCollapsed ? "Expand filters" : "Collapse filters"}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
                <button className="mp-filter-close" onClick={() => setShowFilters(false)}>✕</button>
              </div>
            </div>

          {/* Listing Type Filter */}
          <div className="mp-filter-group">
            <h4 className="mp-filter-title">Listing Type</h4>
            <div className="mp-listing-types">
              <button
                className={`mp-listing-type ${listingType === "all" ? "mp-listing-type--active" : ""}`}
                onClick={() => setListingType("all")}
              >
                <span className="mp-listing-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                  </svg>
                </span>
                <span>All Listings</span>
              </button>
              <button
                className={`mp-listing-type ${listingType === "buy-now" ? "mp-listing-type--active" : ""}`}
                onClick={() => setListingType("buy-now")}
              >
                <span className="mp-listing-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                    <line x1="7" y1="7" x2="7.01" y2="7"/>
                  </svg>
                </span>
                <span>Buy Now</span>
              </button>
              <button
                className={`mp-listing-type ${listingType === "auction" ? "mp-listing-type--active" : ""}`}
                onClick={() => setListingType("auction")}
              >
                <span className="mp-listing-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="8" r="7"/>
                    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
                  </svg>
                </span>
                <span>Auctions</span>
              </button>
            </div>
          </div>

          {/* Categories */}
          <div className="mp-filter-group">
            <h4 className="mp-filter-title">Categories</h4>
            
            {/* Search box */}
            <input
              type="text"
              value={categorySearch}
              onChange={(e) => { setCategorySearch(e.target.value); }}
              className="museo-input"
              placeholder="Search categories..."
              style={{ marginBottom: '10px' }}
            />

            {/* Selected category chip */}
            {selectedCategory !== 'all' && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: 'var(--museo-accent)',
                  color: 'var(--museo-white)',
                  borderRadius: '20px',
                  fontSize: '13px'
                }}>
                  {categories.find(c => c.id === selectedCategory)?.name || selectedCategory}
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: 'inherit',
                      fontSize: '16px',
                      padding: '0 4px',
                      lineHeight: 1
                    }}
                  >
                    ×
                  </button>
                </span>
              </div>
            )}

            {/* Filtered categories list */}
            <div className="mp-categories" style={{ maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
              {(() => {
                const q = categorySearch.trim().toLowerCase();
                const filtered = categories.filter(cat => {
                  if (!q) return true;
                  return cat.name.toLowerCase().includes(q) || cat.id.toLowerCase().includes(q);
                });
                return filtered.map(cat => (
                  <button
                    key={cat.id}
                    className={`mp-category-btn ${selectedCategory === cat.id ? "mp-category-btn--active" : ""}`}
                    onClick={() => setSelectedCategory(cat.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <span className="mp-category-icon">{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                ));
              })()}
            </div>
            {categoriesHasMore && !categorySearch.trim() && (
              <button
                type="button"
                onClick={handleLoadMoreCategories}
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', marginTop: '8px' }}
                disabled={loadingMoreCategories}
              >
                {loadingMoreCategories ? 'Loading…' : 'Load more categories'}
              </button>
            )}
          </div>

          {/* Price Range */}
          <div className="mp-filter-group">
            <h4 className="mp-filter-title">Price Range</h4>
            <div className="mp-price-inputs">
              <input 
                type="number" 
                className="mp-price-input" 
                placeholder="Min"
                value={priceRange.min}
                onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
              />
              <span className="mp-price-separator">-</span>
              <input 
                type="number" 
                className="mp-price-input" 
                placeholder="Max"
                value={priceRange.max}
                onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
              />
            </div>
          </div>

          </div>
        </aside>

        <div className="mp-main">
          {/* Toolbar */}
          <div className="mp-toolbar">
            <div className="mp-toolbar-left">
              <button 
                className="mp-filter-toggle"
                onClick={() => setShowFilters(!showFilters)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="4" y1="6" x2="16" y2="6"/>
                  <line x1="8" y1="12" x2="20" y2="12"/>
                  <line x1="4" y1="18" x2="16" y2="18"/>
                </svg>
                Filters
              </button>

              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => navigate('/marketplace/myorders')}
                title="My Orders"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 2v6h6V2M19 9v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9m14 0H5m14 0l-1-5H6L5 9"/>
                  <path d="M10 14h4"/>
                </svg>
                My Orders
              </button>

              {userData?.isSeller && (
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate('/marketplace/seller-dashboard')}
                  title="Seller Dashboard"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <line x1="3" y1="9" x2="21" y2="9"/>
                    <line x1="9" y1="21" x2="9" y2="9"/>
                  </svg>
                  Seller Dashboard
                </button>
              )}
            </div>

            {/* Sort removed as requested */}
          </div>

          {/* Grid Display */}
          {loading ? (
            <div className="home__loading-container">
              <div className="home__loading-content">
                <div className="home__loading-spinner"></div>
                Loading artworks...
              </div>
            </div>
          ) : marketplaceItems.length === 0 ? (
            <div className="mp-empty">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
              <h2 className="mp-empty-title">No Items Found</h2>
              <p className="mp-empty-text">Try adjusting your filters or check back later for new items.</p>
              {(selectedCategory !== 'all' || listingType !== 'all' || searchQuery || priceRange.min > 0 || priceRange.max < 100000) && (
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setSelectedCategory('all');
                    setListingType('all');
                    setSearchQuery('');
                    setPriceRange({ min: 0, max: 100000 });
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="mp-grid">
                {marketplaceItems
                  .filter(item => {
                    // Filter by listing type
                    if (listingType !== "all" && item.listingType !== listingType) {
                      return false;
                    }
                    // Filter by category (item.categories contains slugs)
                    if (selectedCategory !== "all" && !(Array.isArray(item.categories) && item.categories.includes(selectedCategory))) {
                      return false;
                    }
                    // Filter by price range
                    const itemPrice = item.currentBid || item.price;
                    if (itemPrice < priceRange.min || itemPrice > priceRange.max) {
                      return false;
                    }
                    // Filter by search query
                    if (searchQuery) {
                      const query = searchQuery.toLowerCase();
                      const matchesTitle = item.title?.toLowerCase().includes(query);
                      const matchesShop = item.seller?.shopName?.toLowerCase().includes(query);
                      const matchesMedium = item.medium?.toLowerCase().includes(query);
                      if (!matchesTitle && !matchesShop && !matchesMedium) {
                        return false;
                      }
                    }
                    return true;
                  })
                  .map(item => (
                    <MarketplaceCard 
                      key={item.marketItemId || item.id} 
                      item={item} 
                      onAddToCart={handleAddToCart}
                      onClick={() => handleProductClick(item)}
                    />
                  ))}
              </div>
              {itemsHasMore && (
                <>
                  {/* Infinite scroll sentinel */}
                  <div ref={loadMoreRef} style={{ height: 1 }} />
                  {/* Loading indicator when fetching more */}
                  {loadingMoreItems && (
                    <div className="home__loading-container">
                      <div className="home__loading-content">
                        <div className="home__loading-spinner"></div>
                        Loading more artworks...
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Cart Sidebar removed by P2P migration */}
      </div>

      {/* Product Detail Modal (Buy-Now) */}
      <ProductDetailModal
        isOpen={showProductModal && selectedProduct?.listingType !== 'auction'}
        onClose={closeProductModal}
        item={selectedProduct?.listingType !== 'auction' ? selectedProduct : null}
        onAddToCart={handleAddToCart}
        onPlaceBid={handlePlaceBid}
      />

      {/* Product Auction Modal */}
      <ProductAuctionModal
        isOpen={showAuctionModal && selectedProduct?.listingType === 'auction'}
        onClose={closeProductModal}
        item={selectedProduct?.listingType === 'auction' ? selectedProduct : null}
        onPlaceBid={handlePlaceBid}
        showAlert={showAlert}
      />

      {/* Global Alert Modal */}
      <AlertModal
        open={alertOpen}
        title={alertTitle}
        message={alertMessage}
        okText={alertOkText}
        onOk={() => setAlertOpen(false)}
      />
    </div>
  );
}

// Marketplace Card Component
const MarketplaceCard = ({ item, onAddToCart, onClick }) => {
  // Calculate time remaining for auctions
  const getTimeRemaining = (endTime) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;
    
    if (diff <= 0) return "Ended";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  return (
    <article 
      className="mp-card"
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      {/* Image Container */}
      <div className="mp-card-image-container">
        <img 
          src={item.primary_image || item.images?.[0] || '/placeholder-art.jpg'} 
          alt={item.title}
          className="mp-card-image"
          onError={(e) => {
            e.target.src = '/placeholder-art.jpg';
          }}
        />

        {/* Badges */}
        {item.originalPrice && item.listingType === "buy-now" && (
          <span className="mp-badge mp-badge--sale">
            {Math.round((1 - item.price / item.originalPrice) * 100)}% OFF
          </span>
        )}
      </div>

      {/* Card Content */}
      <div className="mp-card-content">
        <h3 className="mp-card-title" style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</h3>
        
        <div className="mp-card-meta">
          <span className="mp-card-category">{item.medium || 'Mixed Media'}</span>
          <span className="mp-card-year">{item.year_created || new Date().getFullYear()}</span>
        </div>
        <p className="mp-card-artist">by {item.seller?.shopName || 'Unknown Artist'}</p>
        
        <div className="mp-card-details">
          <span className="mp-card-size">{item.dimensions || 'Size not specified'}</span>
          {item.is_original && <span className="mp-card-original">Original</span>}
        </div>

        <div className="mp-card-footer">
          <div className="mp-card-price">
            {item.listingType === "auction" ? (
              <>
                <span className="mp-card-bid-label">Current Bid</span>
                <span className="mp-card-price-current">₱{item.currentBid ? item.currentBid : item.startingPrice}</span>
                <span className="mp-card-time-left">{getTimeRemaining(item.endTime)}</span>
              </>
            ) : (
              <>
                {item.originalPrice && (
                  <span className="mp-card-price-old">₱{item.originalPrice}</span>
                )}
                <span className="mp-card-price-current">₱{item.price}</span>
              </>
            )}
          </div>
          
          <button 
            className={`btn ${item.listingType === 'auction' ? 'btn-accent' : 'btn-primary'} btn-sm`}
            onClick={(e) => {
              e.stopPropagation();
              item.listingType === 'auction' ? onClick() : onAddToCart(item);
            }}
          >
            {item.listingType === "auction" ? "Place Bid" : "Buy Now"}
          </button>
        </div>
      </div>
    </article>
  );
};

