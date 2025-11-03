import { useEffect, useMemo, useState } from "react";
import RequestDetailModal from "./RequestDetailModal";
import MuseoLoadingBox from "../../components/MuseoLoadingBox";
import ConfirmModal from "../ConfirmModal";
import "./css/RequestsModal.css";

const API = import.meta.env.VITE_API_BASE;

export default function RequestsModal({
  open,
  onClose,
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
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
              id: booking.visitId,  // Fixed: use visitId from database
              visitId: booking.visitId,  // Keep original visitId too
              requestId: booking.visitId,  // Use visitId as requestId
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
        return dateB - dateA; // Newest first
      });
      setItems(combined);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && !event.target.closest('[data-dropdown]')) {
        setDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

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
      const requestId = (r.id || r.requestId || r.visitId || '').toString();  // Added visitId support
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
    const req = (items || []).find(r => (r.id || r.requestId || r.visitId) === id);  // Added visitId support
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
        // Determine the correct delete endpoint based on request type
        const req = (items || []).find(r => (r.id || r.requestId || r.visitId) === id);
        const reqType = req?.requestType || req?.type || 'unknown';
        
        // Use appropriate endpoint for different request types
        const deleteUrl = reqType === 'visit_booking' 
          ? `${API}/visit-bookings/${id}`  // Visit booking endpoint
          : `${API}/request/${id}`;         // Regular request endpoint
        
        const res = await fetch(deleteUrl, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to delete request');
        
        // Remove from local state
        setItems(prev => prev.filter(r => (r.id || r.requestId || r.visitId) !== id));  // Added visitId support
      } else {
        // Approve or Reject
        const req = (items || []).find(r => (r.id || r.requestId || r.visitId) === id);  // Added visitId support
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
          const rid = r.id || r.requestId || r.visitId;  // Added visitId support
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
      className="museo-modal-overlay"
      onMouseDown={(e) => { if (e.currentTarget === e.target) onClose(); }}
    >
      <article
        role="dialog"
        aria-modal="true"
        aria-label="Requests"
        className="museo-modal museo-modal--xl requests-modal__container"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="museo-body requests-modal__header">
          <div className="requests-modal__header-top">
            <div>
              <h3 className="museo-title requests-modal__title">
                User Requests
              </h3>
              <p className="museo-desc requests-modal__subtitle">
                Review and act on submissions
              </p>
            </div>
            <button 
              aria-label="Close" 
              onClick={onClose} 
              className="btn-x requests-modal__close-btn"
            >
              ✕
            </button>
          </div>
          
          <div className="requests-modal__filter-bar">
            <div className={`dropdown-filter ${dropdownOpen ? 'open' : ''}`} data-dropdown>
              <button
                className="dropdown-filter-trigger"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <span className="dropdown-filter-label">
                  {filter === 'all' ? 'All Types' : filter.replace(/_/g, ' ')}
                </span>
                <span className="dropdown-filter-arrow">▼</span>
              </button>
              
              <div className="dropdown-filter-menu">
                {types.map((t) => (
                  <button
                    key={t}
                    className={`dropdown-filter-item ${filter === t ? 'active' : ''}`}
                    onClick={() => {
                      setFilter(t);
                      setDropdownOpen(false);
                    }}
                  >
                    {t === 'all' ? 'All Types' : t.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
            <input
              className="museo-input requests-modal__search"
              value={q}
              onChange={e=>setQ(e.target.value)}
              placeholder="Search name, title, type, request ID, user ID"
            />
          </div>
        </header>

        <div className="requests-modal__content">
          {loading && (
            <MuseoLoadingBox message="Loading requests..." show={loading} />
          )}
          
          {!!error && (
            <div className="museo-message requests-modal__error">
              <strong>Error:</strong> {error}
              <br />
              <button className="btn btn-secondary btn-sm" onClick={loadRequests} style={{ marginTop: '12px' }}>
                Retry
              </button>
            </div>
          )}
          
          {!loading && !error && list.length === 0 && (
            <div className="requests-modal__empty">
              <div className="requests-modal__empty-icon">📭</div>
              <h4 className="museo-title requests-modal__empty-title">
                No requests
              </h4>
              <p className="museo-desc requests-modal__empty-desc">
                You'll see new requests here as users submit them.
              </p>
            </div>
          )}

          {!loading && !error && list.length > 0 && (
            <div className="requests-modal__list">
              {list.map((r) => {
                const id = r.id || r.requestId || r.visitId;  // Added visitId support
                const data = r.data || {};
                const imgs = Array.isArray(data.images) ? data.images : [];
                const name = [data.firstName, data.midInit, data.lastName].filter(Boolean).join(' ');
                const type = r.requestType || r.type || 'unknown';
                const status = (r.status || 'pending').toLowerCase();
                
                return (
                  <article 
                    key={id} 
                    className={`requests-modal__card ${type === 'visit_booking' ? 'requests-modal__card--visit-booking' : ''}`}
                    onClick={() => { setSelectedRequest(r); setDetailOpen(true); }}
                  >
                    {/* Header with badges */}
                    <header className="requests-modal__card-header">
                      {/* Left: Type badge */}
                      <div className="requests-modal__card-badges">
                        <span className="museo-badge museo-badge--primary">
                          {type.replace(/_/g,' ')}
                        </span>
                      </div>
                      
                      {/* Right: Status badge */}
                      <div className="requests-modal__card-status">
                        <span className={`museo-badge ${
                          status === 'approved' ? 'museo-badge--success' : 
                          status === 'rejected' ? 'museo-badge--error' : 
                          'museo-badge--warning'
                        }`}>
                          {status}
                        </span>
                      </div>
                    </header>

                    {/* Main content */}
                    <div className="requests-modal__card-content">
                      {/* Title */}
                      <h3 className="requests-modal__card-title">
                        {type === 'visit_booking' 
                          ? (data.organizationName || data.contactName || 'Visit Request')
                          : (name || data.title || r.title || 'Request')
                        }
                      </h3>
                      
                      {/* Metadata */}
                      <div className="requests-modal__metadata">
                        {type === 'visit_booking' ? (
                          // Visit Booking specific metadata
                          <>
                            <div className="visit-booking-highlight">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                              </svg>
                              <strong>Visitor Type:</strong> {data.visitorType?.replace('_', ' ') || '—'}
                            </div>
                            {data.organizationName && <div><strong>Organization:</strong> {data.organizationName}</div>}
                            <div><strong>Visitors:</strong> {data.numberOfVisitors || '—'} people</div>
                            <div><strong>Contact:</strong> {data.contactName || '—'}</div>
                            <div><strong>Email:</strong> {data.contactEmail || '—'}</div>
                            <div><strong>Phone:</strong> {data.contactPhone || '—'}</div>
                            <div className="visit-booking-date">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                              </svg>
                              <strong>Visit Date:</strong> {data.preferredDate || '—'} {data.preferredTime ? `(${data.preferredTime})` : ''}
                            </div>
                            <div><strong>Purpose:</strong> {data.purposeOfVisit?.replace(/-/g, ' ') || '—'}</div>
                            <div><strong>Location:</strong> {data.location || '—'}</div>
                            {data.classification && <div><strong>Classification:</strong> {data.classification}</div>}
                            {data.yearLevel && <div><strong>Year Level:</strong> {data.yearLevel}</div>}
                            {data.remarks && <div className="visit-booking-remarks"><strong>Remarks:</strong> {data.remarks}</div>}
                          </>
                        ) : (
                          // Regular request metadata
                          <>
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
                          </>
                        )}
                      </div>
                      
                      {/* Images */}
                      {imgs.length > 0 && (
                        <div className="requests-modal__images">
                          {imgs.map((src, i) => (
                            <div key={i} className="requests-modal__image-wrapper">
                              <img 
                                src={src} 
                                alt="attachment" 
                                loading="lazy" 
                                className="requests-modal__image"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* JSON Data Preview */}
                      {imgs.length === 0 && Object.keys(data).length > 0 && (
                        <details className="requests-modal__data-preview">
                          <summary className="requests-modal__data-summary">
                            View Request Data
                          </summary>
                          <pre className="requests-modal__data-content">
                            {JSON.stringify(data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                    
                    {/* Action buttons */}
                    <footer 
                      className="requests-modal__card-footer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleActionClick(id, 'approve')}
                        disabled={status === 'approved' || status === 'rejected'}
                        className="btn btn-success btn-sm"
                      >
                        {status === 'approved' ? '✓ Approved' : 'Accept'}
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
                        className="btn btn-secondary btn-sm"
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
