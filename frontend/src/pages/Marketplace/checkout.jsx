import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";
import AddressModal from "../../components/AddressModal";
import "../../styles/main.css";
import "./css/checkout.css";

const API = import.meta.env.VITE_API_BASE;
import { buyNow } from "../../api/orders";

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useUser();
  
  // State management (single-item Buy Now)
  const [cartItems, setCartItems] = useState([]); // will hold one item for Buy Now
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedShipping, setSelectedShipping] = useState("standard");
  // Payment method removed - Xendit handles this
  const [orderNotes, setOrderNotes] = useState("None"); // Default to 'None' for NOT NULL constraint
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  
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
        image: item.images?.[0] || '/assets/default-art.jpg',
        artist: item.sellerProfiles?.shopName || 'Unknown Shop',
        sellerProfileId: item.sellerProfileId
      }]);
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
      navigate('/login');
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
  
  // Shipping options
  const shippingOptions = [
    {
      id: "standard",
      name: "Standard Shipping",
      description: "5-7 business days",
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
      id: "express",
      name: "Express Shipping",
      description: "2-3 business days",
      price: 250,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      )
    },
    {
      id: "priority",
      name: "Priority Shipping",
      description: "Next business day",
      price: 500,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      )
    }
  ];
  // Payment methods removed - Xendit handles payment selection
  
  // Calculations
  const getSubtotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };
  
  const getShippingCost = () => {
    const option = shippingOptions.find(opt => opt.id === selectedShipping);
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
    if (!selectedAddress) {
      alert("Please select a delivery address");
      return;
    }
    if (!cartItems.length) return;
    
    setIsProcessing(true);
    try {
      const item = cartItems[0];
      const shippingFee = getShippingCost();
      const address = savedAddresses.find(addr => addr.userAddressId === selectedAddress);
      
      if (!address) {
        throw new Error('Selected address not found');
      }
      
      // Get shipping method details
      const shippingMethod = shippingOptions.find(opt => opt.id === selectedShipping);
      
      // Build order data with shipping and contact information
      const orderData = {
        marketItemId: item.marketItemId,
        quantity: item.quantity,
        shippingFee,
        shippingMethod: selectedShipping,
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
    <div className="museo-checkout-page">
      <div className="museo-checkout-container">
        <div className="museo-checkout-content">
          {/* Left Column - Forms */}
          <div className="museo-checkout-forms">
            {/* Delivery Address Section */}
            <section className="museo-card museo-card--checkout">
              <div className="museo-card__header museo-checkout-header">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <h2 className="museo-checkout-title">Delivery Address</h2>
              </div>
              
              <div className="museo-card__body museo-address-options">
                {savedAddresses.map(addr => (
                  <div 
                    key={addr.userAddressId}
                    className={`museo-address-card ${selectedAddress === addr.userAddressId ? 'museo-address-card--selected' : ''}`}
                    onClick={() => setSelectedAddress(addr.userAddressId)}
                  >
                    <div className="museo-address-radio">
                      {selectedAddress === addr.userAddressId && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                      )}
                    </div>
                    <div className="museo-address-details">
                      <div className="museo-address-name">
                        {addr.fullName}
                        {addr.isDefault && <span className="museo-badge museo-badge--gold">Default</span>}
                        {addr.addressType && <span className="museo-badge museo-badge--secondary">{addr.addressType}</span>}
                      </div>
                      <div className="museo-address-phone">{addr.phoneNumber}</div>
                      <div className="museo-address-text">
                        {addr.addressLine1}
                        {addr.addressLine2 && `, ${addr.addressLine2}`}
                      </div>
                      <div className="museo-address-location">
                        {addr.barangayName}, {addr.cityMunicipalityName}, 
                        {addr.provinceName} {addr.postalCode}
                      </div>
                      {addr.landmark && <div className="museo-address-landmark">Near: {addr.landmark}</div>}
                    </div>
                    <button className="museo-address-edit btn btn-ghost btn-sm">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  </div>
                ))}
                
                <button 
                  className="btn btn-secondary btn-block"
                  type="button"
                  onClick={() => setShowAddressModal(true)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add New Address
                </button>
              </div>
            </section>
            
            {/* Shipping Options Section */}
            <section className="museo-card museo-card--checkout">
              <div className="museo-card__header museo-checkout-header">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="3" width="15" height="13"/>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                  <circle cx="5.5" cy="18.5" r="2.5"/>
                  <circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
                <h2 className="museo-checkout-title">Shipping Method</h2>
              </div>
              
              <div className="museo-card__body museo-shipping-options">
                {shippingOptions.map(option => (
                  <div 
                    key={option.id}
                    className={`museo-shipping-card ${selectedShipping === option.id ? 'museo-shipping-card--selected' : ''}`}
                    onClick={() => setSelectedShipping(option.id)}
                  >
                    <div className="museo-shipping-radio">
                      {selectedShipping === option.id && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                      )}
                    </div>
                    <div className="museo-shipping-icon">{option.icon}</div>
                    <div className="museo-shipping-details">
                      <div className="museo-shipping-name">{option.name}</div>
                      <div className="museo-shipping-desc">{option.description}</div>
                    </div>
                    <div className="museo-shipping-price">₱{option.price}</div>
                  </div>
                ))}
              </div>
            </section>
            
            {/* Order Notes Section */}
            <section className="museo-card museo-card--checkout">
              <div className="museo-card__header museo-checkout-header">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                <h2 className="museo-checkout-title">Order Notes (Optional)</h2>
              </div>
              
              <div className="museo-card__body">
                <textarea 
                className="museo-textarea"
                placeholder="Add any special instructions for your order..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                rows="4"
                />
              </div>
            </section>
          </div>
          
          {/* Right Column - Order Summary */}
          <div className="museo-checkout-sidebar">
            <div className="museo-card museo-card--summary">
              <h2 className="museo-summary-title">Order Summary</h2>
              
              <div className="museo-summary-items">
                {cartItems.map(item => (
                  <div key={item.id} className="museo-summary-item">
                    <img 
                      src={item.image} 
                      alt={item.title}
                      className="museo-item-image"
                    />
                    <div className="museo-item-details">
                      <div className="museo-item-title">{item.title}</div>
                      <div className="museo-item-artist">by {item.artist}</div>
                      <div className="museo-item-quantity">Qty: {item.quantity}</div>
                    </div>
                    <div className="museo-item-price">₱{(item.price * item.quantity).toFixed(2)}</div>
                  </div>
                ))}
              </div>
              
              <div className="museo-summary-totals">
                <div className="museo-total-row">
                  <span>Subtotal</span>
                  <span>₱{getSubtotal().toFixed(2)}</span>
                </div>
                <div className="museo-total-row">
                  <span>Shipping</span>
                  <span>₱{getShippingCost().toFixed(2)}</span>
                </div>
                <div className="museo-total-row museo-total-row--final">
                  <span>Total</span>
                  <span className="museo-total-amount">₱{getTotal().toFixed(2)}</span>
                </div>
              </div>
              
              <button 
                className={`btn btn-primary btn-block ${isProcessing ? 'museo-btn--processing' : ''}`}
                onClick={handlePlaceOrder}
                disabled={isProcessing || cartItems.length === 0}
              >
                {isProcessing ? (
                  <>
                    <div className="museo-spinner"></div>
                    Processing...
                  </>
                ) : (
                  'Pay Now'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Address Modal */}
      <AddressModal 
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onAddressSaved={handleAddressSaved}
      />
    </div>
  );
}
