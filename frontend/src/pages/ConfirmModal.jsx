import React from "react";
import "./css/events.css";

export default function ConfirmModal({ open, title = "Confirm", message, confirmText = "Confirm", cancelText = "Cancel", onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="museo-modal-overlay evmOverlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel?.()}>
      <article role="dialog" aria-modal="true" aria-label={title} className="museo-modal evmDialog" style={{ position: "relative" }}>
        <button 
          aria-label="Close" 
          onClick={onCancel} 
          className="btn-x"
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            zIndex: 10
          }}
        >✕</button>
        <div className="evmHeader" style={{ position: "static", borderBottom: "none", background: "transparent", paddingRight: "60px" }}>
          <h1 className="evmTitle" style={{ padding: 0, margin: 0, fontSize: "24px", fontWeight: "700" }}>{title}</h1>
        </div>
        <div className="evmSection evmCard">
          <p className="evmP">{message}</p>
          <div className="pvmActions" style={{ justifyContent: "flex-end" }}>
            <button className="btn btn-secondary btn-sm" type="button" onClick={onCancel}>{cancelText}</button>
            <button className="btn btn-primary btn-sm" type="button" onClick={onConfirm}>{confirmText}</button>
          </div>
        </div>
      </article>
    </div>
  );
}
