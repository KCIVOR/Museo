import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import AddProductModal from './AddProductModal';
import EditProductModal from './EditProductModal';
import ConfirmModal from '../Shared/ConfirmModal';
import { 
  SalesIcon, 
  OrdersIcon, 
  ProductsIcon, 
  EarningsIcon,
  EditIcon,
  DeleteIcon,
  ViewIcon,
  UploadIcon,
  PlusIcon,
  CalendarIcon,
  ShipmentIcon
} from '../../styles/icons/DashboardIcons';
import './css/sellerDashboard.css';
import './css/payouts.css';

const API = import.meta.env.VITE_API_BASE;

export default function SellerDashboard() {
  const navigate = useNavigate();
  const { userData } = useUser();

  // Redirect if user is not a seller
  useEffect(() => {
    if (userData && !userData.isSeller) {
      navigate('/settings?tab=marketplace');
    }
  }, [userData, navigate]);
  
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('weekly');
  const [products, setProducts] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  
  // Orders management state
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderFilter, setOrderFilter] = useState('all');
  const [orderStats, setOrderStats] = useState({
    totalOrders: 0,
    toShip: 0,
    shipping: 0,
    completed: 0
  });
  
  // Modal states
  const [processingModal, setProcessingModal] = useState(false);
  const [shippingModal, setShippingModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  
  // Payment settings state - REMOVED (will be replaced)
  
  // Stats data
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalProducts: 0,
    activeProducts: 0,
    earnings: {
      gross: 0,
      net: 0,
      platformFee: 0
    },
    pendingOrders: 0,
    pendingShipments: 0
  });
  
  // Payout balance data - ACTUAL from payout system
  const [payoutBalance, setPayoutBalance] = useState({
    available: 0,
    pending: 0,
    totalPaidOut: 0,
    canWithdraw: false,
    minimumPayout: 100
  });
  
  // Payment method data
  const [paymentMethod, setPaymentMethod] = useState({
    method: null,
    gcashNumber: null,
    bankAccountName: null,
    bankAccountNumber: null,
    bankName: null
  });



  // Handle product added successfully
  const handleProductAdded = async (result) => {
    // Refresh products list
    await fetchProducts();
    alert(result.message || 'Product added successfully!');
  };

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/marketplace/seller/my-items`, {
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setProducts(result.data || []);
      } else {
        console.error('Failed to fetch products:', result.error);
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch actual payout balance from payout system
  const fetchPayoutBalance = async () => {
    try {
      const response = await fetch(`${API}/payouts/balance`, {
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setPayoutBalance({
          available: parseFloat(result.data.available || 0),
          pending: parseFloat(result.data.pending || 0),
          totalPaidOut: parseFloat(result.data.totalPaidOut || 0),
          canWithdraw: result.data.canWithdraw || false,
          minimumPayout: result.data.minimumPayout || 100
        });
      }
    } catch (error) {
      console.error('Error fetching payout balance:', error);
    }
  };
  
  // Fetch payment method info
  const fetchPaymentMethod = async () => {
    try {
      const response = await fetch(`${API}/payouts/payment-info`, {
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setPaymentMethod({
          method: result.data.paymentMethod,
          gcashNumber: result.data.gcashNumber,
          bankAccountName: result.data.bankAccountName,
          bankAccountNumber: result.data.bankAccountNumber,
          bankName: result.data.bankName
        });
      }
    } catch (error) {
      console.error('Error fetching payment method:', error);
    }
  };
  
  // Fetch stats from API
  const fetchStats = async (period = 'all') => {
    try {
      setStatsLoading(true);
      const response = await fetch(`${API}/marketplace/seller/stats?period=${period}`, {
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success && result.stats) {
        setStats(result.stats);
      } else {
        console.error('Failed to fetch stats:', result.error);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch seller's orders
  const fetchOrders = async (status = null) => {
    try {
      setOrdersLoading(true);
      
      const url = status && status !== 'all'
        ? `${API}/marketplace/orders/seller?status=${status}`
        : `${API}/marketplace/orders/seller`;
        
      const response = await fetch(url, {
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setOrders(result.data || []);
        
        // Update order stats if available
        if (result.stats) {
          setOrderStats(result.stats);
        }
      } else {
        console.error('Failed to fetch orders:', result.error);
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Mark order as processing
  const handleMarkAsProcessing = async (order) => {
    if (!window.confirm('Mark this order as processing? This means you are preparing the items for shipment.')) {
      return;
    }

    try {
      const response = await fetch(`${API}/marketplace/orders/${order.orderId}/process`, {
        method: 'PUT',
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success) {
        alert('Order marked as processing!');
        fetchOrders(orderFilter === 'all' ? null : orderFilter);
        fetchStats(selectedPeriod === 'daily' ? 'daily' : 
                   selectedPeriod === 'weekly' ? 'weekly' : 
                   selectedPeriod === 'monthly' ? 'monthly' : 'all');
      } else {
        alert(result.error || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order. Please try again.');
    }
  };

  // Mark order as shipped
  const handleMarkAsShipped = (order) => {
    setSelectedOrder(order);
    setShippingModal(true);
    setTrackingNumber('');
  };

  // Submit tracking information
  const submitTracking = async () => {
    if (!trackingNumber.trim()) {
      alert('Please enter a tracking number');
      return;
    }

    try {
      const response = await fetch(`${API}/marketplace/orders/${selectedOrder.orderId}/ship`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          tracking_number: trackingNumber
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('Order marked as shipped successfully!');
        setShippingModal(false);
        setSelectedOrder(null);
        setTrackingNumber('');
        fetchOrders(orderFilter === 'all' ? null : orderFilter);
        fetchStats(selectedPeriod === 'daily' ? 'daily' : 
                   selectedPeriod === 'weekly' ? 'weekly' : 
                   selectedPeriod === 'monthly' ? 'monthly' : 'all');
      } else {
        alert(result.error || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order. Please try again.');
    }
  };

  // Payment functions - REMOVED (will be replaced)

  // Load data on mount and when period changes
  useEffect(() => {
    if (userData?.isSeller) {
      fetchProducts();
      fetchStats(selectedPeriod === 'daily' ? 'daily' : 
                 selectedPeriod === 'weekly' ? 'weekly' : 
                 selectedPeriod === 'monthly' ? 'monthly' : 'all');
      
      // Fetch payout data
      fetchPayoutBalance();
      fetchPaymentMethod();
      
      // Fetch orders if on orders tab
      if (activeTab === 'orders') {
        fetchOrders(orderFilter === 'all' ? null : orderFilter);
      }
    }
  }, [userData, selectedPeriod, activeTab, orderFilter]);

  // Handle add new product
  const handleAddProduct = () => {
    setIsAddModalOpen(true);
  };
  
  // Handle edit product
  const handleEditProduct = (product) => {
    console.log('Edit button clicked for product:', product);
    setSelectedProduct(product);
    setIsEditModalOpen(true);
    console.log('Modal should open now, isEditModalOpen:', true);
  };

  // Handle edit product success
  const handleEditSuccess = async (updatedProduct) => {
    // Refresh products list
    await fetchProducts();
    setIsEditModalOpen(false);
    setSelectedProduct(null);
    alert('Product updated successfully!');
  };

  // Handle delete product
  const handleDeleteProduct = (product) => {
    setProductToDelete(product);
    setDeleteConfirmOpen(true);
  };

  // Confirm delete product
  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      const response = await fetch(`${API}/marketplace/items/${productToDelete.marketItemId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const result = await response.json();

      if (!response.ok) {
        // Show the error message from backend
        alert(result.error || 'Failed to delete product');
        setDeleteConfirmOpen(false);
        setProductToDelete(null);
        return;
      }

      if (result.success) {
        // Refresh products list
        await fetchProducts();
        alert('Product deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert(error.message || 'Failed to delete product. Please try again.');
    } finally {
      setDeleteConfirmOpen(false);
      setProductToDelete(null);
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setDeleteConfirmOpen(false);
    setProductToDelete(null);
  };

  // Handle view product
  const handleViewProduct = (product) => {
    navigate(`/marketplace/item/${product.marketItemId}`);
  };

  // Handle bulk upload
  const handleBulkUpload = () => {
    // Implement bulk upload logic
    alert('Bulk upload feature coming soon!');
  };

  // Show loading or nothing while checking seller status
  if (!userData?.isSeller) {
    return (
      <div className="seller-dashboard">
        <div className="dashboard-header">
          <div className="header-content">
            <h1>Seller Dashboard</h1>
            <p className="subtitle">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="seller-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Seller Dashboard</h1>
          <p className="subtitle">Welcome back, {userData?.sellerProfile?.shopName || userData?.fullName || 'Seller'}!</p>
        </div>
        <div className="header-actions">
          <select 
            className="period-selector"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <button 
            className="btn btn-primary"
            onClick={handleAddProduct}
          >
            <PlusIcon size={20} />
            Add Product
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="dashboard-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <ProductsIcon size={20} />
          Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <ProductsIcon size={20} />
          My Products
        </button>
        <button 
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <OrdersIcon size={20} />
          My Orders
          {orderStats.toShip > 0 && (
            <span className="tab-badge">{orderStats.toShip}</span>
          )}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'payouts' ? 'active' : ''}`}
          onClick={() => setActiveTab('payouts')}
        >
          <EarningsIcon size={20} />
          Payouts
        </button>
        <button 
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m0 6l4.2 4.2M23 12h-6m-6 0H1m18.2-5.2l-4.2 4.2m0 6l4.2 4.2"/>
          </svg>
          Settings
        </button>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards" style={{ opacity: statsLoading ? 0.6 : 1 }}>
        <div className="stat-card">
          <div className="stat-icon sales-icon">
            <SalesIcon size={28} color="#d4b48a" />
          </div>
          <div className="stat-content">
            <h3 className="stat-title">Total Sales</h3>
            <p className="stat-value">₱{stats.totalSales.toLocaleString()}</p>
            <span className="stat-info">{selectedPeriod} period</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orders-icon">
            <OrdersIcon size={28} color="#8b5a3c" />
          </div>
          <div className="stat-content">
            <h3 className="stat-title">Total Orders</h3>
            <p className="stat-value">{stats.totalOrders}</p>
            <span className="stat-badge">{stats.pendingOrders > 0 && `${stats.pendingOrders} pending`}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon products-icon">
            <ProductsIcon size={28} color="#6e4a2e" />
          </div>
          <div className="stat-content">
            <h3 className="stat-title">Products Listed</h3>
            <p className="stat-value">{stats.totalProducts}</p>
            <span className="stat-info">{stats.activeProducts} active</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon earnings-icon">
            <EarningsIcon size={28} color="#b8956f" />
          </div>
          <div className="stat-content">
            <h3 className="stat-title">Net Earnings</h3>
            <p className="stat-value">₱{stats.earnings.net.toLocaleString()}</p>
            <span className="stat-info">After {((stats.earnings.platformFee / stats.earnings.gross) * 100 || 0).toFixed(0)}% fees</span>
            {stats.earnings.net >= 100 && (
              <button 
                className="btn btn-primary btn-sm" 
                style={{marginTop: '8px'}}
                onClick={() => setActiveTab('payouts')}
              >
                💰 Withdraw Funds
              </button>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon shipment-icon">
            <ShipmentIcon size={28} color="#9c8668" />
          </div>
          <div className="stat-content">
            <h3 className="stat-title">Pending Shipments</h3>
            <p className="stat-value">{stats.pendingShipments}</p>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/marketplace/orders')}>View All</button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="dashboard-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="action-grid">
            <button className="quick-action-btn" onClick={() => setActiveTab('products')}>
              <ProductsIcon size={20} />
              Manage Products
            </button>
            <button className="quick-action-btn" onClick={() => setActiveTab('orders')}>
              <OrdersIcon size={20} />
              View Orders
            </button>
            <button className="quick-action-btn">
              <SalesIcon size={20} />
              Sales Report
            </button>
            <button className="quick-action-btn">
              <ShipmentIcon size={20} />
              Shipping Labels
            </button>
          </div>
        </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
        <div className="products-section">
          <div className="section-header">
            <h2>Product Inventory</h2>
            <div className="section-actions">
              <button className="btn btn-outline btn-sm" onClick={handleBulkUpload}>
                <UploadIcon size={18} />
                Bulk Upload
              </button>
            </div>
          </div>

          <div className="products-table-container">
            {loading ? (
              <div className="loading-state">
                <ProductsIcon size={48} color="#d4c9b8" />
                <p>Loading your products...</p>
              </div>
            ) : products.length > 0 ? (
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Title</th>
                    <th>Medium</th>
                    <th>Dimensions</th>
                    <th>Price</th>
                    <th>Qty</th>
                    <th>Condition</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => (
                  <tr key={product.marketItemId || product.id}>
                    <td>
                      <img 
                        src={product.primary_image || product.image || 'https://via.placeholder.com/50'} 
                        alt={product.title}
                        className="product-thumbnail"
                      />
                    </td>
                    <td className="product-name">
                      <div>
                        <div className="product-title">{product.title}</div>
                        {product.is_original && <span className="badge-original">Original</span>}
                        {product.is_framed && <span className="badge-framed">Framed</span>}
                      </div>
                    </td>
                    <td className="product-medium">{product.medium || 'N/A'}</td>
                    <td className="product-dimensions">{product.dimensions || 'N/A'}</td>
                    <td className="product-price">${product.price?.toLocaleString() || '0'}</td>
                    <td className="product-stock">
                      <span className={product.quantity < 3 ? 'low-stock' : ''}>
                        {product.quantity || 0}
                      </span>
                    </td>
                    <td>
                      <span className={`condition-badge ${product.condition || 'excellent'}`}>
                        {product.condition || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${product.status || 'active'}`}>
                        {product.status || 'active'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn-action view"
                          onClick={() => handleViewProduct(product)}
                          title="View"
                        >
                          <ViewIcon size={18} />
                        </button>
                        <button 
                          className="btn-action edit"
                          onClick={() => handleEditProduct(product)}
                          title="Edit"
                        >
                          <EditIcon size={18} />
                        </button>
                        <button 
                          className="btn-action delete"
                          onClick={() => handleDeleteProduct(product)}
                          title="Delete"
                        >
                          <DeleteIcon size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <ProductsIcon size={48} color="#d4c9b8" />
                <p>No products listed yet</p>
                <button className="btn btn-primary" onClick={handleAddProduct}>
                  Add Your First Product
                </button>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
        <div className="orders-section">
          <div className="section-header">
            <h2>Order Management</h2>
            <div className="order-filters">
              <button 
                className={`filter-btn ${orderFilter === 'all' ? 'active' : ''}`}
                onClick={() => setOrderFilter('all')}
              >
                All Orders ({orderStats.totalOrders})
              </button>
              <button 
                className={`filter-btn ${orderFilter === 'paid' ? 'active' : ''}`}
                onClick={() => setOrderFilter('paid')}
              >
                To Ship ({orderStats.toShip})
              </button>
              <button 
                className={`filter-btn ${orderFilter === 'shipped' ? 'active' : ''}`}
                onClick={() => setOrderFilter('shipped')}
              >
                Shipping ({orderStats.shipping})
              </button>
              <button 
                className={`filter-btn ${orderFilter === 'delivered' ? 'active' : ''}`}
                onClick={() => setOrderFilter('delivered')}
              >
                Completed ({orderStats.completed})
              </button>
            </div>
          </div>

          <div className="orders-list">
            {ordersLoading ? (
              <div className="loading-state">
                <OrdersIcon size={48} color="#d4c9b8" />
                <p>Loading orders...</p>
              </div>
            ) : orders.length > 0 ? (
              orders.map(order => (
                <div key={order.orderId} className="order-card">
                  <div className="order-header">
                    <div className="order-info">
                      <span className="order-id">Order #{order.orderId.slice(0, 8)}</span>
                      <span className={`order-status ${order.status}`}>
                        {(order.status === 'pending' && order.paymentStatus === 'paid') ? 'To Ship' :
                         order.status === 'processing' ? 'Processing' :
                         order.status === 'shipped' ? 'Shipping' : 
                         order.status === 'delivered' ? 'Completed' : 
                         order.status.toUpperCase()}
                      </span>
                      <span className="order-date">
                        {new Date(order.paidAt || order.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="order-total">₱{order.totalAmount.toLocaleString()}</div>
                  </div>

                  <div className="order-items">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="order-item">
                        <img 
                          src={item.image || 'https://via.placeholder.com/60'} 
                          alt={item.title}
                        />
                        <div className="item-details">
                          <div className="item-title">{item.title}</div>
                          <div className="item-info">
                            Qty: {item.quantity} × ₱{item.priceAtPurchase.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {order.trackingNumber && (
                    <div className="tracking-info">
                      <strong>Tracking:</strong> {order.trackingNumber}
                    </div>
                  )}

                  <div className="order-actions">
                    {(order.status === 'pending' && order.paymentStatus === 'paid') && (
                      <>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleMarkAsProcessing(order)}
                        >
                          Mark as Processing
                        </button>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => handleMarkAsShipped(order)}
                        >
                          Mark as Shipped
                        </button>
                      </>
                    )}
                    {order.status === 'processing' && (
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => handleMarkAsShipped(order)}
                      >
                        Mark as Shipped
                      </button>
                    )}
                    {order.status === 'shipped' && (
                      <button className="btn btn-outline btn-sm" disabled>
                        Waiting for Delivery
                      </button>
                    )}
                    {order.status === 'delivered' && (
                      <span className="order-completed">✓ Completed</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <OrdersIcon size={48} color="#d4c9b8" />
                <p>No orders found</p>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Payouts Tab */}
        {activeTab === 'payouts' && (
          <div className="payouts-section">
            <div className="section-header">
              <h2>💰 Payouts & Earnings</h2>
              <p>Manage your earnings and withdraw funds</p>
            </div>

            {/* Balance Card */}
            <div className="payout-balance-card">
              <div className="balance-info">
                <h3>Available Balance</h3>
                <p className="balance-amount">₱{payoutBalance.available.toLocaleString()}</p>
                {payoutBalance.pending > 0 && (
                  <p className="pending-amount">
                    ⏳ Pending (Escrow): ₱{payoutBalance.pending.toLocaleString()}
                  </p>
                )}
                <small>Minimum withdrawal: ₱{payoutBalance.minimumPayout}</small>
                {!paymentMethod.method && (
                  <small className="text-warning">⚠️ Set up payment method first</small>
                )}
              </div>
              <div className="balance-actions">
                {payoutBalance.canWithdraw && paymentMethod.method ? (
                  <button 
                    className="btn btn-primary btn-lg"
                    onClick={async () => {
                      const paymentMethodName = paymentMethod.method === 'gcash' ? 
                        `GCash (${paymentMethod.gcashNumber})` : 
                        paymentMethod.method === 'bank' ?
                        `${paymentMethod.bankName} (${paymentMethod.bankAccountNumber})` :
                        paymentMethod.method;
                        
                      if (!confirm(`Withdraw ₱${payoutBalance.available.toLocaleString()} to your ${paymentMethodName}?`)) return;
                      
                      try {
                        const response = await fetch(`${API}/payouts/withdraw`, {
                          method: 'POST',
                          credentials: 'include'
                        });
                        const result = await response.json();
                        
                        if (result.success) {
                          alert(`✅ ${result.message}\n\nAmount: ₱${result.data.amount}\nReference: ${result.data.reference}\nMethod: ${result.data.paymentMethod}`);
                          // Refresh balances
                          fetchPayoutBalance();
                          fetchStats();
                        } else {
                          alert(`❌ ${result.error}`);
                        }
                      } catch (error) {
                        alert('Error processing withdrawal: ' + error.message);
                      }
                    }}
                  >
                    Withdraw Funds
                  </button>
                ) : !paymentMethod.method ? (
                  <button className="btn btn-secondary btn-lg" disabled>
                    Set Up Payment Method First
                  </button>
                ) : (
                  <button className="btn btn-secondary btn-lg" disabled>
                    Minimum ₱{payoutBalance.minimumPayout} Required
                  </button>
                )}
              </div>
            </div>

            {/* Earnings Breakdown */}
            <div className="earnings-breakdown">
              <h3>Earnings Breakdown</h3>
              <div className="breakdown-grid">
                <div className="breakdown-item">
                  <span className="breakdown-label">Gross Sales</span>
                  <span className="breakdown-value">₱{stats.earnings.gross.toLocaleString()}</span>
                </div>
                <div className="breakdown-item">
                  <span className="breakdown-label">Platform Fee (4%)</span>
                  <span className="breakdown-value text-red">-₱{stats.earnings.platformFee.toLocaleString()}</span>
                </div>
                <div className="breakdown-item total">
                  <span className="breakdown-label">Net Earnings</span>
                  <span className="breakdown-value">₱{stats.earnings.net.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Payout Info */}
            <div className="payout-info-section">
              <h3>How Payouts Work</h3>
              <div className="info-grid">
                <div className="info-card">
                  <div className="info-icon">⏰</div>
                  <h4>24-Hour Escrow</h4>
                  <p>Funds are held for 24 hours after delivery for buyer protection</p>
                </div>
                <div className="info-card">
                  <div className="info-icon">💳</div>
                  <h4>GCash Payout</h4>
                  <p>Receive money directly to your GCash account</p>
                </div>
                <div className="info-card">
                  <div className="info-icon">📊</div>
                  <h4>4% Platform Fee</h4>
                  <p>Low fees to help artists earn more</p>
                </div>
                <div className="info-card">
                  <div className="info-icon">⚡</div>
                  <h4>Fast Processing</h4>
                  <p>Withdrawals processed within minutes</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="settings-section">
            <div className="section-header">
              <h2>Payment Settings</h2>
              <p>Configure how you receive payouts</p>
            </div>
            <div className="empty-state">
              <p>Payment settings coming soon</p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {shippingModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShippingModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Tracking Information</h2>
              <button className="modal-close" onClick={() => setShippingModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="order-summary">
                <p><strong>Order ID:</strong> #{selectedOrder.orderId.slice(0, 8)}</p>
                <p><strong>Total:</strong> ₱{selectedOrder.totalAmount.toLocaleString()}</p>
                <p><strong>Items:</strong> {selectedOrder.items?.length || 0}</p>
              </div>

              <div className="form-group">
                <label>Tracking Number</label>
                <input 
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number (e.g., 420612345678)"
                  className="form-control"
                />
                <small className="form-hint">
                  Enter the tracking number provided by your courier service
                </small>
              </div>

              <div className="tracking-tips">
                <h4>📦 Shipping Tips:</h4>
                <ul>
                  <li>Pack items securely to prevent damage</li>
                  <li>Include invoice and packing slip</li>
                  <li>Use tracking service for valuable items</li>
                  <li>Update buyer with tracking information</li>
                </ul>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShippingModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={submitTracking}
                disabled={!trackingNumber.trim()}
              >
                Confirm Shipment
              </button>
            </div>
          </div>
        </div>
      )}

      
      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleProductAdded}
      />

      {/* Edit Product Modal */}
      <EditProductModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedProduct(null);
        }}
        onSuccess={handleEditSuccess}
        product={selectedProduct}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={deleteConfirmOpen}
        title="Delete Product"
        message={productToDelete ? 
          `Are you sure you want to delete "${productToDelete.title}"? This action cannot be undone.` : 
          'Are you sure you want to delete this product?'}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteProduct}
        onCancel={cancelDelete}
      />
    </div>
  );
}