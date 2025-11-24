import React, { useState, useEffect } from 'react';
import MuseoModal, { MuseoModalBody, MuseoModalActions } from '../../components/MuseoModal';
import ImageUploadZone from '../../components/modal-features/ImageUploadZone';
import CategorySelector from '../../components/modal-features/CategorySelector';
import AlertModal from '../Shared/AlertModal';
import './css/UploadArtModal.css';
const API = import.meta.env.VITE_API_BASE;

const UploadArtModal = ({ isOpen, onClose, onSubmit }) => {
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
  const [successAlert, setSuccessAlert] = useState({ show: false, title: '', message: '' });
  const [dbCategoryOptions, setDbCategoryOptions] = useState([]);
  const [isLoadingDbCategories, setIsLoadingDbCategories] = useState(false);

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
        // Sort: keep 'Other' last if present
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
        console.error('Failed to load DB categories for UploadArtModal:', e);
        if (active) setDbCategoryOptions([]); // Fallback to static options in CategorySelector
      } finally {
        if (active) setIsLoadingDbCategories(false);
      }
    })();
    return () => { active = false; };
  }, []);

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
      newErrors.images = 'Please upload at least one image';
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
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('medium', formData.medium);
      submitData.append('categories', JSON.stringify(categories));
      submitData.append('applyWatermark', applyWatermark.toString());
      if (watermarkText.trim()) {
        submitData.append('watermarkText', watermarkText.trim());
      }
      
      images.forEach((image) => {
        submitData.append(`images`, image.file);
      });

      await onSubmit(submitData);
      
      // Show success alert
      setSuccessAlert({
        show: true,
        title: 'Artwork Uploaded Successfully',
        message: `"${formData.title}" has been added to your gallery. It's now visible to the Museo community!`
      });
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        medium: '',
      });
      setCategories([]);
      setImages([]);
    } catch (error) {
      setErrors({ submit: 'Failed to upload artwork. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MuseoModal
      open={isOpen}
      onClose={onClose}
      title="Share Your Artwork"
      subtitle="Add your creation to the Museo gallery"
      size="lg"
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
            onChange={setImages}
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
            options={dbCategoryOptions}
            loading={isLoadingDbCategories}
            maxPreview={16}
          />

          {/* Watermark Toggle */}
          <div className="museo-form-field museo-form-field--full" style={{ marginTop: '24px' }}>
            <label className="museo-checkbox-container">
              <input
                type="checkbox"
                checked={applyWatermark}
                onChange={(e) => setApplyWatermark(e.target.checked)}
                className="museo-checkbox"
              />
              <span className="museo-checkbox-label">
                <strong>🔒 Protect with watermark</strong>
                <small style={{ display: 'block', marginTop: '4px', color: 'var(--museo-text-muted)', fontWeight: 'normal' }}>
                  Add watermark to protect your artwork from unauthorized use
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
              {isSubmitting ? 'Uploading...' : 'Share Artwork'}
            </button>
          </MuseoModalActions>
        </form>
      </MuseoModalBody>

      {/* Success Alert Modal */}
      <AlertModal
        open={successAlert.show}
        title={successAlert.title}
        message={successAlert.message}
        okText="OK"
        onOk={() => {
          setSuccessAlert({ show: false, title: '', message: '' });
          onClose();
        }}
      />
    </MuseoModal>
  );
};

export default UploadArtModal;
