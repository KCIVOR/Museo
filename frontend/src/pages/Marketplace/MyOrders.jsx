import { useState, useEffect } from 'react';
import AlertModal from '../Shared/AlertModal.jsx';
import ConfirmModal from '../Shared/ConfirmModal.jsx';
import ReturnRequestModal from './components/ReturnRequestModal.jsx';
import ReturnDetailsModal from './components/ReturnDetailsModal.jsx';
import OrderDetailsModal from './components/OrderDetailsModal.jsx';
import { getBuyerReturns } from '../../api/returns.js';
import { useNavigate } from 'react-router-dom';
import '../../styles/main.css';
import './css/myorders.css';

const API = import.meta.env.VITE_API_BASE;

export default function MyOrders() {

  const navigate = useNavigate();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // all, pending, paid, shipped, delivered, cancelled, refunded
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [buyerReturns, setBuyerReturns] = useState([]);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnModalOrder, setReturnModalOrder] = useState(null);
  const [showReturnDetails, setShowReturnDetails] = useState(false);
  const [selectedReturnId, setSelectedReturnId] = useState(null);

  // Museo-themed alert modal
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState('Notice');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertOkText, setAlertOkText] = useState('OK');
  const [alertAfterOk, setAlertAfterOk] = useState(null);
  const showAlert = (message, title = 'Notice', okText = 'OK') => {
    setAlertMessage(message);
    setAlertTitle(title);
    setAlertOkText(okText);
    setAlertOpen(true);
  };

  // Confirm modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('Confirm');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmOkText, setConfirmOkText] = useState('Confirm');
  const [confirmCancelText, setConfirmCancelText] = useState('Cancel');
  const [confirmAction, setConfirmAction] = useState(null); // 'pay' | 'check' | 'cancel' | 'deliver'
  const [confirmPayload, setConfirmPayload] = useState(null);
  const askConfirm = ({ title, message, okText = 'Confirm', cancelText = 'Cancel', action, payload }) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmOkText(okText);
    setConfirmCancelText(cancelText);
    setConfirmAction(action);
    setConfirmPayload(payload);
    setConfirmOpen(true);
  };

  // Fetch orders when component mounts
  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    // Load buyer returns for quick mapping
    (async () => {
      try {
        const res = await getBuyerReturns();
        setBuyerReturns(res.data || []);
      } catch (e) {
        console.warn('Failed to load buyer returns');
      }
    })();
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

  const getReturnByOrder = (orderId) => buyerReturns.find(r => r.orderId === orderId);
  const openReturnModal = (order) => { setReturnModalOrder(order); setShowReturnModal(true); };
  const openReturnDetails = (returnId) => { setSelectedReturnId(returnId); setShowReturnDetails(true); };
  const onReturnSubmitted = async () => {
    // Refresh returns and orders
    try {
      const res = await getBuyerReturns();
      setBuyerReturns(res.data || []);
    } catch {}
    fetchOrders();
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

  const doPayNow = async (order) => {
    try {
      const response = await fetch(`${API}/marketplace/orders/${order.orderId}/payment-link`, {
        method: 'GET',
        credentials: 'include'
      });
      const result = await response.json();
      if (response.ok && result.success && result.data.paymentUrl) {
        window.open(result.data.paymentUrl, '_blank');
        showAlert('Payment link opened in a new tab. Please complete your payment.', 'Payment');
      } else {
        showAlert(result.error || 'Failed to get payment link', 'Error');
      }
    } catch (error) {
      console.error('Error getting payment link:', error);
      showAlert('Failed to get payment link', 'Error');
    }
  };
  const handlePayNow = (order) => {
    const shortId = (order?.orderId || '').slice(0, 8).toUpperCase();
    askConfirm({
      title: 'Open Payment',
      message: `Open the payment page for Order #${shortId} in a new tab?`,
      okText: 'Open',
      cancelText: 'Cancel',
      action: 'pay',
      payload: order,
    });
  };

  const doCheckPaymentStatus = async (orderId) => {
    try {
      const response = await fetch(`${API}/marketplace/orders/${orderId}/check-payment`, { method: 'GET', credentials: 'include' });
      const result = await response.json();
      if (response.ok && result.success) {
        setAlertAfterOk(() => () => { fetchOrders(); });
        showAlert('Payment confirmed! Your order has been paid. The seller will process it soon.', 'Payment');
      } else {
        showAlert(result.message || 'Payment not yet completed. Please complete payment first.', 'Payment');
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      showAlert('Failed to check payment status. Please try again.', 'Error');
    }
  };
  const handleCheckPaymentStatus = (orderId) => {
    const shortId = (orderId || '').slice(0, 8).toUpperCase();
    askConfirm({
      title: 'Check Payment Status',
      message: `Check payment status for Order #${shortId}?`,
      okText: 'Check',
      cancelText: 'Close',
      action: 'check',
      payload: orderId,
    });
  };

  const doCancelOrder = async (orderId) => {
    try {
      const response = await fetch(`${API}/marketplace/orders/${orderId}/cancel`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by buyer' })
      });
      const result = await response.json();
      if (response.ok && result.success) {
        // Determine group context to tailor message
        const orderToCancel = orders.find(o => o.orderId === orderId);
        const isPartOfGroup = !!orderToCancel?.paymentGroupId;
        const successMessage = isPartOfGroup
          ? 'Order cancelled successfully. The payment total has been updated for remaining orders.'
          : 'Order cancelled successfully';
        setAlertAfterOk(() => () => { fetchOrders(); setShowDetailsModal(false); });
        showAlert(successMessage, 'Order');
      } else {
        showAlert(result.error || 'Failed to cancel order', 'Error');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      showAlert('Failed to cancel order', 'Error');
    }
  };
  const handleCancelOrder = (orderId) => {
    const orderToCancel = orders.find(o => o.orderId === orderId);
    const isPartOfGroup = !!orderToCancel?.paymentGroupId;
    const msg = isPartOfGroup
      ? 'Cancel this order? The payment total will be updated to exclude this order amount.'
      : 'Are you sure you want to cancel this order?';
    const shortId = (orderId || '').slice(0, 8).toUpperCase();
    askConfirm({
      title: `Cancel Order #${shortId}`,
      message: msg,
      okText: 'Cancel Order',
      cancelText: 'Keep Order',
      action: 'cancel',
      payload: orderId,
    });
  };

  const doMarkAsDelivered = async (orderId) => {
    try {
      const response = await fetch(`${API}/marketplace/orders/${orderId}/deliver`, { method: 'PUT', credentials: 'include' });
      const result = await response.json();
      if (response.ok && result.success) {
        setAlertAfterOk(() => () => { fetchOrders(); setShowDetailsModal(false); });
        showAlert('Order marked as delivered!', 'Delivery');
      } else {
        showAlert(result.error || 'Failed to update order', 'Error');
      }
    } catch (error) {
      console.error('Error marking as delivered:', error);
      showAlert('Failed to update order', 'Error');
    }
  };
  const handleMarkAsDelivered = (orderId) => {
    const shortId = (orderId || '').slice(0, 8).toUpperCase();
    askConfirm({
      title: 'Mark as Received',
      message: `Confirm that you have received Order #${shortId}?`,
      okText: 'Mark Received',
      cancelText: 'Not Yet',
      action: 'deliver',
      payload: orderId,
    });
  };

  const handleConfirm = async () => {
    const action = confirmAction;
    const payload = confirmPayload;
    setConfirmOpen(false);
    setConfirmAction(null);
    setConfirmPayload(null);
    try {
      if (action === 'pay') await doPayNow(payload);
      else if (action === 'check') await doCheckPaymentStatus(payload);
      else if (action === 'cancel') await doCancelOrder(payload);
      else if (action === 'deliver') await doMarkAsDelivered(payload);
    } catch (_) {}
  };

  const getFilteredOrders = () => {
    if (activeTab === 'all') return orders;
    
    if (activeTab === 'pending') {
      return orders.filter(order => order.paymentStatus === 'pending' && order.status !== 'cancelled');
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
    
    if (activeTab === 'refunded') {
      return orders.filter(order => order.status === 'returned' || order.returnStatus === 'approved' || order.returnStatus === 'refunded');
    }
    
    return orders;
  };

  const getStatusBadge = (order) => {
    if (order.status === 'cancelled') {
      return (
        <span className="museo-badge museo-badge--error museo-badge--interactive">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          Cancelled
        </span>
      );
    }
    
    if (order.status === 'returned' || order.returnStatus === 'approved' || order.returnStatus === 'refunded') {
      return (
        <span className="museo-badge museo-badge--info museo-badge--interactive">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 14l-5-5 5-5"/>
            <path d="M20 20v-7a4 4 0 0 0-4-4H5"/>
          </svg>
          Refunded
        </span>
      );
    }
    
    if (order.paymentStatus === 'pending') {
      return (
        <span className="museo-badge museo-badge--warning museo-badge--interactive">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="6" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Awaiting Payment
        </span>
      );
    }
    
    if (order.paymentStatus === 'paid' && order.status === 'pending') {
      return (
        <span className="museo-badge museo-badge--info museo-badge--interactive">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
          Processing
        </span>
      );
    }
    
    if (order.status === 'shipped') {
      return (
        <span className="museo-badge museo-badge--info museo-badge--interactive">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="3" width="15" height="13"/>
            <path d="M16 8h5l3 3v5h-2"/>
            <circle cx="5.5" cy="18.5" r="2.5"/>
            <circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
          Shipped
        </span>
      );
    }
    
    if (order.status === 'delivered') {
      return (
        <span className="museo-badge museo-badge--success museo-badge--interactive">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          Delivered
        </span>
      );
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
    // Handle undefined, null, NaN, or non-numeric values
    if (price === undefined || price === null || isNaN(price) || typeof price !== 'number') {
      return '₱0.00';
    }
    
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
        <div className="museo-tabs museo-tabs--full">
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
            <span className="museo-tab__badge">{orders.filter(o => o.paymentStatus === 'pending' && o.status !== 'cancelled').length}</span>
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
          <button 
            className={`museo-tab ${activeTab === 'cancelled' ? 'museo-tab--active' : ''}`}
            onClick={() => setActiveTab('cancelled')}
          >
            Cancelled
            <span className="museo-tab__badge">{orders.filter(o => o.status === 'cancelled').length}</span>
          </button>
          <button 
            className={`museo-tab ${activeTab === 'refunded' ? 'museo-tab--active' : ''}`}
            onClick={() => setActiveTab('refunded')}
          >
            Refunded
            <span className="museo-tab__badge">{orders.filter(o => o.status === 'returned' || o.returnStatus === 'approved' || o.returnStatus === 'refunded').length}</span>
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
                className="btn btn-primary btn-sm"
                onClick={() => navigate('/marketplace')}
              >
                Start Shopping
              </button>
            </div>
          ) : (
            filteredOrders.map(order => {
              const statusInfo = order.status === 'pending' && order.paymentStatus === 'pending' 
                ? { label: 'Pending', icon: '⏳' }
                : order.status === 'pending' && order.paymentStatus === 'paid'
                ? { label: 'Processing', icon: '📦' }
                : order.status === 'shipped'
                ? { label: 'Shipped', icon: '🚚' }
                : order.status === 'delivered'
                ? { label: 'Delivered', icon: '✅' }
                : order.status === 'cancelled'
                ? { label: 'Cancelled', icon: '❌' }
                : { label: order.status, icon: '📋' };

              return (
                <div key={order.orderId} className="order-card" data-status={order.status}>
                  {/* Order Image Section */}
                  <div className="order-image-section">
                    {order.items && order.items[0]?.image ? (
                      <img 
                        src={order.items[0].image} 
                        alt={order.items[0].itemTitle || order.items[0].title}
                        className="order-image"
                      />
                    ) : (
                      <div className="order-image-placeholder">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                          <line x1="12" y1="22.08" x2="12" y2="12"/>
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Order Info Section */}
                  <div className="order-info-section">
                    <div className="order-header">
                      {getStatusBadge(order)}
                      <span className="order-id">#{order.orderId.slice(0, 8).toUpperCase()}</span>
                      {order.trackingNumber && (
                        <span className="order-tracking">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="1" y="3" width="15" height="13"/>
                            <path d="M16 8h5l3 3v5h-2"/>
                            <circle cx="5.5" cy="18.5" r="2.5"/>
                            <circle cx="18.5" cy="18.5" r="2.5"/>
                          </svg>
                          {order.trackingNumber}
                        </span>
                      )}
                    </div>

                    <div className="order-items-info">
                      {order.items && order.items[0] && (
                        <>
                          <div className="order-item-title">
                            {order.items[0].itemTitle || order.items[0].title || 'Artwork'}
                            {order.items.length > 1 && ` + ${order.items.length - 1} more`}
                          </div>
                          <div className="order-item-details">
                            {order.items[0].quantity}x 
                            {order.items[0].medium && ` • ${order.items[0].medium}`}
                            {order.items[0].dimensions && ` • ${order.items[0].dimensions}`}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="order-meta">
                      <span className="order-date">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        {formatDate(order.createdAt)}
                      </span>
                      {order.sellerCount && order.sellerCount > 1 && (
                        <span className="order-seller-count">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                          </svg>
                          {order.sellerCount} sellers
                        </span>
                      )}
                      {order.itemCount && (
                        <span className="order-item-count">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                          </svg>
                          {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Order Action Section */}
                  <div className="order-action-section">
                    <div className="order-total">
                      <div className="order-total-label">Total</div>
                      <div className="order-total-amount">{formatPrice(order.totalAmount)}</div>
                    </div>
                    
                    <div className="order-buttons">
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleViewDetails(order.orderId)}
                      >
                        View Details
                      </button>

                      {order.paymentStatus === 'pending' && order.status !== 'cancelled' && (
                        <>
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => handlePayNow(order)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                              <line x1="1" y1="10" x2="23" y2="10"/>
                            </svg>
                            Pay Now
                          </button>
                          <button 
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleCheckPaymentStatus(order.orderId)}
                            title="Check if payment was completed"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="23 4 23 10 17 10"/>
                              <polyline points="1 20 1 14 7 14"/>
                              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                            </svg>
                            Check Payment
                          </button>
                          <button 
                            className="btn btn-danger btn-sm"
                            onClick={() => handleCancelOrder(order.orderId)}
                          >
                            Cancel Order
                          </button>
                        </>
                      )}
                      
                      {order.status === 'shipped' && (
                        <button 
                          className="btn btn-success btn-sm"
                          onClick={() => handleMarkAsDelivered(order.orderId)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                          </svg>
                          Mark as Received
                        </button>
                      )}

                      {order.status === 'delivered' && (
                        (() => {
                          const existing = getReturnByOrder(order.orderId);
                          if (existing) {
                            return (
                              <button 
                                className="btn btn-secondary btn-sm" 
                                onClick={() => openReturnDetails(existing.returnId)}
                              >
                                View Return
                              </button>
                            );
                          }
                          return (
                            <button 
                              className="btn btn-primary btn-sm" 
                              onClick={() => openReturnModal(order)}
                            >
                              Request Return
                            </button>
                          );
                        })()
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      <OrderDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        order={selectedOrder}
        onCancelOrder={handleCancelOrder}
        onMarkAsDelivered={handleMarkAsDelivered}
        getReturnByOrder={getReturnByOrder}
        openReturnDetails={openReturnDetails}
        openReturnModal={openReturnModal}
        getStatusBadge={getStatusBadge}
        formatDate={formatDate}
        formatPrice={formatPrice}
      />

      {/* Return Request Modal */}
      {showReturnModal && returnModalOrder && (
        <ReturnRequestModal 
          open={showReturnModal}
          onClose={() => setShowReturnModal(false)}
          order={returnModalOrder}
          onSubmitted={onReturnSubmitted}
        />
      )}

      {/* Return Details Modal */}
      {showReturnDetails && selectedReturnId && (
        <ReturnDetailsModal 
          open={showReturnDetails}
          onClose={() => { setShowReturnDetails(false); setSelectedReturnId(null); onReturnSubmitted(); }}
          returnId={selectedReturnId}
          role="buyer"
        />
      )}

      {/* Global Confirm */}
      <ConfirmModal
        open={confirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        confirmText={confirmOkText}
        cancelText={confirmCancelText}
        onConfirm={handleConfirm}
        onCancel={() => { setConfirmOpen(false); setConfirmAction(null); setConfirmPayload(null); }}
      />

      {/* Global Alert */}
      <AlertModal
        open={alertOpen}
        title={alertTitle}
        message={alertMessage}
        okText={alertOkText}
        onOk={() => {
          setAlertOpen(false);
          const fn = alertAfterOk;
          setAlertAfterOk(null);
          try { if (typeof fn === 'function') fn(); } catch (_) {}
        }}
      />
    </div>
  );
}
