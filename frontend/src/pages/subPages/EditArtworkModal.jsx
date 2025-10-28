import React, { useState, useEffect } from 'react';
import './css/UploadArtModal.css';

const API = import.meta.env.VITE_API_BASE;

const EditArtworkModal = ({ isOpen, onClose, artwork, onArtworkUpdated }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [medium, setMedium] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({ images: [] });
  const [newImages, setNewImages] = useState([]);
  const [imagesToRemove, setImagesToRemove] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (!isOpen || !artwork) return;
    setTitle(artwork.title || "");
    setDescription(artwork.description || "");
    setMedium(artwork.medium || "");
    setErrors({});
    
    // Handle artwork images
    const artworkImages = artwork.image || [];
    setFormData({
      images: Array.isArray(artworkImages) ? artworkImages : (artworkImages ? [artworkImages] : [])
    });
    setNewImages([]);
    setImagesToRemove([]);
  }, [isOpen, artwork]);

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

  const validate = () => {
    const v = {};
    if (!title.trim()) v.title = "Title is required";
    if (!description.trim()) v.description = "Description is required";
    if (!medium.trim()) v.medium = "Medium is required";
    setErrors(v);
    return Object.keys(v).length === 0;
  };

  const submit = async () => {
    if (submitting) return;
    if (!validate()) return;
    try {
      setSubmitting(true);
      
      const artworkId = artwork?.id || artwork?.artId;
      const submitData = new FormData();
      submitData.append('title', title.trim());
      submitData.append('description', description.trim());
      submitData.append('medium', medium.trim());
      
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

      const response = await fetch(`${API}/profile/art/${artworkId}`, {
        method: 'PUT',
        credentials: 'include',
        body: submitData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update artwork");
      }
      
      const data = await response.json();
      
      // Clean up object URLs
      newImages.forEach(imageObj => {
        URL.revokeObjectURL(imageObj.preview);
      });
      
      onArtworkUpdated?.(data.artwork);
      onClose?.();
    } catch (err) {
      alert(err.message || "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !artwork) return null;

  const allImages = [
    ...formData.images.map(url => ({ id: url, url, isExisting: true })),
    ...newImages
  ];

  return (
    <div className="museo-modal-overlay uam-overlay" onClick={onClose}>
      <section
        className="museo-modal uam-modal"
        role="dialog"
        aria-label="Edit artwork"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="uam-header">
          <div className="uam-header-content">
            <h3 className="uam-title">Edit Artwork</h3>
            <p className="uam-subtitle">Update your artwork details</p>
          </div>
          <button className="uam-close" onClick={onClose}>
            ✕
          </button>
        </header>

        {/* Form Content */}
        <div className="uam-form">
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

            {/* Artwork Details Section */}
            <div className="uam-section">
              <h3 className="uam-section-title">Artwork Details</h3>
              
              <div className="uam-form-grid">
                <div className="uam-field">
                  <label className="museo-form-label">Title *</label>
                  <input
                    type="text"
                    className={`museo-input ${errors.title ? 'pe__input--error' : ''}`}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter artwork title"
                  />
                  {errors.title && <div className="pe__error">{errors.title}</div>}
                </div>

                <div className="uam-field">
                  <label className="museo-form-label">Medium *</label>
                  <input
                    type="text"
                    className={`museo-input ${errors.medium ? 'pe__input--error' : ''}`}
                    value={medium}
                    onChange={(e) => setMedium(e.target.value)}
                    placeholder="e.g., Oil on Canvas, Digital Art, Watercolor, Sculpt"
                  />
                  {errors.medium && <div className="pe__error">{errors.medium}</div>}
                </div>
              </div>

              <div className="uam-field">
                <label className="museo-form-label">Description *</label>
                <textarea
                  className={`museo-input museo-textarea ${errors.description ? 'pe__input--error' : ''}`}
                  placeholder="Describe your artwork, inspiration, or technique..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
                {errors.description && <div className="pe__error">{errors.description}</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <footer className="uam-actions">
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={onClose} 
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <div className="btn-spinner"></div>
                Updating...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Update Artwork
              </>
            )}
          </button>
        </footer>
      </section>
    </div>
  );
};

export default EditArtworkModal;
