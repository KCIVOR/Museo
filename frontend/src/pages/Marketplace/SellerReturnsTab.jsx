import { useEffect, useState } from 'react';
import { getSellerReturns, getReturnDetails } from '../../api/returns';
import ReturnDetailsModal from './components/ReturnDetailsModal.jsx';
import FullscreenImageViewer from '../../components/FullscreenImageViewer';
import '../../styles/components/buttons.css';
import './css/returns.css';

export default function SellerReturnsTab() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [detailsId, setDetailsId] = useState(null);
  
  // Fullscreen image viewer state
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);

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
        <div className="loading-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d4c9b8" strokeWidth="1.5">
            <polyline points="8 3 4 7 8 11"/>
            <path d="M4 7h9a4 4 0 1 1 0 8H6"/>
          </svg>
          <p>Loading returns...</p>
        </div>
      ) : returns.length === 0 ? (
        <div className="museo-form-helper">No returns found</div>
      ) : (
        <div className="returns-list">
          {returns.map(r => (
            <div key={r.returnId} className="order-card" style={{
              background: 'var(--museo-white)',
              border: '1px solid var(--museo-border)',
              borderRadius: 'var(--museo-radius-md)',
              padding: 'var(--museo-space-4)',
              marginBottom: 'var(--museo-space-3)',
              display: 'flex',
              alignItems: 'stretch',
              gap: 'var(--museo-space-4)'
            }}>
              {/* Return Image */}
              <div style={{
                width: '100px',
                height: '100px',
                flexShrink: 0
              }}>
                {r.evidenceImages && r.evidenceImages.length > 0 ? (
                  <img 
                    src={r.evidenceImages[0]}
                    alt="Return evidence"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: 'var(--museo-radius-sm)',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setCurrentImage(r.evidenceImages[0]);
                      setShowFullscreen(true);
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: 'var(--museo-bg-secondary)',
                    borderRadius: 'var(--museo-radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--museo-text-muted)" strokeWidth="1.5">
                      <polyline points="8 3 4 7 8 11"/>
                      <path d="M4 7h9a4 4 0 1 1 0 8H6"/>
                    </svg>
                  </div>
                )}
              </div>
              
              {/* Return Info */}
              <div style={{flex: 1, minWidth: 0}}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 'var(--museo-space-2)'
                }}>
                  <div>
                    <span style={{
                      fontSize: 'var(--museo-text-sm)',
                      color: 'var(--museo-text-secondary)',
                      marginRight: 'var(--museo-space-3)'
                    }}>Return #{r.returnId.slice(0, 8).toUpperCase()}</span>
                    {r.status === 'pending' && (
                      <span className="museo-badge museo-badge--warning museo-badge--interactive">PENDING</span>
                    )}
                    {r.status === 'approved' && (
                      <span className="museo-badge museo-badge--success museo-badge--interactive">APPROVED</span>
                    )}
                    {r.status === 'rejected' && (
                      <span className="museo-badge museo-badge--error museo-badge--interactive">REJECTED</span>
                    )}
                    {r.status === 'disputed' && (
                      <span className="museo-badge museo-badge--info museo-badge--interactive">DISPUTED</span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 'var(--museo-text-lg)',
                    fontWeight: 'var(--museo-font-bold)',
                    color: 'var(--museo-text-primary)'
                  }}>{r.orderTotal ? `₱${r.orderTotal.toLocaleString()}` : ''}</div>
                </div>
                
                <div style={{
                  fontSize: 'var(--museo-text-base)',
                  color: 'var(--museo-text-primary)',
                  fontWeight: 'var(--museo-font-semibold)',
                  marginBottom: 'var(--museo-space-1)'
                }}>
                  {r.buyer?.username || 'Buyer'}
                </div>
                
                <div style={{
                  fontSize: 'var(--museo-text-sm)',
                  color: 'var(--museo-text-secondary)',
                  marginBottom: 'var(--museo-space-2)'
                }}>
                  <strong>{r.reason?.replaceAll('_',' ') || 'Return Request'}</strong>
                  {r.description && (
                    <span style={{display: 'block', marginTop: '4px'}}>{r.description}</span>
                  )}
                  {r.order && (
                    <>
                      <span style={{margin: '0 var(--museo-space-2)'}}>•</span>
                      Order #{r.order.orderNumber || r.order.orderId?.slice(0, 8).toUpperCase()}
                      {r.order.totalAmount && (
                        <span> • ₱{r.order.totalAmount.toLocaleString()}</span>
                      )}
                    </>
                  )}
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--museo-space-3)',
                  fontSize: 'var(--museo-text-sm)',
                  color: 'var(--museo-text-muted)'
                }}>
                  <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                  {r.tracking_number && (
                    <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="1" y="3" width="15" height="13"/>
                        <path d="M16 8h5l3 3v5h-2"/>
                        <circle cx="5.5" cy="18.5" r="2.5"/>
                        <circle cx="18.5" cy="18.5" r="2.5"/>
                      </svg>
                      Tracking: {r.tracking_number}
                    </span>
                  )}
                  {!r.tracking_number && r.status === 'approved' && (
                    <span style={{display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--museo-warning)'}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      Shipping required
                    </span>
                  )}
                </div>
              </div>
              
              {/* Return Actions */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--museo-space-2)',
                justifyContent: 'center',
                minWidth: '150px'
              }}>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={()=>setDetailsId(r.returnId)}
                >
                  View Details
                </button>
                
                {r.status === 'pending' && (
                  <div style={{display: 'flex', gap: 'var(--museo-space-2)'}}>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={()=>setDetailsId(r.returnId)}
                      style={{flex: 1, whiteSpace: 'nowrap'}}
                    >
                      Respond
                    </button>
                  </div>
                )}
                
                {r.status === 'approved' && !r.tracking_number && (
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={()=>setDetailsId(r.returnId)}
                  >
                    Ship Return
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <ReturnDetailsModal open={!!detailsId} onClose={()=>{ setDetailsId(null); fetchData(); }} returnId={detailsId} role="seller" />
      
      {/* Fullscreen Image Viewer for list thumbnails */}
      <FullscreenImageViewer
        isOpen={showFullscreen}
        onClose={() => setShowFullscreen(false)}
        images={currentImage ? [currentImage] : []}
        alt="Return Evidence"
      />
    </div>
  );
}
