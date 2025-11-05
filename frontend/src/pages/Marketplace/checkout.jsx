import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import '../../styles/main.css';
import './css/checkout.css';

export default function Checkout() {
  const navigate = useNavigate();
  const { userData } = useUser();
  
  // Get cart items from localStorage
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Address management
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  
  // Shipping and payment
  const [selectedShipping, setSelectedShipping] = useState('jnt');
  const [selectedPayment, setSelectedPayment] = useState('cod');
  
  // Form state for new address
  const [newAddress, setNewAddress] = useState({
    label: '',
    fullName: userData?.name || '',
    email: userData?.email || '',
    phone: '',
    address: '',
    barangay: '',
    city: '',
    province: '',
    postalCode: '',
    isDefault: false
  });
  
  const [orderNotes, setOrderNotes] = useState('');
  const [errors, setErrors] = useState({});
  
  // Load cart items and addresses on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('museoCart');
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
    
    // Load saved addresses
    const addresses = localStorage.getItem('museoAddresses');
    if (addresses) {
      const parsed = JSON.parse(addresses);
      setSavedAddresses(parsed);
      const defaultAddr = parsed.find(addr => addr.isDefault);
      if (defaultAddr) setSelectedAddressId(defaultAddr.id);
    }
  }, []);
  
  // Calculate totals
  const getSubtotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };
  
  const getShipping = () => {
    if (cartItems.length === 0) return 0;
    
    // Different shipping rates
    const shippingRates = {
      jnt: 150,
      lalamove: 200,
      lbc: 180,
      grab: 250
    };
    
    return shippingRates[selectedShipping] || 150;
  };
  
  const getTotal = () => {
    return getSubtotal() + getShipping();
  };
  
  // Shipping options
  const shippingOptions = [
    { id: 'jnt', name: 'J&T Express', time: '2-3 days', price: 150, logo: '🚚' },
    { id: 'lalamove', name: 'Lalamove', time: 'Same day', price: 200, logo: '🛵' },
    { id: 'lbc', name: 'LBC Express', time: '3-5 days', price: 180, logo: '📦' },
    { id: 'grab', name: 'GrabExpress', time: 'Same day', price: 250, logo: '🚗' }
  ];
  
  // Payment options
  const paymentOptions = [
    { id: 'cod', name: 'Cash on Delivery', icon: '💵' },
    { id: 'gcash', name: 'GCash', icon: '📱' },
    { id: 'card', name: 'Credit/Debit Card', icon: '💳' },
    { id: 'maya', name: 'Maya', icon: '💰' }
  ];
  
  // Handle add address
  const handleAddAddress = () => {
    const addressErrors = {};
    
    if (!newAddress.fullName.trim()) addressErrors.fullName = 'Full name is required';
    if (!newAddress.phone.trim()) addressErrors.phone = 'Phone is required';
    if (!newAddress.address.trim()) addressErrors.address = 'Address is required';
    if (!newAddress.city.trim()) addressErrors.city = 'City is required';
    if (!newAddress.province.trim()) addressErrors.province = 'Province is required';
    
    if (Object.keys(addressErrors).length > 0) {
      setErrors(addressErrors);
      return;
    }
    
    const addressToAdd = {
      id: Date.now(),
      ...newAddress,
      label: newAddress.label || 'Home'
    };
    
    let updatedAddresses = [...savedAddresses, addressToAdd];
    if (savedAddresses.length === 0 || newAddress.isDefault) {
      updatedAddresses = updatedAddresses.map(addr => ({
        ...addr,
        isDefault: addr.id === addressToAdd.id
      }));
    }
    
    setSavedAddresses(updatedAddresses);
    localStorage.setItem('museoAddresses', JSON.stringify(updatedAddresses));
    setSelectedAddressId(addressToAdd.id);
    
    // Reset form
    setNewAddress({
      label: '',
      fullName: userData?.name || '',
      email: userData?.email || '',
      phone: '',
      address: '',
      barangay: '',
      city: '',
      province: '',
      postalCode: '',
      isDefault: false
    });
    
    setIsAddingNewAddress(false);
    setShowAddressModal(false);
    setErrors({});
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newErrors = {};
    if (!selectedAddressId) newErrors.address = 'Please select a delivery address';
    if (!selectedShipping) newErrors.shipping = 'Please select shipping method';
    if (!selectedPayment) newErrors.payment = 'Please select payment method';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setLoading(true);
    
    // Simulate order processing
    setTimeout(() => {
      // Clear cart
      localStorage.removeItem('museoCart');
      setCartItems([]);
      
      // Navigate to success page or show success message
      alert('Order placed successfully! Order ID: #' + Date.now());
      navigate('/marketplace/success');
      setLoading(false);
    }, 1500);
  };
  
  const selectedAddress = savedAddresses.find(addr => addr.id === selectedAddressId);
  
  // Empty cart state
  if (cartItems.length === 0) {
    return (
      <div className="checkout-page">
        <div className="checkout-empty">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M5 7h14l-1 10H6L5 7ZM5 7l-1-3h3m1 0h8m0 0h3l-1 3"/>
            <circle cx="9" cy="20" r="1"/>
            <circle cx="15" cy="20" r="1"/>
          </svg>
          <h2>Your cart is empty</h2>
          <p>Add some artworks to your cart before checking out</p>
          <button 
            className="btn-primary btn-museo"
            onClick={() => navigate('/marketplace')}
          >
            Browse Marketplace
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="checkout-page">
      <div className="checkout-content">
        <div className="checkout-main">
          <div className="checkout-header">
            <button 
              className="checkout-back"
              onClick={() => navigate(-1)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back
            </button>
            <h1>Checkout</h1>
          </div>
          
          <form onSubmit={handleSubmit} className="checkout-form-single">
            {/* Address Picker Section */}
            <section className="checkout-section">
              <div className="section-header">
                <h2 className="section-title">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                  Delivery Address & Contact
                </h2>
                <button 
                  type="button"
                  className="btn-museo btn-secondary"
                  onClick={() => setShowAddressModal(true)}
                >
                  {selectedAddress ? 'Change' : 'Add Address'}
                </button>
              </div>
              
              {selectedAddress ? (
                <div className="selected-address-card">
                  <div className="address-header">
                    <div className="address-info">
                      <strong>{selectedAddress.fullName}</strong>
                      <span className="address-phone">{selectedAddress.phone}</span>
                      {selectedAddress.isDefault && <span className="address-badge">Default</span>}
                    </div>
                  </div>
                  <p className="address-details">
                    {selectedAddress.address}
                    {selectedAddress.barangay && `, ${selectedAddress.barangay}`}
                    <br />
                    {selectedAddress.city}, {selectedAddress.province}
                    {selectedAddress.postalCode && ` ${selectedAddress.postalCode}`}
                  </p>
                  {selectedAddress.email && (
                    <p className="address-email">📧 {selectedAddress.email}</p>
                  )}
                </div>
              ) : (
                <div className="no-address-selected">
                  <p>No delivery address selected. Please add an address to continue.</p>
                </div>
              )}
              
              {errors.address && <span className="error-message">{errors.address}</span>}
            </section>
            
            {/* Shipping Options */}
            <section className="checkout-section">
              <h2 className="section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
                  <path d="M15 18H9"/>
                  <path d="M15 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 13.52 8H10"/>
                  <circle cx="17" cy="18" r="2"/>
                  <circle cx="7" cy="18" r="2"/>
                </svg>
                Shipping Method
              </h2>
              
              <div className="shipping-options">
                {shippingOptions.map(option => (
                  <label 
                    key={option.id} 
                    className={`shipping-option ${selectedShipping === option.id ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="shipping"
                      value={option.id}
                      checked={selectedShipping === option.id}
                      onChange={(e) => setSelectedShipping(e.target.value)}
                    />
                    <div className="shipping-logo">{option.logo}</div>
                    <div className="shipping-info">
                      <strong>{option.name}</strong>
                      <span className="shipping-time">{option.time}</span>
                    </div>
                    <div className="shipping-price">₱{option.price}</div>
                  </label>
                ))}
              </div>
              
              {errors.shipping && <span className="error-message">{errors.shipping}</span>}
            </section>
            
            {/* Payment Method */}
            <section className="checkout-section">
              <h2 className="section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                Payment Method
              </h2>
              
              <div className="payment-options">
                {paymentOptions.map(option => (
                  <label 
                    key={option.id} 
                    className={`payment-option ${selectedPayment === option.id ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={option.id}
                      checked={selectedPayment === option.id}
                      onChange={(e) => setSelectedPayment(e.target.value)}
                    />
                    <div className="payment-icon">{option.icon}</div>
                    <div className="payment-name">{option.name}</div>
                  </label>
                ))}
              </div>
              
              {errors.payment && <span className="error-message">{errors.payment}</span>}
            </section>
            
            {/* Order Notes */}
            <section className="checkout-section">
              <h2 className="section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3h18v18H3zM8 12h8M8 8h8M8 16h5"/>
                </svg>
                Order Notes (Optional)
              </h2>
              
              <div className="form-group">
                <textarea
                  id="notes"
                  name="notes"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Special delivery instructions?"
                  rows="4"
                />
              </div>
            </section>
            
            {/* Order Summary */}
            <section className="checkout-section order-summary-section">
              <h2 className="section-title">Order Summary</h2>
              
              <div className="summary-items">
                {cartItems.map(item => (
                  <div key={item.id} className="summary-item">
                    <img src={item.image} alt={item.title} />
                    <div className="summary-item-details">
                      <h4>{item.title}</h4>
                      <p>{item.artist}</p>
                      <p className="quantity">Qty: {item.quantity}</p>
                    </div>
                    <div className="summary-item-price">
                      ₱{(item.price * item.quantity).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="summary-totals">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>₱{getSubtotal().toLocaleString()}</span>
                </div>
                <div className="summary-row">
                  <span>Shipping</span>
                  <span>₱{getShipping().toLocaleString()}</span>
                </div>
                <div className="summary-row total">
                  <span>Total</span>
                  <span>₱{getTotal().toLocaleString()}</span>
                </div>
              </div>
              
              <button 
                type="submit"
                className="btn-primary btn-museo btn-block"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Processing...
                  </>
                ) : (
                  'Place Order'
                )}
              </button>
            </section>
          </form>
        </div>
      </div>
    </div>
  );
}