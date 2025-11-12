import { useState, useMemo } from 'react';
import ImageUploadZone from '../../../components/modal-features/ImageUploadZone.jsx';
import MuseoModal, { MuseoModalBody, MuseoModalActions, MuseoModalSection } from '../../../components/MuseoModal.jsx';
import '../../../styles/components/inputs.css';
import '../../Marketplace/css/returns.css';

export default function ReturnRequestModal({ open, onClose, order, onSubmitted }) {
  const [reason, setReason] = useState('defective_damaged');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isDelivered = useMemo(() => order?.status === 'delivered', [order]);

  const submit = async () => {
    if (!order?.orderId) return;
    setSubmitting(true);
    setError('');
    try {
      const files = Array.isArray(evidence) ? evidence.map(x => x.file).filter(Boolean) : (evidence?.file ? [evidence.file] : []);
      const { createReturn } = await import('../../../api/returns.js');
      const res = await createReturn({ orderId: order.orderId, reason, description, evidenceFiles: files });
      onSubmitted?.(res.data);
      onClose?.();
    } catch (e) {
      setError(e.message || 'Failed to submit return');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MuseoModal open={open} onClose={onClose} title="Request a Return" size="lg">
      <MuseoModalBody>
        {!isDelivered && (
          <div className="museo-form-error" style={{marginBottom: 12}}>Only delivered orders can be returned.</div>
        )}
        <MuseoModalSection>
          <div className="museo-form-group">
            <label className="museo-label museo-label--required">Reason</label>
            <select className="museo-select" value={reason} onChange={(e)=>setReason(e.target.value)}>
              <option value="defective_damaged">Defective / Damaged</option>
              <option value="wrong_item">Wrong item</option>
              <option value="not_as_described">Not as described</option>
              <option value="changed_mind">Changed my mind</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="museo-form-group">
            <label className="museo-label museo-label--required">Description</label>
            <textarea className="museo-textarea" placeholder="Tell us what went wrong" value={description} onChange={(e)=>setDescription(e.target.value)} />
            <small className="museo-form-helper">Please describe the issue clearly. Required.</small>
          </div>
          <div className="museo-form-group">
            <ImageUploadZone type="multiple" maxFiles={5} title="Evidence photos (optional)" hint="Up to 5 images, PNG/JPG only" value={evidence} onChange={setEvidence}/>
          </div>
          {error && <div className="museo-form-error">{error}</div>}
        </MuseoModalSection>
      </MuseoModalBody>
      <MuseoModalActions>
        <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={!isDelivered || submitting || !description.trim()}>
          {submitting ? 'Submitting...' : 'Submit Return'}
        </button>
      </MuseoModalActions>
    </MuseoModal>
  );
}
