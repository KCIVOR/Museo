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
  const [showCart, setShowCart] = useState(false);
  const [cartItems, setCartItems] = useState(() => {
    // Load cart from localStorage on mount
    const savedCart = localStorage.getItem('museoCart');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('museoCart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Mock data for demonstration
  useEffect(() => {
    loadMarketplaceData();
  }, [selectedCategory, listingType, priceRange, sortBy]);

  const loadMarketplaceData = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setMarketplaceItems(mockMarketplaceItems);
      setLoading(false);
    }, 500);
  };

  // Mock marketplace items with mixed listing types
  const mockMarketplaceItems = [
    {
      id: 1,
      title: "Sunset Over Mountains",
      artist: "Emily Chen",
      price: 2500,
      originalPrice: 3000,
      image: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/gallery/5f3d985f-6a76-4745-a11e-782b2930ba6b/1761039149778-272916701_675557750463982_1659043457488353897_n.jpg",
      category: "landscape",
      medium: "Oil on Canvas",
      dimensions: "24x36 inches",
      year: 2024,
      isOriginal: true,
      isFeatured: true,
      quantity: 1,
      views: 234,
      likes: 45,
      listingType: "buy-now"
    },
    {
      id: 2,
      title: "Abstract Emotions",
      artist: "Marcus Rodriguez",
      price: 1800,
      image: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/gallery/5f3d985f-6a76-4745-a11e-782b2930ba6b/1761039149778-272916701_675557750463982_1659043457488353897_n.jpg",
      category: "abstract",
      medium: "Acrylic on Canvas",
      dimensions: "30x40 inches",
      year: 2023,
      isOriginal: true,
      quantity: 1,
      views: 156,
      likes: 32,
      listingType: "auction",
      currentBid: 1800,
      startingPrice: 1200,
      endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 3,
      title: "Portrait of Serenity",
      artist: "Sofia Williams",
      price: 3200,
      image: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/gallery/5f3d985f-6a76-4745-a11e-782b2930ba6b/1761039149778-272916701_675557750463982_1659043457488353897_n.jpg",
      category: "portrait",
      medium: "Digital Art Print",
      dimensions: "18x24 inches",
      year: 2024,
      isOriginal: false,
      isFramed: true,
      quantity: 10,
      views: 312,
      likes: 67,
      listingType: "buy-now"
    },
    {
      id: 4,
      title: "Urban Dreams",
      artist: "James Park",
      price: 2100,
      image: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/gallery/5f3d985f-6a76-4745-a11e-782b2930ba6b/1761039149778-272916701_675557750463982_1659043457488353897_n.jpg",
      category: "urban",
      medium: "Mixed Media",
      dimensions: "36x48 inches",
      year: 2024,
      isOriginal: true,
      quantity: 1,
      views: 189,
      listingType: "auction",
      currentBid: 2100,
      startingPrice: 1500,
      endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      likes: 41
    },
    {
      id: 5,
      title: "Morning Mist",
      artist: "Chen Wei",
      price: 1500,
      image: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/gallery/5f3d985f-6a76-4745-a11e-782b2930ba6b/1761039149778-272916701_675557750463982_1659043457488353897_n.jpg",
      category: "landscape",
      medium: "Watercolor on Paper",
      dimensions: "16x20 inches",
      year: 2024,
      isOriginal: true,
      quantity: 1,
      views: 278,
      likes: 52,
      listingType: "buy-now"
    },
    {
      id: 6,
      title: "City Lights",
      artist: "Alex Morgan",
      price: 2800,
      image: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/gallery/5f3d985f-6a76-4745-a11e-782b2930ba6b/1761039149778-272916701_675557750463982_1659043457488353897_n.jpg",
      category: "urban",
      medium: "Digital Print",
      dimensions: "24x36 inches",
      year: 2023,
      isOriginal: false,
      quantity: 25,
      views: 412,
      likes: 89,
      listingType: "auction",
      currentBid: 2800,
      startingPrice: 2000,
      endTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 7,
      title: "Serene Garden",
      artist: "Lisa Park",
      price: 1900,
      image: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/gallery/5f3d985f-6a76-4745-a11e-782b2930ba6b/1761039149778-272916701_675557750463982_1659043457488353897_n.jpg",
      category: "landscape",
      medium: "Oil on Canvas",
      dimensions: "20x24 inches",
      year: 2024,
      isOriginal: true,
      quantity: 1,
      views: 156,
      likes: 34,
      listingType: "buy-now"
    },
    {
      id: 8,
      title: "Abstract Mind",
      artist: "David Kim",
      price: 3500,
      image: "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/gallery/5f3d985f-6a76-4745-a11e-782b2930ba6b/1761039149778-272916701_675557750463982_1659043457488353897_n.jpg",
      category: "abstract",
      medium: "Acrylic on Canvas",
      dimensions: "36x36 inches",
      year: 2024,
      isOriginal: true,
      quantity: 1,
      views: 334,
      likes: 76,
      listingType: "auction",
      currentBid: 3500,
      startingPrice: 2500,
      endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];


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

  const handleAddToCart = (item) => {
    const existingItem = cartItems.find(cartItem => cartItem.id === item.id);
    
    if (existingItem) {
      setCartItems(cartItems.map(cartItem => 
        cartItem.id === item.id 
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCartItems([...cartItems, { ...item, quantity: 1 }]);
    }
    
    // Show cart sidebar
    setShowCart(true);
  };

  const handleRemoveFromCart = (itemId) => {
    setCartItems(cartItems.filter(item => item.id !== itemId));
  };

  const handleUpdateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(itemId);
    } else {
      setCartItems(cartItems.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartItemsCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

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
      {/* Cart Button - Fixed Position */}
      <button 
        className="mp-cart-float-btn"
        onClick={() => setShowCart(!showCart)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 7h14l-1 10H6L5 7ZM5 7l-1-3h3m1 0h8m0 0h3l-1 3"/>
          <circle cx="9" cy="20" r="1"/>
          <circle cx="15" cy="20" r="1"/>
        </svg>
        {getCartItemsCount() > 0 && (
          <span className="mp-cart-badge">{getCartItemsCount()}</span>
        )}
      </button>

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
                  if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
                      !item.artist.toLowerCase().includes(searchQuery.toLowerCase())) {
                    return false;
                  }
                  return true;
                })
                .map(item => (
                  <MarketplaceCard 
                    key={item.id} 
                    item={item} 
                    onAddToCart={handleAddToCart}
                    onClick={() => handleProductClick(item)}
                  />
                ))}
            </div>
          )}
        </div>

        {/* Cart Sidebar */}
        <aside className={`mp-cart ${showCart ? "mp-cart--open" : ""}`}>
          <div className="mp-cart-header">
            <h2 className="mp-cart-title">Shopping Cart</h2>
            <button 
              className="btn btn-ghost btn-icon"
              onClick={() => setShowCart(false)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="mp-cart-items">
            {cartItems.length === 0 ? (
              <div className="mp-cart-empty">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M5 7h14l-1 10H6L5 7ZM5 7l-1-3h3m1 0h8m0 0h3l-1 3"/>
                </svg>
                <p>Your cart is empty</p>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowCart(false)}
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <>
                {cartItems.map(item => (
                  <div key={item.id} className="mp-cart-item">
                    <img 
                      src={item.image} 
                      alt={item.title}
                      className="mp-cart-item-image"
                    />
                    <div className="mp-cart-item-details">
                      <h4 className="mp-cart-item-title">{item.title}</h4>
                      <p className="mp-cart-item-artist">by {item.artist}</p>
                      <div className="mp-cart-item-price">${item.price}</div>
                    </div>
                    <div className="mp-cart-item-actions">
                      <div className="mp-quantity">
                        <button 
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button 
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <button 
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleRemoveFromCart(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {cartItems.length > 0 && (
            <div className="mp-cart-footer">
              <div className="mp-cart-total">
                <span>Total:</span>
                <span className="mp-cart-total-price">${getTotalPrice().toFixed(2)}</span>
              </div>
              <button 
                className="btn btn-primary btn-block"
                onClick={() => navigate('/marketplace/checkout')}
              >
                Proceed to Checkout
              </button>
              <button 
                className="btn btn-secondary btn-block"
                onClick={() => setShowCart(false)}
              >
                Continue Shopping
              </button>
            </div>
          )}
        </aside>
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
          src={item.image} 
          alt={item.title}
          className="mp-card-image"
        />

        {/* Badges */}
        {item.isFeatured && (
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
          <span className="mp-card-category">{item.medium}</span>
          <span className="mp-card-year">{item.year}</span>
        </div>
        
        <h3 className="mp-card-title">{item.title}</h3>
        <p className="mp-card-artist">by {item.artist}</p>
        
        <div className="mp-card-details">
          <span className="mp-card-size">{item.dimensions}</span>
          {item.isOriginal && <span className="mp-card-original">Original</span>}
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
            {item.listingType === "auction" ? "Place Bid" : "Add to Cart"}
          </button>
        </div>
      </div>
    </article>
  );
}

