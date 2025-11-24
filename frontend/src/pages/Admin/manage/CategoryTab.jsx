import { useState, useEffect } from 'react';
import ConfirmModal from '../../Shared/ConfirmModal';
import '../../../styles/main.css';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';

export default function CategoryTab() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', slug: '', active: true, sortOrder: 0 });
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      console.log('Fetching categories from:', `${API}/users/admin/categories`);
      const res = await fetch(`${API}/users/admin/categories`, {
        credentials: 'include'
      });
      const data = await res.json();
      console.log('Categories response:', data);
      
      if (data.success) {
        setCategories(data.data || []);
        console.log('Categories loaded:', data.data?.length || 0);
      } else {
        console.error('API error:', data.error);
        showMessage('error', data.error || 'Failed to fetch categories');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      showMessage('error', 'Failed to fetch categories: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      showMessage('error', 'Category name is required');
      return;
    }

    try {
      setLoading(true);
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId 
        ? `${API}/users/admin/categories/${editingId}`
        : `${API}/users/admin/categories`;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      
      if (data.success) {
        showMessage('success', editingId ? 'Category updated successfully' : 'Category created successfully');
        setFormData({ name: '', slug: '', active: true, sortOrder: 0 });
        setEditingId(null);
        fetchCategories();
      } else {
        showMessage('error', data.error || 'Failed to save category');
      }
    } catch (error) {
      console.error('Error saving category:', error);
      showMessage('error', 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', slug: '', active: true, sortOrder: 0 });
    setEditingId(null);
  };

  const openDeleteConfirm = (category) => {
    setCategoryToDelete(category);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;

    try {
      setLoading(true);
      const url = `${API}/users/admin/categories/${categoryToDelete.categoryId}`;
      console.log('Deleting category from:', url);
      
      const res = await fetch(url, {
        method: 'DELETE',
        credentials: 'include'
      });

      console.log('Delete response status:', res.status);
      const data = await res.json();
      console.log('Delete response data:', data);
      
      if (data.success) {
        showMessage('success', 'Category deleted successfully');
        setDeleteConfirmOpen(false);
        setCategoryToDelete(null);
        fetchCategories();
      } else {
        showMessage('error', data.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      showMessage('error', 'Failed to delete category: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setCategoryToDelete(null);
  };

  return (
    <div style={{ padding: 'var(--museo-space-6)' }}>
      {/* Message Alert */}
      {message.text && (
        <div className={`museo-alert museo-alert--${message.type}`} style={{ marginBottom: 'var(--museo-space-4)' }}>
          {message.text}
        </div>
      )}

      {/* Create/Edit Form */}
      <div className="museo-card" style={{ padding: 'var(--museo-space-5)', marginBottom: 'var(--museo-space-6)' }}>
        <h2 className="museo-heading" style={{ fontSize: 'var(--museo-text-lg)', marginBottom: 'var(--museo-space-4)' }}>
          {editingId ? 'Edit Category' : 'Create New Category'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--museo-space-4)', marginBottom: 'var(--museo-space-4)' }}>
            <div className="museo-form-group">
              <label className="museo-label">Category Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Painting, Sculpture"
                className="museo-input"
                disabled={loading}
              />
            </div>

            <div className="museo-form-group">
              <label className="museo-label">Slug</label>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleInputChange}
                placeholder="e.g., painting, sculpture"
                className="museo-input"
                disabled={loading}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--museo-space-4)', marginBottom: 'var(--museo-space-4)' }}>
            <div className="museo-form-group">
              <label className="museo-label">Sort Order</label>
              <input
                type="number"
                name="sortOrder"
                value={formData.sortOrder}
                onChange={handleInputChange}
                placeholder="0"
                className="museo-input"
                disabled={loading}
              />
            </div>

            <div className="museo-form-group">
              <label className="museo-switch">
                <input
                  type="checkbox"
                  name="active"
                  checked={formData.active}
                  onChange={handleInputChange}
                  disabled={loading}
                />
                <span>Active</span>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--museo-space-3)' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : editingId ? 'Update Category' : 'Create Category'}
            </button>
            {editingId && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Categories List */}
      <div className="museo-card" style={{ padding: 'var(--museo-space-5)' }}>
        <h2 className="museo-heading" style={{ fontSize: 'var(--museo-text-lg)', marginBottom: 'var(--museo-space-4)' }}>
          All Categories ({categories.length})
        </h2>

        {loading && !categories.length ? (
          <div style={{ textAlign: 'center', padding: 'var(--museo-space-6)', color: 'var(--museo-text-muted)' }}>
            Loading categories...
          </div>
        ) : categories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--museo-space-6)', color: 'var(--museo-text-muted)' }}>
            No categories yet. Create one to get started!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--museo-border)', backgroundColor: 'var(--museo-bg-secondary)' }}>
                  <th style={{ padding: 'var(--museo-space-3)', textAlign: 'left', fontWeight: 'var(--museo-font-bold)', fontSize: 'var(--museo-text-sm)' }}>ID</th>
                  <th style={{ padding: 'var(--museo-space-3)', textAlign: 'left', fontWeight: 'var(--museo-font-bold)', fontSize: 'var(--museo-text-sm)' }}>Name</th>
                  <th style={{ padding: 'var(--museo-space-3)', textAlign: 'left', fontWeight: 'var(--museo-font-bold)', fontSize: 'var(--museo-text-sm)' }}>Slug</th>
                  <th style={{ padding: 'var(--museo-space-3)', textAlign: 'center', fontWeight: 'var(--museo-font-bold)', fontSize: 'var(--museo-text-sm)' }}>Status</th>
                  <th style={{ padding: 'var(--museo-space-3)', textAlign: 'center', fontWeight: 'var(--museo-font-bold)', fontSize: 'var(--museo-text-sm)' }}>Sort Order</th>
                  <th style={{ padding: 'var(--museo-space-3)', textAlign: 'center', fontWeight: 'var(--museo-font-bold)', fontSize: 'var(--museo-text-sm)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(category => (
                  <tr key={category.categoryId} style={{ borderBottom: '1px solid var(--museo-border)', backgroundColor: 'var(--museo-white)' }}>
                    <td style={{ padding: 'var(--museo-space-3)', fontSize: 'var(--museo-text-sm)', color: 'var(--museo-text-muted)' }}>
                      {category.categoryId}
                    </td>
                    <td style={{ padding: 'var(--museo-space-3)', fontSize: 'var(--museo-text-base)' }}>
                      <strong>{category.name}</strong>
                    </td>
                    <td style={{ padding: 'var(--museo-space-3)', color: 'var(--museo-text-secondary)', fontSize: 'var(--museo-text-sm)' }}>
                      {category.slug || '—'}
                    </td>
                    <td style={{ padding: 'var(--museo-space-3)', textAlign: 'center' }}>
                      <span className={`museo-badge ${category.active ? 'museo-badge--success' : 'museo-badge--warning'}`}>
                        {category.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: 'var(--museo-space-3)', textAlign: 'center', fontSize: 'var(--museo-text-sm)', color: 'var(--museo-text-muted)' }}>
                      {category.sortOrder ?? '0'}
                    </td>
                    <td style={{ padding: 'var(--museo-space-3)', textAlign: 'center' }}>
                      <button
                        className="btn btn-sm btn-ghost"
                        style={{ color: 'var(--museo-error)' }}
                        onClick={() => openDeleteConfirm(category)}
                        disabled={loading}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={deleteConfirmOpen}
        title="Delete Category"
        message={`Are you sure you want to delete "${categoryToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}
