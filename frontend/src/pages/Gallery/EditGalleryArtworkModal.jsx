import React, { useState, useEffect } from 'react';
import MuseoModal, { MuseoModalBody, MuseoModalActions } from '../../components/MuseoModal';
import ImageUploadZone from '../../components/modal-features/ImageUploadZone';
import CategorySelector from '../../components/modal-features/CategorySelector';
import './css/UploadArtModal.css';

const API = import.meta.env.VITE_API_BASE;

const EditGalleryArtworkModal = ({ isOpen, onClose, artwork, onArtworkUpdated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    medium: '',
  });
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [applyWatermark, setApplyWatermark] = useState(true);
  const [watermarkText, setWatermarkText] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagesToRemove, setImagesToRemove] = useState([]);

  const categoriesList = [
    'Classical Art', 'Abstract Art', 'Impressionist', 'Contemporary Art',
    'Digital Art', 'Photography', 'Sculpture', 'Street Art', 'Landscape',
    'Portrait', 'Surrealist', 'Minimalist', 'Expressionist', 'Realism', 'Conceptual'
  ];


  // Initialize form with artwork data
  useEffect(() => {
    if (!isOpen || !artwork) return;
    
    const artworkImages = artwork.image || [];
    const imageArray = Array.isArray(artworkImages) ? artworkImages : (artworkImages ? [artworkImages] : []);
    
    setFormData({
      title: artwork.title || '',
      description: artwork.description || '',
      medium: artwork.medium || '',
    });
    setCategories(artwork.categories || []);
    
    // Convert existing images to ImageUploadZone format
    const existingImagesFormatted = imageArray.map((url, index) => ({
      id: `existing-${index}`,
      url: url,
      preview: url,
      isExisting: true
    }));
    setImages(existingImagesFormatted);
    
    setImagesToRemove([]);
    setErrors({});
  }, [isOpen, artwork]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle image changes from ImageUploadZone
  const handleImagesChange = (newImages) => {
    // Track removed existing images
    const currentExistingUrls = images.filter(img => img.isExisting).map(img => img.url);
    const newExistingUrls = newImages.filter(img => img.isExisting).map(img => img.url);
    const removed = currentExistingUrls.filter(url => !newExistingUrls.includes(url));
    
    if (removed.length > 0) {
      setImagesToRemove(prev => [...prev, ...removed]);
    }
    
    setImages(newImages);
    
    if (errors.images) {
      setErrors(prev => ({ ...prev, images: '' }));
    }
  };


  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Artwork title is required';
    } else if (formData.title.trim().length < 2) {
      newErrors.title = 'Title must be at least 2 characters long';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters long';
    }
    
    if (!formData.medium.trim()) {
      newErrors.medium = 'Medium is required';
    } else if (formData.medium.trim().length < 2) {
      newErrors.medium = 'Medium must be at least 2 characters long';
    }
    
    if (categories.length === 0) {
      newErrors.categories = 'Please select at least one category';
    }
    
    if (images.length === 0) {
      newErrors.images = 'Please keep at least one image or upload new ones';
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
      const artworkId = artwork?.id || artwork?.galleryArtId;
      
      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('medium', formData.medium);
      submitData.append('categories', JSON.stringify(categories));
      
      // Add existing images that weren't removed
      images.filter(img => img.isExisting).forEach(img => {
        submitData.append('existingImages', img.url);
      });

      // Add new image files
      images.filter(img => !img.isExisting && img.file).forEach(img => {
        submitData.append('images', img.file);
      });

      // Add images to remove
      imagesToRemove.forEach(imageUrl => {
        submitData.append('imagesToRemove', imageUrl);
      });

      // Add watermark preferences (only for new images)
      const newImageFiles = images.filter(img => !img.isExisting && img.file);
      if (newImageFiles.length > 0) {
        submitData.append('applyWatermark', applyWatermark.toString());
        if (watermarkText.trim()) {
          submitData.append('watermarkText', watermarkText.trim());
        }
      }

      const response = await fetch(`${API}/gallery/artwork/${artworkId}`, {
        method: 'PUT',
        credentials: 'include',
        body: submitData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update artwork');
      }

      const data = await response.json();
      
      onArtworkUpdated?.(data.artwork);
      onClose();
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to update artwork. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MuseoModal
      open={isOpen}
      onClose={onClose}
      title="Edit Artwork"
      subtitle="Update your artwork details"
      size="lg"
      nested={true}
    >
      <MuseoModalBody>
        <form onSubmit={handleSubmit} style={{ display: 'block' }}>
          {/* Image Upload - Full Width */}
          <ImageUploadZone
            type="multiple"
            maxFiles={5}
            title="Artwork Images"
            hint="Support: JPG, PNG up to 10MB • Maximum 5 images"
            value={images}
            onChange={handleImagesChange}
            error={errors.images}
          />

          {/* Form Fields - 2 Column Grid */}
          <div className="museo-form-grid" style={{ marginTop: '32px' }}>
            <div className="museo-form-field">
              <label className="museo-label">Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={`museo-input ${errors.title ? 'museo-input--error' : ''}`}
                placeholder="Enter artwork title"
              />
              {errors.title && <div className="museo-error-message">{errors.title}</div>}
            </div>

            <div className="museo-form-field">
              <label className="museo-label">Medium *</label>
              <input
                type="text"
                name="medium"
                value={formData.medium}
                onChange={handleInputChange}
                className={`museo-input ${errors.medium ? 'museo-input--error' : ''}`}
                placeholder="e.g., Oil on Canvas, Digital Art, Watercolor..."
              />
              {errors.medium && <div className="museo-error-message">{errors.medium}</div>}
            </div>

            <div className="museo-form-field museo-form-field--full">
              <label className="museo-label">Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className={`museo-textarea ${errors.description ? 'museo-input--error' : ''}`}
                placeholder="Describe your artwork, inspiration, or technique..."
                rows="4"
              />
              {errors.description && <div className="museo-error-message">{errors.description}</div>}
            </div>
          </div>

          {/* Categories */}
          <CategorySelector
            selected={categories}
            onChange={setCategories}
            error={errors.categories}
            title="Categories"
            description="Select categories that best describe your artwork"
          />

          {/* Watermark Toggle - Only show if adding new images */}
          {images.some(img => !img.isExisting) && (
            <div className="museo-form-field museo-form-field--full" style={{ marginTop: '24px' }}>
              <label className="museo-checkbox-container">
                <input
                  type="checkbox"
                  checked={applyWatermark}
                  onChange={(e) => setApplyWatermark(e.target.checked)}
                  className="museo-checkbox"
                />
                <span className="museo-checkbox-label">
                  <strong>🔒 Protect new images with watermark</strong>
                  <small style={{ display: 'block', marginTop: '4px', color: 'var(--museo-text-muted)', fontWeight: 'normal' }}>
                    Add watermark to newly uploaded images (existing images remain unchanged)
                  </small>
                </span>
              </label>
              
              {applyWatermark && (
                <div style={{ marginTop: '12px', paddingLeft: '32px' }}>
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
                  <small style={{ display: 'block', marginTop: '6px', color: 'var(--museo-text-muted)', fontSize: '12px' }}>
                    Leave blank to use default format with your username
                  </small>
                </div>
              )}
            </div>
          )}

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
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update Artwork'}
            </button>
          </MuseoModalActions>
        </form>
      </MuseoModalBody>
    </MuseoModal>
  );
};

export default EditGalleryArtworkModal;
