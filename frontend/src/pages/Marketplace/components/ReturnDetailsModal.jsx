import { useEffect, useState } from 'react';
import MuseoModal, { MuseoModalBody, MuseoModalActions, MuseoModalSection } from '../../../components/MuseoModal.jsx';
import FullscreenImageViewer from '../../../components/FullscreenImageViewer';
import '../../../styles/components/inputs.css';
import '../../Marketplace/css/returns.css';

export default function ReturnDetailsModal({ open, onClose, returnId, role = 'buyer' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [sellerResponse, setSellerResponse] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [receivedCondition, setReceivedCondition] = useState('');
  
  // Fullscreen image viewer state
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (!open || !returnId) return;
    (async () => {
      try {
        setLoading(true);
        const { getReturnDetails } = await import('../../../api/returns.js');
        const res = await getReturnDetails(returnId);
        setData(res.data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, returnId]);

  const sendMessage = async () => {
    if (!message.trim()) return;
    try {
      setActionLoading(true);
      const { addReturnMessage, getReturnDetails } = await import('../../../api/returns.js');
      await addReturnMessage(returnId, message);
      setMessage('');
      const res = await getReturnDetails(returnId);
      setData(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const dispute = async () => {
    try {
      setActionLoading(true);
      const { disputeReturn, getReturnDetails } = await import('../../../api/returns.js');
      await disputeReturn(returnId, 'Buyer disputes the rejection');
      const res = await getReturnDetails(returnId);
      setData(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const approve = async () => {
    try {
      setActionLoading(true);
      const { approveReturn, getReturnDetails } = await import('../../../api/returns.js');
      await approveReturn(returnId, sellerResponse || 'Approved');
      const res = await getReturnDetails(returnId);
      setData(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const reject = async () => {
    try {
      setActionLoading(true);
      const { rejectReturn, getReturnDetails } = await import('../../../api/returns.js');
      await rejectReturn(returnId, sellerResponse || 'Rejected');
      const res = await getReturnDetails(returnId);
      setData(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const resolveAs = async (resolution) => {
    try {
      if (!adminNotes.trim()) {
        setError('Admin notes are required to resolve a dispute');
        return;
      }
      setActionLoading(true);
      const { resolveDispute, getReturnDetails } = await import('../../../api/returns.js');
      await resolveDispute(returnId, resolution, adminNotes);
      const res = await getReturnDetails(returnId);
      setData(res.data);
      setAdminNotes('');
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const markShipped = async () => {
    try {
      setActionLoading(true);
      const { markReturnShipped, getReturnDetails } = await import('../../../api/returns.js');
      await markReturnShipped(returnId, trackingNumber.trim() || null);
      const res = await getReturnDetails(returnId);
      setData(res.data);
      setTrackingNumber('');
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const markReceived = async () => {
    try {
      setActionLoading(true);
      const { markReturnReceived, getReturnDetails } = await import('../../../api/returns.js');
      await markReturnReceived(returnId, receivedCondition.trim() || null);
      const res = await getReturnDetails(returnId);
      setData(res.data);
      setReceivedCondition('');
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const statusBadge = (status) => (
    <span className="museo-badge museo-badge--interactive" style={{textTransform: 'capitalize'}}>{status}</span>
  );

  return (
    <>
      <MuseoModal open={open} onClose={onClose} title="Return Details" size="lg">
        <MuseoModalBody>
          {loading ? (
            <div>Loading...</div>
          ) : data ? (
          <>
            <MuseoModalSection>
              <div className="museo-form-group">
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div>
                    <div className="museo-label">Return ID</div>
                    <div style={{fontWeight:600}}>{data.returnId}</div>
                  </div>
                  <div>
                    {statusBadge(data.status)}
                  </div>
                </div>
              </div>
              <div className="museo-form-group">
                <div className="museo-label">Reason</div>
                <div style={{textTransform: 'capitalize'}}>{data.reason?.replaceAll('_',' ')}</div>
              </div>
              <div className="museo-form-group">
                <div className="museo-label">Description</div>
                <div>{data.description || '—'}</div>
              </div>
              
              {/* Evidence Images Section */}
              {data.evidenceImages && data.evidenceImages.length > 0 && (
                <div className="museo-form-group">
                  <div className="museo-label">Evidence Images</div>
                  <div style={{display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '8px'}}>
                    {data.evidenceImages.map((imageUrl, index) => (
                      <div 
                        key={index}
                        style={{
                          width: '120px',
                          height: '120px',
                          borderRadius: 'var(--museo-radius-sm)',
                          overflow: 'hidden',
                          border: '1px solid var(--museo-border)',
                          position: 'relative'
                        }}
                      >
                        <img 
                          src={imageUrl} 
                          alt={`Evidence ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            setCurrentImageIndex(index);
                            setShowFullscreen(true);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </MuseoModalSection>

            {/* Conversation */}
            <MuseoModalSection>
              <div className="museo-form-group">
                <h3 style={{ fontSize: '1.125rem', fontWeight: 500, color: '#4b5563', marginBottom: '1rem' }}>Conversation</h3>
                <div className="returns-messages" style={{ 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '1rem',
                  minHeight: '100px'
                }}>
                  {(data.messages || []).map((m) => {
                    // Determine the sender name based on senderId
                    let senderName = 'User';
                    if (m.isAdmin) {
                      senderName = 'Admin';
                    } else if (m.senderId === data.buyerId) {
                      senderName = data.buyer?.username || 'Buyer';
                    } else if (data.sellerProfile && m.senderId === data.sellerProfile.userId) {
                      senderName = data.sellerProfile?.shopName || 'Seller';
                    }
                    
                    return (
                      <div key={m.messageId} className="returns-message" style={{ marginBottom: '1rem' }}>
                        <div className="returns-message__meta" style={{ 
                          fontSize: '0.875rem', 
                          color: '#6b7280', 
                          marginBottom: '0.25rem', 
                          display: 'flex',
                          gap: '0.5rem'
                        }}>
                          <span>{new Date(m.createdAt).toLocaleString()}</span>
                          <span style={{ 
                            color: m.isAdmin ? '#9c7c3c' : '#4b5563', 
                            fontWeight: 500 
                          }}>
                            {senderName}
                          </span>
                          {m.isAdmin && <span className="museo-badge museo-badge--info" style={{ marginLeft: '0.25rem' }}>Admin</span>}
                        </div>
                        <div className="returns-message__text" style={{ color: '#374151' }}>{m.message}</div>
                      </div>
                    );
                  })}
                  {(!data.messages || data.messages.length === 0) && (
                    <div style={{ 
                      padding: '1.5rem 0', 
                      textAlign: 'center',
                      color: '#9ca3af',
                      fontStyle: 'italic'
                    }}>No messages yet.</div>
                  )}
                </div>
              </div>

              <div className="museo-form-group">
                <textarea 
                  className="museo-textarea" 
                  placeholder="Write a message" 
                  value={message} 
                  onChange={(e)=>setMessage(e.target.value)}
                  style={{ 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    minHeight: '80px'
                  }} 
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={sendMessage} 
                    disabled={actionLoading || !message.trim()}
                  >
                    Send
                  </button>
                </div>
              </div>
            </MuseoModalSection>

            {/* Seller actions */}
            {role === 'seller' && data.status === 'pending' && (
              <MuseoModalSection>
                <div className="museo-form-group">
                  <label className="museo-label">Response to buyer (optional)</label>
                  <textarea className="museo-textarea" value={sellerResponse} onChange={(e)=>setSellerResponse(e.target.value)} />
                </div>
                <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
                  <button className="btn btn-danger btn-sm" onClick={reject} disabled={actionLoading}>Reject</button>
                  <button className="btn btn-success btn-sm" onClick={approve} disabled={actionLoading}>Approve</button>
                </div>
              </MuseoModalSection>
            )}

            {/* Buyer dispute action (hidden if admin already resolved) */}
            {role === 'buyer' && data.status === 'rejected' && !data.resolvedAt && (
              <MuseoModalSection>
                <div style={{display:'flex', justifyContent:'flex-end'}}>
                  <button className="btn btn-primary btn-sm" onClick={dispute} disabled={actionLoading}>Dispute Decision</button>
                </div>
              </MuseoModalSection>
            )}
            {role === 'buyer' && data.status === 'rejected' && data.resolvedAt && (
              <MuseoModalSection>
                <div className="museo-form-helper">This return was reviewed by an admin on {new Date(data.resolvedAt).toLocaleString()}. The decision is final.</div>
              </MuseoModalSection>
            )}

            {/* Approved with Return Address - Buyer marks shipped */}
            {data.shippingStatus === "pendingShipment" && role === 'buyer' && (
              <MuseoModalSection>
                <div className="museo-form-group">
                  <div className="museo-label">Return Address</div>
                  <div className="return-address-box" style={{border: '1px solid #ddd', borderRadius: '8px', padding: '12px', marginBottom: '16px'}}>
                    {data.returnAddress ? (
                      <div>
                        <div style={{fontWeight: 'bold'}}>{data.returnAddress.name || 'Seller'}</div>
                        {data.returnAddress.phone && <div>Phone: {data.returnAddress.phone}</div>}
                        <div>{data.returnAddress.address1 || '—'}</div>
                        {data.returnAddress.address2 && <div>{data.returnAddress.address2}</div>}
                        <div>
                          {[
                            data.returnAddress.barangay, 
                            data.returnAddress.city, 
                            data.returnAddress.province
                          ].filter(Boolean).join(', ')}
                        </div>
                        <div>
                          {[
                            data.returnAddress.region, 
                            data.returnAddress.postalCode
                          ].filter(Boolean).join(' ')}
                        </div>
                      </div>
                    ) : (
                      <div className="museo-form-helper">No return address found. Please contact the seller.</div>
                    )}
                  </div>
                </div>
                
                <div className="museo-form-group">
                  <label className="museo-label">Tracking Number (Optional)</label>
                  <input 
                    type="text" 
                    className="museo-input" 
                    placeholder="Enter shipping tracking number"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                  />
                  <div className="museo-form-helper">
                    Please ship the item to the address above, then mark it as shipped.
                  </div>
                </div>

                <div style={{display:'flex', justifyContent:'flex-end', marginTop: '16px'}}>
                  <button 
                    className="btn btn-primary btn-sm" 
                    onClick={markShipped} 
                    disabled={actionLoading}
                  >
                    Mark as Shipped
                  </button>
                </div>
              </MuseoModalSection>
            )}

            {/* In Transit - Buyer already shipped */}
            {data.shippingStatus === "inTransit" && role === 'buyer' && (
              <MuseoModalSection>
                <div className="museo-form-group">
                  <div className="museo-label">Shipping Status</div>
                  <div className="museo-notice museo-notice--success" style={{padding: '8px 12px', borderRadius: '4px'}}>
                    <div><strong>Shipped on:</strong> {new Date(data.buyerShippedAt).toLocaleString()}</div>
                    {data.trackingNumber && <div><strong>Tracking:</strong> {data.trackingNumber}</div>}
                    <div className="museo-form-helper" style={{marginTop: '8px'}}>
                      You have shipped this item. The seller will process your refund once they receive it.
                    </div>
                  </div>
                </div>
              </MuseoModalSection>
            )}

            {/* In Transit - Seller marks received */}
            {data.shippingStatus === "inTransit" && role === 'seller' && (
              <MuseoModalSection>
                <div className="museo-form-group">
                  <div className="museo-label">Shipping Status</div>
                  <div style={{marginBottom: '16px'}}>
                    <div><strong>Buyer shipped on:</strong> {new Date(data.buyerShippedAt).toLocaleString()}</div>
                    {data.trackingNumber && <div><strong>Tracking:</strong> {data.trackingNumber}</div>}
                  </div>
                  
                  <label className="museo-label">Received Condition (Optional)</label>
                  <textarea 
                    className="museo-textarea" 
                    placeholder="Describe the condition of the returned item"
                    value={receivedCondition}
                    onChange={(e) => setReceivedCondition(e.target.value)}
                  />
                  <div className="museo-form-helper">
                    Note: Marking as received will automatically process the refund to the buyer.
                  </div>
                </div>
                
                <div style={{display:'flex', justifyContent:'flex-end', marginTop: '16px'}}>
                  <button 
                    className="btn btn-success btn-sm" 
                    onClick={markReceived} 
                    disabled={actionLoading}
                  >
                    Confirm Receipt & Process Refund
                  </button>
                </div>
              </MuseoModalSection>
            )}

            {/* Completed - Refund processed */}
            {data.shippingStatus === "completed" && (
              <MuseoModalSection>
                <div className="museo-form-group">
                  <div className="museo-label">Return Status</div>
                  <div className="museo-notice museo-notice--info" style={{padding: '8px 12px', borderRadius: '4px'}}>
                    <div>
                      <strong>Return Complete</strong>
                      {data.refundedAt && ` • Refund processed on ${new Date(data.refundedAt).toLocaleString()}`}
                    </div>
                    <div style={{marginTop: '4px'}}>
                      <strong>Shipped by buyer:</strong> {new Date(data.buyerShippedAt).toLocaleString()}
                    </div>
                    <div>
                      <strong>Received by seller:</strong> {new Date(data.sellerReceivedAt).toLocaleString()}
                    </div>
                    {data.trackingNumber && <div><strong>Tracking:</strong> {data.trackingNumber}</div>}
                    {data.receivedCondition && <div><strong>Condition Notes:</strong> {data.receivedCondition}</div>}
                  </div>
                </div>
              </MuseoModalSection>
            )}

            {/* Admin resolve dispute */}
            {role === 'admin' && data.status === 'disputed' && (
              <MuseoModalSection>
                <div className="museo-form-group">
                  <label className="museo-label museo-label--required">Admin Notes</label>
                  <textarea className="museo-textarea" placeholder="Provide detailed notes for your decision" value={adminNotes} onChange={(e)=>setAdminNotes(e.target.value)} />
                  <small className="museo-form-helper">This will be recorded and visible to both buyer and seller.</small>
                </div>
                <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
                  <button className="btn btn-danger btn-sm" onClick={()=>resolveAs('reject')} disabled={actionLoading || !adminNotes.trim()}>Resolve as Reject</button>
                  <button className="btn btn-success btn-sm" onClick={()=>resolveAs('approve')} disabled={actionLoading || !adminNotes.trim()}>Resolve as Approve</button>
                </div>
              </MuseoModalSection>
            )}

            {error && <div className="museo-form-error">{error}</div>}
          </>
        ) : (
          <div className="museo-form-error">Failed to load return</div>
        )}
      </MuseoModalBody>
      <MuseoModalActions>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
      </MuseoModalActions>
      </MuseoModal>

      {/* Fullscreen Image Viewer */}
      {data && (
        <FullscreenImageViewer
          isOpen={showFullscreen}
          onClose={() => setShowFullscreen(false)}
          images={data.evidenceImages || []}
          currentIndex={currentImageIndex}
          onIndexChange={setCurrentImageIndex}
          alt="Evidence Image"
        />
      )}
    </>
  );
}
