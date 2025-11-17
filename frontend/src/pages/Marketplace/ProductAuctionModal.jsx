import { useState, useEffect } from "react";
import "../../styles/components/productModal.css";

export default function ProductAuctionModal({ isOpen, onClose, item, onPlaceBid }) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [bidAmount, setBidAmount] = useState("");
  const [showBidSuccess, setShowBidSuccess] = useState(false);
  const [selectedTab, setSelectedTab] = useState("details");
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Images from API (primary_image + images[])
  const images = item ? [
    item.primary_image,
    ...(Array.isArray(item.images) ? item.images : [])
  ].filter(Boolean) : [];

  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      setSelectedImageIndex(0);
      setBidAmount("");
      setShowBidSuccess(false);
      setSelectedTab("details");
      setIsDescriptionExpanded(false);
      return () => { document.body.style.overflow = prev; };
    }
  }, [isOpen]);

  // Auction-only fields with robust fallbacks (DB and legacy)
  const startPriceVal = item ? Number(
    item.startPrice ?? item.startingPrice ?? item.start_price ?? 0
  ) : 0;
  const minIncrementVal = item ? Number(
    item.minIncrement ?? item.min_increment ?? 0
  ) : 0;
  const startsAt = item ? (
    item.startAt ?? item.start_time ?? null
  ) : null;
  const endsAt = item ? (
    item.endAt ?? item.endTime ?? item.endsAt ?? null
  ) : null;
  const reservePrice = item ? (item.reservePrice ?? item.reserve_price ?? null) : null;
  const allowBidUpdates = item ? (item.allowBidUpdates ?? item.allow_bid_updates ?? false) : false;
  const singleBidOnly = item ? (item.singleBidOnly ?? item.single_bid_only ?? false) : false;

  // Debug: log incoming item and derived auction fields
  useEffect(() => {
    if (isOpen && item) {
      console.debug('[AuctionModal] Item + derived fields', {
        item,
        startPriceVal,
        minIncrementVal,
        startsAt,
        endsAt,
        allowBidUpdates,
        singleBidOnly
      });
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handlePlaceBid = () => {
    const bid = parseFloat(bidAmount);
    if (!isNaN(bid) && bid >= startPriceVal) {
      setShowBidSuccess(true);
      setTimeout(() => {
        try { onPlaceBid?.(item, bid); } catch (e) {}
        onClose?.();
      }, 1500);
    }
  };

  // Truncate description to fit available space
  const MAX_DESCRIPTION_LENGTH = 300;
  const description = item.description || 'No description provided.';
  const isTruncated = description.length > MAX_DESCRIPTION_LENGTH;
  const displayDescription = isDescriptionExpanded 
    ? description 
    : description.substring(0, MAX_DESCRIPTION_LENGTH);

  return (
    <div className="pdm-overlay" onClick={onClose}>
      <div className="pdm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pdm-header">
          <div className="pdm-breadcrumb">
            Marketplace / Auction / {item.title}
          </div>
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
                src={images[selectedImageIndex] || 'https://via.placeholder.com/600'} 
                alt={item.title}
                className="pdm-image"
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
                {images.map((img, i) => (
                  <button 
                    key={i} 
                    className={`pdm-thumb ${selectedImageIndex === i ? 'active' : ''}`}
                    onClick={() => setSelectedImageIndex(i)}
                  >
                    <img src={img} alt={`${item.title}-${i}`} />
                  </button>
                ))}
              </div>
            )}

            {/* Quick Info (match ProductDetailModal) */}
            <div className="pdm-quick-info">
              <div className="pdm-info-item">
                <span className="pdm-info-label">Medium</span>
                <span className="pdm-info-value">{item.medium || 'N/A'}</span>
              </div>
              <div className="pdm-info-item">
                <span className="pdm-info-label">Dimensions</span>
                <span className="pdm-info-value">{item.dimensions || 'N/A'}</span>
              </div>
              {item.year_created && (
                <div className="pdm-info-item">
                  <span className="pdm-info-label">Year</span>
                  <span className="pdm-info-value">{item.year_created}</span>
                </div>
              )}
              <div className="pdm-info-item">
                <span className="pdm-info-label">Authenticity</span>
                <span className="pdm-info-value">{item.is_original ? 'Original' : 'Print'}</span>
              </div>
            </div>
          </div>

          {/* Right: Details (match ProductDetailModal) */}
          <div className="pdm-details">
            <div className="pdm-title-section">
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
              <button className={`pdm-tab ${selectedTab === 'details' ? 'active' : ''}`} onClick={() => setSelectedTab('details')}>Details</button>
              <button className={`pdm-tab ${selectedTab === 'auction-info' ? 'active' : ''}`} onClick={() => setSelectedTab('auction-info')}>Auction Info</button>
              <button className={`pdm-tab ${selectedTab === 'shipping' ? 'active' : ''}`} onClick={() => setSelectedTab('shipping')}>Shipping</button>
              <button className={`pdm-tab ${selectedTab === 'auth' ? 'active' : ''}`} onClick={() => setSelectedTab('auth')}>Authenticity</button>
            </div>

            <div className="pdm-tab-content">
              {selectedTab === 'details' && (
                <div className="pdm-description">
                  {displayDescription}
                  {isTruncated && !isDescriptionExpanded && (
                    <button 
                      onClick={() => setIsDescriptionExpanded(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--museo-primary)',
                        cursor: 'pointer',
                        fontWeight: '600',
                        padding: '0 4px',
                      }}
                    >
                      ... see more
                    </button>
                  )}
                  {isDescriptionExpanded && isTruncated && (
                    <button 
                      onClick={() => setIsDescriptionExpanded(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--museo-primary)',
                        cursor: 'pointer',
                        fontWeight: '600',
                        padding: '0 4px',
                        marginLeft: '4px',
                      }}
                    >
                      see less
                    </button>
                  )}
                </div>
              )}

              {selectedTab === 'auction-info' && (
                <div className="pdm-shipping-info">
                  <div className="pdm-ship-option">
                    <strong>Auction Type</strong>
                    <span>Blind Auction - Sealed Bids</span>
                  </div>
                  <div className="pdm-ship-option">
                    <strong>Starting Price</strong>
                    <span>₱{Number(startPriceVal || 0).toLocaleString()}</span>
                  </div>
                  {minIncrementVal != null && !Number.isNaN(minIncrementVal) && (
                    <div className="pdm-ship-option">
                      <strong>Minimum Bid Increment</strong>
                      <span>₱{Number(minIncrementVal).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="pdm-ship-option">
                    <strong>Auction Starts</strong>
                    <span>{startsAt ? new Date(startsAt).toLocaleString() : 'N/A'}</span>
                  </div>
                  <div className="pdm-ship-option">
                    <strong>Auction Ends</strong>
                    <span>{endsAt ? new Date(endsAt).toLocaleString() : 'N/A'}</span>
                  </div>
                  <div className="pdm-ship-option">
                    <strong>Single Bid Only</strong>
                    <span>{singleBidOnly ? '✅ Yes' : '❌ No'}</span>
                  </div>
                </div>
              )}

              {selectedTab === 'shipping' && (
                <div className="pdm-shipping-info">
                  <div className="pdm-ship-option">
                    <strong>Standard Shipping</strong>
                    <span>3-7 business days, insured</span>
                  </div>
                  <div className="pdm-ship-option">
                    <strong>Express Shipping</strong>
                    <span>1-3 business days, insured</span>
                  </div>
                  <div className="pdm-ship-option">
                    <strong>International</strong>
                    <span>Worldwide delivery available</span>
                  </div>
                </div>
              )}

              {selectedTab === 'auth' && (
                <div className="pdm-shipping-info">
                  <div className="pdm-ship-option">
                    <strong>Signed</strong>
                    <span>Hand-signed by the artist</span>
                  </div>
                  <div className="pdm-ship-option">
                    <strong>Certificate</strong>
                    <span>Certificate of Authenticity included</span>
                  </div>
                </div>
              )}
            </div>

            {/* Auction pricing + bid (match ProductDetailModal styles) */}
            <div className="pdm-purchase">
              <div className="pdm-auction">
                <div className="pdm-auction-info">
                  {Number.isFinite(startPriceVal) && startPriceVal > 0 && (
                    <div className="pdm-auction-stat">
                      <span className="pdm-stat-label">Starting Price</span>
                      <span className="pdm-stat-value">₱{startPriceVal.toLocaleString()}</span>
                    </div>
                  )}
                  {startsAt && (
                    <div className="pdm-auction-stat">
                      <span className="pdm-stat-label">Starts</span>
                      <span className="pdm-stat-value">{new Date(startsAt).toLocaleString()}</span>
                    </div>
                  )}
                  {endsAt && (
                    <div className="pdm-auction-stat">
                      <span className="pdm-stat-label">Ends</span>
                      <span className="pdm-stat-value">{new Date(endsAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="pdm-bid-form">
                  <label className="pdm-bid-label">Your Sealed Bid</label>
                  <input
                    type="number"
                    className="museo-input"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder={`Min ₱${startPriceVal}`}
                    min={startPriceVal}
                  />
                  {showBidSuccess ? (
                    <div className="pdm-bid-success">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      Bid placed successfully!
                    </div>
                  ) : (
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={handlePlaceBid}
                      disabled={!bidAmount || parseFloat(bidAmount) < startPriceVal}
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
            </div>

            {showBidSuccess && (
              <div className="pdm-success">
                <div className="pdm-success-icon">✅</div>
                <p>Your sealed bid has been placed!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
