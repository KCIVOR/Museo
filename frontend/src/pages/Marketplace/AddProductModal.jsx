import React, { useState, useEffect } from 'react';
import MuseoModal, { MuseoModalBody, MuseoModalActions } from '../../components/MuseoModal';
import ImageUploadZone from '../../components/modal-features/ImageUploadZone';
import CategorySelector from '../../components/modal-features/CategorySelector';
import './css/addProductModal.css';

const API = import.meta.env.VITE_API_BASE;

const AddProductModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    medium: '',
    dimensions: '',
    year_created: '',
    weight_kg: '',
    is_original: true,
    is_framed: false,
    condition: 'excellent',
    quantity: '',
    categories: [],
    tags: [],
    is_available: true,
    is_featured: false,
    status: 'active',
  });
  
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dbCategoryOptions, setDbCategoryOptions] = useState([]);
  const [isLoadingDbCategories, setIsLoadingDbCategories] = useState(false);
  const [applyWatermark, setApplyWatermark] = useState(true);
  const [watermarkText, setWatermarkText] = useState("");

  // Load categories from DB (category table)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setIsLoadingDbCategories(true);
        const res = await fetch(`${API}/gallery/categories?page=1&limit=200&nocache=1`, { credentials: 'include' });
        if (!res.ok) throw new Error(`Failed to fetch categories (${res.status})`);
        const data = await res.json();
        const list = Array.isArray(data?.categories) ? data.categories : [];
        // Keep 'Other' last
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
        console.error('Failed to load DB categories for AddProductModal:', e);
        if (active) setDbCategoryOptions([]);
      } finally {
        if (active) setIsLoadingDbCategories(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleArrayInputChange = (e, field) => {
    const value = e.target.value;
    // Split by comma and trim each item
    const items = value.split(',').map(item => item.trim()).filter(item => item);
    setFormData(prev => ({
      ...prev,
      [field]: items
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Product title is required';
    } else if (formData.title.trim().length < 2) {
      newErrors.title = 'Title must be at least 2 characters long';
    }
    
    if (!formData.price || formData.price <= 0) {
      newErrors.price = 'Valid price is required';
    }
    
    if (!formData.medium) {
      newErrors.medium = 'Please specify the medium';
    }
    
    if (!formData.dimensions) {
      newErrors.dimensions = 'Please specify dimensions';
    }
    
    if (!formData.quantity || formData.quantity < 0) {
      newErrors.quantity = 'Valid quantity is required';
    }
    
    if (formData.categories.length === 0) {
      newErrors.categories = 'Please add at least one category';
    }
    
    if (images.length === 0) {
      newErrors.images = 'Please upload at least one product image';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create FormData for file upload
      const submitData = new FormData();
      
      // Add all text fields
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('price', formData.price);
      submitData.append('medium', formData.medium);
      submitData.append('dimensions', formData.dimensions);
      submitData.append('year_created', formData.year_created || '');
      submitData.append('weight_kg', formData.weight_kg || '');
      submitData.append('is_original', formData.is_original.toString());
      submitData.append('is_framed', formData.is_framed.toString());
      submitData.append('condition', formData.condition);
      submitData.append('quantity', formData.quantity);
      submitData.append('categories', JSON.stringify(formData.categories));
      submitData.append('tags', JSON.stringify(formData.tags));
      submitData.append('is_available', formData.is_available.toString());
      submitData.append('is_featured', formData.is_featured.toString());
      submitData.append('status', formData.status);
      // Watermark controls
      submitData.append('applyWatermark', applyWatermark.toString());
      if (watermarkText.trim()) {
        submitData.append('watermarkText', watermarkText.trim());
      }
      
      // Add images
      images.forEach((image) => {
        submitData.append('images', image.file);
      });
      
      // Submit to API
      const response = await fetch(`${API}/marketplace/items`, {
        method: 'POST',
        credentials: 'include',
        body: submitData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add product');
      }

      if (result.success) {
        // Reset form
        handleReset();
        
        // Call success callback
        if (onSuccess) {
          await onSuccess(result);
        }
        
        // Close modal
        onClose();
      }
      
    } catch (error) {
      console.error('Error adding product:', error);
      setErrors({ submit: error.message || 'Failed to add product. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      title: '',
      description: '',
      price: '',
      medium: '',
      dimensions: '',
      year_created: '',
      weight_kg: '',
      is_original: true,
      is_framed: false,
      condition: 'excellent',
      quantity: '',
      categories: [],
      tags: [],
      is_available: true,
      is_featured: false,
      status: 'active',
    });
    setImages([]);
    setErrors({});
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <MuseoModal
      open={isOpen}
      onClose={handleClose}
      title="Add New Product"
      subtitle="List a new product in your marketplace"
      size="lg"
    >
      <MuseoModalBody>
        <form onSubmit={handleSubmit} className="add-product-form">
          {/* Image Upload Section */}
          <ImageUploadZone
            type="multiple"
            maxFiles={10}
            title="Product Images"
            hint="Support: JPG, PNG up to 10MB • Maximum 10 images • First image will be primary"
            value={images}
            onChange={setImages}
            error={errors.images}
          />

          {/* Basic Information */}
          <div className="form-section">
            <h3 className="section-title">Basic Information</h3>
            
            {/* Title and Price */}
            <div className="form-row">
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
                <label htmlFor="price" className="museo-label museo-label--required">
                  Price ($)
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className={`museo-input ${errors.price ? 'museo-input--error' : ''}`}
                />
                {errors.price && <span className="museo-form-error">{errors.price}</span>}
              </div>
            </div>

            {/* Description */}
            <div className="museo-form-group">
              <label htmlFor="description" className="museo-label museo-label--required">
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

          {/* Product Details */}
          <div className="form-section">
            <h3 className="section-title">Product Details</h3>
            
            {/* Medium and Dimensions */}
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
                  placeholder="e.g., Oil on Canvas, Watercolor, Digital"
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
                  placeholder="e.g., 24x36 inches"
                  className={`museo-input ${errors.dimensions ? 'museo-input--error' : ''}`}
                />
                {errors.dimensions && <span className="museo-form-error">{errors.dimensions}</span>}
              </div>
            </div>
            
            {/* Year Created and Weight */}
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
                  placeholder="e.g., 2024"
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
                  placeholder="e.g., 2.5"
                  min="0"
                  step="0.1"
                  className="museo-input"
                />
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
            </div>
            
            {/* Checkboxes for Original and Framed */}
            <div className="form-row">
              <div className="museo-form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="is_original"
                    checked={formData.is_original}
                    onChange={handleInputChange}
                    className="museo-checkbox"
                  />
                  <span>Original Artwork</span>
                </label>
              </div>
              
              <div className="museo-form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="is_framed"
                    checked={formData.is_framed}
                    onChange={handleInputChange}
                    className="museo-checkbox"
                  />
                  <span>Framed</span>
                </label>
              </div>
              
              <div className="museo-form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="is_featured"
                    checked={formData.is_featured}
                    onChange={handleInputChange}
                    className="museo-checkbox"
                  />
                  <span>Feature this item</span>
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
          
          {/* Categories and Tags */}
          <div className="form-section">
            <h3 className="section-title">Categories & Tags</h3>
            
            <div className="form-row">
              <div className="museo-form-group" style={{ width: '100%' }}>
                <CategorySelector
                  selected={formData.categories}
                  onChange={(vals) => setFormData(prev => ({ ...prev, categories: vals }))}
                  error={errors.categories}
                  title="Categories"
                  description="Select categories that best describe this product"
                  options={dbCategoryOptions}
                  loading={isLoadingDbCategories}
                  maxPreview={16}
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="museo-form-group">
                <label htmlFor="tags" className="museo-label">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={formData.tags.join(', ')}
                  onChange={(e) => handleArrayInputChange(e, 'tags')}
                  placeholder="e.g., sunset, mountains, oil painting, framed"
                  className="museo-input"
                />
              </div>
            </div>
          </div>
          
          {/* Inventory & Status */}
          <div className="form-section">
            <h3 className="section-title">Inventory & Status</h3>
            
            <div className="form-row">
              <div className="museo-form-group">
                <label htmlFor="quantity" className="museo-label museo-label--required">
                  Quantity Available
                </label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  placeholder="1"
                  min="0"
                  className={`museo-input ${errors.quantity ? 'museo-input--error' : ''}`}
                />
                {errors.quantity && <span className="museo-form-error">{errors.quantity}</span>}
              </div>
              
              <div className="museo-form-group">
                <label htmlFor="status" className="museo-label">Item Status</label>
                <select 
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="museo-select"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending Approval</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              
              <div className="museo-form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="is_available"
                    checked={formData.is_available}
                    onChange={handleInputChange}
                    className="museo-checkbox"
                  />
                  <span>Available for Purchase</span>
                </label>
              </div>
            </div>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="museo-error-message" style={{ marginTop: 'var(--museo-space-4)' }}>
              {errors.submit}
            </div>
          )}

          {/* Actions */}
          <MuseoModalActions>
            <button 
              type="button" 
              className="btn btn-sm btn-secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-sm btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding Product...' : 'Add Product'}
            </button>
          </MuseoModalActions>
        </form>
      </MuseoModalBody>
    </MuseoModal>
  );
};

export default AddProductModal;
