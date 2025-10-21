import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Reusable Fullscreen Image Viewer Component
 * 
 * @param {boolean} isOpen - Whether the fullscreen viewer is open
 * @param {function} onClose - Function to call when closing the viewer
 * @param {string|array} images - Single image URL or array of image URLs
 * @param {number} currentIndex - Current image index (for multiple images)
 * @param {function} onIndexChange - Function to call when image index changes
 * @param {string} alt - Alt text for the image
 * @param {object} styles - Optional custom styles override
 */
export default function FullscreenImageViewer({
  isOpen,
  onClose,
  images,
  currentIndex = 0,
  onIndexChange,
  alt = "Image",
  styles = {}
}) {
  // Normalize images to array
  const imageArray = Array.isArray(images) ? images : [images];
  const hasMultipleImages = imageArray.length > 1;

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (hasMultipleImages && onIndexChange) {
            e.preventDefault();
            const newIndex = currentIndex === 0 ? imageArray.length - 1 : currentIndex - 1;
            onIndexChange(newIndex);
          }
          break;
        case 'ArrowRight':
          if (hasMultipleImages && onIndexChange) {
            e.preventDefault();
            const newIndex = currentIndex === imageArray.length - 1 ? 0 : currentIndex + 1;
            onIndexChange(newIndex);
          }
          break;
      }
    };

    // Lock body scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, currentIndex, hasMultipleImages, onIndexChange, onClose, imageArray.length]);

  if (!isOpen || !imageArray[currentIndex]) return null;

  const defaultStyles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      ...styles.overlay
    },
    image: {
      maxWidth: '95vw',
      maxHeight: '95vh',
      objectFit: 'contain',
      borderRadius: '8px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      cursor: 'default',
      ...styles.image
    },
    counter: {
      position: 'absolute',
      bottom: '30px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(0, 0, 0, 0.7)',
      color: 'white',
      padding: '10px 20px',
      borderRadius: '20px',
      fontSize: '16px',
      fontWeight: '600',
      zIndex: 10001,
      userSelect: 'none',
      ...styles.counter
    },
    closeButton: {
      position: 'absolute',
      top: '20px',
      right: '20px',
      background: 'rgba(0, 0, 0, 0.7)',
      color: 'white',
      border: 'none',
      borderRadius: '50%',
      width: '50px',
      height: '50px',
      fontSize: '24px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10001,
      transition: 'background-color 0.2s ease',
      ...styles.closeButton
    },
    navButton: {
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'rgba(0, 0, 0, 0.7)',
      color: 'white',
      border: 'none',
      borderRadius: '50%',
      width: '60px',
      height: '60px',
      fontSize: '24px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10001,
      transition: 'background-color 0.2s ease',
      ...styles.navButton
    }
  };

  const modalContent = (
    <div 
      style={defaultStyles.overlay}
      onClick={onClose}
    >
      {/* Main Image */}
      <img
        src={imageArray[currentIndex]}
        alt={`${alt} ${hasMultipleImages ? `${currentIndex + 1}` : ''}`}
        style={defaultStyles.image}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Image Counter */}
      {hasMultipleImages && (
        <div style={defaultStyles.counter}>
          {currentIndex + 1} / {imageArray.length}
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}
