import { useEffect, useState } from 'react';
import { getSellerReturns, getReturnDetails } from '../../api/returns';
import ReturnDetailsModal from './components/ReturnDetailsModal.jsx';
import '../../styles/components/buttons.css';
import './css/returns.css';

export default function SellerReturnsTab() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [detailsId, setDetailsId] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getSellerReturns(filter === 'all' ? undefined : filter);
      setReturns(res.data || []);
    } catch (e) {
      console.error('Failed to load returns', e);
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filter]);

  const formatDate = (d) => new Date(d).toLocaleString();

  return (
    <div className="returns-panel">
      <div className="returns-toolbar">
        <h3>Returns</h3>
        <select className="museo-select museo-input--sm" value={filter} onChange={(e)=>setFilter(e.target.value)} style={{maxWidth:220}}>
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="disputed">Disputed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : returns.length === 0 ? (
        <div className="museo-form-helper">No returns found</div>
      ) : (
        <div className="returns-list">
          {returns.map(r => (
            <div key={r.returnId} className="return-card">
              <div className="return-card__row">
                <div>
                  <div className="return-id">#{r.returnId.slice(0,8)}</div>
                  <div className="return-meta">{r.reason?.replaceAll('_',' ')} • {formatDate(r.createdAt)}</div>
                </div>
                <span className="museo-badge museo-badge--interactive" style={{textTransform:'capitalize'}}>{r.status}</span>
              </div>
              <div className="return-card__row">
                <div className="return-desc">{r.description || 'No description'}</div>
                <div className="return-actions">
                  <button className="btn btn-secondary btn-sm" onClick={()=>setDetailsId(r.returnId)}>View</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ReturnDetailsModal open={!!detailsId} onClose={()=>{ setDetailsId(null); fetchData(); }} returnId={detailsId} role="seller" />
    </div>
  );
}
