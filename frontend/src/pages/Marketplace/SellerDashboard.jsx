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
  
  // Stats data
  const [stats, setStats] = useState({
    totalSales: 45250,
    totalOrders: 156,
    totalProducts: 28,
    earnings: {
      daily: 850,
      weekly: 5950,
      monthly: 23800
    },
    pendingOrders: 12,
    pendingShipments: 8
  });

  // Mock product data with new database structure
  const mockProducts = [
    {
      id: 1,
      marketItemId: "8140610e-e5ae-4757-a6a6-a36cab670176",
      name: "Urban Decay - Mixed Media Sculpture",
      title: "Urban Decay - Mixed Media Sculpture",
      description: "Contemporary mixed media sculpture exploring themes of urbanization and nature.",
      price: 3200,
      medium: "Mixed Media (Metal, Wood, Found Objects)",
      dimensions: "18x12x24 inches (HxWxD)",
      year_created: 2023,
      weight_kg: 4.5,
      is_original: true,
      is_framed: false,
      condition: "excellent",
      stock: 1,
      quantity: 1,
      category: "sculpture, mixed media, contemporary",
      categories: ["sculpture", "mixed media", "contemporary"],
      tags: ["sculpture", "mixed media", "contemporary art", "urban", "recycled"],
      status: "active",
      is_available: true,
      is_featured: false,
      sold: 0,
      views: 234,
      image: "https://images.unsplash.com/photo-1578301978018-3005759f48f7"
    },
    {
      id: 2,
      marketItemId: "09ec606e-e60a-4f3a-acfe-2864b09676bc",
      name: "Spring Garden - Watercolor Botanical Study",
      title: "Spring Garden - Watercolor Botanical Study",
      description: "Delicate watercolor painting featuring a variety of spring flowers.",
      price: 950,
      medium: "Watercolor on Paper",
      dimensions: "16x20 inches",
      year_created: 2024,
      weight_kg: 0.8,
      is_original: true,
      is_framed: true,
      condition: "excellent",
      stock: 1,
      quantity: 1,
      category: "floral, botanical, traditional",
      categories: ["floral", "botanical", "traditional"],
      tags: ["watercolor", "flowers", "spring", "botanical", "pastel"],
      status: "active",
      is_available: true,
      is_featured: false,
      sold: 5,
      views: 156,
      image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946"
    },
    {
      id: 3,
      marketItemId: "592f2d98-1fdd-4dc0-82ae-34e149e0ae25",
      name: "City Lights at Night - Limited Edition Print",
      title: "City Lights at Night - Limited Edition Print",
      description: "Stunning urban photography capturing the vibrant energy of city life after dark.",
      price: 450,
      medium: "Digital Photography Print",
      dimensions: "20x30 inches",
      year_created: 2024,
      weight_kg: 0.5,
      is_original: false,
      is_framed: true,
      condition: "excellent",
      stock: 15,
      quantity: 15,
      category: "photography, urban, prints",
      categories: ["photography", "urban", "prints"],
      tags: ["city", "night", "photography", "limited edition", "urban"],
      status: "active",
      is_available: true,
      is_featured: false,
      sold: 23,
      views: 890,
      image: "https://images.unsplash.com/photo-1514565131-fce0801e5785"
    }
  ];


  // Handle product added successfully
  const handleProductAdded = async (result) => {
    // Refresh products list
    await fetchProducts();
    alert(result.message || 'Product added successfully!');
  };

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API}/marketplace/items`, {
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setProducts(result.data);
        setStats(prev => ({
          ...prev,
          totalProducts: result.data.length
        }));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Load products on mount
  useEffect(() => {
    if (userData?.isSeller) {
      fetchProducts();
    }
  }, [userData]);

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
    navigate(`/marketplace/${product.id}`);
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

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="stat-card">
          <div className="stat-icon sales-icon">
            <SalesIcon size={28} color="#d4b48a" />
          </div>
          <div className="stat-content">
            <h3 className="stat-title">Total Sales</h3>
            <p className="stat-value">${stats.totalSales.toLocaleString()}</p>
            <span className="stat-change positive">+12% from last {selectedPeriod}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orders-icon">
            <OrdersIcon size={28} color="#8b5a3c" />
          </div>
          <div className="stat-content">
            <h3 className="stat-title">Total Orders</h3>
            <p className="stat-value">{stats.totalOrders}</p>
            <span className="stat-badge">{stats.pendingOrders} pending</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon products-icon">
            <ProductsIcon size={28} color="#6e4a2e" />
          </div>
          <div className="stat-content">
            <h3 className="stat-title">Products Listed</h3>
            <p className="stat-value">{stats.totalProducts}</p>
            <span className="stat-info">{products.filter(p => p.status === 'active').length} active</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon earnings-icon">
            <EarningsIcon size={28} color="#b8956f" />
          </div>
          <div className="stat-content">
            <h3 className="stat-title">Earnings</h3>
            <p className="stat-value">
              ${selectedPeriod === 'daily' ? stats.earnings.daily :
                 selectedPeriod === 'weekly' ? stats.earnings.weekly :
                 stats.earnings.monthly}
            </p>
            <span className="stat-period">{selectedPeriod}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon shipment-icon">
            <ShipmentIcon size={28} color="#9c8668" />
          </div>
          <div className="stat-content">
            <h3 className="stat-title">Pending Shipments</h3>
            <p className="stat-value">{stats.pendingShipments}</p>
            <button className="btn btn-outline btn-sm">View All</button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="dashboard-content">
        {/* Product List Table */}
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

            {products.length === 0 && (
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

        {/* Quick Actions */}
        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="action-grid">
            <button className="quick-action-btn">
              <CalendarIcon size={20} />
              Schedule Discount
            </button>
            <button className="quick-action-btn">
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
      </div>
      
      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleProductAdded}
      />
    </div>
  );
}