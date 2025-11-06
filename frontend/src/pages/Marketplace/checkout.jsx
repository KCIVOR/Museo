import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";
import AddressModal from "../../components/AddressModal";
import "../../styles/main.css";
import "./css/checkout.css";

const API = import.meta.env.VITE_API_BASE;

export default function Checkout() {
  const navigate = useNavigate();
  const { userData } = useUser();
  
  // State management
  const [cartItems, setCartItems] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedShipping, setSelectedShipping] = useState("standard");
  const [selectedPayment, setSelectedPayment] = useState("card");
  const [orderNotes, setOrderNotes] = useState("");
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
  
  // Load cart and addresses from localStorage
  useEffect(() => {
    // Load cart
    const savedCart = localStorage.getItem('museoCart');
    if (savedCart) {
      const parsedCart = JSON.parse(savedCart);
      if (parsedCart.length === 0) {
        // Redirect to marketplace if cart is empty
        navigate('/marketplace');
      } else {
        setCartItems(parsedCart);
      }
    } else {
      navigate('/marketplace');
    }
    
    // Load saved addresses
    const storedAddresses = localStorage.getItem('museoAddresses');
    if (storedAddresses) {
      const addresses = JSON.parse(storedAddresses);
      setSavedAddresses(addresses);
      
      // Set default address
      const defaultAddr = addresses.find(addr => addr.isDefault);
      if (defaultAddr) {
        setSelectedAddress(defaultAddr.id);
      }
    }
  }, []);
  
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
  
  // Payment methods
  const paymentMethods = [
    {
      id: "card",
      name: "Credit/Debit Card",
      description: "Visa, Mastercard, Amex",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
          <line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
      )
    },
    {
      id: "gcash",
      name: "GCash",
      description: "Digital wallet payment",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
        </svg>
      )
    },
    {
      id: "bank",
      name: "Bank Transfer",
      description: "Direct bank payment",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      )
    },
    {
      id: "cod",
      name: "Cash on Delivery",
      description: "Pay when you receive",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
          <path d="M12 3v4"/>
          <circle cx="12" cy="14" r="3"/>
        </svg>
      )
    }
  ];
  
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
      setSelectedAddress(defaultAddr.id);
    } else if (updatedAddresses.length === 1) {
      setSelectedAddress(updatedAddresses[0].id);
    }
  };
  
  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      alert("Please select a delivery address");
      return;
    }
    
    setIsProcessing(true);
    
    // Simulate order processing
    setTimeout(() => {
      // Clear cart
      localStorage.removeItem('museoCart');
      
      // Redirect to success page or show success message
      alert("Order placed successfully! Order #" + Date.now());
      navigate('/marketplace');
    }, 2000);
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
                    key={addr.id}
                    className={`museo-address-card ${selectedAddress === addr.id ? 'museo-address-card--selected' : ''}`}
                    onClick={() => setSelectedAddress(addr.id)}
                  >
                    <div className="museo-address-radio">
                      {selectedAddress === addr.id && (
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
                      <div className="museo-address-phone">{addr.phoneNumber || addr.phone}</div>
                      <div className="museo-address-text">
                        {addr.addressLine1}
                        {addr.addressLine2 && `, ${addr.addressLine2}`}
                      </div>
                      <div className="museo-address-location">
                        {addr.barangayName || addr.barangay}, {addr.cityMunicipalityName || addr.city}, 
                        {addr.provinceName || addr.province} {addr.postalCode}
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
            
            {/* Payment Method Section */}
            <section className="museo-card museo-card--checkout">
              <div className="museo-card__header museo-checkout-header">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                <h2 className="museo-checkout-title">Payment Method</h2>
              </div>
              
              <div className="museo-card__body museo-payment-options">
                {paymentMethods.map(method => (
                  <div 
                    key={method.id}
                    className={`museo-payment-card ${selectedPayment === method.id ? 'museo-payment-card--selected' : ''}`}
                    onClick={() => setSelectedPayment(method.id)}
                  >
                    <div className="museo-payment-radio">
                      {selectedPayment === method.id && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                      )}
                    </div>
                    <div className="museo-payment-icon">{method.icon}</div>
                    <div className="museo-payment-details">
                      <div className="museo-payment-name">{method.name}</div>
                      <div className="museo-payment-desc">{method.description}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Payment form for card */}
              {selectedPayment === 'card' && (
                <div className="museo-card-details-form">
                  <div className="museo-form-group">
                    <label className="museo-label">Card Number</label>
                    <input type="text" className="museo-input" placeholder="1234 5678 9012 3456" />
                  </div>
                  <div className="museo-form-row">
                    <div className="museo-form-group">
                      <label className="museo-label">Expiry Date</label>
                      <input type="text" className="museo-input" placeholder="MM/YY" />
                    </div>
                    <div className="museo-form-group">
                      <label className="museo-label">CVV</label>
                      <input type="text" className="museo-input" placeholder="123" />
                    </div>
                  </div>
                  <div className="museo-form-group">
                    <label className="museo-label">Cardholder Name</label>
                    <input type="text" className="museo-input" placeholder="John Doe" />
                  </div>
                </div>
              )}
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
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <div className="museo-spinner"></div>
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
      
      {/* Address Modal */}
      <AddressModal 
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onAddressSaved={handleAddressSaved}
      />
    </div>
  );
}
