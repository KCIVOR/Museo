import React, { useState, useEffect } from 'react';
import MuseoModal, { MuseoModalBody, MuseoModalActions } from '../../components/MuseoModal';
import CategorySelector from '../../components/modal-features/CategorySelector';
import './css/addProductModal.css';

const API = import.meta.env.VITE_API_BASE;

const EditAuctionItemModal = ({ isOpen, onClose, item, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    medium: '',
    dimensions: '',
    year_created: '',
    weight_kg: '',
    is_original: true,
    is_framed: false,
    condition: 'excellent',
    categories: [],
    tags: [],
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applyWatermark, setApplyWatermark] = useState(true);
  const [watermarkText, setWatermarkText] = useState("");
  const [dbCategoryOptions, setDbCategoryOptions] = useState([]);
  const [isLoadingDbCategories, setIsLoadingDbCategories] = useState(false);

  // Load categories from DB
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setIsLoadingDbCategories(true);
        const res = await fetch(`${API}/gallery/categories?page=1&limit=200&nocache=1`, { credentials: 'include' });
        if (!res.ok) throw new Error(`Failed to fetch categories (${res.status})`);
        const data = await res.json();
        const list = Array.isArray(data?.categories) ? data.categories : [];
        const sorted = list.sort((a, b) => {
          if (a.slug === 'other') return 1;
          if (b.slug === 'other') return -1;
          return 0;
        });
        const opts = sorted.map(c => ({
          value: String(c.slug ?? c.categoryId ?? c.name),
          label: String(c.name ?? c.slug ?? c.categoryId)
        }));
        if (!active) return;
        setDbCategoryOptions(opts);
      } catch (e) {
        console.error('Failed to load DB categories:', e);
        if (active) setDbCategoryOptions([]);
      } finally {
        if (active) setIsLoadingDbCategories(false);
      }
    })();
    return () => { active = false; };
  }, []);

  // Pre-fill form when item changes
  useEffect(() => {
    if (item && isOpen) {
      setFormData({
        title: item.title || '',
        description: item.description || '',
        medium: item.medium || '',
        dimensions: item.dimensions || '',
        year_created: item.year_created || '',
        weight_kg: item.weight_kg || '',
        is_original: item.is_original || true,
        is_framed: item.is_framed || false,
        condition: item.condition || 'excellent',
        categories: Array.isArray(item.categories) ? item.categories : [],
        tags: Array.isArray(item.tags) ? item.tags : [],
      });
      setErrors({});
    }
  }, [item, isOpen]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleArrayInputChange = (e, field) => {
    const items = e.target.value.split(',').map(item => item.trim()).filter(item => item);
    setFormData(prev => ({ ...prev, [field]: items }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim() || formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }
    if (!formData.medium) newErrors.medium = 'Medium is required';
    if (!formData.dimensions) newErrors.dimensions = 'Dimensions are required';
    if (formData.categories.length === 0) newErrors.categories = 'Add at least one category';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const submitData = {
        title: formData.title,
        description: formData.description,
        medium: formData.medium,
        dimensions: formData.dimensions,
        year_created: formData.year_created ? parseInt(formData.year_created) : null,
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
        is_original: formData.is_original,
        is_framed: formData.is_framed,
        condition: formData.condition,
        categories: formData.categories,
        tags: formData.tags,
        applyWatermark: applyWatermark.toString(),
        watermarkText: watermarkText.trim() || '',
      };

      const response = await fetch(`${API}/auctions/items/${item.auctionItemId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      const result = await response.json();
      if (result.success) {
        onSuccess && onSuccess(result.data);
        onClose();
      } else {
        setErrors({ submit: result.error || 'Failed to update item' });
      }
    } catch (error) {
      console.error('Error updating item:', error);
      setErrors({ submit: 'An error occurred while updating the item' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MuseoModal
      open={isOpen}
      onClose={onClose}
      title="Edit Auction Item"
      subtitle="Update your artwork details"
      size="lg"
    >
      <MuseoModalBody>
        <form onSubmit={handleSubmit} className="add-product-form">
          <div className="form-section">
            <h3 className="section-title">Basic Information</h3>
            
            <div className="museo-form-group">
              <label htmlFor="title" className="museo-label museo-label--required">
                Product Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Sunset Over Mountains"
                className={`museo-input ${errors.title ? 'museo-input--error' : ''}`}
              />
              {errors.title && <span className="museo-form-error">{errors.title}</span>}
            </div>

            <div className="museo-form-group">
              <label htmlFor="description" className="museo-label">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="4"
                placeholder="Describe your product in detail..."
                className="museo-textarea"
              />
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">Product Details</h3>
            
            <div className="form-row">
              <div className="museo-form-group">
                <label htmlFor="medium" className="museo-label museo-label--required">
                  Medium
                </label>
                <input
                  type="text"
                  id="medium"
                  name="medium"
                  value={formData.medium}
                  onChange={handleInputChange}
                  placeholder="e.g., Oil on Canvas"
                  className={`museo-input ${errors.medium ? 'museo-input--error' : ''}`}
                />
                {errors.medium && <span className="museo-form-error">{errors.medium}</span>}
              </div>

              <div className="museo-form-group">
                <label htmlFor="dimensions" className="museo-label museo-label--required">
                  Dimensions
                </label>
                <input
                  type="text"
                  id="dimensions"
                  name="dimensions"
                  value={formData.dimensions}
                  onChange={handleInputChange}
                  placeholder="e.g., 50x70 cm"
                  className={`museo-input ${errors.dimensions ? 'museo-input--error' : ''}`}
                />
                {errors.dimensions && <span className="museo-form-error">{errors.dimensions}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="museo-form-group">
                <label htmlFor="year_created" className="museo-label">
                  Year Created
                </label>
                <input
                  type="number"
                  id="year_created"
                  name="year_created"
                  value={formData.year_created}
                  onChange={handleInputChange}
                  placeholder="e.g., 2020"
                  min="1900"
                  max={new Date().getFullYear()}
                  className="museo-input"
                />
              </div>

              <div className="museo-form-group">
                <label htmlFor="weight_kg" className="museo-label">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  id="weight_kg"
                  name="weight_kg"
                  value={formData.weight_kg}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.1"
                  min="0"
                  className="museo-input"
                />
              </div>
            </div>

            <div className="museo-form-group">
              <label htmlFor="condition" className="museo-label museo-label--required">
                Condition
              </label>
              <select
                id="condition"
                name="condition"
                value={formData.condition}
                onChange={handleInputChange}
                className="museo-select"
              >
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>

            <div className="form-row">
              <div className="museo-form-group">
                <label className="museo-checkbox-label">
                  <input
                    type="checkbox"
                    id="is_original"
                    name="is_original"
                    checked={formData.is_original}
                    onChange={handleInputChange}
                    className="museo-checkbox"
                  />
                  <span>Original Artwork</span>
                </label>
              </div>

              <div className="museo-form-group">
                <label className="museo-checkbox-label">
                  <input
                    type="checkbox"
                    id="is_framed"
                    name="is_framed"
                    checked={formData.is_framed}
                    onChange={handleInputChange}
                    className="museo-checkbox"
                  />
                  <span>Framed</span>
                </label>
              </div>
            </div>
          </div>

          {/* Protection */}
          <div className="form-section">
            <h3 className="section-title">Protection</h3>
            <div className="museo-form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  className="museo-checkbox"
                  checked={applyWatermark}
                  onChange={(e) => setApplyWatermark(e.target.checked)}
                />
                <span>Protect images with watermark</span>
              </label>
              {applyWatermark && (
                <div style={{ marginTop: '8px', paddingLeft: '28px' }}>
                  <label className="museo-label" style={{ fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                    Custom watermark text (optional)
                  </label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    className="museo-input"
                    placeholder={`© Your Name ${new Date().getFullYear()} • Museo`}
                    style={{ fontSize: '14px' }}
                  />
                  <span className="museo-form-helper">Leave blank to use default format with your username</span>
                </div>
              )}
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">Categorization</h3>
            
            <div className="museo-form-group" style={{ width: '100%' }}>
              <CategorySelector
                selected={formData.categories}
                onChange={(vals) => setFormData(prev => ({ ...prev, categories: vals }))}
                error={errors.categories}
                title="Categories"
                description="Select categories that best describe this item"
                options={dbCategoryOptions}
                loading={isLoadingDbCategories}
                maxPreview={16}
              />
            </div>

            <div className="museo-form-group">
              <label htmlFor="tags" className="museo-label">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                id="tags"
                placeholder="e.g., abstract, modern"
                value={formData.tags.join(', ')}
                onChange={(e) => handleArrayInputChange(e, 'tags')}
                className="museo-input"
              />
              <span className="museo-form-helper">Separate with commas</span>
            </div>
          </div>

          {errors.submit && (
            <div className="museo-notice museo-notice--error">
              {errors.submit}
            </div>
          )}
        </form>
      </MuseoModalBody>

      <MuseoModalActions>
        <button 
          className="btn btn-sm btn-ghost"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button 
          className="btn btn-sm btn-primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </MuseoModalActions>
    </MuseoModal>
  );
};

export default EditAuctionItemModal;
