import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";
import AddressPickerModal from "../../components/AddressPickerModal.jsx";
import "../../styles/main.css";
import "./css/checkout.css";
import { buyNow } from "../../api/orders";
const API = import.meta.env.VITE_API_BASE;

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useUser();
  
  // State management (single-item Buy Now)
  const [cartItems, setCartItems] = useState([]); // will hold one item for Buy Now
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedShipping, setSelectedShipping] = useState("jnt-standard");
  // Payment method removed - Xendit handles this
  const [orderNotes, setOrderNotes] = useState("None"); // Default to 'None' for NOT NULL constraint
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [error, setError] = useState("");
  
  // Form states
  const [addressForm, setAddressForm] = useState({
    fullName: "",
    phone: "",
    street: "",
    barangay: "",
    city: "",
    province: "",
    postalCode: "",
    isDefault: false
  });
  
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [availableShippingOptions, setAvailableShippingOptions] = useState([]);
  const [selectedCourierBrand, setSelectedCourierBrand] = useState('');

  // Load selected Buy Now item (from router state)
  const fetchSelectedItem = async (marketItemId, quantity) => {
    try {
      const response = await fetch(`${API}/marketplace/items/${marketItemId}`, { credentials: 'include' });
      const result = await response.json();
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || 'Item not found');
      }
      const item = result.data;
      setCartItems([{ 
        id: marketItemId,
        marketItemId: marketItemId,
        title: item.title,
        price: item.price,
        quantity: Number(quantity) || 1,
        image: (Array.isArray(item.images) ? item.images[0] : item.images) || '/assets/default-art.jpg',
        artist: item.sellerProfiles?.shopName || 'Unknown Shop',
        sellerProfileId: item.sellerProfileId
      }]);

      // Filter shipping options using seller's shippingPreferences if provided
      const prefsContainer = Array.isArray(item?.sellerProfiles) ? item?.sellerProfiles[0] : item?.sellerProfiles;
      const prefs = prefsContainer?.shippingPreferences;
      const filteredOpts = prefs && prefs.couriers ? shippingOptions.filter(opt => {
        const courierBrand = opt.courier;
        const svc = opt.courierService;
        return prefs.couriers?.[courierBrand]?.[svc] === true;
      }) : shippingOptions;
      setAvailableShippingOptions(filteredOpts);
      // Ensure selected option is valid
      const stillValid = filteredOpts.some(o => o.id === selectedShipping);
      if (!stillValid) {
        setSelectedShipping(filteredOpts[0]?.id || selectedShipping);
      }
      // Default brand selection
      const firstBrand = filteredOpts[0]?.courier || '';
      setSelectedCourierBrand(firstBrand);
    } catch (err) {
      console.error('Error loading item:', err);
      navigate('/marketplace');
    }
  };

  // Fetch addresses from backend
  const fetchAddresses = async () => {
    try {
      const response = await fetch(`${API}/marketplace/addresses`, {
        credentials: 'include'
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSavedAddresses(result.data || []);
        
        // Set default address if exists
        const defaultAddr = result.data?.find(addr => addr.isDefault);
        if (defaultAddr) {
          setSelectedAddress(defaultAddr.userAddressId);
        } else if (result.data?.length > 0) {
          // Select first address if no default
          setSelectedAddress(result.data[0].userAddressId);
        }
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  };

  // Load selected item and addresses on mount
  useEffect(() => {
    if (!userData) {
      navigate('/');
      return;
    }
    
    // Validate router state for Buy Now
    const state = location.state || {};
    if (!state.marketItemId) {
      navigate('/marketplace');
      return;
    }
    fetchSelectedItem(state.marketItemId, state.quantity || 1);
    
    // Fetch addresses from backend
    fetchAddresses();
  }, [userData]);
  
  // Shipping options (courier-branded)
  const shippingOptions = [
    {
      id: "jnt-standard",
      courier: "J&T Express",
      courierService: "standard",
      name: "J&T Express — Standard",
      description: "5–7 business days",
      price: 100,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="3" width="15" height="13"/>
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
          <circle cx="5.5" cy="18.5" r="2.5"/>
          <circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
      )
    },
    {
      id: "jnt-express",
      courier: "J&T Express",
      courierService: "express",
      name: "J&T Express — Express",
      description: "2–3 business days",
      price: 180,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="3" width="15" height="13"/>
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
          <circle cx="5.5" cy="18.5" r="2.5"/>
          <circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
      )
    },
    {
      id: "lbc-standard",
      courier: "LBC",
      courierService: "standard",
      name: "LBC — Standard",
      description: "4–6 business days",
      price: 120,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      )
    },
    {
      id: "lbc-express",
      courier: "LBC",
      courierService: "express",
      name: "LBC — Express",
      description: "2–3 business days",
      price: 250,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      )
    }
  ];
  
  // Effective options (respect seller preferences when available)
  const effectiveShippingOptions = availableShippingOptions.length ? availableShippingOptions : shippingOptions;

  // Group by courier brand for categorized UI
  const groupedByCourier = useMemo(() => {
    const map = {};
    for (const opt of effectiveShippingOptions) {
      if (!map[opt.courier]) map[opt.courier] = [];
      map[opt.courier].push(opt);
    }
    // Stable sort services per brand by price ascending then service
    Object.values(map).forEach(list => list.sort((a, b) => (a.price - b.price) || a.courierService.localeCompare(b.courierService)));
    return map;
  }, [effectiveShippingOptions]);

  // Keep selectedShipping consistent with selected brand
  useEffect(() => {
    const brandOptions = groupedByCourier[selectedCourierBrand] || [];
    if (brandOptions.length === 0) {
      // pick the first available brand if current is empty
      const firstBrand = Object.keys(groupedByCourier)[0];
      if (firstBrand) {
        setSelectedCourierBrand(firstBrand);
        setSelectedShipping(groupedByCourier[firstBrand][0]?.id || selectedShipping);
      }
      return;
    }
    const exists = brandOptions.some(o => o.id === selectedShipping);
    if (!exists && brandOptions[0]) {
      setSelectedShipping(brandOptions[0].id);
    }
  }, [selectedCourierBrand, groupedByCourier]);
  // Payment methods removed - Xendit handles payment selection
  
  // Calculations
  const getSubtotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };
  
  const getShippingCost = () => {
    const option = effectiveShippingOptions.find(opt => opt.id === selectedShipping);
    return option ? option.price : 0;
  };
  
  const getTotal = () => {
    const subtotal = getSubtotal();
    const shipping = getShippingCost();
    return subtotal + shipping;
  };
  
  // Handle address saved from modal
  const handleAddressSaved = (updatedAddresses) => {
    setSavedAddresses(updatedAddresses);
    // Auto-select if it's the first or default address
    const defaultAddr = updatedAddresses.find(addr => addr.isDefault);
    if (defaultAddr) {
      setSelectedAddress(defaultAddr.userAddressId);
    } else if (updatedAddresses.length === 1) {
      setSelectedAddress(updatedAddresses[0].userAddressId);
    }
  };
  
  const handlePlaceOrder = async () => {
    setError("");
    if (!selectedAddress) {
      alert("Please select a delivery address");
      return;
    }
    if (!cartItems.length) return;
    try {
      setIsProcessing(true);
      const item = cartItems[0];
      const shippingFee = getShippingCost();
      const address = savedAddresses.find(addr => addr.userAddressId === selectedAddress);
      
      if (!address) {
        throw new Error('Selected address not found');
      }
      
      // Get shipping method details
      const shippingMethod = effectiveShippingOptions.find(opt => opt.id === selectedShipping);
      
      // Build order data with shipping and contact information
      const orderData = {
        marketItemId: item.marketItemId,
        quantity: item.quantity,
        shippingFee,
        shippingMethod: shippingMethod?.courierService || 'standard',
        courier: shippingMethod?.courier || null,
        courierService: shippingMethod?.courierService || null,
        orderNotes,
        shippingAddress: {
          fullName: address.fullName,
          phone: address.phoneNumber || address.phone,
          addressLine1: address.addressLine1 || address.street,
          addressLine2: address.addressLine2 || '',
          barangayName: address.barangayName || address.barangay,
          cityMunicipalityName: address.cityMunicipalityName || address.city,
          provinceName: address.provinceName || address.province,
          postalCode: address.postalCode,
          landmark: address.landmark || ''
        },
        contactInfo: {
          name: userData?.firstName + ' ' + userData?.lastName,
          email: userData?.email,
          phone: address.phoneNumber || address.phone
        }
      };
      
      // Call the API with complete order information
      const res = await buyNow(orderData);
      const checkoutUrl = res?.data?.checkoutUrl || res?.checkoutUrl;
      
      if (!checkoutUrl) {
        throw new Error('No checkout URL returned');
      }
      
      // Open Xendit payment page in new tab
      window.open(checkoutUrl, '_blank');
      
      // Navigate to orders page to monitor status
      navigate('/marketplace/myorders');
    } catch (error) {
      console.error('Error starting payment:', error);
      
      // Specific handling for seller purchasing their own item
      if (error.message?.includes('Sellers cannot purchase their own items') ||
          error.message?.includes('cannot purchase their own')) {
        setError('As a seller, you cannot purchase your own listed items.');
      } else {
        setError(error.message || 'Failed to start payment. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <div className="checkout-content">
          {/* Left Column - Forms */}
          <div className="checkout-forms">
            {/* Delivery Address Section */}
            <section className="checkout-section">
              <div className="section-header">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <h2 className="section-title">Delivery Address</h2>
              </div>
              
              <div className="address-options">
                {savedAddresses.length > 0 ? (
                  (() => {
                    const addr = savedAddresses.find(a => a.userAddressId === selectedAddress) || savedAddresses[0];
                    return (
                      <div className={`address-card selected`}>
                        <div className="address-radio">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                          </svg>
                        </div>
                        <div className="address-details">
                          <div className="address-name">
                            {addr.fullName}
                            {addr.isDefault && <span className="default-badge">Default</span>}
                          </div>
                          <div className="address-phone">{addr.phoneNumber}</div>
                          <div className="address-text">
                            {addr.addressLine1}
                            {addr.addressLine2 && `, ${addr.addressLine2}`}
                          </div>
                          <div className="address-location">
                            {addr.barangayName}, {addr.cityMunicipalityName}, {addr.provinceName} {addr.postalCode}
                          </div>
                          {addr.landmark && <div className="address-landmark">Near: {addr.landmark}</div>}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="empty-state">
                    No addresses saved yet. Please add an address to continue.
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button 
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => setShowAddressPicker(true)}
                    style={{ flex: 1 }}
                  >
                    Manage Addresses
                  </button>
                </div>
              </div>
            </section>
            
            {/* Shipping Options Section */}
            <section className="checkout-section">
              <div className="section-header">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="1" y="3" width="15" height="13"/>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                  <circle cx="5.5" cy="18.5" r="2.5"/>
                  <circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
                <h2 className="section-title">Shipping Method</h2>
              </div>
              
              <div className="shipping-options">
                {effectiveShippingOptions.length === 0 ? (
                  <div className="museo-message" style={{ padding: '12px' }}>Seller has no supported shipping methods configured for this item. Please contact the seller.</div>
                ) : (
                  Object.entries(groupedByCourier).map(([brand, options]) => {
                    const brandSelected = selectedCourierBrand === brand;
                    const current = options.find(o => o.id === selectedShipping) || options[0];
                    return (
                      <div key={brand} className={`shipping-card ${brandSelected ? 'selected' : ''}`} onClick={() => setSelectedCourierBrand(brand)}>
                        <div className="shipping-radio">
                          {brandSelected && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                          )}
                        </div>
                        <div className="shipping-icon">{current?.icon}</div>
                        <div className="shipping-details" style={{ flex: 1 }}>
                          <div className="shipping-name">{brand}</div>
                          {brandSelected ? (
                            <div style={{ marginTop: 6, display: 'flex', gap: 12, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                              <select
                                className="museo-select"
                                value={selectedShipping && options.some(o => o.id === selectedShipping) ? selectedShipping : current?.id}
                                onChange={(e) => setSelectedShipping(e.target.value)}
                                style={{ minWidth: 220 }}
                              >
                                {options.map(o => (
                                  <option key={o.id} value={o.id}>{`${o.courierService.charAt(0).toUpperCase() + o.courierService.slice(1)} — ₱${o.price}`}</option>
                                ))}
                              </select>
                              <div className="shipping-desc">{current?.description}</div>
                            </div>
                          ) : (
                            <div className="shipping-desc">Select to choose service</div>
                          )}
                        </div>
                        <div className="shipping-price">₱{current?.price}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
            
            {/* Order Notes Section */}
            <section className="checkout-section">
              <div className="section-header">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                <h2 className="section-title">Order Notes</h2>
              </div>
              
              <textarea 
                className="museo-textarea"
                placeholder="Add any special instructions for your order (optional)..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                rows="3"
              />
            </section>
          </div>
          
          {/* Right Column - Order Summary */}
          <div className="checkout-sidebar">
            <div className="order-summary">
              <h2 className="summary-title">Order Summary</h2>
              
              <div className="summary-items">
                {cartItems.length > 0 ? cartItems.map(item => (
                  <div key={item.id} className="summary-item">
                    <img 
                      src={item.image} 
                      alt={item.title}
                      className="item-image"
                    />
                    <div className="item-details">
                      <div className="item-title">{item.title}</div>
                      <div className="item-artist">by {item.artist}</div>
                      <div className="item-quantity">Qty: {item.quantity}</div>
                    </div>
                    <div className="item-price">₱{(item.price * item.quantity).toFixed(2)}</div>
                  </div>
                )) : (
                  <div className="empty-state">Loading item details...</div>
                )}
              </div>
              
              <div className="summary-totals">
                <div className="total-row">
                  <span>Subtotal</span>
                  <span>₱{getSubtotal().toFixed(2)}</span>
                </div>
                <div className="total-row">
                  <span>Shipping</span>
                  <span>₱{getShippingCost().toFixed(2)}</span>
                </div>
                <div className="total-row final">
                  <span>Total</span>
                  <span className="total-amount">₱{getTotal().toFixed(2)}</span>
                </div>
              </div>
              {error && (
                <div className="auth-message error" style={{ marginTop: '12px' }}>
                  {error}
                </div>
              )}
              
              <button 
                className={`btn btn-primary ${isProcessing ? 'processing' : ''}`}
                onClick={handlePlaceOrder}
                disabled={isProcessing || cartItems.length === 0 || !selectedAddress || effectiveShippingOptions.length === 0}
                style={{ width: '100%' }}
              >
                {isProcessing ? (
                  <>
                    <span className="spinner"></span>
                    Processing...
                  </>
                ) : (
                  'Place Order'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Address Picker */}
      {showAddressPicker && (
        <AddressPickerModal
          isOpen={showAddressPicker}
          onClose={() => setShowAddressPicker(false)}
          initialSelectedId={selectedAddress}
          onSelect={(sel) => {
            const id = typeof sel === 'string' ? sel : sel?.userAddressId;
            if (id) setSelectedAddress(id);
            setShowAddressPicker(false);
            // Refresh to reflect any address changes
            fetchAddresses();
          }}
        />
      )}
    </div>
  );
}
