import { useEffect, useState } from 'react';
import MuseoModal, { MuseoModalBody, MuseoModalActions, MuseoModalSection } from '../../../components/MuseoModal.jsx';

const API = import.meta.env.VITE_API_BASE;

export default function ViewBidsModal({ open, onClose, auctionId, title }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bids, setBids] = useState([]);
  const [topBid, setTopBid] = useState(null);

  useEffect(() => {
    if (!open || !auctionId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        // Attempt to fetch bids history. If API doesn't exist yet, show friendly message.
        const res = await fetch(`${API}/auctions/${auctionId}/bids`, { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false || !Array.isArray(data.data)) {
          setError('Bid history endpoint is not available yet. Please ask admin to enable /auctions/:id/bids.');
          return;
        }
        const sorted = [...data.data].sort((a, b) => b.amount - a.amount || new Date(b.created_at) - new Date(a.created_at));
        if (!cancelled) {
          setBids(sorted);
          setTopBid(sorted[0] || null);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load bids');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, auctionId]);

  return (
    <MuseoModal open={open} onClose={onClose} title={`Bids — ${title || 'Auction'}`} size="lg">
      <MuseoModalBody>
        <MuseoModalSection>
          {loading && <div>Loading bid history…</div>}
          {error && <div className="museo-error-message">{error}</div>}
          {!loading && !error && (
            <div>
              {topBid ? (
                <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img
                    src={topBid?.bidder?.profilePicture || 'https://via.placeholder.com/40'}
                    alt={`${[topBid?.bidder?.firstName, topBid?.bidder?.lastName].filter(Boolean).join(' ') || 'Avatar'}`}
                    style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--museo-border)' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="museo-label">Top Bid</div>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>₱{Number(topBid.amount || 0).toLocaleString()}</div>
                    <small className="museo-form-helper">
                      by {[topBid?.bidder?.firstName, topBid?.bidder?.lastName].filter(Boolean).join(' ') || 'Anonymous'} • {new Date(topBid.created_at).toLocaleString()}
                    </small>
                  </div>
                </div>
              ) : (
                <div className="museo-form-helper">No bids yet.</div>
              )}

              {bids.length > 0 && (
                <div style={{ maxHeight: 420, overflow: 'auto', borderTop: '1px solid var(--museo-border)', paddingTop: 8 }}>
                  {bids.map(b => (
                    <div key={b.bidId} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px dashed var(--museo-border)' }}>
                      <img
                        src={b?.bidder?.profilePicture || 'https://via.placeholder.com/36'}
                        alt={`${[b?.bidder?.firstName, b?.bidder?.lastName].filter(Boolean).join(' ') || 'Avatar'}`}
                        style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--museo-border)' }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{[b?.bidder?.firstName, b?.bidder?.lastName].filter(Boolean).join(' ') || 'Anonymous'}</div>
                        <div className="museo-form-helper" title={new Date(b.created_at).toLocaleString()}>
                          {new Date(b.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ fontWeight: 700 }}>₱{Number(b.amount || 0).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </MuseoModalSection>
      </MuseoModalBody>
      <MuseoModalActions>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
      </MuseoModalActions>
    </MuseoModal>
  );
}
