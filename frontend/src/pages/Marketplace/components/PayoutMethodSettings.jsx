import React, { useEffect, useMemo, useState } from 'react';
import AlertModal from '../../Shared/AlertModal.jsx';

// Standalone Payment Settings panel for Seller Dashboard Settings tab
// Uses existing backend endpoints:
//  - GET  /api/payouts/payment-info
//  - PUT  /api/payouts/payment-info
export default function PayoutMethodSettings({ apiBase }) {
  const API = useMemo(() => apiBase || (import.meta?.env?.VITE_API_URL || import.meta?.env?.VITE_API_BASE || 'http://localhost:3000/api'), [apiBase]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [method, setMethod] = useState(''); // '', 'gcash', 'maya', 'bank'
  const [gcashNumber, setGcashNumber] = useState('');
  const [mayaNumber, setMayaNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');

  const [current, setCurrent] = useState(null);
  const [error, setError] = useState('');
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState('Notice');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertOkText, setAlertOkText] = useState('OK');

  const showAlert = (message, title = 'Notice', okText = 'OK') => {
    setAlertMessage(message);
    setAlertTitle(title);
    setAlertOkText(okText);
    setAlertOpen(true);
  };

  const bankOptions = [
    'BDO',
    'BPI',
    'Metrobank',
    'UnionBank',
    'Landbank',
    'PNB',
    'Security Bank',
    'RCBC',
    'Chinabank',
    'EastWest',
  ];

  const maskPhone = (v) => {
    if (!v) return '';
    const digits = String(v).replace(/\D/g, '');
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, digits.length - 4).replace(/\d/g, '•')}${digits.slice(-4)}`;
  };

  const maskAccount = (v) => {
    if (!v) return '';
    const digits = String(v).replace(/\s/g, '');
    if (digits.length <= 4) return digits;
    return `${'•'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
  };

  const fetchPaymentInfo = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API}/payouts/payment-info`, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.error || 'Failed to load payment info');

      const info = data?.data || {};
      setCurrent(info);
      setMethod(info.paymentMethod || '');
      setGcashNumber(info.gcashNumber || '');
      setMayaNumber(info.mayaNumber || '');
      setBankName(info.bankName || '');
      setBankAccountName(info.bankAccountName || '');
      setBankAccountNumber(info.bankAccountNumber || '');
    } catch (e) {
      setError(e.message || 'Failed to load payment info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSave = async () => {
    try {
      setSaving(true);
      setError('');

      if (!method) throw new Error('Please select a payout method');
      if (method === 'gcash' && !gcashNumber.trim()) throw new Error('Please enter your GCash number');
      if (method === 'maya' && !mayaNumber.trim()) throw new Error('Please enter your Maya number');
      if (method === 'bank') {
        if (!bankName || !bankAccountName.trim() || !bankAccountNumber.trim()) {
          throw new Error('Please complete your bank details');
        }
      }

      const payload = { paymentMethod: method };
      if (method === 'gcash') payload.gcashNumber = gcashNumber.trim();
      if (method === 'maya') payload.mayaNumber = mayaNumber.trim();
      if (method === 'bank') {
        payload.bankName = bankName;
        payload.bankAccountName = bankAccountName.trim();
        payload.bankAccountNumber = bankAccountNumber.trim();
      }

      const res = await fetch(`${API}/payouts/payment-info`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.error || 'Failed to save payment info');

      showAlert('Payment method saved', 'Success');
      fetchPaymentInfo();
    } catch (e) {
      setError(e.message || 'Failed to save payment information');
    } finally {
      setSaving(false);
    }
  };

  const disabled = useMemo(() => {
    if (!method) return true;
    if (method === 'gcash') return !gcashNumber.trim();
    if (method === 'maya') return !mayaNumber.trim();
    if (method === 'bank') return !bankName || !bankAccountName.trim() || !bankAccountNumber.trim();
    return false;
  }, [method, gcashNumber, mayaNumber, bankName, bankAccountName, bankAccountNumber]);

  return (
    <div className="museo-card" style={{ padding: 'var(--museo-space-5)', border: '1px solid var(--museo-border)', borderRadius: 'var(--museo-radius-lg)', background: 'var(--museo-white)' }}>
      <div className="museo-grid museo-grid--2" style={{ gap: 'var(--museo-space-4)' }}>
        <div className="museo-form-group">
          <label className="museo-label">Payout Method</label>
          <select className="museo-select" value={method} onChange={(e) => setMethod(e.target.value)} disabled={loading}>
            <option value="">Select method</option>
            <option value="gcash">GCash (PH)</option>
            <option value="maya">Maya (PH)</option>
            <option value="bank">Bank Transfer</option>
          </select>
          <div className="museo-form-helper">Choose where you want to receive your earnings</div>
        </div>

        {method === 'gcash' && (
          <div className="museo-form-group">
            <label className="museo-label">GCash Number</label>
            <input
              className="museo-input"
              type="tel"
              inputMode="numeric"
              placeholder="09XXXXXXXXX"
              value={gcashNumber}
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d+]/g, '');
                setGcashNumber(v);
              }}
              disabled={loading}
            />
            <div className="museo-form-helper">We will send payouts to this GCash number</div>
          </div>
        )}

        {method === 'maya' && (
          <div className="museo-form-group">
            <label className="museo-label">Maya Number</label>
            <input
              className="museo-input"
              type="tel"
              inputMode="numeric"
              placeholder="09XXXXXXXXX"
              value={mayaNumber}
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d+]/g, '');
                setMayaNumber(v);
              }}
              disabled={loading}
            />
            <div className="museo-form-helper">We will send payouts to this Maya number</div>
          </div>
        )}

        {method === 'bank' && (
          <>
            <div className="museo-form-group">
              <label className="museo-label">Bank Name</label>
              <select className="museo-select" value={bankName} onChange={(e) => setBankName(e.target.value)} disabled={loading}>
                <option value="">Select bank</option>
                {bankOptions.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="museo-form-group">
              <label className="museo-label">Account Name</label>
              <input
                className="museo-input"
                type="text"
                placeholder="Exact name on account"
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="museo-form-group">
              <label className="museo-label">Account Number</label>
              <input
                className="museo-input"
                type="text"
                inputMode="numeric"
                placeholder="e.g., 1234567890"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                disabled={loading}
              />
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="museo-notice museo-notice--error" style={{ marginTop: 'var(--museo-space-3)' }}>
          {error}
        </div>
      )}

      <div className="museo-actions" style={{ marginTop: 'var(--museo-space-5)', display: 'flex', gap: 'var(--museo-space-3)' }}>
        <button className={`btn btn-primary btn-sm ${saving ? 'processing' : ''}`} onClick={onSave} disabled={saving || disabled}>
          {saving ? 'Saving…' : 'Save Payment Method'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={fetchPaymentInfo} disabled={loading || saving}>
          Refresh
        </button>
      </div>

      <div className="museo-form-helper" style={{ marginTop: 'var(--museo-space-3)' }}>
        Current: {current?.paymentMethod ? (
          <>
            {current.paymentMethod === 'gcash' && <>GCash ({maskPhone(current.gcashNumber)})</>}
            {current.paymentMethod === 'maya' && <>Maya ({maskPhone(current.mayaNumber)})</>}
            {current.paymentMethod === 'bank' && <>{current.bankName} ({maskAccount(current.bankAccountNumber)})</>}
          </>
        ) : 'No payout method set'}
      </div>

      <AlertModal
        open={alertOpen}
        title={alertTitle}
        message={alertMessage}
        okText={alertOkText}
        onOk={() => setAlertOpen(false)}
      />
    </div>
  );
}
