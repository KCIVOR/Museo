import React from "react";
import "./css/events.css";

export default function ConfirmModal({ open, title = "Confirm", message, confirmText = "Confirm", cancelText = "Cancel", onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="museo-modal-overlay evmOverlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel?.()}>
      <article role="dialog" aria-modal="true" aria-label={title} className="museo-modal evmDialog">
        <button aria-label="Close" onClick={onCancel} className="evmClose">✕</button>
        <div className="evmHeader" style={{ position: "static", borderBottom: "none", background: "transparent" }}>
          <h1 className="evmTitle" style={{ padding: 0 }}>{title}</h1>
        </div>
        <div className="evmSection evmCard">
          <p className="evmP">{message}</p>
          <div className="pvmActions" style={{ justifyContent: "flex-end" }}>
            <button className="evmGhostBtn" type="button" onClick={onCancel}>{cancelText}</button>
            <button className="evmCalBtn" type="button" onClick={onConfirm}>{confirmText}</button>
          </div>
        </div>
      </article>
    </div>
  );
}
