import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/main.css';
import './css/myorders.css';

const API = import.meta.env.VITE_API_BASE;

export default function MyOrders() {

  const navigate = useNavigate();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // all, pending, paid, shipped, delivered, cancelled
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Fetch orders when component mounts
  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/marketplace/orders/buyer`, {
        credentials: 'include'
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setOrders(result.data || []);
      } else {
        console.error('Failed to fetch orders:', result.error);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (orderId) => {
    try {
      const response = await fetch(`${API}/marketplace/orders/${orderId}`, {
        credentials: 'include'
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSelectedOrder(result.data);
        setShowDetailsModal(true);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    }
  };

  const handlePayNow = async (order) => {
    try {
      // Get payment link for this order
      const response = await fetch(`${API}/marketplace/orders/${order.orderId}/payment-link`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();

      if (response.ok && result.success && result.data.paymentUrl) {
        // Open payment link in new tab
        window.open(result.data.paymentUrl, '_blank');
        alert('Payment link opened in new tab. Please complete your payment.');
      } else {
        alert(result.error || 'Failed to get payment link');
      }
    } catch (error) {
      console.error('Error getting payment link:', error);
      alert('Failed to get payment link');
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    try {
      const response = await fetch(`${API}/marketplace/orders/${orderId}/cancel`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: 'Cancelled by buyer'
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert('Order cancelled successfully');
        fetchOrders();
        setShowDetailsModal(false);
      } else {
        alert(result.error || 'Failed to cancel order');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert('Failed to cancel order');
    }
  };

  const handleMarkAsDelivered = async (orderId) => {
    if (!confirm('Confirm that you have received this order?')) {
      return;
    }

    try {
      const response = await fetch(`${API}/marketplace/orders/${orderId}/deliver`, {
        method: 'PUT',
        credentials: 'include'
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert('Order marked as delivered!');
        fetchOrders();
        setShowDetailsModal(false);
      } else {
        alert(result.error || 'Failed to update order');
      }
    } catch (error) {
      console.error('Error marking as delivered:', error);
      alert('Failed to update order');
    }
  };

  const getFilteredOrders = () => {
    if (activeTab === 'all') return orders;
    
    if (activeTab === 'pending') {
      return orders.filter(order => order.paymentStatus === 'pending');
    }
    
    if (activeTab === 'paid') {
      return orders.filter(order => order.paymentStatus === 'paid' && order.status === 'pending');
    }
    
    if (activeTab === 'shipped') {
      return orders.filter(order => order.status === 'shipped');
    }
    
    if (activeTab === 'delivered') {
      return orders.filter(order => order.status === 'delivered');
    }
    
    if (activeTab === 'cancelled') {
      return orders.filter(order => order.status === 'cancelled');
    }
    
    return orders;
  };

  const getStatusBadge = (order) => {
    if (order.status === 'cancelled') {
      return <span className="museo-badge museo-badge--error museo-badge--interactive">Cancelled</span>;
    }
    
    if (order.paymentStatus === 'pending') {
      return <span className="museo-badge museo-badge--warning museo-badge--interactive">Awaiting Payment</span>;
    }
    
    if (order.paymentStatus === 'paid' && order.status === 'pending') {
      return <span className="museo-badge museo-badge--info museo-badge--interactive">Processing</span>;
    }
    
    if (order.status === 'shipped') {
      return <span className="museo-badge museo-badge--primary museo-badge--interactive">Shipped</span>;
    }
    
    if (order.status === 'delivered') {
      return <span className="museo-badge museo-badge--success museo-badge--interactive">Delivered</span>;
    }
    
    return <span className="museo-badge museo-badge--interactive">{order.status}</span>;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(price);
  };

  const filteredOrders = getFilteredOrders();

  if (loading) {
    return (
      <div className="museo-page">
        <div className="museo-feed museo-container--md">
          <div className="museo-loading-container">
            <div className="museo-loading-spinner"></div>
            <div className="museo-loading-text">Loading orders...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="museo-page">
      <div className="museo-feed museo-container--md">
        {/* Header */}
        <div className="myorders-header">
          <div className="myorders-header__nav">
            <button 
              className="btn-ghost btn-icon"
              onClick={() => navigate('/marketplace')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <h1 className="museo-heading">My Orders</h1>
          </div>
          <p className="myorders-subtitle">Track and manage your orders</p>
        </div>

        {/* Tabs */}
        <div className="museo-tabs museo-tabs--scrollable">
          <button 
            className={`museo-tab ${activeTab === 'all' ? 'museo-tab--active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Orders 
            <span className="museo-tab__badge">{orders.length}</span>
          </button>
          <button 
            className={`museo-tab ${activeTab === 'pending' ? 'museo-tab--active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending Payment
            <span className="museo-tab__badge">{orders.filter(o => o.paymentStatus === 'pending').length}</span>
          </button>
          <button 
            className={`museo-tab ${activeTab === 'paid' ? 'museo-tab--active' : ''}`}
            onClick={() => setActiveTab('paid')}
          >
            Processing
            <span className="museo-tab__badge">{orders.filter(o => o.paymentStatus === 'paid' && o.status === 'pending').length}</span>
          </button>
          <button 
            className={`museo-tab ${activeTab === 'shipped' ? 'museo-tab--active' : ''}`}
            onClick={() => setActiveTab('shipped')}
          >
            Shipped
            <span className="museo-tab__badge">{orders.filter(o => o.status === 'shipped').length}</span>
          </button>
          <button 
            className={`museo-tab ${activeTab === 'delivered' ? 'museo-tab--active' : ''}`}
            onClick={() => setActiveTab('delivered')}
          >
            Delivered
            <span className="museo-tab__badge">{orders.filter(o => o.status === 'delivered').length}</span>
          </button>
        </div>

        {/* Orders List */}
        <div className="myorders-list">
          {filteredOrders.length === 0 ? (
            <div className="myorders-empty">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              <h3>No orders found</h3>
              <p>You haven't placed any orders yet</p>
              <button 
                className="btn-primary"
                onClick={() => navigate('/marketplace')}
              >
                Start Shopping
              </button>
            </div>
          ) : (
            filteredOrders.map(order => (
              <div key={order.orderId} className="museo-card order-card">
                <div className="museo-card__header order-header">
                  <div className="order-info">
                    <span className="order-id">Order #{order.orderId.slice(0, 8)}</span>
                    <span className="order-date">{formatDate(order.createdAt)}</span>
                  </div>
                  {getStatusBadge(order)}
                </div>

                <div className="museo-card__body">
                  <div className="order-summary">
                    <div className="order-amount">
                      <span className="order-label">Total Amount:</span>
                      <span className="order-value">{formatPrice(order.totalAmount)}</span>
                    </div>
                    {order.paymentMethodUsed && (
                      <div className="order-payment">
                        <span className="order-label">Payment:</span>
                        <span className="order-value">{order.paymentMethodUsed}</span>
                      </div>
                    )}
                  </div>

                  {order.shippingAddress && (
                    <div className="order-shipping">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      <span>
                        {order.shippingAddress.street}, {order.shippingAddress.barangay}, 
                        {order.shippingAddress.city}, {order.shippingAddress.province}
                      </span>
                    </div>
                  )}
                </div>

                <div className="museo-card__footer order-actions">
                  <button 
                    className="btn-secondary btn-sm"
                    onClick={() => handleViewDetails(order.orderId)}
                  >
                    View Details
                  </button>
                  
                  {order.paymentStatus === 'pending' && order.status !== 'cancelled' && (
                    <>
                      <button 
                        className="btn-primary btn-sm"
                        onClick={() => handlePayNow(order)}
                      >
                        💳 Pay Now
                      </button>
                      <button 
                        className="btn-danger btn-sm"
                        onClick={() => handleCancelOrder(order.orderId)}
                      >
                        Cancel Order
                      </button>
                    </>
                  )}
                  
                  {order.status === 'shipped' && (
                    <button 
                      className="btn-success btn-sm"
                      onClick={() => handleMarkAsDelivered(order.orderId)}
                    >
                      Mark as Received
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="museo-modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="museo-modal museo-modal--lg" onClick={(e) => e.stopPropagation()}>
            <div className="museo-modal__header">
              <h2 className="museo-modal__title">Order Details</h2>
              <button 
                className="museo-modal__close"
                onClick={() => setShowDetailsModal(false)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="museo-modal__body">
              {/* Order Info */}
              <div className="order-details-section">
                <h3 className="section-title">Order Information</h3>
                <div className="order-details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Order ID:</span>
                    <span className="detail-value">{selectedOrder.orderId}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status:</span>
                    <span className="detail-value">{getStatusBadge(selectedOrder)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Order Date:</span>
                    <span className="detail-value">{formatDate(selectedOrder.createdAt)}</span>
                  </div>
                  {selectedOrder.paidAt && (
                    <div className="detail-item">
                      <span className="detail-label">Paid At:</span>
                      <span className="detail-value">{formatDate(selectedOrder.paidAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className="order-details-section">
                <h3 className="section-title">Order Items</h3>
                <div className="order-items-list">
                  {selectedOrder.items?.map((item, index) => (
                    <div key={index} className="order-item">
                      <img 
                        src={item.itemImage || '/assets/default-art.jpg'} 
                        alt={item.itemTitle}
                        className="order-item__image"
                      />
                      <div className="order-item__details">
                        <h4>{item.itemTitle}</h4>
                        <p>Quantity: {item.quantity}</p>
                        <p className="order-item__price">{formatPrice(item.price)} each</p>
                      </div>
                      <div className="order-item__total">
                        {formatPrice(item.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address */}
              {selectedOrder.shippingAddress && (
                <div className="order-details-section">
                  <h3 className="section-title">Shipping Address</h3>
                  <div className="shipping-details">
                    <p><strong>{selectedOrder.shippingAddress.fullName}</strong></p>
                    <p>{selectedOrder.shippingAddress.phone}</p>
                    <p>{selectedOrder.shippingAddress.street}</p>
                    <p>{selectedOrder.shippingAddress.barangay}, {selectedOrder.shippingAddress.city}</p>
                    <p>{selectedOrder.shippingAddress.province} {selectedOrder.shippingAddress.postalCode}</p>
                  </div>
                </div>
              )}

              {/* Payment Summary */}
              <div className="order-details-section">
                <h3 className="section-title">Payment Summary</h3>
                <div className="payment-summary">
                  <div className="summary-row">
                    <span>Subtotal:</span>
                    <span>{formatPrice(selectedOrder.totalAmount)}</span>
                  </div>
                  {selectedOrder.paymentFee > 0 && (
                    <div className="summary-row">
                      <span>Payment Fee:</span>
                      <span>{formatPrice(selectedOrder.paymentFee)}</span>
                    </div>
                  )}
                  <div className="summary-row summary-total">
                    <span>Total:</span>
                    <span>{formatPrice(selectedOrder.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="museo-modal__footer">
              <button 
                className="btn-secondary"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </button>
              
              {selectedOrder.paymentStatus === 'pending' && selectedOrder.status !== 'cancelled' && (
                <button 
                  className="btn-danger"
                  onClick={() => handleCancelOrder(selectedOrder.orderId)}
                >
                  Cancel Order
                </button>
              )}
              
              {selectedOrder.status === 'shipped' && (
                <button 
                  className="btn-success"
                  onClick={() => handleMarkAsDelivered(selectedOrder.orderId)}
                >
                  Mark as Received
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
