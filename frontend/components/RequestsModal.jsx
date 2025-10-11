import { useEffect, useMemo, useState } from "react";
import ConfirmModal from "../src/pages/ConfirmModal";
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
    <div className="evmOverlay" onMouseDown={(e) => { if (e.currentTarget === e.target) onClose(); }}>
      <article
        role="dialog"
        aria-modal="true"
        aria-label="Requests"
        className="evmDialog"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'clamp(820px, 92vw, 1040px)', maxHeight: '94vh', display: 'grid', gridTemplateRows: 'auto 1fr' }}
      >
        <header style={{ display:'grid', gap:8, padding:'10px 12px 6px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
            <div style={{ display:'grid' }}>
              <h3 style={{ margin:0, fontSize:18, fontWeight:800, color:'#0f172a' }}>User Requests</h3>
              <span style={{ color:'#6b7280', fontSize:13 }}>Review and act on submissions</span>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <button aria-label="Close" onClick={onClose} className="evmClose">✕</button>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <div style={{ display:'inline-flex', gap:6, background:'#f3f4f6', padding:4, borderRadius:999, border:'1px solid #e6e6ea' }}>
              {types.map(t => (
                <button key={t} onClick={() => setFilter(t)}
                  style={{
                    height:28, padding:'0 10px', borderRadius:999, border:'1px solid ' + (filter===t?'#111827':'transparent'),
                    background: filter===t?'#fff':'transparent', fontWeight:800, cursor:'pointer', textTransform:'capitalize'
                  }}>
                  {t.replace(/_/g,' ')}
                </button>
              ))}
            </div>
            <input
              value={q}
              onChange={e=>setQ(e.target.value)}
              placeholder="Search name, title, type, request ID, user ID"
              style={{ height:30, padding:'0 10px', borderRadius:10, border:'1px solid #e6e6ea', flex:'1 1 200px' }}
            />
          </div>
        </header>

        <div style={{ padding:'8px 12px 12px', overflow:'auto' }}>
          {loading && (
            <div className="rq__loading">Loading…</div>
          )}
          {!!error && (
            <div className="rq__error">{error}</div>
          )}
          {!loading && !error && list.length === 0 && (
            <div className="rq__empty">
              <div className="rq__emptyIcon">📭</div>
              <div className="rq__emptyTitle">No requests</div>
              <div className="rq__emptyText">You’ll see new requests here as users submit them.</div>
            </div>
          )}

          {!loading && !error && list.length > 0 && (
            <ul className="rq__list" style={{ listStyle:'none', margin:0, padding:0, display:'grid', gap:12 }}>
              {list.map((r) => {
                const id = r.id || r.requestId;
                const data = r.data || {};
                const imgs = Array.isArray(data.images) ? data.images : [];
                const name = [data.firstName, data.midInit, data.lastName].filter(Boolean).join(' ');
                const type = r.requestType || r.type || 'unknown';
                const status = (r.status || 'pending').toLowerCase(); // Use table column status only
                return (
                  <li key={id} className="rq__item" style={{ border:'1px solid #e6e6ea', borderRadius:12, background:'#fff', display:'grid', gridTemplateColumns:'1fr auto', gap:12, padding:12, cursor:'pointer' }} onClick={() => { setSelectedRequest(r); setDetailOpen(true); }}>
                    <div className="rq__left" style={{ display:'grid', gap:8 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span className="rq__badge" style={{ padding:'2px 8px', borderRadius:999, border:'1px solid #e6e6ea', fontSize:12, fontWeight:700, color:'#374151', background:'#f9fafb', textTransform:'capitalize' }}>{type.replace(/_/g,' ')}</span>
                        <div className="rq__title" style={{ fontWeight:800, color:'#0f172a' }}>{name || data.title || r.title || 'Request'}</div>
                        <span title="Status" style={{ marginLeft:'auto', padding:'2px 8px', borderRadius:999, border:'1px solid #e6e6ea', fontSize:12, fontWeight:700, textTransform:'capitalize',
                          background: status==='approved' ? '#dcfce7' : status==='rejected' ? '#fee2e2' : '#f3f4f6',
                          color: status==='approved' ? '#166534' : status==='rejected' ? '#991b1b' : '#374151'
                        }}>{status}</span>
                      </div>
                      <div className="rq__meta" style={{ display:'flex', flexWrap:'wrap', gap:12, color:'#374151', fontSize:13 }}>
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
                        <div className="rq__images" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:8 }}>
                          {imgs.map((src, i) => (
                            <img key={i} src={src} alt="attachment" className="rq__img" loading="lazy" style={{ width:'100%', aspectRatio:'4/3', objectFit:'cover', borderRadius:10, border:'1px solid #e6e6ea' }} />
                          ))}
                        </div>
                      )}
                      {imgs.length === 0 && Object.keys(data).length > 0 && (
                        <pre style={{ margin:0, background:'#f7f7f8', border:'1px solid #eef0f2', borderRadius:10, padding:10, color:'#111', overflow:'auto' }}>{JSON.stringify(data, null, 2)}</pre>
                      )}
                    </div>
                    <div className="rq__actions" style={{ display:'grid', alignContent:'start', gap:8 }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn-accept"
                        onClick={() => handleActionClick(id, 'approve')}
                        disabled={status === 'approved' || status === 'rejected'}
                        style={{ height:34, padding:'0 14px', borderRadius:10, border:'1px solid #16a34a', background: status==='approved' ? '#86efac' : '#22c55e', color:'#062b16', fontWeight:800, cursor: (status==='approved' || status==='rejected') ? 'not-allowed' : 'pointer', opacity: (status==='approved' || status==='rejected') ? 0.6 : 1 }}
                      >{status==='approved' ? 'Approved' : 'Accept'}</button>
                      <button
                        className="btn-reject"
                        onClick={() => handleActionClick(id, 'reject')}
                        disabled={status === 'approved' || status === 'rejected'}
                        style={{ height:34, padding:'0 14px', borderRadius:10, border:'1px solid #dc2626', background: status==='rejected' ? '#fca5a5' : '#ef4444', color:'#fff', fontWeight:800, cursor: (status==='approved' || status==='rejected') ? 'not-allowed' : 'pointer', opacity: (status==='approved' || status==='rejected') ? 0.6 : 1 }}
                      >{status==='rejected' ? 'Rejected' : 'Reject'}</button>
                      <button
                        className="rq__btn rq__btn--delete"
                        onClick={() => handleActionClick(id, 'delete')}
                        style={{ height:34, padding:'0 14px', borderRadius:10, border:'1px solid #78716c', background: '#a8a29e', color:'#fff', fontWeight:800, cursor: 'pointer' }}
                      >Delete</button>
                    </div>
                  </li>
                );
              })}
            </ul>
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
