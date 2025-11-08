import { useState } from "react";
import "../../styles/components/modal-features.css";

/**
 * ImageUploadZone - Unified image upload component
 * Handles single, multiple, and dual (cover+avatar) uploads
 * 
 * @param {string} type - "single" | "multiple" | "cover" | "avatar"
 * @param {number} maxFiles - Maximum number of files (for multiple)
 * @param {number} maxSize - Maximum file size in MB (default: 10)
 * @param {string} accept - Accepted file types
 * @param {Array|Object} value - Current images
 * @param {Function} onChange - Callback when images change
 * @param {string} error - Error message
 * @param {string} title - Section title
 * @param {string} hint - Helper text
 */
export default function ImageUploadZone({
  type = "single",
  maxFiles = 1,
  maxSize = 10,
  accept = "image/jpeg,image/jpg,image/png",
  value = [],
  onChange,
  error,
  title,
  hint
}) {
  const [dragActive, setDragActive] = useState(false);

  const isSingle = type === "single";
  const isMultiple = type === "multiple";
  const isCover = type === "cover";
  const isAvatar = type === "avatar";
  
  // Normalize value to array
  const images = Array.isArray(value) ? value : (value ? [value] : []);
  const maxAllowed = isMultiple ? maxFiles : 1;

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
    const maxSizeBytes = maxSize * 1024 * 1024;
    
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isNotGif = file.type !== 'image/gif';
      const isValidSize = file.size <= maxSizeBytes;
      return isImage && isNotGif && isValidSize;
    });

    if (validFiles.length === 0) return;

    // Create preview URLs
    const newImages = validFiles.map(file => ({
      file,
      url: URL.createObjectURL(file),
      preview: URL.createObjectURL(file),
      id: Date.now() + Math.random()
    }));

    if (isSingle || isCover || isAvatar) {
      // Single image - replace
      onChange?.(newImages[0]);
    } else {
      // Multiple images - append up to max
      const combined = [...images, ...newImages].slice(0, maxAllowed);
      onChange?.(combined);
    }
  };

  const handleRemove = (imageId) => {
    if (isSingle || isCover || isAvatar) {
      onChange?.(null);
    } else {
      const filtered = images.filter(img => img.id !== imageId);
      onChange?.(filtered);
    }
  };

  const pickImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = isMultiple;
    input.onchange = (e) => handleFileSelect(e);
    input.click();
  };

  // Render different layouts based on type
  if (isCover) {
    return (
      <div className="museo-cover-upload">
        <label className="museo-label">{title || "Cover Photo"}</label>
        <div className="museo-cover-preview">
          {images[0] ? (
            <img src={images[0].url || images[0]} alt="Cover" />
          ) : (
            <div className="museo-cover-empty">Background photo</div>
          )}
        </div>
        <button 
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={pickImage}
        >
          Change cover photo
        </button>
        {error && <div className="museo-error-message">{error}</div>}
      </div>
    );
  }

  if (isAvatar) {
    return (
      <div className="museo-avatar-upload">
        <label className="museo-label">{title || "Profile Picture"}</label>
        <div className="museo-avatar-preview">
          {images[0] ? (
            <img src={images[0].url || images[0]} alt="Avatar" />
          ) : (
            <div className="museo-avatar-empty">Photo</div>
          )}
        </div>
        <button 
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={pickImage}
        >
          Change photo
        </button>
        {error && <div className="museo-error-message">{error}</div>}
      </div>
    );
  }

  // Single or Multiple upload
  return (
    <div className="museo-upload-section">
      {title && <h3 className="museo-section-title">{title}</h3>}
      
      <div 
        className={`museo-dropzone ${dragActive ? 'museo-dropzone--active' : ''} ${images.length > 0 ? 'museo-dropzone--has-files' : ''} ${error ? 'museo-dropzone--error' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={pickImage}
      >
        <div className="museo-dropzone-content">
          <div className="museo-dropzone-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div className="museo-dropzone-text">
            <strong>Drop your {isMultiple ? 'files' : 'file'} here</strong> or click to browse
          </div>
          <div className="museo-dropzone-hint">
            {hint || `Support: JPG, PNG up to ${maxSize}MB${isMultiple ? ` • Maximum ${maxFiles} files` : ' • Single file only'}`}
          </div>
        </div>
      </div>

      {error && <div className="museo-error-message">{error}</div>}

      {/* Image Previews */}
      {images.length > 0 && (
        <div className={`museo-image-previews ${isMultiple ? 'museo-image-previews--grid' : 'museo-image-previews--single'}`}>
          {images.map((img, idx) => (
            <div key={img.id || idx} className="museo-image-preview">
              <img src={img.url || img.preview || img} alt={`Preview ${idx + 1}`} />
              <button
                type="button"
                className="museo-image-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(img.id);
                }}
                title="Remove image"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
