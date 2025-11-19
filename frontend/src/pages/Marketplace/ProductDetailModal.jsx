import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/components/productModal.css";
import FullscreenImageViewer from "../../components/FullscreenImageViewer";

export default function ProductDetailModal({ isOpen, onClose, item, onAddToCart, onPlaceBid }) {
  const navigate = useNavigate();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [bidAmount, setBidAmount] = useState("");
  const [showBidSuccess, setShowBidSuccess] = useState(false);
  const [selectedTab, setSelectedTab] = useState("details");

  // Handle images from API (primary_image + images array) with de-duplication
  const images = item ? (() => {
    const arr = [
      item.primary_image,
      ...(Array.isArray(item.images) ? item.images : [])
    ].filter(Boolean);
    const seen = new Set();
    return arr.filter((src) => {
      if (seen.has(src)) return false;
      seen.add(src);
      return true;
    });
  })() : [];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSelectedImageIndex(0);
      setQuantity(1);
      setBidAmount("");
      setShowBidSuccess(false);
      setSelectedTab("details");
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const isBlindAuction = item?.listingType === "auction";
  const suggestedMinBid = item?.startingPrice || item?.price || 1000;

  const handleAddToCart = () => {
    // Navigate directly to checkout with this item and selected quantity
    const qty = Number(quantity) > 0 ? Number(quantity) : 1;
    navigate('/marketplace/checkout', {
      state: {
        marketItemId: item.marketItemId || item.id,
        quantity: qty
      }
    });
  };

  const handlePlaceBid = () => {
    const bid = parseFloat(bidAmount);
    if (bid >= suggestedMinBid) {
      setShowBidSuccess(true);
      setTimeout(() => {
        onPlaceBid(item, bid);
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="pdm-overlay" onClick={onClose}>
      <div className="pdm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header Bar */}
        <div className="pdm-header">
          <div className="pdm-breadcrumb">
            Marketplace / {item.categories?.[0] || item.medium || 'Artwork'} / {item.title}
          </div>

    {/* Fullscreen viewer for gallery */}
    <FullscreenImageViewer
      isOpen={showFullscreen}
      onClose={() => setShowFullscreen(false)}
      images={images}
      currentIndex={selectedImageIndex}
      onIndexChange={setSelectedImageIndex}
      alt={item?.title || 'Artwork'}
    />
          <button className="pdm-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="pdm-body">
          {/* Left: Gallery */}
          <div className="pdm-gallery">
            <div className="pdm-main-image">
              <img 
                src={images[selectedImageIndex]} 
                alt={item.title}
                className="pdm-image"
                onClick={() => setShowFullscreen(true)}
                style={{ cursor: 'zoom-in' }}
              />
              {images.length > 1 && (
                <>
                  <button 
                    className="pdm-nav pdm-nav-prev"
                    onClick={() => setSelectedImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1)}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="15 18 9 12 15 6"/>
                    </svg>
                  </button>
                  <button 
                    className="pdm-nav pdm-nav-next"
                    onClick={() => setSelectedImageIndex(prev => (prev + 1) % images.length)}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                </>
              )}
            </div>
            
            {images.length > 1 && (
              <div className="pdm-thumbs">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    className={`pdm-thumb ${selectedImageIndex === idx ? 'active' : ''}`}
                    onClick={() => setSelectedImageIndex(idx)}
                  >
                    <img src={img} alt={`View ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}

            {/* Quick Info */}
            <div className="pdm-quick-info">
              <div className="pdm-info-item">
                <span className="pdm-info-label">Medium</span>
                <span className="pdm-info-value">{item.medium || 'N/A'}</span>
              </div>
              <div className="pdm-info-item">
                <span className="pdm-info-label">Dimensions</span>
                <span className="pdm-info-value">{item.dimensions || 'N/A'}</span>
              </div>
              <div className="pdm-info-item">
                <span className="pdm-info-label">Year</span>
                <span className="pdm-info-value">{item.year_created || 'N/A'}</span>
              </div>
              <div className="pdm-info-item">
                <span className="pdm-info-label">Authenticity</span>
                <span className="pdm-info-value">{item.is_original ? 'Original' : 'Print'}</span>
              </div>
            </div>
          </div>

          {/* Right: Details */}
          <div className="pdm-details">
            {/* Title & Artist */}
            <div className="pdm-title-section">
              {isBlindAuction && (
                <div className="pdm-auction-badge">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  BLIND AUCTION
                </div>
              )}
              <h1 className="pdm-title">{item.title}</h1>
              <div className="pdm-artist">
                <img 
                  src={item.seller?.profilePicture || `https://ui-avatars.com/api/?name=${item.seller?.shopName || 'Artist'}&background=d4b48a&color=fff&size=32`} 
                  alt={item.seller?.shopName || 'Artist'}
                  className="pdm-artist-avatar"
                />
                <div>
                  <span className="pdm-artist-name">{item.seller?.shopName || 'Unknown Artist'}</span>
                  <span className="pdm-artist-verified">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Verified Seller
                  </span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="pdm-tabs">
              <button 
                className={`pdm-tab ${selectedTab === 'details' ? 'active' : ''}`}
                onClick={() => setSelectedTab('details')}
              >
                Details
              </button>
              {isBlindAuction && (
                <button 
                  className={`pdm-tab ${selectedTab === 'rules' ? 'active' : ''}`}
                  onClick={() => setSelectedTab('rules')}
                >
                  Auction Rules
                </button>
              )}
            </div>

            {/* Tab Content */}
            <div className="pdm-tab-content">
              {selectedTab === 'details' && (
                <div className="pdm-description">
                  {item.description ? (
                    <p>{item.description}</p>
                  ) : (
                    <>
                      <p>
                        This exceptional {item.medium?.toLowerCase() || 'artwork'} represents a masterful exploration 
                        of contemporary artistic expression. Created by {item.seller?.shopName || 'the artist'}, this piece showcases remarkable 
                        technical skill and emotional depth.
                      </p>
                      <p>
                        Each detail has been carefully crafted to create a work that resonates with both collectors 
                        and art enthusiasts. {item.is_original && 'The piece comes with a certificate of authenticity and is ready for display.'}
                      </p>
                    </>
                  )}
                </div>
              )}
              
              {selectedTab === 'rules' && isBlindAuction && (
                <div className="pdm-rules">
                  <h4>How Blind Bidding Works</h4>
                  <ul>
                    <li>All bids are sealed and hidden from other participants</li>
                    <li>The highest bid wins when the auction ends</li>
                    <li>Minimum bid increment: ₱50</li>
                    <li>You'll be notified within 24 hours if you win</li>
                    <li>Payment must be completed within 48 hours of winning</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Price/Bid Section */}
            <div className="pdm-purchase">
              {isBlindAuction ? (
                <div className="pdm-auction">
                  <div className="pdm-auction-info">
                    <div className="pdm-auction-stat">
                      <span className="pdm-stat-label">Suggested Bid</span>
                      <span className="pdm-stat-value">₱{suggestedMinBid}+</span>
                    </div>
                    <div className="pdm-auction-stat">
                      <span className="pdm-stat-label">Participants</span>
                      <span className="pdm-stat-value">12 bidders</span>
                    </div>
                    <div className="pdm-auction-stat">
                      <span className="pdm-stat-label">Ends In</span>
                      <span className="pdm-stat-value">2d 14h</span>
                    </div>
                  </div>

                  <div className="pdm-bid-form">
                    <label className="pdm-bid-label">Your Sealed Bid</label>
                    <div className="pdm-bid-input-group">
                      <span className="pdm-currency">₱</span>
                      <input
                        type="number"
                        className="pdm-bid-input"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        placeholder={`Min ${suggestedMinBid}`}
                        min={suggestedMinBid}
                      />
                    </div>
                    {showBidSuccess ? (
                      <div className="pdm-bid-success">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Bid placed successfully!
                      </div>
                    ) : (
                      <button 
                        className="pdm-bid-btn"
                        onClick={handlePlaceBid}
                        disabled={!bidAmount || parseFloat(bidAmount) < suggestedMinBid}
                      >
                        Place Sealed Bid
                      </button>
                    )}
                    <p className="pdm-bid-note">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                      </svg>
                      Bids are binding. You cannot see other participants' bids.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="pdm-buy">
                  <div className="pdm-price-section">
                    {item.originalPrice && (
                      <span className="pdm-price-original">₱{item.originalPrice}</span>
                    )}
                    <span className="pdm-price-current">₱{item.price}</span>
                    {item.originalPrice && (
                      <span className="pdm-price-discount">
                        {Math.round((1 - item.price / item.originalPrice) * 100)}% OFF
                      </span>
                    )}
                  </div>

                  <div className="pdm-quantity">
                    <label>Quantity</label>
                    <div className="pdm-qty-selector">
                      <button 
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                      >
                        −
                      </button>
                      <span>{quantity}</span>
                      <button 
                        onClick={() => setQuantity(quantity + 1)}
                        disabled={quantity >= (item.quantity || 10)}
                      >
                        +
                      </button>
                    </div>
                    <span className="pdm-stock">
                      {item.quantity > 0 ? `${item.quantity} available` : 'In stock'}
                    </span>
                  </div>

                  <div className="pdm-actions">
                    <button className="pdm-btn-buy" onClick={handleAddToCart}>
                      Buy Now
                    </button>
                  </div>

                  {/* Trust Badges */}
                  <div className="pdm-trust">
                    <div className="pdm-trust-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 1l3.09 6.26L22 8.27l-5 4.87L18.18 20 12 16.77 5.82 20 7 13.14 2 8.27l6.91-1.01L12 1z"/>
                      </svg>
                      Authentic
                    </div>
                    <div className="pdm-trust-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                      Insured
                    </div>
                    <div className="pdm-trust-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      </svg>
                      Certificate
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
