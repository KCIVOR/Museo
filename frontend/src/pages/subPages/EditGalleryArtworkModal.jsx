import React, { useState, useEffect } from 'react';
import './css/UploadArtModal.css';

const API = import.meta.env.VITE_API_BASE;

const EditGalleryArtworkModal = ({ isOpen, onClose, artwork, onArtworkUpdated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    medium: '',
    categories: [],
    existingImages: [],
    newImages: []
  });
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagesToRemove, setImagesToRemove] = useState([]);

  const categories = [
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
      categories: artwork.categories || [],
      existingImages: imageArray,
      newImages: []
    });
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

  const handleCategoryToggle = (category) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(cat => cat !== category)
        : [...prev.categories, category]
    }));
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const handleFiles = (files) => {
    const totalImages = formData.existingImages.length + formData.newImages.length;
    
    if (totalImages + files.length > 5) {
      setErrors(prev => ({
        ...prev,
        images: 'Maximum 5 images allowed'
      }));
      return;
    }

    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isNotGif = file.type !== 'image/gif';
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      return isImage && isNotGif && isValidSize;
    });

    if (validFiles.length !== files.length) {
      setErrors(prev => ({
        ...prev,
        images: 'Some files were rejected. Only JPG, PNG images under 10MB are allowed (no GIFs).'
      }));
    }

    // Create preview URLs
    const newImages = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Date.now() + Math.random(),
      isNew: true
    }));

    setFormData(prev => ({
      ...prev,
      newImages: [...prev.newImages, ...newImages]
    }));
  };

  const removeExistingImage = (imageUrl) => {
    setFormData(prev => ({
      ...prev,
      existingImages: prev.existingImages.filter(img => img !== imageUrl)
    }));
    setImagesToRemove(prev => [...prev, imageUrl]);
  };

  const removeNewImage = (imageId) => {
    setFormData(prev => {
      const imageToRemove = prev.newImages.find(img => img.id === imageId);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      return {
        ...prev,
        newImages: prev.newImages.filter(img => img.id !== imageId)
      };
    });
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
    
    if (formData.categories.length === 0) {
      newErrors.categories = 'Please select at least one category';
    }
    
    if (formData.existingImages.length === 0 && formData.newImages.length === 0) {
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
      submitData.append('categories', JSON.stringify(formData.categories));
      
      // Add existing images that weren't removed
      formData.existingImages.forEach(imageUrl => {
        submitData.append('existingImages', imageUrl);
      });

      // Add new image files
      formData.newImages.forEach(imageObj => {
        submitData.append('images', imageObj.file);
      });

      // Add images to remove
      imagesToRemove.forEach(imageUrl => {
        submitData.append('imagesToRemove', imageUrl);
      });

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
      
      // Clean up object URLs
      formData.newImages.forEach(imageObj => {
        URL.revokeObjectURL(imageObj.preview);
      });
      
      onArtworkUpdated?.(data.artwork);
      onClose();
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to update artwork. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const allImages = [
    ...formData.existingImages.map(url => ({ id: url, url, isExisting: true })),
    ...formData.newImages
  ];

  return (
    <div className="museo-modal-overlay uam-overlay" onClick={onClose}>
      <div className="museo-modal uam-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="uam-header">
          <div className="uam-header-content">
            <h2 className="uam-title">Edit Artwork</h2>
            <p className="uam-subtitle">Update your artwork details</p>
          </div>
          <button className="btn-x uam-close" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {/* Form */}
        <form className="uam-form" onSubmit={handleSubmit}>
          <div className="uam-content">
            {/* Image Upload Section */}
            <div className="uam-section">
            <h3 className="uam-section-title">Artwork Images</h3>
            
            <div 
              className={`uam-dropzone ${dragActive ? 'uam-dropzone--active' : ''} ${allImages.length > 0 ? 'uam-dropzone--has-files' : ''} ${errors.images ? 'uam-dropzone--error' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="uam-dropzone-content">
                <div className="uam-dropzone-icon">🎨</div>
                <div className="uam-dropzone-text">
                  <strong>Drop your artwork here</strong> or click to browse
                </div>
                <div className="uam-dropzone-hint">
                  Support: JPG, PNG up to 10MB • Maximum 5 images
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleFileSelect}
                  className="uam-file-input"
                />
              </div>
            </div>

            {errors.images && <div className="uam-error">{errors.images}</div>}

            {/* Image Previews */}
            {allImages.length > 0 && (
              <div className="uam-image-previews">
                {allImages.map((image) => (
                  <div key={image.id} className="uam-image-preview">
                    <img 
                      src={image.isExisting ? image.url : image.preview} 
                      alt="Preview" 
                    />
                    <button
                      type="button"
                      className="uam-image-remove"
                      onClick={() => image.isExisting ? removeExistingImage(image.url) : removeNewImage(image.id)}
                      title="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Artwork Details */}
          <div className="uam-section">
            <h3 className="uam-section-title">Artwork Details</h3>
            
            <div className="uam-form-grid">
              <div className="uam-field">
                <label className="museo-form-label">Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`museo-input ${errors.title ? 'pe__input--error' : ''}`}
                  placeholder="Enter artwork title"
                />
                {errors.title && <div className="pe__error">{errors.title}</div>}
              </div>

              <div className="uam-field">
                <label className="museo-form-label">Medium *</label>
                <input
                  type="text"
                  name="medium"
                  value={formData.medium}
                  onChange={handleInputChange}
                  className={`museo-input ${errors.medium ? 'pe__input--error' : ''}`}
                  placeholder="e.g., Oil on Canvas, Digital Art, Watercolor, Sculpture..."
                />
                {errors.medium && <div className="pe__error">{errors.medium}</div>}
              </div>
            </div>

            <div className="uam-field">
              <label className="museo-form-label">Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className={`museo-input museo-textarea ${errors.description ? 'pe__input--error' : ''}`}
                placeholder="Describe your artwork, inspiration, or technique..."
                rows="4"
              />
              {errors.description && <div className="pe__error">{errors.description}</div>}
            </div>
          </div>

          {/* Categories */}
          <div className="uam-section">
            <h3 className="uam-section-title">Categories *</h3>
            <p className="uam-section-desc">Select categories that best describe your artwork</p>
            
            <div className={`uam-categories ${errors.categories ? 'uam-categories--error' : ''}`}>
              {categories.map(category => (
                <button
                  key={category}
                  type="button"
                  className={`uam-category-btn ${formData.categories.includes(category) ? 'uam-category-btn--active' : ''}`}
                  onClick={() => handleCategoryToggle(category)}
                >
                  {category}
                </button>
              ))}
            </div>
            {errors.categories && <div className="uam-error">{errors.categories}</div>}
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="uam-submit-error">{errors.submit}</div>
          )}
          </div>

          {/* Actions */}
          <div className="uam-actions">
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
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditGalleryArtworkModal;
