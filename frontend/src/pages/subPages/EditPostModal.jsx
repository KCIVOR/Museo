import React, { useState, useEffect } from 'react';
import './css/UploadArtModal.css'; // Using the same CSS as UploadArtModal

const API = import.meta.env.VITE_API_BASE;

const EditPostModal = ({ isOpen, onClose, post, onPostUpdated }) => {
  const [formData, setFormData] = useState({
    description: '',
    images: []
  });
  const [newImages, setNewImages] = useState([]);
  const [imagesToRemove, setImagesToRemove] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when post changes
  useEffect(() => {
    if (post) {
      // Handle both 'image' (from database) and 'images' (from updates)
      const postImages = post.image || post.images;
      setFormData({
        description: post.text || '',
        images: Array.isArray(postImages) ? postImages : (postImages ? [postImages] : [])
      });
      setNewImages([]);
      setImagesToRemove([]);
      setErrors({});
    }
  }, [post]);

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
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files) => {
    const fileArray = Array.from(files);
    const maxFiles = 5;
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (formData.images.length + newImages.length + fileArray.length > maxFiles) {
      setErrors(prev => ({ ...prev, images: `Maximum ${maxFiles} images allowed` }));
      return;
    }

    const validFiles = [];
    const invalidFiles = [];

    fileArray.forEach(file => {
      if (file.size > maxSize) {
        invalidFiles.push(`${file.name} is too large (max 10MB)`);
      } else if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        invalidFiles.push(`${file.name} is not a supported format`);
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      setErrors(prev => ({ ...prev, images: invalidFiles.join(', ') }));
      return;
    }

    const newImagePreviews = validFiles.map(file => ({
      id: Date.now() + Math.random(),
      file,
      preview: URL.createObjectURL(file),
      isNew: true
    }));

    setNewImages(prev => [...prev, ...newImagePreviews]);
    setErrors(prev => ({ ...prev, images: '' }));
  };

  const removeExistingImage = (imageUrl) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter(img => img !== imageUrl)
    }));
    setImagesToRemove(prev => [...prev, imageUrl]);
  };

  const removeNewImage = (imageId) => {
    setNewImages(prev => {
      const imageToRemove = prev.find(img => img.id === imageId);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      return prev.filter(img => img.id !== imageId);
    });
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
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
    setErrors({});

    try {
      const submitData = new FormData();
      submitData.append('description', formData.description);
      
      // Add existing images that weren't removed
      formData.images.forEach(imageUrl => {
        submitData.append('existingImages', imageUrl);
      });

      // Add new image files
      newImages.forEach(imageObj => {
        submitData.append('images', imageObj.file);
      });

      // Add images to remove
      imagesToRemove.forEach(imageUrl => {
        submitData.append('imagesToRemove', imageUrl);
      });

      const response = await fetch(`${API}/homepage/posts/${post.id}`, {
        method: 'PUT',
        credentials: 'include',
        body: submitData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update post');
      }

      const updatedPost = await response.json();
      
      // Clean up object URLs
      newImages.forEach(imageObj => {
        URL.revokeObjectURL(imageObj.preview);
      });

      // Notify parent component
      if (onPostUpdated) {
        onPostUpdated(updatedPost);
      }

      onClose();
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to update post. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Clean up object URLs
    newImages.forEach(imageObj => {
      URL.revokeObjectURL(imageObj.preview);
    });
    onClose();
  };

  if (!isOpen || !post) return null;

  const allImages = [
    ...formData.images.map(url => ({ id: url, url, isExisting: true })),
    ...newImages
  ];

  return (
    <div className="museo-modal-overlay uam-overlay" onClick={handleClose}>
      <div className="museo-modal uam-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="uam-header">
          <div className="uam-header-content">
            <h2 className="uam-title">Edit Your Post</h2>
            <p className="uam-subtitle">Update your post content and images</p>
          </div>
          <button className="btn-x uam-close" onClick={handleClose} title="Close">
            ✕
          </button>
        </div>

        {/* Form */}
        <form className="uam-form" onSubmit={handleSubmit}>
          <div className="uam-content">
            {/* Image Upload Section */}
            <div className="uam-section">
              <h3 className="uam-section-title">Post Images</h3>
              
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
                    <strong>Drop your images here</strong> or click to browse
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

            {/* Post Details */}
            <div className="uam-section">
              <h3 className="uam-section-title">Post Details</h3>
              
              <div className="uam-field">
                <label className="museo-form-label">Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className={`museo-input museo-textarea ${errors.description ? 'pe__input--error' : ''}`}
                  placeholder="Describe your post, inspiration, or technique..."
                  rows="4"
                />
                {errors.description && <div className="pe__error">{errors.description}</div>}
              </div>
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
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPostModal;
