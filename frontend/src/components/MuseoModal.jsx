import { useEffect, useRef } from "react";

/**
 * MuseoModal - Reusable modal component for forms and content
 * 
 * @param {boolean} open - Controls modal visibility
 * @param {function} onClose - Callback when modal closes
 * @param {string} title - Modal title
 * @param {string} subtitle - Optional subtitle/description
 * @param {React.ReactNode} children - Modal content
 * @param {string} size - Modal size: 'sm', 'md', 'lg', 'xl' (default: 'lg')
 * @param {boolean} showCloseButton - Show X button (default: true)
 * @param {boolean} closeOnOverlayClick - Close when clicking overlay (default: true)
 * @param {boolean} closeOnEscape - Close on ESC key (default: true)
 * @param {boolean} nested - Whether this modal appears on top of another modal (default: false)
 */
export default function MuseoModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  size = "lg",
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  nested = false,
}) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (e) => {
      if (closeOnEscape && e.key === "Escape") {
        onClose?.();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, closeOnEscape]);

  if (!open) return null;

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === overlayRef.current) {
      onClose?.();
    }
  };

  return (
    <div
      className={`museo-modal-overlay${nested ? ' museo-modal-overlay--nested' : ''}`}
      ref={overlayRef}
      onMouseDown={handleOverlayClick}
    >
      <article
        className={`museo-modal museo-modal--${size}${nested ? ' museo-modal--nested' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="museo-modal-title"
      >
        {/* Close Button */}
        {showCloseButton && (
          <button
            type="button"
            className="museo-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        )}

        {/* Header */}
        {(title || subtitle) && (
          <div className="museo-modal-header">
            {title && (
              <h1 id="museo-modal-title" className="museo-modal-title">
                {title}
              </h1>
            )}
            {subtitle && <p className="museo-modal-subtitle">{subtitle}</p>}
          </div>
        )}

        {/* Content */}
        <div className="museo-modal-content">{children}</div>
      </article>
    </div>
  );
}

/**
 * MuseoModalSection - Section within modal with optional border
 */
export function MuseoModalSection({ children, noBorder = false }) {
  return (
    <div className={`museo-modal-section ${noBorder ? 'museo-modal-section--no-border' : ''}`}>
      {children}
    </div>
  );
}

/**
 * MuseoModalBody - Main content area (form content)
 */
export function MuseoModalBody({ children }) {
  return <div className="museo-modal-body">{children}</div>;
}

/**
 * MuseoModalActions - Action buttons at bottom
 */
export function MuseoModalActions({ children, align = "right" }) {
  return (
    <div className={`museo-modal-actions museo-modal-actions--${align}`}>
      {children}
    </div>
  );
}
