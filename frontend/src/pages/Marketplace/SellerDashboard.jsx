import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import AddProductModal from './AddProductModal';
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

  // Load data on mount and when period changes
  useEffect(() => {
    if (userData?.isSeller) {
      fetchProducts();
      fetchStats(selectedPeriod === 'daily' ? 'daily' : 
                 selectedPeriod === 'weekly' ? 'weekly' : 
                 selectedPeriod === 'monthly' ? 'monthly' : 'all');
      
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
  
  // Handle edit product (TODO: Create EditProductModal similar to AddProductModal)
  const handleEditProduct = (product) => {
    alert('Edit functionality coming soon! Product ID: ' + product.marketItemId);
    // TODO: Create EditProductModal component
  };

  // Handle delete product
  const handleDeleteProduct = async (product) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const response = await fetch(`${API}/marketplace/items/${product.marketItemId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete product');
      }

      if (result.success) {
        // Refresh products list
        await fetchProducts();
        alert('Product deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert(error.message || 'Failed to delete product. Please try again.');
    }
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
      </div>
      
      {/* Shipping Modal */}
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
    </div>
  );
}