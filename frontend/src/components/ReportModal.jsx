import { useState } from 'react';
import MuseoModal, { MuseoModalBody, MuseoModalActions } from './MuseoModal';
import ContentPreview from './ContentPreview';

const API = import.meta.env.VITE_API_BASE;

const REPORT_REASONS = [
  'Inappropriate Content',
  'Harassment or Bullying',
  'Spam',
  'Copyright Infringement',
  'Misleading Information',
  'Hate Speech',
  'Violence or Dangerous Content',
  'Other'
];

export default function ReportModal({ isOpen, onClose, targetType, targetId, onSubmitted }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reason) {
      setError('Please select a reason for reporting');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          targetType,
          targetId,
          reason,
          details
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to submit report');
      }

      setSuccess(true);
      setReason('');
      setDetails('');
      
      setTimeout(() => {
        onSubmitted?.();
        handleClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'An error occurred while submitting the report');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setDetails('');
    setError('');
    setSuccess(false);
    onClose();
  };

  return (
    <MuseoModal
      open={isOpen}
      onClose={handleClose}
      title="Report Content"
      subtitle="Help us keep our community safe"
      size="lg"
      nested={true}
    >
      <MuseoModalBody>
        {/* Show reported content preview */}
        {targetType && targetId && (
          <div style={{ marginBottom: '24px' }}>
            <ContentPreview targetType={targetType} targetId={targetId} />
          </div>
        )}

        {/* Report form */}
        <form onSubmit={handleSubmit} style={{ display: 'block' }}>
          {/* Reason dropdown */}
          <div className="museo-form-field museo-form-field--full">
            <label className="museo-label">Reason for Report *</label>
            <select
              className="museo-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
            >
              <option value="">Select a reason...</option>
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Details textarea */}
          <div className="museo-form-field museo-form-field--full" style={{ marginTop: '16px' }}>
            <label className="museo-label">Additional Details (Optional)</label>
            <textarea
              className="museo-textarea"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide any additional context that might help us review this report..."
              disabled={loading}
              rows="4"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="museo-error-message" style={{ marginTop: '16px' }}>
              {error}
            </div>
          )}

          {/* Success message */}
          {success && (
            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#e6f7ed', color: '#2f7d32', borderRadius: '6px', fontSize: '14px' }}>
              ✓ Report submitted successfully. Thank you for helping keep our community safe.
            </div>
          )}
        </form>
      </MuseoModalBody>

      <MuseoModalActions>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleClose}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={handleSubmit}
          disabled={loading || !reason || success}
        >
          {loading ? 'Submitting...' : 'Submit Report'}
        </button>
      </MuseoModalActions>
    </MuseoModal>
  );
}
