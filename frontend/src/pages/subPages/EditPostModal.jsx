import React, { useState, useEffect } from 'react';
import MuseoModal, { MuseoModalBody, MuseoModalActions } from '../../components/MuseoModal';
import ImageUploadZone from '../../components/modal-features/ImageUploadZone';
import './css/UploadArtModal.css';

const API = import.meta.env.VITE_API_BASE;

const EditPostModal = ({ isOpen, onClose, post, onPostUpdated }) => {
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]); // Array of { file, url, id } for ImageUploadZone
  const [existingImages, setExistingImages] = useState([]); // URLs of existing images
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when post changes
  useEffect(() => {
    if (post && isOpen) {
      // Handle both 'image' (from database) and 'images' (from updates)
      const postImages = post.image || post.images;
      const imageArray = Array.isArray(postImages) ? postImages : (postImages ? [postImages] : []);
      
      setDescription(post.text || '');
      setExistingImages(imageArray);
      
      // Convert existing URLs to ImageUploadZone format
      setImages(imageArray.map((url, index) => ({
        id: `existing-${index}`,
        url: url,
        isExisting: true
      })));
      
      setErrors({});
    }
  }, [post, isOpen]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const submitData = new FormData();
      submitData.append('description', description);
      
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

  return (
    <MuseoModal
      open={isOpen}
      onClose={onClose}
      title="Edit Your Post"
      subtitle="Update your post content and images"
      size="lg"
      nested={true}
    >
      <MuseoModalBody>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} style={{ display: 'block' }}>
          {/* Image Upload - Full Width */}
          <ImageUploadZone
            type="multiple"
            maxFiles={5}
            title="Post Images"
            hint="Support: JPG, PNG up to 10MB • Maximum 5 images"
            value={images}
            onChange={setImages}
            error={errors.images}
          />

          {/* Form Fields */}
          <div className="museo-form-field museo-form-field--full" style={{ marginTop: '32px' }}>
            <label className="museo-label">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`museo-textarea ${errors.description ? 'museo-input--error' : ''}`}
              placeholder="Describe your post, inspiration, or technique..."
              rows="4"
            />
            {errors.description && <div className="museo-error-message">{errors.description}</div>}
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
          </MuseoModalActions>
        </form>
      </MuseoModalBody>
    </MuseoModal>
  );
};

export default EditPostModal;
