// Rovick Ayusin mo nalang

import React, { useState } from 'react';
import MuseoModal, { MuseoModalBody, MuseoModalActions } from '../../components/MuseoModal';
import ImageUploadZone from '../../components/modal-features/ImageUploadZone';
import './css/addProductModal.css';

const API = import.meta.env.VITE_API_BASE;

const AddAuctionProductModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    starting_bid: '',
    reserve_price: '',
    auction_start_date: '',
    auction_end_date: '',
    medium: '',
    dimensions: '',
    year_created: '',
    weight_kg: '',
    is_original: true,
    is_framed: false,
    condition: 'excellent',
    categories: [],
    tags: [],
    status: 'active',
  });
  
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    
    if (!formData.starting_bid || formData.starting_bid <= 0) {
      newErrors.starting_bid = 'Valid starting bid is required';
    }
    
    if (!formData.reserve_price || formData.reserve_price <= 0) {
      newErrors.reserve_price = 'Valid reserve price is required';
    }

    if (parseFloat(formData.reserve_price) < parseFloat(formData.starting_bid)) {
      newErrors.reserve_price = 'Reserve price must be greater than or equal to starting bid';
    }
    
    if (!formData.auction_start_date) {
      newErrors.auction_start_date = 'Auction start date is required';
    }
    
    if (!formData.auction_end_date) {
      newErrors.auction_end_date = 'Auction end date is required';
    }

    if (formData.auction_end_date && formData.auction_start_date && 
        new Date(formData.auction_end_date) <= new Date(formData.auction_start_date)) {
      newErrors.auction_end_date = 'End date must be after start date';
    }
    
    if (!formData.medium) {
      newErrors.medium = 'Please specify the medium';
    }
    
    if (!formData.dimensions) {
      newErrors.dimensions = 'Please specify dimensions';
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
      // Create FormData for multipart upload
      const submitData = new FormData();
      
      // Add text fields
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('starting_bid', formData.starting_bid);
      submitData.append('reserve_price', formData.reserve_price);
      submitData.append('auction_start_date', formData.auction_start_date);
      submitData.append('auction_end_date', formData.auction_end_date);
      submitData.append('medium', formData.medium);
      submitData.append('dimensions', formData.dimensions);
      submitData.append('year_created', formData.year_created);
      submitData.append('weight_kg', formData.weight_kg);
      submitData.append('is_original', formData.is_original);
      submitData.append('is_framed', formData.is_framed);
      submitData.append('condition', formData.condition);
      submitData.append('categories', JSON.stringify(formData.categories));
      submitData.append('tags', JSON.stringify(formData.tags));
      submitData.append('status', formData.status);
      submitData.append('listingType', 'auction');

      // Add images
      images.forEach((image) => {
        submitData.append('images', image.file);
      });

      const response = await fetch(`${API}/marketplace/items`, {
        method: 'POST',
        credentials: 'include',
        body: submitData
      });

      const result = await response.json();

      if (result.success) {
        // Reset form
        setFormData({
          title: '',
          description: '',
          starting_bid: '',
          reserve_price: '',
          auction_start_date: '',
          auction_end_date: '',
          medium: '',
          dimensions: '',
          year_created: '',
          weight_kg: '',
          is_original: true,
          is_framed: false,
          condition: 'excellent',
          categories: [],
          tags: [],
          status: 'active',
        });
        setImages([]);
        setErrors({});
        
        onSuccess && onSuccess(result);
        onClose();
      } else {
        setErrors({ submit: result.error || 'Failed to create auction product' });
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ submit: 'An error occurred while creating the auction product' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      starting_bid: '',
      reserve_price: '',
      auction_start_date: '',
      auction_end_date: '',
      medium: '',
      dimensions: '',
      year_created: '',
      weight_kg: '',
      is_original: true,
      is_framed: false,
      condition: 'excellent',
      categories: [],
      tags: [],
      status: 'active',
    });
    setImages([]);
    setErrors({});
    onClose();
  };

  return (
    <MuseoModal
      open={isOpen}
      onClose={handleClose}
      title="Add Auction Product"
      subtitle="List a new auction item in your marketplace"
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
            
            {/* Title and Description */}
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

          {/* Auction Details */}
          <div className="form-section">
            <h3 className="section-title">Auction Details</h3>
            
            {/* Starting Bid and Reserve Price */}
            <div className="form-row">
              <div className="museo-form-group">
                <label htmlFor="starting_bid" className="museo-label museo-label--required">
                  Starting Bid (₱)
                </label>
                <input
                  type="number"
                  id="starting_bid"
                  name="starting_bid"
                  value={formData.starting_bid}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className={`museo-input ${errors.starting_bid ? 'museo-input--error' : ''}`}
                />
                {errors.starting_bid && <span className="museo-form-error">{errors.starting_bid}</span>}
              </div>

              <div className="museo-form-group">
                <label htmlFor="reserve_price" className="museo-label museo-label--required">
                  Reserve Price (₱)
                </label>
                <input
                  type="number"
                  id="reserve_price"
                  name="reserve_price"
                  value={formData.reserve_price}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className={`museo-input ${errors.reserve_price ? 'museo-input--error' : ''}`}
                />
                {errors.reserve_price && <span className="museo-form-error">{errors.reserve_price}</span>}
              </div>
            </div>

            {/* Auction Dates */}
            <div className="form-row">
              <div className="museo-form-group">
                <label htmlFor="auction_start_date" className="museo-label museo-label--required">
                  Auction Start Date
                </label>
                <input
                  type="datetime-local"
                  id="auction_start_date"
                  name="auction_start_date"
                  value={formData.auction_start_date}
                  onChange={handleInputChange}
                  className={`museo-input ${errors.auction_start_date ? 'museo-input--error' : ''}`}
                />
                {errors.auction_start_date && <span className="museo-form-error">{errors.auction_start_date}</span>}
              </div>

              <div className="museo-form-group">
                <label htmlFor="auction_end_date" className="museo-label museo-label--required">
                  Auction End Date
                </label>
                <input
                  type="datetime-local"
                  id="auction_end_date"
                  name="auction_end_date"
                  value={formData.auction_end_date}
                  onChange={handleInputChange}
                  className={`museo-input ${errors.auction_end_date ? 'museo-input--error' : ''}`}
                />
                {errors.auction_end_date && <span className="museo-form-error">{errors.auction_end_date}</span>}
              </div>
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
                  placeholder="e.g., 50x70 cm"
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

            {/* Condition */}
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

            {/* Original and Framed Checkboxes */}
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

          {/* Categories and Tags */}
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
              <span className="museo-form-helper">Separate multiple categories with commas</span>
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
              <span className="museo-form-helper">Separate multiple tags with commas</span>
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
          className="btn btn-ghost"
          onClick={handleClose}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button 
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating...' : 'Create Auction'}
        </button>
      </MuseoModalActions>
    </MuseoModal>
  );
};

export default AddAuctionProductModal;
