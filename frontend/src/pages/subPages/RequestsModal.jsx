import { useEffect, useMemo, useState } from "react";
import ConfirmModal from "../ConfirmModal";
import RequestDetailModal from "./RequestDetailModal";
const API = import.meta.env.VITE_API_BASE;

export default function RequestsModal({
  open,
  onClose,
  // Optional action handlers to customize per type
  actionsByType = {}, // { [type]: { approve: (id, req)=>Promise, reject: (id, req)=>Promise } }
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // { id, action, requestName }
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const loadRequests = async () => {
    setLoading(true);
    setError("");
    try {
      // Backend route: GET /request/getRequest (returns { requests: [...] })
      const res = await fetch(`${API}/request/getRequest`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to load requests (${res.status})`);
      const data = await res.json();
      setItems(Array.isArray(data?.requests) ? data.requests : (Array.isArray(data) ? data : []));
    } catch (e) {
      setError(e.message || "Failed to load requests");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    let abort = false;
    const load = async () => {
      await loadRequests();
    };
    if (!abort) load();
    return () => { abort = true; };
  }, [open]);

  // Derive type options from data
  const types = useMemo(() => {
    const s = new Set();
    (items || []).forEach(r => s.add((r.requestType || r.type || 'unknown')));
    return ['all', ...Array.from(s).sort()];
  }, [items]);

  // Filter and search
  const list = useMemo(() => {
    const base = items || [];
    const f1 = filter === 'all' ? base : base.filter(r => (r.requestType || r.type || 'unknown') === filter);
    const term = q.trim().toLowerCase();
    if (!term) return f1;
    return f1.filter(r => {
      const data = r.data || {};
      const name = [data.firstName, data.midInit, data.lastName].filter(Boolean).join(' ');
      const title = data.title || '';
      const t = (r.requestType || r.type || '').toString();
      const requestId = (r.id || r.requestId || '').toString();
      const userId = (r.userId || '').toString();
      return (
        name.toLowerCase().includes(term) ||
        title.toLowerCase().includes(term) ||
        t.toLowerCase().includes(term) ||
        requestId.toLowerCase().includes(term) ||
        userId.toLowerCase().includes(term)
      );
    });
  }, [items, filter, q]);

  const handleActionClick = (id, action) => {
    // Find request to get name for confirmation message
    const req = (items || []).find(r => (r.id || r.requestId) === id);
    const data = req?.data || {};
    const name = [data.firstName, data.midInit, data.lastName].filter(Boolean).join(' ') || data.title || 'this request';
    
    setPendingAction({ id, action, requestName: name });
    setConfirmOpen(true);
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    
    const { id, action } = pendingAction;
    setConfirmOpen(false);
    
    try {
      if (action === 'delete') {
        // Delete request
        const res = await fetch(`${API}/request/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to delete request');
        
        // Remove from local state
        setItems(prev => prev.filter(r => (r.id || r.requestId) !== id));
      } else {
        // Approve or Reject
        const req = (items || []).find(r => (r.id || r.requestId) === id);
        const rType = req?.requestType || req?.type || 'unknown';
        const handler = actionsByType[rType]?.[action];

        let responseData = null;
        if (typeof handler === 'function') {
          responseData = await handler(id, req);
        } else {
          // Generic fallback endpoint (adjust when backend is ready):
          // POST /request/action { id, action, type }
          const res = await fetch(`${API}/request/action`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, action, type: rType }),
          });
          if (!res.ok) throw new Error(`Failed to ${action}`);
          responseData = await res.json();
        }
        
        // Update local state with the new status from backend response
        const newStatus = responseData?.status || (action === 'approve' ? 'approved' : 'rejected');
        setItems(prev => prev.map(r => {
          const rid = r.id || r.requestId;
          if (rid !== id) return r;
          const data = r.data || {};
          return { 
            ...r, 
            status: newStatus, // Update table column status
            updatedAt: new Date().toISOString(), // Update table column updatedAt
            data: { ...data, status: newStatus } // Also update data.status for consistency
          };
        }));
      }
    } catch (e) {
      alert(e.message || `Failed to ${action}`);
    } finally {
      setPendingAction(null);
    }
  };

  if (!open) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px'
      }}
      onMouseDown={(e) => { if (e.currentTarget === e.target) onClose(); }}
    >
      <article
        role="dialog"
        aria-modal="true"
        aria-label="Requests"
        className="museo-card"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={{ 
          width: 'clamp(820px, 92vw, 1040px)', 
          maxHeight: '94vh', 
          display: 'grid', 
          gridTemplateRows: 'auto 1fr',
          background: 'var(--museo-white)',
          border: '1px solid var(--museo-border)',
          borderRadius: '16px',
          boxShadow: '0 20px 60px var(--museo-shadow)'
        }}
      >
        <header className="museo-body" style={{ padding: '16px 20px 12px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom: '12px' }}>
            <div>
              <h3 className="museo-title" style={{ margin:0, fontSize:'24px', fontWeight:800, color:'var(--museo-primary)' }}>
                User Requests
              </h3>
              <p className="museo-desc" style={{ margin: '4px 0 0 0', color:'var(--museo-text-secondary)', fontSize:'14px' }}>
                Review and act on submissions
              </p>
            </div>
            <button 
              aria-label="Close" 
              onClick={onClose} 
              className="museo-btn museo-btn--ghost"
              style={{ 
                width: '36px', 
                height: '36px', 
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>
          
          <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
            <div style={{ display:'inline-flex', gap:6, background:'var(--museo-bg-secondary)', padding:'4px', borderRadius:'999px', border:'1px solid var(--museo-border)' }}>
              {types.map(t => (
                <button 
                  key={t} 
                  onClick={() => setFilter(t)}
                  className="museo-btn museo-btn--ghost"
                  style={{
                    height:'32px', 
                    padding:'0 12px', 
                    borderRadius:'999px', 
                    border:'1px solid ' + (filter===t ? 'var(--museo-primary)' : 'transparent'),
                    background: filter===t ? 'var(--museo-white)' : 'transparent', 
                    color: filter===t ? 'var(--museo-primary)' : 'var(--museo-text-secondary)',
                    fontWeight: filter===t ? '700' : '500',
                    textTransform:'capitalize',
                    fontSize: '13px'
                  }}
                >
                  {t.replace(/_/g,' ')}
                </button>
              ))}
            </div>
            <input
              value={q}
              onChange={e=>setQ(e.target.value)}
              placeholder="Search name, title, type, request ID, user ID"
              style={{ 
                height:'36px', 
                padding:'0 12px', 
                borderRadius:'10px', 
                border:'1px solid var(--museo-border)', 
                flex:'1 1 200px',
                background: 'var(--museo-white)',
                color: 'var(--museo-text-primary)'
              }}
            />
          </div>
        </header>

        <div style={{ padding:'0 20px 20px', overflow:'auto' }}>
          {loading && (
            <div className="museo-message" style={{ textAlign: 'center', padding: '40px' }}>
              Loading requests...
            </div>
          )}
          
          {!!error && (
            <div className="museo-message" style={{ 
              textAlign: 'center', 
              padding: '40px',
              color: 'var(--museo-error)',
              background: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              margin: '20px 0'
            }}>
              {error}
            </div>
          )}
          
          {!loading && !error && list.length === 0 && (
            <div className="museo-message" style={{ 
              textAlign: 'center', 
              padding: '60px 20px',
              background: 'var(--museo-bg-secondary)',
              borderRadius: '16px',
              margin: '20px 0'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.7 }}>📭</div>
              <h4 className="museo-title" style={{ margin: '0 0 8px 0', color: 'var(--museo-primary)' }}>
                No requests
              </h4>
              <p className="museo-desc" style={{ margin: 0, color: 'var(--museo-text-secondary)' }}>
                You'll see new requests here as users submit them.
              </p>
            </div>
          )}

          {!loading && !error && list.length > 0 && (
            <div style={{ display:'grid', gap:'16px', margin: '20px 0' }}>
              {list.map((r) => {
                const id = r.id || r.requestId;
                const data = r.data || {};
                const imgs = Array.isArray(data.images) ? data.images : [];
                const name = [data.firstName, data.midInit, data.lastName].filter(Boolean).join(' ');
                const type = r.requestType || r.type || 'unknown';
                const status = (r.status || 'pending').toLowerCase();
                
                return (
                  <article 
                    key={id} 
                    style={{
                      background: 'var(--museo-white)',
                      border: '2px solid var(--museo-border)',
                      borderRadius: '16px',
                      padding: '20px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontFamily: 'var(--museo-font-body)',
                      position: 'relative'
                    }}
                    onClick={() => { setSelectedRequest(r); setDetailOpen(true); }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.borderColor = 'var(--museo-accent)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                      e.currentTarget.style.borderColor = 'var(--museo-border)';
                    }}
                  >
                    {/* Header with badges */}
                    <header style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '16px',
                      gap: '12px'
                    }}>
                      {/* Left: Type badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: 'var(--museo-accent-light)',
                          color: 'var(--museo-primary)',
                          fontSize: '12px',
                          fontWeight: '700',
                          textTransform: 'capitalize',
                          border: '1px solid var(--museo-accent)',
                          letterSpacing: '0.025em'
                        }}>
                          {type.replace(/_/g,' ')}
                        </span>
                      </div>
                      
                      {/* Right: Status badge */}
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '700',
                          textTransform: 'capitalize',
                          letterSpacing: '0.025em',
                          background: status === 'approved' 
                            ? 'var(--museo-success)' 
                            : status === 'rejected' 
                            ? 'var(--museo-error)' 
                            : 'var(--museo-gray-200)',
                          color: status === 'approved' || status === 'rejected' 
                            ? 'var(--museo-white)' 
                            : 'var(--museo-text-secondary)',
                          border: `1px solid ${
                            status === 'approved' 
                              ? 'var(--museo-success)' 
                              : status === 'rejected' 
                              ? 'var(--museo-error)' 
                              : 'var(--museo-border)'
                          }`
                        }}>
                          {status}
                        </span>
                      </div>
                    </header>

                    {/* Main content */}
                    <div style={{ marginBottom: '16px' }}>
                      {/* Title */}
                      <h3 style={{
                        margin: '0 0 12px 0',
                        fontSize: '18px',
                        fontWeight: '700',
                        color: 'var(--museo-text-primary)',
                        fontFamily: 'var(--museo-font-display)',
                        lineHeight: '1.3'
                      }}>
                        {name || data.title || r.title || 'Request'}
                      </h3>
                      
                      {/* Metadata */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '8px',
                        marginBottom: '16px',
                        fontSize: '13px',
                        color: 'var(--museo-text-secondary)'
                      }}>
                        {'userId' in r && <div><strong>User ID:</strong> {r.userId}</div>}
                        {'phone' in data && <div><strong>Phone:</strong> {data.phone || '—'}</div>}
                        {'age' in data && <div><strong>Age:</strong> {data.age || '—'}</div>}
                        {'sex' in data && <div><strong>Sex:</strong> {data.sex || '—'}</div>}
                        {'birthdate' in data && <div><strong>Birthdate:</strong> {data.birthdate || '—'}</div>}
                        {'address' in data && <div><strong>Address:</strong> {data.address || '—'}</div>}
                        {'artworkTitle' in data && <div><strong>Artwork:</strong> {data.artworkTitle || '—'}</div>}
                        {'artId' in data && <div><strong>Art ID:</strong> {data.artId || '—'}</div>}
                        {'startingPrice' in data && <div><strong>Start Price:</strong> {data.startingPrice || '—'}</div>}
                        {'reservePrice' in data && <div><strong>Reserve:</strong> {data.reservePrice || '—'}</div>}
                        {'auctionStart' in data && <div><strong>Auction Start:</strong> {data.auctionStart || '—'}</div>}
                        {'auctionEnd' in data && <div><strong>Auction End:</strong> {data.auctionEnd || '—'}</div>}
                      </div>
                      
                      {/* Images */}
                      {imgs.length > 0 && (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                          gap: '12px',
                          marginBottom: '16px'
                        }}>
                          {imgs.map((src, i) => (
                            <div key={i} style={{
                              borderRadius: '12px',
                              overflow: 'hidden',
                              border: '2px solid var(--museo-border)',
                              aspectRatio: '4/3'
                            }}>
                              <img 
                                src={src} 
                                alt="attachment" 
                                loading="lazy" 
                                style={{ 
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }} 
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* JSON Data Preview */}
                      {imgs.length === 0 && Object.keys(data).length > 0 && (
                        <details style={{
                          background: 'var(--museo-bg-secondary)',
                          border: '1px solid var(--museo-border)',
                          borderRadius: '12px',
                          padding: '12px',
                          marginBottom: '16px'
                        }}>
                          <summary style={{
                            cursor: 'pointer',
                            fontWeight: '600',
                            color: 'var(--museo-text-primary)',
                            marginBottom: '8px'
                          }}>
                            View Request Data
                          </summary>
                          <pre style={{
                            margin: 0,
                            fontSize: '12px',
                            color: 'var(--museo-text-secondary)',
                            overflow: 'auto',
                            fontFamily: 'var(--museo-font-mono)'
                          }}>
                            {JSON.stringify(data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                    
                    {/* Action buttons */}
                    <footer 
                      style={{
                        display: 'flex',
                        gap: '8px',
                        justifyContent: 'flex-end',
                        paddingTop: '16px',
                        borderTop: '1px solid var(--museo-border)'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleActionClick(id, 'approve')}
                        disabled={status === 'approved' || status === 'rejected'}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          border: 'none',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: status === 'approved' || status === 'rejected' ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                          background: status === 'approved' ? 'var(--museo-success)' : '#22c55e',
                          color: 'white',
                          opacity: status === 'approved' || status === 'rejected' ? 0.6 : 1
                        }}
                        onMouseEnter={(e) => {
                          if (status !== 'approved' && status !== 'rejected') {
                            e.target.style.transform = 'translateY(-1px)';
                            e.target.style.boxShadow = '0 4px 8px rgba(34, 197, 94, 0.3)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        {status === 'approved' ? '✓ Approved' : 'Accept'}
                      </button>
                      
                      <button
                        onClick={() => handleActionClick(id, 'reject')}
                        disabled={status === 'approved' || status === 'rejected'}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          border: 'none',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: status === 'approved' || status === 'rejected' ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                          background: status === 'rejected' ? 'var(--museo-error)' : '#ef4444',
                          color: 'white',
                          opacity: status === 'approved' || status === 'rejected' ? 0.6 : 1
                        }}
                        onMouseEnter={(e) => {
                          if (status !== 'approved' && status !== 'rejected') {
                            e.target.style.transform = 'translateY(-1px)';
                            e.target.style.boxShadow = '0 4px 8px rgba(239, 68, 68, 0.3)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        {status === 'rejected' ? '✗ Rejected' : 'Reject'}
                      </button>
                      
                      <button
                        onClick={() => handleActionClick(id, 'delete')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          border: '1px solid var(--museo-border)',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          background: 'var(--museo-white)',
                          color: 'var(--museo-text-muted)'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'var(--museo-error)';
                          e.target.style.color = 'white';
                          e.target.style.borderColor = 'var(--museo-error)';
                          e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'var(--museo-white)';
                          e.target.style.color = 'var(--museo-text-muted)';
                          e.target.style.borderColor = 'var(--museo-border)';
                          e.target.style.transform = 'translateY(0)';
                        }}
                      >
                        Delete
                      </button>
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </article>

      <ConfirmModal
        open={confirmOpen}
        title={
          pendingAction?.action === 'approve' ? 'Confirm Approval' : 
          pendingAction?.action === 'reject' ? 'Confirm Rejection' : 
          'Confirm Deletion'
        }
        message={
          pendingAction?.action === 'delete' 
            ? `Are you sure you want to permanently delete the request from ${pendingAction?.requestName}? This action cannot be undone.`
            : `Are you sure you want to ${pendingAction?.action === 'approve' ? 'approve' : 'reject'} the request from ${pendingAction?.requestName}?`
        }
        confirmText={
          pendingAction?.action === 'approve' ? 'Approve' : 
          pendingAction?.action === 'reject' ? 'Reject' : 
          'Delete'
        }
        cancelText="Cancel"
        onConfirm={confirmAction}
        onCancel={() => { setConfirmOpen(false); setPendingAction(null); }}
      />

      <RequestDetailModal
        open={detailOpen}
        request={selectedRequest}
        onClose={() => { setDetailOpen(false); setSelectedRequest(null); }}
      />
    </div>
  );
}
