import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import RequestDetailModal from "../Admin/RequestDetailModal";
import MuseoLoadingBox from "../../components/MuseoLoadingBox";
import ConfirmModal from "./ConfirmModal";
// Using the modular styles system instead of page-specific CSS
import "../../styles/main.css";

const API = import.meta.env.VITE_API_BASE;

export default function RequestsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Built-in action handlers for different request types
  const actionsByType = {
    visit_booking: {
      approve: async (id) => {
        const res = await fetch(`${API}/visit-bookings/${id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'approved' })
        });
        if (!res.ok) throw new Error('Failed to approve visit booking');
        const data = await res.json();
        return { success: true, status: 'approved', data };
      },
      reject: async (id) => {
        const res = await fetch(`${API}/visit-bookings/${id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'rejected' })
        });
        if (!res.ok) throw new Error('Failed to reject visit booking');
        const data = await res.json();
        return { success: true, status: 'rejected', data };
      }
    }
    // Add more request type handlers here as needed
  };

  const loadRequests = async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch regular requests
      const res = await fetch(`${API}/request/getRequest`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to load requests (${res.status})`);
      const data = await res.json();
      const regularRequests = Array.isArray(data?.requests) ? data.requests : (Array.isArray(data) ? data : []);
      
      // Fetch visit bookings
      let visitBookings = [];
      try {
        const visitRes = await fetch(`${API}/visit-bookings`, {
          credentials: "include",
        });
        if (visitRes.ok) {
          const visitData = await visitRes.json();
          if (visitData.success && Array.isArray(visitData.data)) {
            // Transform visit bookings to match request format
            visitBookings = visitData.data.map(booking => ({
              id: booking.visitId,
              visitId: booking.visitId,
              requestId: booking.visitId,
              userId: booking.user_id,
              requestType: 'visit_booking',
              type: 'visit_booking',
              status: booking.status,
              createdAt: booking.created_at,
              data: {
                visitorType: booking.visitor_type,
                organizationName: booking.organization_name,
                numberOfVisitors: booking.number_of_visitors,
                classification: booking.classification,
                yearLevel: booking.year_level,
                institutionalType: booking.institutional_type,
                location: booking.location,
                contactName: booking.contact_name,
                contactEmail: booking.contact_email,
                contactPhone: booking.contact_phone,
                preferredDate: booking.preferred_date,
                preferredTime: booking.preferred_time,
                purposeOfVisit: booking.purpose_of_visit,
                purposeOther: booking.purpose_other,
                remarks: booking.remarks,
                organizationDetails: booking.organization_details,
                adminNotes: booking.admin_notes
              }
            }));
          }
        }
      } catch (visitError) {
        console.error('Failed to load visit bookings:', visitError);
      }
      
      // Combine both types and sort by date (newest first)
      const combined = [...regularRequests, ...visitBookings];
      combined.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at || 0);
        const dateB = new Date(b.createdAt || b.created_at || 0);
        return dateB - dateA;
      });
      setItems(combined);
    } catch (e) {
      setError(e.message || "Failed to load requests");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const getRequestTypes = useMemo(() => {
    const types = new Set();
    items.forEach(r => {
      const t = r.requestType || r.type || 'unknown';
      types.add(t);
    });
    return Array.from(types).sort();
  }, [items]);

  const filteredRequests = useMemo(() => {
    const base = items || [];
    const f1 = filter === 'all' ? base : base.filter(r => (r.requestType || r.type || 'unknown') === filter);
    const term = q.trim().toLowerCase();
    if (!term) return f1;
    return f1.filter(r => {
      const data = r.data || {};
      const name = [data.firstName, data.midInit, data.lastName].filter(Boolean).join(' ');
      const title = data.title || '';
      const t = (r.requestType || r.type || '').toString();
      const requestId = (r.id || r.requestId || r.visitId || '').toString();
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
    const req = (items || []).find(r => (r.id || r.requestId || r.visitId) === id);
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
        const req = (items || []).find(r => (r.id || r.requestId || r.visitId) === id);
        const reqType = req?.requestType || req?.type || 'unknown';
        
        const deleteUrl = reqType === 'visit_booking' 
          ? `${API}/visit-bookings/${id}`
          : `${API}/request/${id}`;
        
        const res = await fetch(deleteUrl, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to delete request');
        
        setItems(prev => prev.filter(r => (r.id || r.requestId || r.visitId) !== id));
      } else {
        const req = (items || []).find(r => (r.id || r.requestId || r.visitId) === id);
        const rType = req?.requestType || req?.type || 'unknown';
        const handler = actionsByType[rType]?.[action];

        let responseData = null;
        if (typeof handler === 'function') {
          responseData = await handler(id, req);
        } else {
          const res = await fetch(`${API}/request/action`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, action, type: rType }),
          });
          if (!res.ok) throw new Error(`Failed to ${action}`);
          responseData = await res.json();
        }
        
        const newStatus = responseData?.status || (action === 'approve' ? 'approved' : 'rejected');
        setItems(prev => prev.map(r => {
          const rid = r.id || r.requestId || r.visitId;
          if (rid !== id) return r;
          const data = r.data || {};
          return { 
            ...r, 
            status: newStatus,
            updatedAt: new Date().toISOString(),
            data: { ...data, status: newStatus }
          };
        }));
      }
      
      setPendingAction(null);
    } catch (e) {
      console.error(`Failed to ${action}:`, e);
      alert(`Failed to ${action}: ${e.message}`);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  return (
    <div className="museo-page">
      <style>{`
        /* Keep badge colors stable on card hover */
        .request-card:hover .museo-badge {
          transform: none !important;
        }
        .request-card:hover .museo-badge--primary {
          background: var(--museo-accent-light) !important;
          color: var(--museo-primary) !important;
          border-color: var(--museo-accent) !important;
        }
        .request-card:hover .museo-badge--success {
          background: var(--museo-success) !important;
          color: var(--museo-white) !important;
          border-color: var(--museo-success) !important;
        }
        .request-card:hover .museo-badge--error {
          background: var(--museo-error) !important;
          color: var(--museo-white) !important;
          border-color: var(--museo-error) !important;
        }
        .request-card:hover .museo-badge--warning {
          background: var(--museo-warning) !important;
          color: var(--museo-primary) !important;
          border-color: var(--museo-warning) !important;
        }
        @media (min-width: 1400px) {
          .requests-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
      `}</style>
      <div className="museo-feed">
        {/* Page Header */}
        <header style={{ marginBottom: '32px', borderBottom: '1px solid var(--museo-border)', paddingBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h1 className="museo-heading">Request Management</h1>
            <button 
              className="btn btn-ghost"
              onClick={loadRequests}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : '↻ Refresh'}
            </button>
          </div>
          
          {/* Filters and Search */}
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
              <button
                className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                onClick={() => setFilter('all')}
                style={{ borderRadius: '20px' }}
              >
                All ({items.length})
              </button>
              {getRequestTypes.map(type => {
                const count = items.filter(r => (r.requestType || r.type || 'unknown') === type).length;
                return (
                  <button
                    key={type}
                    className={`btn ${filter === type ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                    onClick={() => setFilter(type)}
                    style={{ borderRadius: '20px' }}
                  >
                    {type.replace(/_/g, ' ')} ({count})
                  </button>
                );
              })}
            </div>
            
            <input
              type="text"
              className="museo-input"
              placeholder="Search requests..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: '300px' }}
            />
          </div>
        </header>

        {/* Content */}
        <div>
          {loading && <MuseoLoadingBox show={loading} />}
          
          {!loading && error && (
            <div className="museo-message museo-message--error">
              <strong>Error:</strong> {error}
              <button className="btn btn-secondary btn-sm" onClick={loadRequests} style={{ marginLeft: '12px' }}>
                Retry
              </button>
            </div>
          )}
          
          {!loading && !error && filteredRequests.length === 0 && (
            <div className="museo-message">
              <h3>No requests found</h3>
              <p>{q ? 'Try adjusting your search terms' : 'New requests will appear here'}</p>
            </div>
          )}

          {!loading && !error && filteredRequests.length > 0 && (
            <div className="requests-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', maxWidth: '100%', gap: '24px' }}>
              {filteredRequests.map((r) => {
                const id = r.id || r.requestId || r.visitId;
                const data = r.data || {};
                const imgs = Array.isArray(data.images) ? data.images : [];
                const name = [data.firstName, data.midInit, data.lastName].filter(Boolean).join(' ');
                const type = r.requestType || r.type || 'unknown';
                const status = (r.status || 'pending').toLowerCase();
                
                return (
                  <article 
                    key={id} 
                    className="museo-card request-card"
                    onClick={() => { setSelectedRequest(r); setDetailOpen(true); }}
                    style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                  >
                    {/* Card Header */}
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--museo-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--museo-bg-secondary)' }}>
                      <span className="museo-badge museo-badge--primary">
                        {type.replace(/_/g,' ')}
                      </span>
                      <span className={`museo-badge ${
                        status === 'approved' ? 'museo-badge--success' : 
                        status === 'rejected' ? 'museo-badge--error' : 
                        'museo-badge--warning'
                      }`}>
                        {status}
                      </span>
                    </div>

                    {/* Card Content */}
                    <div className="museo-body" style={{ flex: 1 }}>
                      <h3 className="museo-title" style={{ marginBottom: '16px' }}>
                        {type === 'visit_booking' 
                          ? (data.organizationName || data.contactName || 'Visit Request')
                          : (name || data.title || r.title || 'Request')
                        }
                      </h3>
                      
                      <div className="museo-desc" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {type === 'visit_booking' ? (
                          <>
                            <div><strong>Visitor Type:</strong> {data.visitorType?.replace('_', ' ') || '—'}</div>
                            <div><strong>Visitors:</strong> {data.numberOfVisitors || '—'} people</div>
                            <div><strong>Visit Date:</strong> {data.preferredDate || '—'}</div>
                            <div><strong>Contact:</strong> {data.contactEmail || '—'}</div>
                          </>
                        ) : (
                          <>
                            {data.email && <div><strong>Email:</strong> {data.email}</div>}
                            {data.phone && <div><strong>Phone:</strong> {data.phone}</div>}
                            {r.createdAt && <div><strong>Submitted:</strong> {new Date(r.createdAt).toLocaleDateString()}</div>}
                          </>
                        )}
                      </div>

                      {imgs.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', alignItems: 'center' }}>
                          {imgs.slice(0, 3).map((src, i) => (
                            <img key={i} src={src} alt="" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--museo-border)' }} />
                          ))}
                          {imgs.length > 3 && <span className="museo-badge" style={{ background: 'var(--museo-bg-secondary)' }}>+{imgs.length - 3} more</span>}
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div 
                      className="museo-actions"
                      onClick={(e) => e.stopPropagation()}
                      style={{ padding: '16px 20px', borderTop: '1px solid var(--museo-border)', display: 'flex', gap: '8px', background: 'var(--museo-bg-secondary)' }}
                    >
                      <button
                        onClick={() => handleActionClick(id, 'approve')}
                        disabled={status === 'approved' || status === 'rejected'}
                        className="btn btn-success btn-sm"
                      >
                        {status === 'approved' ? '✓ Approved' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleActionClick(id, 'reject')}
                        disabled={status === 'approved' || status === 'rejected'}
                        className="btn btn-danger btn-sm"
                      >
                        {status === 'rejected' ? '✗ Rejected' : 'Reject'}
                      </button>
                      <button
                        onClick={() => handleActionClick(id, 'delete')}
                        className="btn btn-ghost btn-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <RequestDetailModal 
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        request={selectedRequest}
      />
      
      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={
          pendingAction?.action === 'approve' ? 'Confirm Approval' : 
          pendingAction?.action === 'reject' ? 'Confirm Rejection' : 
          'Confirm Deletion'
        }
        message={
          pendingAction?.action === 'delete' 
            ? `Are you sure you want to permanently delete the request from ${pendingAction?.requestName}?`
            : `Are you sure you want to ${pendingAction?.action} the request from ${pendingAction?.requestName}?`
        }
        confirmText={
          pendingAction?.action === 'approve' ? 'Approve' : 
          pendingAction?.action === 'reject' ? 'Reject' : 
          'Delete'
        }
        cancelText="Cancel"
        onConfirm={confirmAction}
      />
    </div>
  );
}
