import React, { useState, useEffect } from 'react';
import MuseoModal, { MuseoModalBody, MuseoModalActions } from '../../components/MuseoModal';
import ImageUploadZone from '../../components/modal-features/ImageUploadZone';
import './css/UploadArtModal.css';

const API = import.meta.env.VITE_API_BASE;

const EditArtworkModal = ({ isOpen, onClose, artwork, onArtworkUpdated }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [medium, setMedium] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [images, setImages] = useState([]); // Array of { file, url, id } for ImageUploadZone
  const [existingImages, setExistingImages] = useState([]); // URLs of existing images
  const [imagesToRemove, setImagesToRemove] = useState([]);
  const [applyWatermark, setApplyWatermark] = useState(true); // Default to true for protection
  const [watermarkText, setWatermarkText] = useState(""); // Custom watermark text (empty = use default)

  useEffect(() => {
    if (!isOpen || !artwork) return;
    setTitle(artwork.title || "");
    setDescription(artwork.description || "");
    setMedium(artwork.medium || "");
    setErrors({});
    
    // Handle artwork images
    const artworkImages = artwork.image || [];
    const imageArray = Array.isArray(artworkImages) ? artworkImages : (artworkImages ? [artworkImages] : []);
    
    setExistingImages(imageArray);
    
    // Convert existing URLs to ImageUploadZone format
    setImages(imageArray.map((url, index) => ({
      id: `existing-${index}`,
      url: url,
      isExisting: true
    })));
    
    setImagesToRemove([]);
  }, [isOpen, artwork]);

  const validate = () => {
    const v = {};
    if (!title.trim()) v.title = "Title is required";
    if (!description.trim()) v.description = "Description is required";
    if (!medium.trim()) v.medium = "Medium is required";
    
    if (images.length === 0) {
      v.images = "At least one image is required";
    }
    
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
      
      // Separate existing and new images
      const existingImageUrls = images.filter(img => img.isExisting).map(img => img.url);
      const newImageFiles = images.filter(img => !img.isExisting);
      
      // Add existing images that weren't removed
      existingImageUrls.forEach(imageUrl => {
        submitData.append('existingImages', imageUrl);
      });

      // Add new image files
      newImageFiles.forEach(imageObj => {
        submitData.append('images', imageObj.file);
      });

      // Add images to remove (images that were in existingImages but not in current images)
      const imagesToRemove = existingImages.filter(url => !existingImageUrls.includes(url));
      imagesToRemove.forEach(imageUrl => {
        submitData.append('imagesToRemove', imageUrl);
      });

      // Add watermark preferences (only for new images)
      if (newImageFiles.length > 0) {
        submitData.append('applyWatermark', applyWatermark.toString());
        if (watermarkText.trim()) {
          submitData.append('watermarkText', watermarkText.trim());
        }
      }

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
      
      onArtworkUpdated?.(data.artwork);
      onClose?.();
    } catch (err) {
      setErrors({ submit: err.message || "Update failed" });
    } finally {
      setSubmitting(false);
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
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} style={{ display: 'block' }}>
          {/* Image Upload - Full Width */}
          <ImageUploadZone
            type="multiple"
            maxFiles={5}
            title="Artwork Images"
            hint="Support: JPG, PNG up to 10MB • Maximum 5 images"
            value={images}
            onChange={setImages}
            error={errors.images}
          />

          {/* Form Fields */}
          <div style={{ marginTop: '32px' }}>
            <div className="museo-form-grid museo-form-grid--2">
              <div className="museo-form-field">
                <label className="museo-label">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`museo-input ${errors.title ? 'museo-input--error' : ''}`}
                  placeholder="Enter artwork title"
                />
                {errors.title && <div className="museo-error-message">{errors.title}</div>}
              </div>

              <div className="museo-form-field">
                <label className="museo-label">Medium *</label>
                <input
                  type="text"
                  value={medium}
                  onChange={(e) => setMedium(e.target.value)}
                  className={`museo-input ${errors.medium ? 'museo-input--error' : ''}`}
                  placeholder="e.g., Oil on Canvas, Digital Art, Watercolor"
                />
                {errors.medium && <div className="museo-error-message">{errors.medium}</div>}
              </div>
            </div>

            <div className="museo-form-field museo-form-field--full" style={{ marginTop: '24px' }}>
              <label className="museo-label">Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`museo-textarea ${errors.description ? 'museo-input--error' : ''}`}
                placeholder="Describe your artwork, inspiration, or technique..."
                rows="4"
              />
              {errors.description && <div className="museo-error-message">{errors.description}</div>}
            </div>

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
                    <strong>Protect new images with watermark</strong>
                    <small style={{ display: 'block', marginTop: '4px', color: 'var(--museo-text-muted)', fontWeight: 'normal' }}>
                      Add watermark to newly uploaded images (existing images remain unchanged)
                    </small>
                  </span>
                </label>
                
                {/* Custom watermark text input (shows when watermark is enabled) */}
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
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={submitting}
            >
              {submitting ? 'Updating...' : 'Update Artwork'}
            </button>
          </MuseoModalActions>
        </form>
      </MuseoModalBody>
    </MuseoModal>
  );
};

export default EditArtworkModal;
