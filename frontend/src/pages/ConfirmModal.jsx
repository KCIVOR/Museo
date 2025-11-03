import React from "react";
import "../styles/main.css";

export default function ConfirmModal({ open, title = "Confirm", message, confirmText = "Confirm", cancelText = "Cancel", onConfirm, onCancel }) {
  if (!open) return null;
  
  return (
    <div 
      className="museo-modal-overlay" 
      style={{ zIndex: 1070 }} 
      onMouseDown={(e) => e.target === e.currentTarget && onCancel?.()}
    >
      <article 
        role="dialog" 
        aria-modal="true" 
        aria-label={title} 
        className="museo-modal museo-modal--sm"
        style={{ 
          position: "relative", 
          zIndex: 1071,
          maxWidth: '500px'
        }}
      >
        {/* Close Button */}
        <button 
          aria-label="Close" 
          onClick={onCancel} 
          className="museo-modal__close"
          style={{
            position: "absolute",
            top: 'var(--museo-space-4)',
            right: 'var(--museo-space-4)',
            background: 'transparent',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: 'var(--museo-text-muted)',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--museo-border-radius-md)',
            transition: 'all var(--museo-transition-base)',
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--museo-bg-secondary)';
            e.currentTarget.style.color = 'var(--museo-text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--museo-text-muted)';
          }}
        >
          ✕
        </button>

        {/* Header */}
        <div style={{ 
          padding: 'var(--museo-space-5)',
          paddingBottom: 'var(--museo-space-4)',
          borderBottom: '1px solid var(--museo-border)'
        }}>
          <h2 style={{ 
            margin: 0,
            fontSize: 'var(--museo-font-size-xl)',
            fontWeight: 'var(--museo-font-weight-bold)',
            color: 'var(--museo-text-primary)',
            fontFamily: 'var(--museo-font-family-display)',
            paddingRight: 'var(--museo-space-8)'
          }}>
            {title}
          </h2>
        </div>

        {/* Body */}
        <div style={{ 
          padding: 'var(--museo-space-5)'
        }}>
          <p style={{ 
            margin: 0,
            fontSize: 'var(--museo-font-size-base)',
            color: 'var(--museo-text-secondary)',
            lineHeight: 'var(--museo-line-height-relaxed)'
          }}>
            {message}
          </p>
        </div>

        {/* Actions */}
        <div style={{ 
          padding: 'var(--museo-space-5)',
          paddingTop: 'var(--museo-space-4)',
          borderTop: '1px solid var(--museo-border)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 'var(--museo-space-3)'
        }}>
          <button 
            className="btn btn-secondary btn-sm" 
            type="button" 
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button 
            className="btn btn-primary btn-sm" 
            type="button" 
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </article>
    </div>
  );
}
