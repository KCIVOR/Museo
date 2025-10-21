import React, { useEffect, useState } from "react";
import './subPages/css/UploadArtModal.css';
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
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (!open) return;
    setImages([]);
    setTitle("");
    setDescription("");
    setMedium("");
    setErrors({});
    setDragActive(false);
  }, [open]);

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
    
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;
    
    handleFiles(files);
  };

  const handleFiles = (files) => {
    // Validate files (same as UploadArtModal)
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
    
    // Create image objects with preview URLs
    const newImages = validFiles.map(file => ({
      id: Date.now() + Math.random(),
      file,
      preview: URL.createObjectURL(file)
    }));
    
    // Add to existing images (max 5 total)
    setImages(prev => [...prev, ...newImages].slice(0, 5));
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const removeImage = (imageId) => {
    setImages(prev => {
      const updated = prev.filter(img => img.id !== imageId);
      // Clean up URL to prevent memory leaks
      const imageToRemove = prev.find(img => img.id === imageId);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      return updated;
    });
  };

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
      
      // Add multiple images
      images.forEach((image) => {
        fd.append("images", image.file);
      });
      
      fd.append("title", title);
      fd.append("description", description);
      fd.append("medium", medium);
      // Add default categories for profile uploads
      fd.append("categories", JSON.stringify(["Digital Art"]));

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
      onUploaded?.(data.artwork);
      onClose?.();
    } catch (err) {
      alert(err.message || "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="museo-modal-overlay uam-overlay" onClick={onClose}>
      <section
        className="museo-modal uam-modal"
        role="dialog"
        aria-label="Upload artwork"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="uam-header">
          <div className="uam-header-content">
            <h3 className="uam-title">Upload Your Artwork</h3>
            <p className="uam-subtitle">Add your creation to your profile</p>
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
                className={`uam-dropzone ${dragActive ? 'uam-dropzone--active' : ''} ${images.length > 0 ? 'uam-dropzone--has-files' : ''} ${errors.images ? 'uam-dropzone--error' : ''}`}
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
                    Support: JPG, PNG up to 10MB • Maximum 5 images • No GIFs
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
              {images.length > 0 && (
                <div className="uam-image-previews">
                  {images.map((image) => (
                    <div key={image.id} className="uam-image-preview">
                      <img src={image.preview} alt="Preview" />
                      <button
                        type="button"
                        className="uam-image-remove"
                        onClick={() => removeImage(image.id)}
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
                  <label className="uam-label">Title *</label>
                  <input
                    type="text"
                    className={`uam-input ${errors.title ? 'uam-input--error' : ''}`}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter artwork title"
                  />
                  {errors.title && <div className="uam-error">{errors.title}</div>}
                </div>

                <div className="uam-field">
                  <label className="uam-label">Medium *</label>
                  <input
                    type="text"
                    className={`uam-input ${errors.medium ? 'uam-input--error' : ''}`}
                    value={medium}
                    onChange={(e) => setMedium(e.target.value)}
                    placeholder="e.g., Oil on Canvas, Digital Art, Watercolor, Sculpt"
                  />
                  {errors.medium && <div className="uam-error">{errors.medium}</div>}
                </div>
              </div>

              <div className="uam-field">
                <label className="uam-label">Description *</label>
                <textarea
                  className={`uam-textarea ${errors.description ? 'uam-textarea--error' : ''}`}
                  placeholder="Describe your artwork, inspiration, or technique..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
                {errors.description && <div className="uam-error">{errors.description}</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <footer className="uam-actions">
          <button 
            className="uam-btn uam-btn--secondary" 
            onClick={onClose} 
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className="uam-btn uam-btn--primary"
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? "Uploading..." : "Upload"}
          </button>
        </footer>
      </section>
    </div>
  );
}
