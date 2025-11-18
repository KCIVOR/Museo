import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";
import ProductDetailModal from "./ProductDetailModal";
import ProductAuctionModal from "./ProductAuctionModal";
import "./css/marketplace.css";

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
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showAuctionModal, setShowAuctionModal] = useState(false);
  const hasOpenedProductRef = useRef(false);


  // Fetch marketplace items from API
  const fetchMarketplaceItems = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/marketplace/items`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch marketplace items');
      }

      const result = await response.json();
      
      // Get items from response and add hardcoded auction
      let items = result.data || [];
      
      // Ensure all items have a listingType
      items = items.map(item => ({
        ...item,
        listingType: item.listingType || 'buy-now'
      }));

      // Fetch active auctions and normalize to marketplace card shape
      let auctionsNormalized = [];
      try {
        console.log('🔄 Fetching active auctions...');
        const aRes = await fetch(`${API}/auctions?status=active&limit=100`, { method: 'GET', credentials: 'include' });
        if (aRes.ok) {
          const aJson = await aRes.json();
          console.log('📦 Raw auctions response:', aJson);
          
          const aList = Array.isArray(aJson?.data)
            ? aJson.data
            : Array.isArray(aJson?.auctions)
              ? aJson.auctions
              : Array.isArray(aJson)
                ? aJson
                : [];

          console.log(`📊 Found ${aList.length} auctions to normalize`);

          auctionsNormalized = aList.map((a, idx) => {
            console.log(`🎨 Raw auction data ${idx}:`, {
              auctionId: a.auctionId,
              startAt: a.startAt,
              endAt: a.endAt,
              startPrice: a.startPrice,
              minIncrement: a.minIncrement,
              status: a.status,
              singleBidOnly: a.singleBidOnly,
              allowBidUpdates: a.allowBidUpdates,
              created_at: a.created_at,
              updated_at: a.updated_at,
              fullAuction: a
            });
            console.log(`🎨 Normalizing auction ${idx}:`, a);
            
            // auction_items is an object, not an array
            const aItem = a.auction_items;
            
            const title = aItem?.title || a.title || 'Untitled';
            const primary = aItem?.primary_image || a.primary_image;
            const imgs = Array.isArray(aItem?.images) ? aItem.images : [];
            const sellerData = aItem?.seller;
            const seller = sellerData ? { 
              shopName: sellerData.shopName || 'Unknown Artist',
              profilePicture: `https://ui-avatars.com/api/?name=${sellerData.shopName || 'Artist'}&background=d4b48a&color=fff&size=32`
            } : { shopName: 'Unknown Artist' };
            const categories = aItem?.categories || [];
            const current = a.currentBid ?? a.highestBid ?? null;
            const startPrice = a.startPrice ?? a.startingPrice ?? 0;
            const end = a.endAt ?? a.endTime;
            const price = (current ?? startPrice ?? 0);
            
            const normalized = {
              id: a.auctionId || a.id,
              marketItemId: a.auctionId || a.id,
              auctionId: a.auctionId || a.id,
              title,
              description: aItem?.description || a.description || '',
              primary_image: primary,
              images: imgs,
              medium: aItem?.medium,
              dimensions: aItem?.dimensions,
              year_created: aItem?.year_created,
              is_original: aItem?.is_original,
              is_featured: aItem?.is_featured,
              seller,
              categories,
              listingType: 'auction',
              // Keep existing fields for backward compatibility
              startingPrice: startPrice,
              endTime: end,
              currentBid: current,
              price,
              // Add DB-aligned fields for modal usage
              startAt: a.startAt ?? a.start_time ?? a.startsAt ?? null,
              endAt: end,
              startPrice: startPrice,
              minIncrement: a.minIncrement ?? a.min_increment ?? null,
              singleBidOnly: a.singleBidOnly ?? a.single_bid_only ?? false,
              allowBidUpdates: a.allowBidUpdates ?? a.allow_bid_updates ?? false
            };
            
            console.log(`✅ Normalized auction ${idx}:`, normalized);
            return normalized;
          });
          
          console.log(`✅ Successfully normalized ${auctionsNormalized.length} auctions`);
        } else {
          console.warn('⚠️ Auctions fetch response not OK:', aRes.status);
        }
      } catch (e) {
        console.error('❌ Failed to load auctions', e);
      }

      // Combine auctions with regular items
      items = [...auctionsNormalized, ...items];
      
      // Apply client-side filters
      if (selectedCategory !== 'all') {
        items = items.filter(item => 
          item.categories?.includes(selectedCategory) || 
          item.medium?.toLowerCase() === selectedCategory.toLowerCase()
        );
      }
      
      if (listingType === 'buy-now') {
        // Only show buy-now items, exclude auctions
        items = items.filter(item => item.listingType === 'buy-now');
      } else if (listingType === 'auction') {
        // Only show auction items
        items = items.filter(item => item.listingType === 'auction');
      }
      // If listingType === 'all', show everything (no filter)
      
      items = items.filter(item => 
        item.price >= priceRange.min && item.price <= priceRange.max
      );
      
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
      
      setMarketplaceItems(items);
    } catch (error) {
      console.error('Error loading marketplace:', error);
      setMarketplaceItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Category definitions 

  const categories = [
    { 
      id: "all", 
      name: "All Categories", 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="9" y1="21" x2="9" y2="9"/>
        </svg>
      )
    },
    { 
      id: "painting", 
      name: "Paintings", 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      )
    },
    { 
      id: "sculpture", 
      name: "Sculptures", 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
          <line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
      )
    },
    { 
      id: "photography", 
      name: "Photography", 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      )
    },
    { 
      id: "digital", 
      name: "Digital Art", 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      )
    },
    { 
      id: "prints", 
      name: "Prints & Posters", 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 6 2 18 2 18 9"/>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
          <rect x="6" y="14" width="12" height="8"/>
        </svg>
      )
    },
    { 
      id: "mixed", 
      name: "Mixed Media", 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 2 7 12 12 22 7 12 2"/>
          <polyline points="2 17 12 22 22 17"/>
          <polyline points="2 12 12 17 22 12"/>
        </svg>
      )
    }
  ];

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
    fetchMarketplaceItems();
    // Cart disabled by P2P migration
  }, [userData]);

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
            <div className="mp-categories">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  className={`mp-category-btn ${selectedCategory === cat.id ? "mp-category-btn--active" : ""}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <span className="mp-category-icon">{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
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

          {/* Additional Filters */}
          <div className="mp-filter-group">
            <h4 className="mp-filter-title">Artwork Type</h4>
            <label className="mp-checkbox">
              <input type="checkbox" />
              <span>Original Artworks</span>
            </label>
            <label className="mp-checkbox">
              <input type="checkbox" />
              <span>Limited Editions</span>
            </label>
            <label className="mp-checkbox">
              <input type="checkbox" />
              <span>Open Editions</span>
            </label>
          </div>

          <button className="btn btn-primary btn-block">Apply Filters</button>
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

            <div className="mp-sort">
              <label>Sort by:</label>
              <select 
                className="mp-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>
          </div>

          {/* Grid Display */}
          {loading ? (
            <div className="mp-loading">
              <div className="mp-loading-spinner"></div>
              <p>Loading artworks...</p>
            </div>
          ) : marketplaceItems.length === 0 ? (
            <div className="mp-empty">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
              <h3>No Items Found</h3>
              <p>Try adjusting your filters or check back later for new items.</p>
              {(selectedCategory !== 'all' || listingType !== 'all' || searchQuery) && (
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setSelectedCategory('all');
                    setListingType('all');
                    setSearchQuery('');
                    setPriceRange({ min: 0, max: 10000 });
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="mp-grid">
              {marketplaceItems
                .filter(item => {
                  // Filter by listing type
                  if (listingType !== "all" && item.listingType !== listingType) {
                    return false;
                  }
                  // Filter by category
                  if (selectedCategory !== "all" && item.category !== selectedCategory) {
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
        <div className="mp-card-meta">
          <span className="mp-card-category">{item.medium || 'Mixed Media'}</span>
          <span className="mp-card-year">{item.year_created || new Date().getFullYear()}</span>
        </div>
        
        <h3 className="mp-card-title" style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</h3>
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
                <span className="mp-card-price-current">${item.currentBid || item.startingPrice}</span>
                <span className="mp-card-time-left">{getTimeRemaining(item.endTime)}</span>
              </>
            ) : (
              <>
                {item.originalPrice && (
                  <span className="mp-card-price-old">${item.originalPrice}</span>
                )}
                <span className="mp-card-price-current">${item.price}</span>
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
}

