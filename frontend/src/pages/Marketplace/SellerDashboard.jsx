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
import SellerReturnsTab from './SellerReturnsTab.jsx';
import '../../styles/main.css';
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
    completed: 0,
    cancelled: 0
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
    <div className="museo-page">
      <div className="museo-feed museo-container--lg">
        {/* Header */}
        <div className="museo-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--museo-space-6)',
          gap: 'var(--museo-space-3)'
        }}>
          <div>
            <h1 className="museo-heading">Seller Dashboard</h1>
            <p className="museo-subtitle" style={{color: 'var(--museo-text-secondary)', marginTop: 'var(--museo-space-1)'}}>
              Welcome back, {userData?.sellerProfile?.shopName || userData?.fullName || 'Seller'}!
            </p>
          </div>
          <div style={{
            display: 'flex',
            gap: 'var(--museo-space-3)',
            alignItems: 'center'
          }}>
            <select 
              className="museo-select museo-input--sm"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              style={{
                minWidth: '120px',
                width: 'auto'
              }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <button 
              className="btn-ghost btn-icon"
              onClick={handleAddProduct}
            >
              +
            </button>
          </div>
        </div>

      {/* Tab Navigation - Using Museo Tabs */}
      <div className="museo-tabs museo-tabs--full">
        <button 
          className={`museo-tab ${activeTab === 'overview' ? 'museo-tab--active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '6px'}}>
            <rect x="3" y="12" width="18" height="9" rx="2" ry="2"/>
            <path d="M3 12v-1a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1"/>
            <path d="M8 9V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v5"/>
          </svg>
          Overview
        </button>
        <button 
          className={`museo-tab ${activeTab === 'products' ? 'museo-tab--active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '6px'}}>
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
          My Products
        </button>
        <button 
          className={`museo-tab ${activeTab === 'orders' ? 'museo-tab--active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '6px'}}>
            <rect x="2" y="5" width="20" height="14" rx="2"/>
            <line x1="2" y1="10" x2="22" y2="10"/>
          </svg>
          My Orders
          {orderStats.toShip > 0 && (
            <span className="museo-tab__badge">{orderStats.toShip}</span>
          )}
        </button>
        <button 
          className={`museo-tab ${activeTab === 'returns' ? 'museo-tab--active' : ''}`}
          onClick={() => setActiveTab('returns')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '6px'}}>
            <polyline points="8 3 4 7 8 11"/>
            <path d="M4 7h9a4 4 0 1 1 0 8H6"/>
          </svg>
          Returns
        </button>
        <button 
          className={`museo-tab ${activeTab === 'payouts' ? 'museo-tab--active' : ''}`}
          onClick={() => setActiveTab('payouts')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '6px'}}>
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          Payouts
        </button>
        <button 
          className={`museo-tab ${activeTab === 'settings' ? 'museo-tab--active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '6px'}}>
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6m3.5-10.5L21 3m-6 18l5.5-5.5M3 12h6m12 0h6M6.5 8.5L1 3m6 18l-5.5-5.5"/>
          </svg>
          Settings
        </button>
      </div>

      {/* Summary Cards - Responsive Scroll */}
      <div className="museo-stats-container" style={{ 
        display: 'flex',
        gap: 'var(--museo-space-3)',
        marginBottom: 'var(--museo-space-6)',
        overflowX: 'auto',
        paddingBottom: 'var(--museo-space-2)',
        scrollbarWidth: 'thin',
        opacity: statsLoading ? 0.6 : 1
      }}>
        <div className="museo-stat-card" style={{
          minWidth: '250px',
          background: 'var(--museo-white)',
          borderRadius: 'var(--museo-radius-lg)',
          padding: 'var(--museo-space-4)',
          border: '1px solid var(--museo-border)',
          display: 'flex',
          gap: 'var(--museo-space-3)'
        }}>
          <div className="museo-stat-icon" style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--museo-radius-md)',
            background: 'var(--museo-accent-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--museo-accent)" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div className="museo-stat-content" style={{flex: 1}}>
            <h3 style={{
              fontSize: 'var(--museo-text-sm)',
              color: 'var(--museo-text-secondary)',
              fontWeight: 'var(--museo-font-medium)',
              margin: '0 0 var(--museo-space-1) 0'
            }}>Total Sales</h3>
            <p style={{
              fontSize: 'var(--museo-text-2xl)',
              color: 'var(--museo-text-primary)',
              fontWeight: 'var(--museo-font-bold)',
              margin: 0
            }}>₱{stats.totalSales.toLocaleString()}</p>
            <span style={{
              fontSize: 'var(--museo-text-xs)',
              color: 'var(--museo-text-muted)'
            }}>{selectedPeriod} period</span>
          </div>
        </div>

        <div className="museo-stat-card" style={{
          minWidth: '250px',
          background: 'var(--museo-white)',
          borderRadius: 'var(--museo-radius-lg)',
          padding: 'var(--museo-space-4)',
          border: '1px solid var(--museo-border)',
          display: 'flex',
          gap: 'var(--museo-space-3)'
        }}>
          <div className="museo-stat-icon" style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--museo-radius-md)',
            background: 'var(--museo-bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--museo-primary)" strokeWidth="2">
              <rect x="2" y="5" width="20" height="14" rx="2"/>
              <line x1="2" y1="10" x2="22" y2="10"/>
            </svg>
          </div>
          <div className="museo-stat-content" style={{flex: 1}}>
            <h3 style={{
              fontSize: 'var(--museo-text-sm)',
              color: 'var(--museo-text-secondary)',
              fontWeight: 'var(--museo-font-medium)',
              margin: '0 0 var(--museo-space-1) 0'
            }}>Total Orders</h3>
            <p style={{
              fontSize: 'var(--museo-text-2xl)',
              color: 'var(--museo-text-primary)',
              fontWeight: 'var(--museo-font-bold)',
              margin: 0
            }}>{stats.totalOrders}</p>
            {stats.pendingOrders > 0 && (
              <span className="museo-tab__badge" style={{marginTop: 'var(--museo-space-1)'}}>
                {stats.pendingOrders} pending
              </span>
            )}
          </div>
        </div>

        <div className="museo-stat-card" style={{
          minWidth: '250px',
          background: 'var(--museo-white)',
          borderRadius: 'var(--museo-radius-lg)',
          padding: 'var(--museo-space-4)',
          border: '1px solid var(--museo-border)',
          display: 'flex',
          gap: 'var(--museo-space-3)'
        }}>
          <div className="museo-stat-icon" style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--museo-radius-md)',
            background: 'var(--museo-info-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--museo-info)" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>
          <div className="museo-stat-content" style={{flex: 1}}>
            <h3 style={{
              fontSize: 'var(--museo-text-sm)',
              color: 'var(--museo-text-secondary)',
              fontWeight: 'var(--museo-font-medium)',
              margin: '0 0 var(--museo-space-1) 0'
            }}>Products Listed</h3>
            <p style={{
              fontSize: 'var(--museo-text-2xl)',
              color: 'var(--museo-text-primary)',
              fontWeight: 'var(--museo-font-bold)',
              margin: 0
            }}>{stats.totalProducts}</p>
            <span style={{
              fontSize: 'var(--museo-text-xs)',
              color: 'var(--museo-text-muted)'
            }}>{stats.activeProducts} active</span>
          </div>
        </div>

        <div className="museo-stat-card" style={{
          minWidth: '250px',
          background: 'var(--museo-white)',
          borderRadius: 'var(--museo-radius-lg)',
          padding: 'var(--museo-space-4)',
          border: '1px solid var(--museo-border)',
          display: 'flex',
          gap: 'var(--museo-space-3)'
        }}>
          <div className="museo-stat-icon" style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--museo-radius-md)',
            background: 'var(--museo-success-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--museo-success)" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div className="museo-stat-content" style={{flex: 1}}>
            <h3 style={{
              fontSize: 'var(--museo-text-sm)',
              color: 'var(--museo-text-secondary)',
              fontWeight: 'var(--museo-font-medium)',
              margin: '0 0 var(--museo-space-1) 0'
            }}>Net Earnings</h3>
            <p style={{
              fontSize: 'var(--museo-text-2xl)',
              color: 'var(--museo-text-primary)',
              fontWeight: 'var(--museo-font-bold)',
              margin: 0
            }}>₱{stats.earnings.net.toLocaleString()}</p>
          </div>
        </div>

        <div className="museo-stat-card" style={{
          minWidth: '250px',
          background: 'var(--museo-white)',
          borderRadius: 'var(--museo-radius-lg)',
          padding: 'var(--museo-space-4)',
          border: '1px solid var(--museo-border)',
          display: 'flex',
          gap: 'var(--museo-space-3)'
        }}>
          <div className="museo-stat-icon" style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--museo-radius-md)',
            background: 'var(--museo-warning-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--museo-warning)" strokeWidth="2">
              <rect x="1" y="3" width="15" height="13"/>
              <path d="M16 8h5l3 3v5h-2"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          <div className="museo-stat-content" style={{flex: 1}}>
            <h3 style={{
              fontSize: 'var(--museo-text-sm)',
              color: 'var(--museo-text-secondary)',
              fontWeight: 'var(--museo-font-medium)',
              margin: '0 0 var(--museo-space-1) 0'
            }}>Pending Shipments</h3>
            <p style={{
              fontSize: 'var(--museo-text-2xl)',
              color: 'var(--museo-text-primary)',
              fontWeight: 'var(--museo-font-bold)',
              margin: 0
            }}>{stats.pendingShipments}</p>

          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="dashboard-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
        <div style={{
          background: 'var(--museo-white)',
          borderRadius: 'var(--museo-radius-lg)',
          padding: 'var(--museo-space-6)',
          marginBottom: 'var(--museo-space-6)'
        }}>
          <h3 className="museo-heading" style={{fontSize: 'var(--museo-text-xl)', marginBottom: 'var(--museo-space-4)'}}>Quick Actions</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--museo-space-3)'
          }}>
            <button 
              className="btn btn-ghost"
              style={{
                padding: 'var(--museo-space-4)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--museo-space-2)',
                border: '1px solid var(--museo-border)',
                background: 'var(--museo-white)',
                borderRadius: 'var(--museo-radius-md)',
                cursor: 'pointer',
                transition: 'all var(--museo-duration-base) var(--museo-ease-out)'
              }}
              onClick={() => setActiveTab('products')}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
              <span>Manage Products</span>
            </button>
            <button 
              className="btn btn-ghost"
              style={{
                padding: 'var(--museo-space-4)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--museo-space-2)',
                border: '1px solid var(--museo-border)',
                background: 'var(--museo-white)',
                borderRadius: 'var(--museo-radius-md)',
                cursor: 'pointer',
                transition: 'all var(--museo-duration-base) var(--museo-ease-out)'
              }}
              onClick={() => setActiveTab('orders')}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="5" width="20" height="14" rx="2"/>
                <line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
              <span>View Orders</span>
            </button>
            <button 
              className="btn btn-ghost"
              style={{
                padding: 'var(--museo-space-4)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--museo-space-2)',
                border: '1px solid var(--museo-border)',
                background: 'var(--museo-white)',
                borderRadius: 'var(--museo-radius-md)',
                cursor: 'pointer',
                transition: 'all var(--museo-duration-base) var(--museo-ease-out)'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
              <span>Sales Report</span>
            </button>
            <button 
              className="btn btn-ghost"
              style={{
                padding: 'var(--museo-space-4)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--museo-space-2)',
                border: '1px solid var(--museo-border)',
                background: 'var(--museo-white)',
                borderRadius: 'var(--museo-radius-md)',
                cursor: 'pointer',
                transition: 'all var(--museo-duration-base) var(--museo-ease-out)'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/>
                <path d="M9 22V12h6v10"/>
              </svg>
              <span>Shipping Labels</span>
            </button>
          </div>
        </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
        <div className="museo-products-section">
          <div style={{
            marginBottom: 'var(--museo-space-4)'
          }}>
            <h2 className="museo-heading" style={{fontSize: 'var(--museo-text-2xl)'}}>Product Inventory</h2>
          </div>

          <div className="products-table-container">
            {loading ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--museo-space-8)',
                color: 'var(--museo-text-secondary)'
              }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--museo-accent)" strokeWidth="1.5">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
                <p style={{marginTop: 'var(--museo-space-3)'}}>Loading your products...</p>
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
                          className="btn btn-ghost"
                          style={{
                            padding: 'var(--museo-space-1)',
                            minWidth: 'auto'
                          }}
                          onClick={() => handleViewProduct(product)}
                          title="View"
                        >
                          <ViewIcon size={18} />
                        </button>
                        <button 
                          className="btn btn-ghost"
                          style={{
                            padding: 'var(--museo-space-1)',
                            minWidth: 'auto'
                          }}
                          onClick={() => handleEditProduct(product)}
                          title="Edit"
                        >
                          <EditIcon size={18} />
                        </button>
                        <button 
                          className="btn btn-ghost"
                          style={{
                            padding: 'var(--museo-space-1)',
                            minWidth: 'auto',
                            color: 'var(--museo-error)'
                          }}
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
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--museo-space-8)',
                textAlign: 'center'
              }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--museo-accent)" strokeWidth="1.5">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
                <p style={{
                  fontSize: 'var(--museo-text-lg)',
                  color: 'var(--museo-text-secondary)',
                  marginTop: 'var(--museo-space-3)',
                  marginBottom: 'var(--museo-space-4)'
                }}>No products listed yet</p>
                <button 
                  className="btn btn-primary"
                  style={{
                    padding: 'var(--museo-space-2) var(--museo-space-4)',
                    background: 'var(--museo-primary)',
                    color: 'var(--museo-white)',
                    border: 'none',
                    borderRadius: 'var(--museo-radius-md)'
                  }}
                  onClick={handleAddProduct}
                >
                  Add Your First Product
                </button>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
        <div className="museo-orders-section">
          <div style={{
            marginBottom: 'var(--museo-space-6)'
          }}>
            <h2 className="museo-heading" style={{fontSize: 'var(--museo-text-2xl)', marginBottom: 'var(--museo-space-4)'}}>Order Management</h2>
            <div className="museo-tabs museo-tabs--full">
              <button 
                className={`museo-tab ${orderFilter === 'all' ? 'museo-tab--active' : ''}`}
                onClick={() => setOrderFilter('all')}
              >
                All Orders
                <span className="museo-tab__badge">{orderStats.totalOrders}</span>
              </button>
              <button 
                className={`museo-tab ${orderFilter === 'paid' ? 'museo-tab--active' : ''}`}
                onClick={() => setOrderFilter('paid')}
              >
                To Ship
                <span className="museo-tab__badge">{orderStats.toShip}</span>
              </button>
              <button 
                className={`museo-tab ${orderFilter === 'shipped' ? 'museo-tab--active' : ''}`}
                onClick={() => setOrderFilter('shipped')}
              >
                Shipping
                <span className="museo-tab__badge">{orderStats.shipping}</span>
              </button>
              <button 
                className={`museo-tab ${orderFilter === 'delivered' ? 'museo-tab--active' : ''}`}
                onClick={() => setOrderFilter('delivered')}
              >
                Completed
                <span className="museo-tab__badge">{orderStats.completed}</span>
              </button>
              <button 
                className={`museo-tab ${orderFilter === 'cancelled' ? 'museo-tab--active' : ''}`}
                onClick={() => setOrderFilter('cancelled')}
              >
                Cancelled
                <span className="museo-tab__badge">{orderStats.cancelled}</span>
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
                <div key={order.orderId} className="order-card" style={{
                  background: 'var(--museo-white)',
                  border: '1px solid var(--museo-border)',
                  borderRadius: 'var(--museo-radius-md)',
                  padding: 'var(--museo-space-4)',
                  marginBottom: 'var(--museo-space-3)',
                  display: 'flex',
                  alignItems: 'stretch',
                  gap: 'var(--museo-space-4)'
                }}>
                  {/* Order Image */}
                  <div style={{
                    width: '100px',
                    height: '100px',
                    flexShrink: 0
                  }}>
                    {order.items && order.items[0] ? (
                      <img 
                        src={order.items[0].image || order.items[0].itemImage || 'https://via.placeholder.com/100'}
                        alt={order.items[0].title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: 'var(--museo-radius-sm)'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        background: 'var(--museo-bg-secondary)',
                        borderRadius: 'var(--museo-radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--museo-text-muted)" strokeWidth="1.5">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Order Info */}
                  <div style={{flex: 1, minWidth: 0}}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 'var(--museo-space-2)'
                    }}>
                      <div>
                        <span style={{
                          fontSize: 'var(--museo-text-sm)',
                          color: 'var(--museo-text-secondary)',
                          marginRight: 'var(--museo-space-3)'
                        }}>Order #{order.orderId.slice(0, 8).toUpperCase()}</span>
                        {(order.status === 'pending' && order.paymentStatus === 'paid') && (
                          <span className="museo-badge museo-badge--warning museo-badge--interactive">TO SHIP</span>
                        )}
                        {order.status === 'processing' && (
                          <span className="museo-badge museo-badge--info museo-badge--interactive">PROCESSING</span>
                        )}
                        {order.status === 'shipped' && (
                          <span className="museo-badge museo-badge--info museo-badge--interactive">SHIPPING</span>
                        )}
                        {order.status === 'delivered' && (
                          <span className="museo-badge museo-badge--success museo-badge--interactive">COMPLETED</span>
                        )}
                        {order.status === 'cancelled' && (
                          <span className="museo-badge museo-badge--error museo-badge--interactive">CANCELLED</span>
                        )}
                      </div>
                      <div style={{
                        fontSize: 'var(--museo-text-lg)',
                        fontWeight: 'var(--museo-font-bold)',
                        color: 'var(--museo-text-primary)'
                      }}>₱{order.totalAmount.toLocaleString()}</div>
                    </div>

                    <div style={{
                      fontSize: 'var(--museo-text-base)',
                      color: 'var(--museo-text-primary)',
                      fontWeight: 'var(--museo-font-semibold)',
                      marginBottom: 'var(--museo-space-1)'
                    }}>
                      {order.buyerName || 'Customer'}
                    </div>
                    
                    <div style={{
                      fontSize: 'var(--museo-text-sm)',
                      color: 'var(--museo-text-secondary)',
                      marginBottom: 'var(--museo-space-2)'
                    }}>
                      {order.items && order.items[0] && (
                        <>
                          {order.items[0].title}
                          {order.items.length > 1 && ` + ${order.items.length - 1} more`}
                        </>
                      )}
                      <span style={{margin: '0 var(--museo-space-2)'}}>•</span>
                      Qty: {order.items?.reduce((sum, item) => sum + item.quantity, 0) || 1} × ₱{order.items?.[0]?.priceAtPurchase?.toLocaleString() || '0'}
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--museo-space-3)',
                      fontSize: 'var(--museo-text-sm)',
                      color: 'var(--museo-text-muted)'
                    }}>
                      <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        {new Date(order.paidAt || order.createdAt).toLocaleDateString()}
                      </span>
                      {order.trackingNumber && (
                        <>
                          <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="1" y="3" width="15" height="13"/>
                              <path d="M16 8h5l3 3v5h-2"/>
                              <circle cx="5.5" cy="18.5" r="2.5"/>
                              <circle cx="18.5" cy="18.5" r="2.5"/>
                            </svg>
                            Tracking: {order.trackingNumber}
                          </span>
                          {order.status === 'delivered' && (
                            <span style={{color: 'var(--museo-success)', display: 'flex', alignItems: 'center', gap: '4px'}}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                <polyline points="22 4 12 14.01 9 11.01"/>
                              </svg>
                              Completed
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Order Actions */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--museo-space-2)',
                    justifyContent: 'center',
                    minWidth: '150px'
                  }}>
                    {(order.status === 'pending' && order.paymentStatus === 'paid') && (
                      <>
                        <button 
                          className="btn btn-secondary"
                          style={{
                            padding: 'var(--museo-space-2) var(--museo-space-3)',
                            fontSize: 'var(--museo-text-sm)'
                          }}
                          onClick={() => handleMarkAsProcessing(order)}
                        >
                          Mark as Processing
                        </button>
                        <button 
                          className="btn btn-primary"
                          style={{
                            padding: 'var(--museo-space-2) var(--museo-space-3)',
                            fontSize: 'var(--museo-text-sm)',
                            background: 'var(--museo-primary)',
                            color: 'var(--museo-white)',
                            border: 'none'
                          }}
                          onClick={() => handleMarkAsShipped(order)}
                        >
                          Mark as Shipped
                        </button>
                      </>
                    )}
                    {order.status === 'processing' && (
                      <button 
                        className="btn btn-primary"
                        style={{
                          padding: 'var(--museo-space-2) var(--museo-space-3)',
                          fontSize: 'var(--museo-text-sm)',
                          background: 'var(--museo-primary)',
                          color: 'var(--museo-white)',
                          border: 'none'
                        }}
                        onClick={() => handleMarkAsShipped(order)}
                      >
                        Mark as Shipped
                      </button>
                    )}
                    {order.status === 'shipped' && (
                      <button 
                        className="btn btn-ghost"
                        style={{
                          padding: 'var(--museo-space-2) var(--museo-space-3)',
                          fontSize: 'var(--museo-text-sm)',
                          opacity: 0.6,
                          cursor: 'not-allowed'
                        }}
                        disabled
                      >
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

        {/* Returns Tab */}
        {activeTab === 'returns' && (
          <div className="museo-returns-section" style={{marginTop: 'var(--museo-space-6)'}}>
            <SellerReturnsTab />
          </div>
        )}

        {/* Payouts Tab */}
        {activeTab === 'payouts' && (
          <div>
            <div style={{
              marginBottom: 'var(--museo-space-6)'
            }}>
              <h2 className="museo-heading" style={{
                fontSize: 'var(--museo-text-2xl)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--museo-space-2)'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
                Payouts & Earnings
              </h2>
              <p style={{
                color: 'var(--museo-text-secondary)',
                marginTop: 'var(--museo-space-2)'
              }}>Manage your earnings and withdraw funds</p>
            </div>

            {/* Balance Card */}
            <div style={{
              background: 'var(--museo-white)',
              borderRadius: 'var(--museo-radius-lg)',
              padding: 'var(--museo-space-6)',
              marginBottom: 'var(--museo-space-4)',
              border: '1px solid var(--museo-border)',
              boxShadow: 'var(--museo-shadow-sm)'
            }}>
              <div>
                <h3 className="museo-heading" style={{
                  fontSize: 'var(--museo-text-lg)',
                  marginBottom: 'var(--museo-space-3)'
                }}>Available Balance</h3>
                <p style={{
                  fontSize: 'var(--museo-text-3xl)',
                  fontWeight: 'var(--museo-font-bold)',
                  color: 'var(--museo-primary)',
                  margin: 'var(--museo-space-2) 0'
                }}>₱{payoutBalance.available.toLocaleString()}</p>
                {payoutBalance.pending > 0 && (
                  <p style={{
                    fontSize: 'var(--museo-text-sm)',
                    color: 'var(--museo-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--museo-space-1)',
                    marginBottom: 'var(--museo-space-2)'
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Pending (Escrow): ₱{payoutBalance.pending.toLocaleString()}
                  </p>
                )}
                <small style={{
                  display: 'block',
                  color: 'var(--museo-text-secondary)',
                  marginTop: 'var(--museo-space-2)'
                }}>Minimum withdrawal: ₱{payoutBalance.minimumPayout}</small>
                {!paymentMethod.method && (
                  <small style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--museo-space-1)',
                    color: 'var(--museo-warning)',
                    marginTop: 'var(--museo-space-2)'
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    Set up payment method first
                  </small>
                )}
              </div>
              <div style={{
                marginTop: 'var(--museo-space-4)',
                display: 'flex',
                justifyContent: 'center'
              }}>
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
                          alert(`${result.message}\n\nAmount: ₱${result.data.amount}\nReference: ${result.data.reference}\nMethod: ${result.data.paymentMethod}`);
                          // Refresh balances
                          fetchPayoutBalance();
                          fetchStats();
                        } else {
                          alert(`Error: ${result.error}`);
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
            <div style={{
              background: 'var(--museo-white)',
              borderRadius: 'var(--museo-radius-lg)',
              padding: 'var(--museo-space-4)',
              marginBottom: 'var(--museo-space-4)',
              border: '1px solid var(--museo-border)'
            }}>
              <h3 className="museo-heading" style={{
                fontSize: 'var(--museo-text-lg)',
                marginBottom: 'var(--museo-space-3)'
              }}>Earnings Breakdown</h3>
              <div style={{
                display: 'grid',
                gap: 'var(--museo-space-3)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 'var(--museo-space-2) 0'
                }}>
                  <span style={{color: 'var(--museo-text-secondary)'}}>Gross Sales</span>
                  <span style={{
                    fontWeight: 'var(--museo-font-semibold)',
                    color: 'var(--museo-text-primary)'
                  }}>₱{stats.earnings.gross.toLocaleString()}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 'var(--museo-space-2) 0'
                }}>
                  <span style={{color: 'var(--museo-text-secondary)'}}>Platform Fee (4%)</span>
                  <span style={{
                    fontWeight: 'var(--museo-font-semibold)',
                    color: 'var(--museo-error)'
                  }}>-₱{stats.earnings.platformFee.toLocaleString()}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 'var(--museo-space-2) 0',
                  borderTop: '2px solid var(--museo-border)',
                  paddingTop: 'var(--museo-space-3)'
                }}>
                  <span style={{
                    fontWeight: 'var(--museo-font-semibold)',
                    color: 'var(--museo-text-primary)'
                  }}>Net Earnings</span>
                  <span style={{
                    fontWeight: 'var(--museo-font-bold)',
                    fontSize: 'var(--museo-text-lg)',
                    color: 'var(--museo-primary)'
                  }}>₱{stats.earnings.net.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Payout Info */}
            <div style={{
              background: 'var(--museo-white)',
              borderRadius: 'var(--museo-radius-lg)',
              padding: 'var(--museo-space-4)',
              border: '1px solid var(--museo-border)'
            }}>
              <h3 className="museo-heading" style={{
                fontSize: 'var(--museo-text-lg)',
                marginBottom: 'var(--museo-space-3)'
              }}>How Payouts Work</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: 'var(--museo-space-3)'
              }}>
                <div style={{
                  padding: 'var(--museo-space-3)',
                  background: 'var(--museo-bg-secondary)',
                  borderRadius: 'var(--museo-radius-md)',
                  textAlign: 'center'
                }}>
                  <div style={{
                    marginBottom: 'var(--museo-space-2)',
                    color: 'var(--museo-primary)'
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <h4 style={{
                    fontSize: 'var(--museo-text-base)',
                    fontWeight: 'var(--museo-font-semibold)',
                    marginBottom: 'var(--museo-space-1)'
                  }}>24-Hour Escrow</h4>
                  <p style={{
                    fontSize: 'var(--museo-text-sm)',
                    color: 'var(--museo-text-secondary)'
                  }}>Funds are held for 24 hours after delivery for buyer protection</p>
                </div>
                <div style={{
                  padding: 'var(--museo-space-3)',
                  background: 'var(--museo-bg-secondary)',
                  borderRadius: 'var(--museo-radius-md)',
                  textAlign: 'center'
                }}>
                  <div style={{
                    marginBottom: 'var(--museo-space-2)',
                    color: 'var(--museo-primary)'
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                      <line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                  </div>
                  <h4 style={{
                    fontSize: 'var(--museo-text-base)',
                    fontWeight: 'var(--museo-font-semibold)',
                    marginBottom: 'var(--museo-space-1)'
                  }}>GCash Payout</h4>
                  <p style={{
                    fontSize: 'var(--museo-text-sm)',
                    color: 'var(--museo-text-secondary)'
                  }}>Receive money directly to your GCash account</p>
                </div>
                <div style={{
                  padding: 'var(--museo-space-3)',
                  background: 'var(--museo-bg-secondary)',
                  borderRadius: 'var(--museo-radius-md)',
                  textAlign: 'center'
                }}>
                  <div style={{
                    marginBottom: 'var(--museo-space-2)',
                    color: 'var(--museo-primary)'
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="20" x2="18" y2="10"/>
                      <line x1="12" y1="20" x2="12" y2="4"/>
                      <line x1="6" y1="20" x2="6" y2="14"/>
                    </svg>
                  </div>
                  <h4 style={{
                    fontSize: 'var(--museo-text-base)',
                    fontWeight: 'var(--museo-font-semibold)',
                    marginBottom: 'var(--museo-space-1)'
                  }}>4% Platform Fee</h4>
                  <p style={{
                    fontSize: 'var(--museo-text-sm)',
                    color: 'var(--museo-text-secondary)'
                  }}>Low fees to help artists earn more</p>
                </div>
                <div style={{
                  padding: 'var(--museo-space-3)',
                  background: 'var(--museo-bg-secondary)',
                  borderRadius: 'var(--museo-radius-md)',
                  textAlign: 'center'
                }}>
                  <div style={{
                    marginBottom: 'var(--museo-space-2)',
                    color: 'var(--museo-primary)'
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                  </div>
                  <h4 style={{
                    fontSize: 'var(--museo-text-base)',
                    fontWeight: 'var(--museo-font-semibold)',
                    marginBottom: 'var(--museo-space-1)'
                  }}>Fast Processing</h4>
                  <p style={{
                    fontSize: 'var(--museo-text-sm)',
                    color: 'var(--museo-text-secondary)'
                  }}>Withdrawals processed within minutes</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div>
            <div style={{
              marginBottom: 'var(--museo-space-4)'
            }}>
              <h2 className="museo-heading" style={{
                fontSize: 'var(--museo-text-2xl)'
              }}>Payment Settings</h2>
              <p style={{
                color: 'var(--museo-text-secondary)',
                marginTop: 'var(--museo-space-1)'
              }}>Configure how you receive payouts</p>
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--museo-space-8)',
              background: 'var(--museo-white)',
              borderRadius: 'var(--museo-radius-lg)',
              textAlign: 'center',
              border: '1px solid var(--museo-border)'
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{
                color: 'var(--museo-text-muted)',
                marginBottom: 'var(--museo-space-3)'
              }}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <p style={{
                fontSize: 'var(--museo-text-lg)',
                color: 'var(--museo-text-secondary)'
              }}>Payment settings coming soon</p>
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
                <h4>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{verticalAlign: 'middle', marginRight: '6px'}}>
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  </svg>
                  Shipping Tips:
                </h4>
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
    </div>
  );
}