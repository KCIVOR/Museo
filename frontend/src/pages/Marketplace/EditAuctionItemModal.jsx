import React, { useState, useEffect } from 'react';
import MuseoModal, { MuseoModalBody, MuseoModalActions } from '../../components/MuseoModal';
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

          <div className="form-section">
            <h3 className="section-title">Categorization</h3>
            
            <div className="museo-form-group">
              <label htmlFor="categories" className="museo-label museo-label--required">
                Categories
              </label>
              <input
                type="text"
                id="categories"
                placeholder="e.g., Painting, Contemporary Art"
                value={formData.categories.join(', ')}
                onChange={(e) => handleArrayInputChange(e, 'categories')}
                className={`museo-input ${errors.categories ? 'museo-input--error' : ''}`}
              />
              <span className="museo-form-helper">Separate with commas</span>
              {errors.categories && <span className="museo-form-error">{errors.categories}</span>}
            </div>

            <div className="museo-form-group">
              <label htmlFor="tags" className="museo-label">
                Tags
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
