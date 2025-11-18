import React, { useEffect, useState } from 'react';
import MuseoModal, { MuseoModalBody, MuseoModalActions, MuseoModalSection } from '../../components/MuseoModal.jsx';
import './css/addProductModal.css';

const API = import.meta.env.VITE_API_BASE;

function isoToLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function localToISO(local) {
  if (!local) return null;
  const d = new Date(local);
  return d.toISOString();
}

export default function EditAuctionModal({ isOpen, onClose, auction, onSaved }) {
  const [form, setForm] = useState({
    startPrice: '',
    reservePrice: '',
    minIncrement: '',
    startAt: '',
    endAt: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && auction) {
      setForm({
        startPrice: auction.startPrice ?? '',
        reservePrice: auction.reservePrice ?? '',
        minIncrement: auction.minIncrement ?? 0,
        startAt: isoToLocalInput(auction.startAt),
        endAt: isoToLocalInput(auction.endAt)
      });
      setError('');
    }
  }, [isOpen, auction]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const sp = parseFloat(form.startPrice);
    const rp = parseFloat(form.reservePrice);
    const mi = parseFloat(form.minIncrement);
    if (!Number.isFinite(sp) || sp <= 0) return 'Starting price must be greater than 0';
    if (!Number.isFinite(rp) || rp < 0) return 'Reserve price must be 0 or more';
    if (Number.isFinite(sp) && Number.isFinite(rp) && rp < sp) return 'Reserve price must be ≥ starting price';
    if (!Number.isFinite(mi) || mi < 0) return 'Minimum increment must be 0 or more';
    if (!form.startAt) return 'Start time is required';
    if (!form.endAt) return 'End time is required';
    if (new Date(form.endAt) <= new Date(form.startAt)) return 'End time must be after start time';
    return '';
    };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    const msg = validate();
    if (msg) { setError(msg); return; }

    setSubmitting(true);
    setError('');
    try {
      const body = {
        startPrice: parseFloat(form.startPrice),
        reservePrice: parseFloat(form.reservePrice),
        minIncrement: parseFloat(form.minIncrement),
        startAt: localToISO(form.startAt),
        endAt: localToISO(form.endAt)
      };
      const res = await fetch(`${API}/auctions/${auction.auctionId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.error || data.message || `Failed to update auction (${res.status})`);
      }
      onSaved?.(data.data || data);
    } catch (err) {
      setError(err.message || 'Failed to update auction');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !auction) return null;

  return (
    <MuseoModal
      open={isOpen}
      onClose={onClose}
      title={`Edit Auction`}
      subtitle={`Update pricing and schedule. Changes allowed only if auction has no bids (admin can override).`}
      size="lg"
    >
      <MuseoModalBody>
        <form onSubmit={handleSubmit} className="add-product-form">
          <MuseoModalSection>
            <div className="form-section">
              <h3 className="section-title">Auction Pricing</h3>

              <div className="form-row">
                <div className="museo-form-group">
                  <label htmlFor="startPrice" className="museo-label museo-label--required">Starting Price (₱)</label>
                  <input
                    id="startPrice"
                    name="startPrice"
                    type="number"
                    className="museo-input"
                    value={form.startPrice}
                    onChange={onChange}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="museo-form-group">
                  <label htmlFor="reservePrice" className="museo-label museo-label--required">Reserve Price (₱)</label>
                  <input
                    id="reservePrice"
                    name="reservePrice"
                    type="number"
                    className="museo-input"
                    value={form.reservePrice}
                    onChange={onChange}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="museo-form-group">
                <label htmlFor="minIncrement" className="museo-label museo-label--required">Minimum Bid Increment (₱)</label>
                <input
                  id="minIncrement"
                  name="minIncrement"
                  type="number"
                  className="museo-input"
                  value={form.minIncrement}
                  onChange={onChange}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </MuseoModalSection>

          <MuseoModalSection>
            <div className="form-section">
              <h3 className="section-title">Auction Duration (Manila Timezone)</h3>
              <div className="form-row">
                <div className="museo-form-group">
                  <label htmlFor="startAt" className="museo-label museo-label--required">Start Time</label>
                  <input
                    id="startAt"
                    name="startAt"
                    type="datetime-local"
                    className="museo-input"
                    value={form.startAt}
                    onChange={onChange}
                  />
                </div>
                <div className="museo-form-group">
                  <label htmlFor="endAt" className="museo-label museo-label--required">End Time</label>
                  <input
                    id="endAt"
                    name="endAt"
                    type="datetime-local"
                    className="museo-input"
                    value={form.endAt}
                    onChange={onChange}
                  />
                </div>
              </div>
            </div>
          </MuseoModalSection>

          {error && (
            <div className="museo-notice museo-notice--error">{error}</div>
          )}
        </form>
      </MuseoModalBody>
      <MuseoModalActions>
        <button className="btn btn-sm btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
        <button className={`btn btn-sm btn-primary ${submitting ? 'processing' : ''}`} onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Saving…' : 'Save Changes'}
        </button>
      </MuseoModalActions>
    </MuseoModal>
  );
}
