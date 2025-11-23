import { useEffect, useRef, useState } from "react";
import "./ReportModal.css";

const API = import.meta.env.VITE_API_BASE;

const PRESET_REASONS = [
  { code: "spam", label: "Spam or misleading" },
  { code: "harassment", label: "Harassment or hate" },
  { code: "scam", label: "Scams or fraud" },
  { code: "ip_violation", label: "Intellectual property violation" },
  { code: "prohibited_item", label: "Prohibited or restricted item" },
  { code: "fake_item", label: "Counterfeit / inauthentic" },
  { code: "wrong_category", label: "Wrong category / tagging" },
  { code: "privacy", label: "Privacy / personal data exposure" },
  { code: "other", label: "Other" },
];

export default function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  defaultReason = "",
  defaultDetails = "",
  onSubmitted,
}) {
  const dialogRef = useRef(null);
  const [reasonOption, setReasonOption] = useState("spam");
  const [customReason, setCustomReason] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Initialize defaults when opening
  useEffect(() => {
    if (isOpen) {
      setSuccess(false);
      setError("");
      setLoading(false);
      if (defaultReason) {
        const preset = PRESET_REASONS.find(r => r.code === defaultReason);
        if (preset) {
          setReasonOption(defaultReason);
          setCustomReason("");
        } else {
          setReasonOption("other");
          setCustomReason(defaultReason);
        }
      } else {
        setReasonOption("spam");
        setCustomReason("");
      }
      setDetails(defaultDetails || "");
    }
  }, [isOpen, defaultReason, defaultDetails]);

  // Close on Esc
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Auto focus first control when opened
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => {
      dialogRef.current?.querySelector("select, textarea, input, button")?.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [isOpen]);

  if (!isOpen) return null;

  const submit = async () => {
    try {
      setError("");
      setSuccess(false);
      setLoading(true);

      const finalReason = reasonOption === "other" ? customReason.trim() : reasonOption;
      if (!finalReason && !details.trim()) {
        setError("Please provide a reason or details.");
        setLoading(false);
        return;
      }

      const res = await fetch(`${API}/reports`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId,
          reason: finalReason || null,
          details: details?.trim() || null,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        if (res.status === 409) {
          setError(json?.error || "You already have an open report for this item.");
        } else {
          setError(json?.error || `Failed to submit report (HTTP ${res.status})`);
        }
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
      onSubmitted?.(json.data);
      // Optionally close after slight delay
      setTimeout(() => onClose?.(), 800);
    } catch (e) {
      setError(e?.message || "Failed to submit report");
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className="report modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        ref={dialogRef}
      >
        <div className="report__header">
          <h2 id="report-title">Report Content</h2>
          <button className="report__close" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="report__group">
          <label className="report__label">Reason</label>
          <div className="report__row">
            <select
              className="report__select"
              value={reasonOption}
              onChange={(e) => setReasonOption(e.target.value)}
              disabled={loading}
            >
              {PRESET_REASONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>
            {reasonOption === "other" && (
              <input
                className="report__input"
                placeholder="Type a short summary"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                maxLength={200}
                disabled={loading}
              />
            )}
          </div>
        </div>

        <div className="report__group">
          <label className="report__label">Details (optional)</label>
          <textarea
            className="report__textarea"
            placeholder="Add more context (links, timestamps, what happened)"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={5}
            maxLength={5000}
            disabled={loading}
          />
          <div className="report__hint">{details.length}/5000</div>
        </div>

        {error && <div className="report__error">{error}</div>}
        {success && <div className="report__success">Report submitted. Thank you.</div>}

        <div className="report__footer">
          <button className="btn" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </div>
    </div>
  );
}
