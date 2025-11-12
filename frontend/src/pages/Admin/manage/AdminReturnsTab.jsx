import { useEffect, useState } from 'react';
import { getAdminReturns } from '../../../api/returns';
import ReturnDetailsModal from '../../Marketplace/components/ReturnDetailsModal.jsx';
import '../../../styles/components/inputs.css';
import '../../Marketplace/css/returns.css';

export default function AdminReturnsTab() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('all');
  const [onlyDisputed, setOnlyDisputed] = useState(true);
  const [q, setQ] = useState('');
  const [detailsId, setDetailsId] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getAdminReturns({ status: status === 'all' ? undefined : status, disputed: onlyDisputed });
      const list = res.data || [];
      // Basic client-side search
      const term = q.trim().toLowerCase();
      const filtered = term
        ? list.filter((r) => {
            const hay = [
              r.returnId,
              r.status,
              r.reason,
              r.description,
              r?.order?.orderNumber,
              r?.sellerProfile?.shopName,
              r?.buyer?.username,
            ].map((x) => String(x || '')).join(' ').toLowerCase();
            return hay.includes(term);
          })
        : list;
      setReturns(filtered);
    } catch (e) {
      console.error('Admin returns load failed', e);
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, onlyDisputed]);

  return (
    <div className="returns-panel">
      <div className="returns-toolbar" style={{gap: 12}}>
        <h3>Returns (Admin)</h3>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <input className="museo-input museo-input--sm" placeholder="Search by ID, reason, user..." value={q} onChange={(e)=>setQ(e.target.value)} style={{maxWidth:260}}/>
          <select className="museo-select museo-input--sm" value={status} onChange={(e)=>setStatus(e.target.value)} style={{maxWidth:180}}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="disputed">Disputed</option>
            <option value="refunded">Refunded</option>
          </select>
          <label style={{display:'flex', alignItems:'center', gap:6}}>
            <input type="checkbox" checked={onlyDisputed} onChange={(e)=>setOnlyDisputed(e.target.checked)} />
            <span className="museo-form-helper">Only disputed</span>
          </label>
          <button className="btn btn-ghost btn-sm" onClick={loadData} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : returns.length === 0 ? (
        <div className="museo-form-helper">No returns found</div>
      ) : (
        <div className="returns-list">
          {returns.map((r) => (
            <div key={r.returnId} className="return-card">
              <div className="return-card__row">
                <div>
                  <div className="return-id">#{(r.returnId || '').slice(0,8)}</div>
                  <div className="return-meta">
                    {r.reason?.replaceAll('_',' ')} • {new Date(r.createdAt).toLocaleString()} • Buyer: {r?.buyer?.username || '—'} • Seller: {r?.sellerProfile?.shopName || '—'}
                  </div>
                </div>
                <span className="museo-badge museo-badge--interactive" style={{textTransform:'capitalize'}}>{r.status}</span>
              </div>
              <div className="return-card__row">
                <div className="return-desc">
                  {r.description || 'No description'}
                </div>
                <div className="return-actions">
                  <button className="btn btn-secondary btn-sm" onClick={()=>setDetailsId(r.returnId)}>View</button>
                  {r.status === 'disputed' && (
                    <button className="btn btn-primary btn-sm" onClick={()=>setDetailsId(r.returnId)}>Resolve</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ReturnDetailsModal 
        open={!!detailsId} 
        onClose={()=>{ setDetailsId(null); loadData(); }} 
        returnId={detailsId} 
        role="admin" 
      />
    </div>
  );
}
