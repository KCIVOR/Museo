import React, { useEffect, useMemo, useState } from 'react';
import PayoutMethodSettings from './PayoutMethodSettings.jsx';
import MuseoModal, { MuseoModalBody, MuseoModalActions, MuseoModalSection } from '../../../components/MuseoModal.jsx';
import AlertModal from '../../Shared/AlertModal.jsx';
import ConfirmModal from '../../Shared/ConfirmModal.jsx';

export default function PayoutsManager({ apiBase }) {
  const API = useMemo(() => apiBase || (import.meta?.env?.VITE_API_URL || import.meta?.env?.VITE_API_BASE || 'http://localhost:3000/api'), [apiBase]);

  const [active, setActive] = useState('balance'); // balance | method | history

  const [balance, setBalance] = useState({ available: 0, pending: 0, totalPaidOut: 0, canWithdraw: false, minimumPayout: 100, mode: 'demo' });
  const [balLoading, setBalLoading] = useState(true);

  const [pm, setPm] = useState({ paymentMethod: null, gcashNumber: null, mayaNumber: null, bankName: null, bankAccountName: null, bankAccountNumber: null });
  const [pmLoading, setPmLoading] = useState(true);

  const [methods, setMethods] = useState([]);
  const [methodsLoading, setMethodsLoading] = useState(false);
  const [settingDefaultId, setSettingDefaultId] = useState('');
  const [methodsOpen, setMethodsOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTargetId, setConfirmTargetId] = useState('');
  const [withdrawConfirmOpen, setWithdrawConfirmOpen] = useState(false);
  const [withdrawConfirmMessage, setWithdrawConfirmMessage] = useState('');
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState('Notice');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertOkText, setAlertOkText] = useState('OK');

  const [history, setHistory] = useState({ payouts: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasMore: false }});
  const [histLoading, setHistLoading] = useState(false);
  const [error, setError] = useState('');

  const formatPhp = (n) => {
    const num = Number(n || 0);
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(num);
  };

  const showAlert = (message, title = 'Notice', okText = 'OK') => {
    setAlertMessage(message);
    setAlertTitle(title);
    setAlertOkText(okText);
    setAlertOpen(true);
  };

  const deleteMethod = async (id) => {
    try {
      setDeletingId(id);
      const res = await fetch(`${API}/payouts/methods/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.error || 'Failed to delete method');
      await Promise.all([fetchMethods(), fetchPm(), fetchBalance()]);
    } catch (e) {
      showAlert(e.message || 'Failed to delete method', 'Error');
    } finally {
      setDeletingId('');
    }
  };

  const openDeleteConfirm = (id) => {
    setConfirmTargetId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    const id = confirmTargetId;
    setConfirmOpen(false);
    setConfirmTargetId('');
    await deleteMethod(id);
  };

  const fetchMethods = async () => {
    try {
      setMethodsLoading(true);
      const res = await fetch(`${API}/payouts/methods`, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setMethods(Array.isArray(data.data) ? data.data : []);
      }
    } finally {
      setMethodsLoading(false);
    }
  };

  const setDefault = async (id) => {
    try {
      setSettingDefaultId(id);
      const res = await fetch(`${API}/payouts/methods/${id}/default`, { method: 'POST', credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.error || 'Failed to set default');
      await Promise.all([fetchPm(), fetchMethods(), fetchBalance()]);
    } catch (e) {
      showAlert(e.message || 'Failed to set default', 'Error');
    } finally {
      setSettingDefaultId('');
    }
  };

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

  const fetchBalance = async () => {
    try {
      setBalLoading(true);
      const res = await fetch(`${API}/payouts/balance`, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setBalance({
          available: parseFloat(data.data.available || 0),
          pending: parseFloat(data.data.pending || 0),
          totalPaidOut: parseFloat(data.data.totalPaidOut || 0),
          canWithdraw: !!data.data.canWithdraw,
          minimumPayout: data.data.minimumPayout || 100,
          mode: data.data.mode || 'demo'
        });
      }
    } finally {
      setBalLoading(false);
    }
  };

  const fetchPm = async () => {
    try {
      setPmLoading(true);
      const res = await fetch(`${API}/payouts/payment-info`, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setPm(data.data || {});
      }
    } finally {
      setPmLoading(false);
    }
  };

  const fetchHistory = async (page = 1) => {
    try {
      setHistLoading(true);
      const res = await fetch(`${API}/payouts/history?page=${page}&limit=10`, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setHistory({ payouts: data.data?.payouts || [], pagination: data.data?.pagination || { page, limit: 10, total: 0, totalPages: 0, hasMore: false } });
      }
    } finally {
      setHistLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    fetchPm();
    fetchMethods();
  }, []);

  useEffect(() => {
    if (active === 'history') fetchHistory(1);
  }, [active]);

  const onWithdraw = () => {
    setError('');
    if (!balance.canWithdraw) return;
    const pmName = pm?.paymentMethod === 'gcash' ? `GCash (${maskPhone(pm?.gcashNumber)})` : pm?.paymentMethod === 'maya' ? `Maya (${maskPhone(pm?.mayaNumber)})` : pm?.paymentMethod === 'bank' ? `${pm?.bankName} (${maskAccount(pm?.bankAccountNumber)})` : pm?.paymentMethod || 'method';
    setWithdrawConfirmMessage(`Withdraw ${formatPhp(balance.available)} to your ${pmName}?`);
    setWithdrawConfirmOpen(true);
  };

  const performWithdraw = async () => {
    try {
      const res = await fetch(`${API}/payouts/withdraw`, { method: 'POST', credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.error || 'Failed to withdraw');
      showAlert(`${data.message}\n\nAmount: ${formatPhp(data.data.amount)}\nReference: ${data.data.reference}\nMethod: ${data.data.paymentMethod}`, 'Withdrawal');
      fetchBalance();
      if (active === 'history') fetchHistory(history.pagination?.page || 1);
    } catch (e) {
      setError(e.message || 'Failed to withdraw');
      showAlert(e.message || 'Failed to withdraw', 'Error');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 'var(--museo-space-6)' }}>
        <h2 className="museo-heading" style={{ fontSize: 'var(--museo-text-2xl)', display: 'flex', alignItems: 'center', gap: 'var(--museo-space-2)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          Payouts & Earnings
        </h2>
        <p style={{ color: 'var(--museo-text-secondary)', marginTop: 'var(--museo-space-2)' }}>Manage your earnings, methods, and withdrawals</p>
      </div>

      {/* Sub-tabs */}
      <div className="museo-tabs museo-tabs--full" style={{ marginBottom: 'var(--museo-space-4)' }}>
        <button className={`museo-tab ${active === 'balance' ? 'museo-tab--active' : ''}`} onClick={() => setActive('balance')}>Balance</button>
        <button className={`museo-tab ${active === 'method' ? 'museo-tab--active' : ''}`} onClick={() => setActive('method')}>Payment Method</button>
        <button className={`museo-tab ${active === 'history' ? 'museo-tab--active' : ''}`} onClick={() => setActive('history')}>History</button>
      </div>

      {/* Balance Tab */}
      {active === 'balance' && (
        <div className="museo-card" style={{ background: 'var(--museo-white)', borderRadius: 'var(--museo-radius-lg)', padding: 'var(--museo-space-6)', border: '1px solid var(--museo-border)', boxShadow: 'var(--museo-shadow-sm)' }}>
          <div>
            <h3 className="museo-heading" style={{ fontSize: 'var(--museo-text-lg)', marginBottom: 'var(--museo-space-3)' }}>Available Balance</h3>
            <p style={{ fontSize: 'var(--museo-text-3xl)', fontWeight: 'var(--museo-font-bold)', color: 'var(--museo-primary)', margin: 'var(--museo-space-2) 0' }}>
              {balLoading ? 'Loading…' : formatPhp(balance.available)}
            </p>
            {balance.pending > 0 && (
              <p style={{ fontSize: 'var(--museo-text-sm)', color: 'var(--museo-text-muted)', display: 'flex', alignItems: 'center', gap: 'var(--museo-space-1)', marginBottom: 'var(--museo-space-2)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                Pending (Escrow): {formatPhp(balance.pending)}
              </p>
            )}
            <small style={{ display: 'block', color: 'var(--museo-text-secondary)', marginTop: 'var(--museo-space-2)' }}>Minimum withdrawal: ₱{balance.minimumPayout}</small>
            {!pm.paymentMethod && (
              <small style={{ display: 'flex', alignItems: 'center', gap: 'var(--museo-space-1)', color: 'var(--museo-warning)', marginTop: 'var(--museo-space-2)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                Set up payment method first
              </small>
            )}
          </div>

          {error && (
            <div className="museo-notice museo-notice--error" style={{ marginTop: 'var(--museo-space-3)' }}>{error}</div>
          )}

          <div style={{ marginTop: 'var(--museo-space-4)', display: 'flex', gap: 'var(--museo-space-3)', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={fetchBalance} disabled={balLoading}>Refresh</button>
            <button className="btn btn-primary btn-sm" onClick={onWithdraw} disabled={balLoading || !balance.canWithdraw || !pm.paymentMethod}>
              Withdraw Funds
            </button>
          </div>

          <div className="museo-card" style={{ marginTop: 'var(--museo-space-5)', padding: 'var(--museo-space-4)', border: '1px solid var(--museo-border)', borderRadius: 'var(--museo-radius-md)' }}>
            <div style={{ display: 'grid', gap: 'var(--museo-space-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--museo-text-secondary)' }}>Total Paid Out</span>
                <span style={{ fontWeight: 'var(--museo-font-semibold)' }}>{formatPhp(balance.totalPaidOut)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--museo-text-secondary)' }}>Mode</span>
                <span style={{ fontWeight: 'var(--museo-font-semibold)' }}>{balance.mode?.toUpperCase?.() || 'DEMO'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Tab */}
      {active === 'method' && (
        <div className="museo-card" style={{ padding: 'var(--museo-space-5)', border: '1px solid var(--museo-border)', borderRadius: 'var(--museo-radius-lg)', background: 'var(--museo-white)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="museo-heading" style={{ fontSize: 'var(--museo-text-lg)' }}>Payment Method</h3>
              <div className="museo-form-helper" style={{ marginTop: 'var(--museo-space-2)' }}>
                {pmLoading ? 'Loading…' : pm?.paymentMethod
                  ? (
                      <>
                        {pm.paymentMethod === 'gcash' && <>GCash ({maskPhone(pm.gcashNumber)})</>}
                        {pm.paymentMethod === 'maya' && <>Maya ({maskPhone(pm.mayaNumber)})</>}
                        {pm.paymentMethod === 'bank' && <>{pm.bankName} ({maskAccount(pm.bankAccountNumber)})</>}
                      </>
                    )
                  : 'No method selected'}
              </div>
            </div>
            <div>
              <button className="btn btn-secondary btn-sm" onClick={() => { setMethodsOpen(true); setLinkOpen(false); }}>
                {pm?.paymentMethod ? 'Change' : 'Set up'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {active === 'history' && (
        <div className="museo-card" style={{ padding: 'var(--museo-space-5)', border: '1px solid var(--museo-border)', borderRadius: 'var(--museo-radius-lg)', background: 'var(--museo-white)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--museo-space-3)' }}>
            <h3 className="museo-heading" style={{ fontSize: 'var(--museo-text-lg)' }}>Payout History</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => fetchHistory(history.pagination?.page || 1)} disabled={histLoading}>Refresh</button>
            </div>
          </div>

          {histLoading ? (
            <div className="museo-message">Loading payout history…</div>
          ) : history.payouts.length === 0 ? (
            <div className="museo-message">No payouts yet</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {history.payouts.map((p) => (
                    <tr key={p.payoutId}>
                      <td>{new Date(p.paidDate || p.readyDate || p.createdAt).toLocaleString()}</td>
                      <td>{p.payoutType || 'standard'}</td>
                      <td><span className={`status-badge ${p.status}`}>{p.status}</span></td>
                      <td>{formatPhp(p.netAmount || p.amount)}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.payoutReference || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {history.pagination?.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--museo-space-3)' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => fetchHistory(Math.max(1, (history.pagination?.page || 1) - 1))} disabled={histLoading || (history.pagination?.page || 1) <= 1}>Prev</button>
              <div className="museo-form-helper">Page {history.pagination?.page} of {history.pagination?.totalPages}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => fetchHistory(Math.min(history.pagination?.totalPages || 1, (history.pagination?.page || 1) + 1))} disabled={histLoading || (history.pagination?.page || 1) >= (history.pagination?.totalPages || 1)}>Next</button>
            </div>
          )}
        </div>
      )}
      {/* Methods Picker Modal */}
      <MuseoModal open={methodsOpen} onClose={() => { setMethodsOpen(false); setLinkOpen(false); }} title={linkOpen ? 'Link New Account' : 'Select Payout Method'} size="md">
        <MuseoModalBody>
          <MuseoModalSection>
            {!linkOpen && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--museo-space-3)' }}>
                  <div className="museo-form-helper">Choose one of your linked accounts</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={fetchMethods} disabled={methodsLoading}>{methodsLoading ? 'Refreshing…' : 'Refresh'}</button>
                    <button className="btn btn-primary btn-sm" onClick={() => setLinkOpen(true)}>Link new account</button>
                  </div>
                </div>
                {methodsLoading ? (
                  <div className="museo-message">Loading methods…</div>
                ) : methods.length === 0 ? (
                  <div className="museo-message">No linked accounts yet. Click “Link new account”.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 'var(--museo-space-3)' }}>
                    {methods.map(m => (
                      <div key={m.sellerPayoutMethodId} className="museo-card museo-card--compact" style={{ padding: 'var(--museo-space-3)', border: '1px solid var(--museo-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 'var(--museo-font-semibold)', color: 'var(--museo-text-primary)' }}>{m.method?.toUpperCase?.() || 'METHOD'}</div>
                            <div className="museo-form-helper">
                              {m.method === 'gcash' && <>GCash ({maskPhone(m.phoneE164)})</>}
                              {m.method === 'maya' && <>Maya ({maskPhone(m.phoneE164)})</>}
                              {m.method === 'bank' && <>{m.bankName} ({maskAccount(m.bankAccountNumber)})</>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {m.isDefault ? (
                              <span className="museo-badge museo-badge--success">Default</span>
                            ) : (
                              <button className={`btn btn-secondary btn-sm ${settingDefaultId === m.sellerPayoutMethodId ? 'loading' : ''}`} disabled={!!settingDefaultId} onClick={() => setDefault(m.sellerPayoutMethodId)}>
                                {settingDefaultId === m.sellerPayoutMethodId ? 'Setting…' : 'Make Default'}
                              </button>
                            )}
                            <button
                              className={`btn btn-ghost btn-sm`}
                              title="Delete"
                              aria-label="Delete payout method"
                              disabled={!!deletingId}
                              onClick={() => openDeleteConfirm(m.sellerPayoutMethodId)}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                <path d="M10 11v6"/>
                                <path d="M14 11v6"/>
                                <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {linkOpen && (
              <div>
                <div className="museo-form-helper" style={{ marginBottom: 'var(--museo-space-3)' }}>Add an e‑wallet or bank account. Saving will set it as default.</div>
                <PayoutMethodSettings apiBase={API} />
              </div>
            )}
          </MuseoModalSection>
        </MuseoModalBody>
        <MuseoModalActions>
          {linkOpen ? (
            <button className="btn btn-ghost btn-sm" onClick={() => setLinkOpen(false)}>Back</button>
          ) : null}
          <button className="btn btn-primary btn-sm" onClick={() => { fetchPm(); fetchMethods(); setMethodsOpen(false); setLinkOpen(false); }}>Done</button>
        </MuseoModalActions>
      </MuseoModal>

      {/* Withdraw Confirm */}
      <ConfirmModal
        open={withdrawConfirmOpen}
        title="Withdraw Funds"
        message={withdrawConfirmMessage}
        confirmText="Withdraw"
        cancelText="Cancel"
        onConfirm={() => { setWithdrawConfirmOpen(false); performWithdraw(); }}
        onCancel={() => setWithdrawConfirmOpen(false)}
      />

      {/* Global Alert */}
      <AlertModal
        open={alertOpen}
        title={alertTitle}
        message={alertMessage}
        okText={alertOkText}
        onOk={() => setAlertOpen(false)}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        open={confirmOpen}
        title="Delete payout method"
        message="Are you sure you want to delete this payout method? If it's your default, another linked method will be set as default if available."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => { setConfirmOpen(false); setConfirmTargetId(''); }}
      />
    </div>
  );
}
