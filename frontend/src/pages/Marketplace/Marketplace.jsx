import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";
import ProductDetailModal from "./ProductDetailModal";
import "./css/marketplace.css";

const API = import.meta.env.VITE_API_BASE;

export default function Marketplace() {
  const navigate = useNavigate();
  const { userData } = useUser();
  
  // State management
  const [marketplaceItems, setMarketplaceItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [listingType, setListingType] = useState("all"); // all, buy-now, auction
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 });
  const [sortBy, setSortBy] = useState("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);

  // Cart removed by P2P migration

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
      
      // Get items from response
      let items = result.data || [];
      
      // Apply client-side filters
      if (selectedCategory !== 'all') {
        items = items.filter(item => 
          item.categories?.includes(selectedCategory) || 
          item.medium?.toLowerCase() === selectedCategory.toLowerCase()
        );
      }
      
      if (listingType !== 'all') {
        items = items.filter(item => item.listingType === listingType);
      }
      
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

  // Category definitions (removed mock data)


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
    // Buy Now -> go to checkout page with selected item & quantity
    const qty = Number(quantityToAdd) > 0 ? Number(quantityToAdd) : 1;
    navigate('/marketplace/checkout', {
      state: {
        marketItemId: item.marketItemId || item.id,
        quantity: qty
      }
    });
  };

  // Cart removed by P2P migration

  // Cart removed by P2P migration

  // Effects
  useEffect(() => {
    fetchMarketplaceItems();
    // Cart disabled by P2P migration
  }, [userData]);

  const handleProductClick = (item) => {
    setSelectedProduct(item);
    setShowProductModal(true);
  };

  const handlePlaceBid = (item, bidAmount) => {
    console.log(`Placing blind bid of $${bidAmount} on ${item.title}`);
    alert(`Your sealed bid of $${bidAmount} has been placed successfully!\n\nYou will be notified when the auction ends.`);
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

      {/* Product Detail Modal */}
      <ProductDetailModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        item={selectedProduct}
        onAddToCart={handleAddToCart}
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
        {item.is_featured && (
          <span className="mp-badge mp-badge--featured">Featured</span>
        )}
        {item.originalPrice && item.listingType === "buy-now" && (
          <span className="mp-badge mp-badge--sale">
            {Math.round((1 - item.price / item.originalPrice) * 100)}% OFF
          </span>
        )}
        {item.listingType === "auction" && (
          <span className="mp-badge mp-badge--auction">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <circle cx="12" cy="8" r="7"/>
              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
            </svg>
            Auction
          </span>
        )}
      </div>

      {/* Card Content */}
      <div className="mp-card-content">
        <div className="mp-card-meta">
          <span className="mp-card-category">{item.medium || 'Mixed Media'}</span>
          <span className="mp-card-year">{item.year_created || new Date().getFullYear()}</span>
        </div>
        
        <h3 className="mp-card-title">{item.title}</h3>
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

