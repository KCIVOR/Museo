import React, { useEffect, useState } from "react";
import MuseoModal, { MuseoModalBody, MuseoModalActions } from '../../components/MuseoModal';
import ImageUploadZone from '../../components/modal-features/ImageUploadZone';
import '../Gallery/css/UploadArtModal.css';
const API = import.meta.env.VITE_API_BASE
// A lightweight modal-style uploader similar in UX to SetProfile
// Props:
// - open: boolean
// - onClose: () => void
// - onUploaded?: (art) => void  // optional callback with created art row
export default function UploadArt({ open, onClose, onUploaded }) {
  const [images, setImages] = useState([]); // Array of { file, url, id }
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [medium, setMedium] = useState("");
  const [applyWatermark, setApplyWatermark] = useState(true); // Default to true for protection
  const [watermarkText, setWatermarkText] = useState(""); // Custom watermark text (empty = use default)
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setImages([]);
    setTitle("");
    setDescription("");
    setMedium("");
    setErrors({});
  }, [open]);

  const validate = () => {
    const v = {};
    if (images.length === 0) v.images = "At least one image is required";
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
      const fd = new FormData();
      
      // Add multiple images - ImageUploadZone returns array of {file, preview, id}
      images.forEach((image) => {
        fd.append("images", image.file);
      });
      
      fd.append("title", title);
      fd.append("description", description);
      fd.append("medium", medium);
      // Add default categories for profile uploads
      fd.append("categories", JSON.stringify(["Digital Art"]));
      // Add watermark preference
      fd.append("applyWatermark", applyWatermark.toString());
      // Add custom watermark text if provided
      if (watermarkText.trim()) {
        fd.append("watermarkText", watermarkText.trim());
      }

      // Use profile endpoint for multiple image support
      const res = await fetch(`${API}/profile/uploadArt`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to upload");
      }
      const data = await res.json();
      
      // Reset form
      setImages([]);
      setTitle("");
      setDescription("");
      setMedium("");
      setErrors({});
      
      onUploaded?.(data.artwork);
      onClose?.();
    } catch (err) {
      setErrors({ submit: err.message || "Upload failed" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MuseoModal
      open={open}
      onClose={onClose}
      title="Upload Your Artwork"
      subtitle="Add your creation to your profile"
      size="lg"
    >
      <MuseoModalBody>
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} style={{ display: 'block' }}>
          {/* Image Upload - Full Width */}
          <ImageUploadZone
            type="multiple"
            maxFiles={5}
            title="Artwork Images"
            hint="Support: JPG, PNG up to 10MB • Maximum 5 images • No GIFs"
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
                placeholder="e.g., Oil on Canvas, Digital Art, Watercolor..."
              />
              {errors.medium && <div className="museo-error-message">{errors.medium}</div>}
            </div>

            <div className="museo-form-field museo-form-field--full">
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

            {/* Watermark Toggle */}
            <div className="museo-form-field museo-form-field--full">
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
              {submitting ? 'Uploading...' : 'Upload Artwork'}
            </button>
          </MuseoModalActions>
        </form>
      </MuseoModalBody>
    </MuseoModal>
  );
}
