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
                  <div 
                    key={id} 
                    className="museo-card" 
                    style={{ 
                      display:'grid', 
                      gridTemplateColumns:'1fr auto', 
                      gap:'16px', 
                      padding:'16px', 
                      cursor:'pointer'
                    }} 
                    onClick={() => { setSelectedRequest(r); setDetailOpen(true); }}
                  >
                    <div style={{ display:'grid', gap:'12px' }}>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px', marginBottom: '8px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap: 'wrap' }}>
                          <span className="museo-badge" style={{ 
                            padding:'4px 10px', 
                            borderRadius:'999px', 
                            border:'1px solid var(--museo-border)', 
                            fontSize:'12px', 
                            fontWeight:'700', 
                            color:'var(--museo-text-secondary)', 
                            background:'var(--museo-bg-secondary)', 
                            textTransform:'capitalize' 
                          }}>
                            {type.replace(/_/g,' ')}
                          </span>
                          
                          <h4 className="museo-title" style={{ 
                            margin: 0,
                            fontWeight:'800', 
                            color:'var(--museo-primary)',
                            fontSize: '16px'
                          }}>
                            {name || data.title || r.title || 'Request'}
                          </h4>
                        </div>
                        
                        <span className="museo-badge" style={{ 
                          padding:'4px 10px', 
                          borderRadius:'999px', 
                          border:'1px solid var(--museo-border)', 
                          fontSize:'12px', 
                          fontWeight:'700', 
                          textTransform:'capitalize',
                          background: status==='approved' ? '#dcfce7' : status==='rejected' ? '#fee2e2' : 'var(--museo-bg-secondary)',
                          color: status==='approved' ? '#166534' : status==='rejected' ? '#991b1b' : 'var(--museo-text-secondary)',
                          flexShrink: 0
                        }}>
                          {status}
                        </span>
                      </div>
                      
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'16px', color:'var(--museo-text-secondary)', fontSize:'13px' }}>
                        {'userId' in r && <span>User ID: {r.userId}</span>}
                        {'phone' in data && <span>Phone: {data.phone || '—'}</span>}
                        {'age' in data && <span>Age: {data.age || '—'}</span>}
                        {'sex' in data && <span>Sex: {data.sex || '—'}</span>}
                        {'birthdate' in data && <span>Birthdate: {data.birthdate || '—'}</span>}
                        {'address' in data && <span>Address: {data.address || '—'}</span>}
                        {'artworkTitle' in data && <span>Artwork: {data.artworkTitle || '—'}</span>}
                        {'artId' in data && <span>Art ID: {data.artId || '—'}</span>}
                        {'startingPrice' in data && <span>Start Price: {data.startingPrice || '—'}</span>}
                        {'reservePrice' in data && <span>Reserve: {data.reservePrice || '—'}</span>}
                        {'auctionStart' in data && <span>Auction Start: {data.auctionStart || '—'}</span>}
                        {'auctionEnd' in data && <span>Auction End: {data.auctionEnd || '—'}</span>}
                      </div>
                      
                      {imgs.length > 0 && (
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:'8px' }}>
                          {imgs.map((src, i) => (
                            <img 
                              key={i} 
                              src={src} 
                              alt="attachment" 
                              loading="lazy" 
                              style={{ 
                                width:'100%', 
                                aspectRatio:'4/3', 
                                objectFit:'cover', 
                                borderRadius:'10px', 
                                border:'1px solid var(--museo-border)' 
                              }} 
                            />
                          ))}
                        </div>
                      )}
                      
                      {imgs.length === 0 && Object.keys(data).length > 0 && (
                        <pre style={{ 
                          margin:0, 
                          background:'var(--museo-bg-secondary)', 
                          border:'1px solid var(--museo-border)', 
                          borderRadius:'10px', 
                          padding:'12px', 
                          color:'var(--museo-text-primary)', 
                          overflow:'auto',
                          fontSize: '12px'
                        }}>
                          {JSON.stringify(data, null, 2)}
                        </pre>
                      )}
                    </div>
                    
                    <div className="museo-actions" style={{ display:'grid', alignContent:'start', gap:'8px', opacity: 1, transform: 'translateY(0)', pointerEvents: 'auto' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className="museo-btn museo-btn--primary"
                        onClick={() => handleActionClick(id, 'approve')}
                        disabled={status === 'approved' || status === 'rejected'}
                        style={{ 
                          background: status==='approved' ? '#86efac' : 'var(--museo-success)',
                          color: status==='approved' ? '#062b16' : 'var(--museo-white)',
                          opacity: (status==='approved' || status==='rejected') ? 0.6 : 1,
                          cursor: (status==='approved' || status==='rejected') ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {status==='approved' ? 'Approved' : 'Accept'}
                      </button>
                      
                      <button
                        className="museo-btn museo-btn--error"
                        onClick={() => handleActionClick(id, 'reject')}
                        disabled={status === 'approved' || status === 'rejected'}
                        style={{ 
                          background: status==='rejected' ? '#fca5a5' : 'var(--museo-error)',
                          opacity: (status==='approved' || status==='rejected') ? 0.6 : 1,
                          cursor: (status==='approved' || status==='rejected') ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {status==='rejected' ? 'Rejected' : 'Reject'}
                      </button>
                      
                      <button
                        className="museo-btn museo-btn--secondary"
                        onClick={() => handleActionClick(id, 'delete')}
                        style={{ 
                          background: 'var(--museo-text-muted)',
                          color: 'var(--museo-white)'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
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
