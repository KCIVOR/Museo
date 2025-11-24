import { useState, useEffect } from "react";
import "../../styles/components/productModal.css";
import AddressPickerModal from "../../components/AddressPickerModal.jsx";
import FullscreenImageViewer from "../../components/FullscreenImageViewer";

export default function ProductAuctionModal({ isOpen, onClose, item, onPlaceBid }) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [bidAmount, setBidAmount] = useState("");
  const [showBidSuccess, setShowBidSuccess] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [placingBid, setPlacingBid] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [userAddresses, setUserAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [selectedTab, setSelectedTab] = useState("details")
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [nowTs, setNowTs] = useState(Date.now());
  const [myBids, setMyBids] = useState([]);
  const [loadingMyBids, setLoadingMyBids] = useState(false);
  const [errorMyBids, setErrorMyBids] = useState('');
  // Seller courier preferences and user-selected courier/service
  const [sellerCouriers, setSellerCouriers] = useState(null);
  const [selectedCourierBrand, setSelectedCourierBrand] = useState('');
  const [selectedCourierService, setSelectedCourierService] = useState('');
  const [estimatedShippingPrice, setEstimatedShippingPrice] = useState(0);
  // Images from API (primary_image + images[]) with de-duplication
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
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      setSelectedImageIndex(0);
      setBidAmount("");
      setShowBidSuccess(false);
      setSelectedTab("details");
      setIsDescriptionExpanded(false);
      fetchAddress();
      // Fetch auction details for seller shipping preferences
      fetchAuctionDetails();
      return () => { document.body.style.overflow = prev; };
    }
  }, [isOpen]);

  // Tick clock to re-evaluate start/end gating while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
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
  const auctionId = item?.auctionId ?? item?.id ?? item?.auction_id ?? item?.auctionID ?? item?.auctionid;

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

  // Derive courier options early and keep service consistent (hooks must be unconditional)
  const courierOptions = sellerCouriers?.couriers || {};
  const courierBrands = Object.keys(courierOptions);
  const hasCourierOptions = courierBrands.some(brand => courierOptions[brand]?.standard || courierOptions[brand]?.express);

  useEffect(() => {
    // Keep selected service valid when brand changes or options update
    if (!hasCourierOptions || !selectedCourierBrand) return;
    const services = ['standard', 'express'].filter(s => courierOptions[selectedCourierBrand]?.[s]);
    if (services.length === 0) {
      setSelectedCourierService('');
    } else if (!services.includes(selectedCourierService)) {
      setSelectedCourierService(services[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourierBrand, hasCourierOptions]);

  // Fetch server shipping quote when selection changes (static fallback handled by backend)
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!hasCourierOptions || !selectedCourierBrand || !selectedCourierService) {
        if (alive) setEstimatedShippingPrice(0);
        return;
      }
      try {
        const API = import.meta.env.VITE_API_BASE;
        const res = await fetch(`${API}/marketplace/shipping/quote`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courier: selectedCourierBrand, courierService: selectedCourierService })
        });
        const json = await res.json().catch(() => ({}));
        if (!alive) return;
        if (res.ok && json?.success !== false) {
          setEstimatedShippingPrice(Number(json?.data?.price || 0));
        } else {
          setEstimatedShippingPrice(0);
        }
      } catch {
        if (alive) setEstimatedShippingPrice(0);
      }
    })();
    return () => { alive = false; };
  }, [hasCourierOptions, selectedCourierBrand, selectedCourierService]);

  // Fetch my bid history for this auction
  const fetchMyBids = async () => {
    if (!auctionId) return;
    try {
      setLoadingMyBids(true);
      setErrorMyBids('');
      const API = import.meta.env.VITE_API_BASE;
      let res = await fetch(`${API}/auctions/${auctionId}/my-bids`, { credentials: 'include' });
      let data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        // Fallback to single latest bid endpoint if list isn't available
        const res2 = await fetch(`${API}/auctions/${auctionId}/my-bid`, { credentials: 'include' });
        const data2 = await res2.json().catch(() => ({}));
        if (!res2.ok || data2.success === false || (!Array.isArray(data2.data) && !data2.data)) {
          setErrorMyBids('Bid history endpoint is not available yet.');
          setMyBids([]);
          return;
        }
        const arr = Array.isArray(data2.data) ? data2.data : [data2.data];
        const sorted = [...arr].sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
        setMyBids(sorted);
        return;
      }
      const arr = Array.isArray(data.data) ? data.data : [];
      const sorted = [...arr].sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
      setMyBids(sorted);
    } catch (e) {
      setErrorMyBids(e?.message || 'Failed to load bid history');
    } finally {
      setLoadingMyBids(false);
    }
  };

  // Fetch auction details to get seller shipping preferences
  const fetchAuctionDetails = async () => {
    try {
      if (!isOpen || !auctionId) return;
      const API = import.meta.env.VITE_API_BASE;
      const res = await fetch(`${API}/auctions/${auctionId}`, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success && data?.data?.sellerShippingPrefs) {
        const prefs = data.data.sellerShippingPrefs;
        // Normalize: keep only couriers with at least one enabled service
        const couriers = prefs?.couriers || {};
        const filtered = Object.fromEntries(
          Object.entries(couriers).filter(([_, svc]) => Boolean(svc?.standard) || Boolean(svc?.express))
        );
        setSellerCouriers({ couriers: filtered });
        // Auto-select first available brand/service similar to checkout
        const brands = Object.keys(filtered);
        if (brands.length > 0) {
          const fb = brands[0];
          const services = ['standard', 'express'].filter(s => filtered[fb]?.[s]);
          setSelectedCourierBrand(fb);
          setSelectedCourierService(services[0] || '');
        } else {
          setSelectedCourierBrand('');
          setSelectedCourierService('');
        }
      } else {
        setSellerCouriers(null);
      }
    } catch (e) {
      setSellerCouriers(null);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    if (selectedTab !== 'my-bids') return;
    fetchMyBids();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedTab, auctionId]);

  if (!isOpen || !item) return null;

  // Time-based gating for bidding
  const beforeStart = startsAt ? nowTs < new Date(startsAt).getTime() : false;
  const afterEnd = endsAt ? nowTs >= new Date(endsAt).getTime() : false;
  const isPaused = item?.status === 'paused';
  const timeDisabled = beforeStart || afterEnd || isPaused;

  // Live timer label
  const formatDuration = (ms) => {
    if (!Number.isFinite(ms) || ms <= 0) return '0s';
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const parts = [];
    if (d) parts.push(`${d}d`);
    if (h || d) parts.push(`${h}h`);
    if (m || h || d) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  };

  const startMs = startsAt ? new Date(startsAt).getTime() : null;
  const endMs = endsAt ? new Date(endsAt).getTime() : null;
  let timerLabel = '';
  if (beforeStart && startMs) {
    timerLabel = `Starts in ${formatDuration(startMs - nowTs)}`;
  } else if (afterEnd && endMs) {
    timerLabel = `Ended ${formatDuration(nowTs - endMs)} ago`;
  } else if (isPaused && endMs) {
    timerLabel = `Paused — Ends in ${formatDuration(endMs - nowTs)}`;
  } else if (endMs) {
    timerLabel = `Ends in ${formatDuration(endMs - nowTs)}`;
  }

  const handlePlaceBid = async () => {
    const bid = parseFloat(bidAmount);
    // Require user to pick an address first
    if (!selectedAddressId) {
      setErrorMsg('Please select a shipping address on the Shipping tab before placing a bid.');
      setSelectedTab('shipping');
      return;
    }
    // If seller has courier preferences, require user to select one
    const hasCourierOptions = !!(sellerCouriers && Object.values(sellerCouriers.couriers || {}).some(c => c.standard || c.express));
    if (hasCourierOptions && (!selectedCourierBrand || !selectedCourierService)) {
      setErrorMsg('Please choose your courier and service in the Shipping tab before placing a bid.');
      setSelectedTab('shipping');
      return;
    }
    if (isNaN(bid) || bid < startPriceVal) return;
    setErrorMsg('');
    setPlacingBid(true);
    try {
      const API = import.meta.env.VITE_API_BASE;
      const idempotencyKey = (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
        ? globalThis.crypto.randomUUID()
        : `bid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const payload = {
        amount: bid,
        userAddressId: selectedAddressId,
        idempotencyKey
      };
      if (selectedCourierBrand && selectedCourierService) {
        payload.courier = selectedCourierBrand;
        payload.courierService = selectedCourierService;
      }
      const res = await fetch(`${API}/auctions/${auctionId}/bids`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        const msg = json?.error || `Failed to place bid (HTTP ${res.status})`;
        setErrorMsg(msg);
        return;
      }
      setShowBidSuccess(true);
      setTimeout(() => {
        onClose?.();
      }, 1200);
    } catch (e) {
      setErrorMsg(e?.message || 'Failed to place bid');
    } finally {
      setPlacingBid(false);
    }
  };

  const fetchAddress = async () => {
    try {
      const API = import.meta.env.VITE_API_BASE;
      const res = await fetch(`${API}/marketplace/addresses`, {
        method: 'GET',
        credentials: 'include',
      });
  
      // Handle non-OK HTTP codes
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('fetchAddress: HTTP error', res.status, text);
        setUserAddresses([]);
        setSelectedAddressId('');
        return [];
      }
  
      const json = await res.json().catch(() => ({}));
      const addresses = Array.isArray(json?.data) ? json.data : [];
      console.log('fetchAddress: loaded addresses', addresses);
      setUserAddresses(addresses);
      // Preserve current selection if it still exists; clear if removed
      setSelectedAddressId(prev => (prev && addresses.some(a => a.userAddressId === prev) ? prev : ''));
      return addresses;
    } catch (error) {
      console.error('fetchAddress: unexpected error:', error);
      setUserAddresses([]);
      setSelectedAddressId('');
      return [];
    }
  };


  // Truncate description to fit available space
  const MAX_DESCRIPTION_LENGTH = 300;
  const description = item.description || 'No description provided.';
  const isTruncated = description.length > MAX_DESCRIPTION_LENGTH;
  const displayDescription = isDescriptionExpanded 
    ? description 
    : description.substring(0, MAX_DESCRIPTION_LENGTH);
  
  // Currently selected address object (if any)
  const selectedAddress = userAddresses.find(a => a.userAddressId === selectedAddressId);
  // Determine if courier selection is required/enabled (derived above)

  // Estimated shipping cost from server (fallback handled in backend)
  const estimatedShipping = (selectedCourierBrand && selectedCourierService) ? Number(estimatedShippingPrice || 0) : 0;
  const parsedBid = Number(bidAmount) || 0;
  const estimatedTotal = parsedBid + (hasCourierOptions ? estimatedShipping : 0);

  return (
    <>
    <div className="pdm-overlay" onClick={onClose}>
      <div className="pdm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pdm-header">
          <div className="pdm-breadcrumb">
            Marketplace / Auction / {item.title}
          </div>
          <button className="event-modal__close" onClick={onClose}>
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
              <button className={`pdm-tab ${selectedTab === 'my-bids' ? 'active' : ''}`} onClick={() => setSelectedTab('my-bids')}>My Bids</button>
              <button className={`pdm-tab ${selectedTab === 'shipping' ? 'active' : ''}`} onClick={() => setSelectedTab('shipping')}>Shipping</button>
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
                  {/*
                    <div className="pdm-ship-option">
                      <strong>Single Bid Only</strong>
                      <span>{singleBidOnly ? '✅ Yes' : '❌ No'}</span>
                    </div>
                  */}
                  
                </div>
              )}

              {selectedTab === 'my-bids' && (
                <div className="pdm-my-bids">
                  {loadingMyBids && <div className="museo-message">Loading your bids…</div>}
                  {errorMyBids && !loadingMyBids && (
                    <div className="museo-error-message">{errorMyBids}</div>
                  )}
                  {!loadingMyBids && !errorMyBids && (
                    myBids.length > 0 ? (
                      <div className="museo-card">
                        <div className="museo-card__body">
                          <div className="pdm-my-bids-list">
                            {myBids.map((b, i) => (
                              <div key={b.bidId || b.id || i} className="pdm-my-bid-row">
                                <div className="pdm-my-bid-amount">₱{Number(b.amount || 0).toLocaleString()}</div>
                                <div className="pdm-my-bid-time">{new Date(b.created_at || b.createdAt).toLocaleString()}</div>
                                {i === 0 && (
                                  <span className="museo-badge museo-badge--outline museo-badge--sm">Latest</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="museo-form-helper">You haven't placed any bids for this auction yet.</div>
                    )
                  )}
                </div>
              )}

              {selectedTab === 'shipping' && (
                <div className="pdm-shipping-info">
                  <div className="pdm-ship-option">
                    <strong>Shipping Address</strong>
                    <button
                      className="btn btn-sm btn-secondary"
                      type="button"
                      onClick={() => setShowAddressPicker(true)}
                    >
                      Manage Addresses
                    </button>
                  </div>
                  {userAddresses.length === 0 ? (
                    <div className="pdm-ship-option">
                      <span>No saved addresses found.</span>
                    </div>
                  ) : !selectedAddress ? (
                    <div className="pdm-ship-option">
                      <span>No address selected. Click Manage Addresses to choose one.</span>
                    </div>
                  ) : (
                    <div className="museo-card is-selected">
                      <div className="museo-card__body">
                        <div className="museo-address-content">
                          <div className="museo-address-name">{selectedAddress.fullName} {selectedAddress.isDefault ? '(Default)' : ''}</div>
                          <div className="museo-address-line">{selectedAddress.addressLine1}{selectedAddress.addressLine2 ? `, ${selectedAddress.addressLine2}` : ''}</div>
                          <div className="museo-address-line">{selectedAddress.barangayName}, {selectedAddress.cityMunicipalityName}, {selectedAddress.provinceName}, {selectedAddress.regionName} {selectedAddress.postalCode}</div>
                          <div className="museo-address-phone">{selectedAddress.phoneNumber}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {hasCourierOptions && (
                    <>
                      <hr style={{ margin: '12px 0', borderColor: 'var(--museo-border)' }} />
                      <div className="pdm-ship-option">
                        <strong>Shipping Method</strong>
                        <span className="museo-form-helper">Select courier and service</span>
                      </div>
                      <div className="museo-card">
                        <div className="museo-card__body shipping-options">
                          {courierBrands.map((brand) => {
                            const brandSelected = selectedCourierBrand === brand;
                            const services = ['standard', 'express'].filter(s => courierOptions[brand]?.[s]);
                            const currentService = brandSelected && services.includes(selectedCourierService) ? selectedCourierService : services[0];
                            return (
                              <div
                                key={brand}
                                className={`shipping-card ${brandSelected ? 'selected' : ''}`}
                                onClick={() => setSelectedCourierBrand(brand)}
                              >
                                <div className="shipping-radio">
                                  {brandSelected && (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                    </svg>
                                  )}
                                </div>
                                <div className="shipping-details">
                                  <div className="shipping-name">{brand}</div>
                                  {brandSelected ? (
                                    <div className="shipping-service-row" onClick={(e) => e.stopPropagation()}>
                                      <select
                                        className="museo-select"
                                        value={currentService || ''}
                                        onChange={(e) => setSelectedCourierService(e.target.value)}
                                      >
                                        {services.includes('standard') && (<option value="standard">Standard</option>)}
                                        {services.includes('express') && (<option value="express">Express</option>)}
                                      </select>
                                      <div className="shipping-desc">
                                        {currentService === 'express' ? 'Faster delivery' : 'Economy delivery'}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="shipping-desc">Select to choose service</div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/*
                    <div className="pdm-ship-option">
                      <strong>International</strong>
                      <span>Worldwide delivery available</span>
                    </div>
                  */}
                </div>
              )}
            </div>

            {/* Auction pricing + bid (match ProductDetailModal styles) */}
            <div className="pdm-purchase">
              <div className="pdm-auction">
                {(startsAt || endsAt) && timerLabel && (
                  <div className="museo-card pdm-countdown-card">
                    <div className="museo-card__body">
                      <div className="pdm-countdown">
                        <span className="museo-badge museo-badge--primary museo-badge--sm museo-badge--dot">Time</span>
                        <span className="pdm-countdown-value">{timerLabel}</span>
                      </div>
                    </div>
                  </div>
                )}

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
                  {/* Estimated breakdown */}
                  <div className="museo-card">
                    <div className="museo-card__body" style={{ display: 'grid', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="pdm-stat-label">Bid</span>
                        <span className="pdm-stat-value">₱{Number(parsedBid || 0).toLocaleString()}</span>
                      </div>
                      {hasCourierOptions && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span className="pdm-stat-label">Estimated Shipping</span>
                          <span className="pdm-stat-value">₱{Number(estimatedShipping || 0).toLocaleString()}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--museo-border)', paddingTop: 6 }}>
                        <span className="pdm-stat-label">Estimated Total</span>
                        <span className="pdm-stat-value">₱{Number(estimatedTotal || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  {showBidSuccess ? (
                    <div className="pdm-bid-success">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      Bid placed successfully!
                    </div>
                  ) : (
                    <>
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={handlePlaceBid}
                        disabled={
                          placingBid ||
                          !bidAmount ||
                          parseFloat(bidAmount) < startPriceVal ||
                          !selectedAddressId ||
                          (hasCourierOptions && (!selectedCourierBrand || !selectedCourierService)) ||
                          timeDisabled
                        }
                      >
                        {placingBid ? 'Placing…' : 'Place Sealed Bid'}
                      </button>
                      {timeDisabled && (
                        <div style={{ color: 'var(--museo-text-muted)', fontSize: '12px', marginTop: '6px' }}>
                          {beforeStart
                            ? `Bidding opens at ${new Date(startsAt).toLocaleString()}`
                            : afterEnd
                              ? `Auction ended at ${new Date(endsAt).toLocaleString()}`
                              : isPaused
                                ? `Auction is paused. Ends at ${new Date(endsAt).toLocaleString()}`
                                : ''}
                        </div>
                      )}
                      {!selectedAddressId && userAddresses.length > 0 && (
                        <div style={{ color: 'var(--museo-text-muted)', fontSize: '12px' }}>
                          Select a shipping address in the Shipping tab to enable bidding.
                        </div>
                      )}
                      {hasCourierOptions && (!selectedCourierBrand || !selectedCourierService) && (
                        <div style={{ color: 'var(--museo-text-muted)', fontSize: '12px' }}>
                          Choose your courier and service in the Shipping tab to enable bidding.
                        </div>
                      )}
                      {errorMsg && (
                        <div style={{ color: 'var(--museo-error)', fontSize: '12px' }}>
                          {errorMsg}
                        </div>
                      )}
                    </>
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

    {/* Fullscreen viewer for gallery */}
    <FullscreenImageViewer
      isOpen={showFullscreen}
      onClose={() => setShowFullscreen(false)}
      images={images}
      currentIndex={selectedImageIndex}
      onIndexChange={setSelectedImageIndex}
      alt={item?.title || 'Artwork'}
    />

    {showAddressPicker && (
      <AddressPickerModal
        isOpen={showAddressPicker}
        onClose={() => setShowAddressPicker(false)}
        initialSelectedId={selectedAddressId}
        onSelect={(sel) => {
          const id = typeof sel === 'string' ? sel : sel?.userAddressId;
          if (id) setSelectedAddressId(id);
          setShowAddressPicker(false);
          // Refresh address list to reflect any add/edit/delete operations
          fetchAddress();
        }}
      />
    )}

    </>
  );
}
