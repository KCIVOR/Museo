import { useEffect, useMemo, useState } from "react";
import RequestDetailModal from "../RequestDetailModal";
import MuseoLoadingBox from "../../../components/MuseoLoadingBox";
import ConfirmModal from "../../ConfirmModal";

const API = import.meta.env.VITE_API_BASE;

export default function RequestsTab() {
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
      },
      delete: async (id) => {
        const res = await fetch(`${API}/visit-bookings/${id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to delete visit booking');
        return { success: true, deleted: true };
      }
    },
    artist_verification: {
      approve: async (id, req) => {
        const res = await fetch(`${API}/request/action`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            id, 
            action: 'approve', 
            type: 'artist_verification' 
          })
        });
        if (!res.ok) throw new Error('Failed to approve artist verification');
        const data = await res.json();
        return { success: true, status: 'approved', data };
      },
      reject: async (id, req) => {
        const res = await fetch(`${API}/request/action`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            id, 
            action: 'reject', 
            type: 'artist_verification' 
          })
        });
        if (!res.ok) throw new Error('Failed to reject artist verification');
        const data = await res.json();
        return { success: true, status: 'rejected', data };
      },
      delete: async (id) => {
        const res = await fetch(`${API}/request/${id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to delete artist verification');
        return { success: true, deleted: true };
      }
    },
    // Default handler for other request types
    default: {
      approve: async (id, req) => {
        const res = await fetch(`${API}/request/action`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            id, 
            action: 'approve', 
            type: req?.requestType || req?.type || 'unknown'
          })
        });
        if (!res.ok) throw new Error('Failed to approve request');
        const data = await res.json();
        return { success: true, status: 'approved', data };
      },
      reject: async (id, req) => {
        const res = await fetch(`${API}/request/action`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            id, 
            action: 'reject', 
            type: req?.requestType || req?.type || 'unknown'
          })
        });
        if (!res.ok) throw new Error('Failed to reject request');
        const data = await res.json();
        return { success: true, status: 'rejected', data };
      },
      delete: async (id) => {
        const res = await fetch(`${API}/request/${id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to delete request');
        return { success: true, deleted: true };
      }
    }
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
        console.warn('Could not fetch visit bookings:', visitError);
      }
      
      // Combine both types and sort by date (newest first)
      const combined = [...regularRequests, ...visitBookings];
      combined.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at || 0);
        const dateB = new Date(b.createdAt || b.created_at || 0);
        return dateB - dateA;
      });
      
      setItems(combined);
    } catch (err) {
      setError(err.message || "Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (req, action) => {
    setPendingAction({ req, action });
    setConfirmOpen(true);
  };

  const executePendingAction = async () => {
    if (!pendingAction) return;
    const { req, action } = pendingAction;
    
    // Try to get specific handler, fall back to default
    const requestType = req.requestType || req.type;
    let typeHandlers = actionsByType[requestType];
    
    // If no specific handler exists, use the default handler
    if (!typeHandlers) {
      typeHandlers = actionsByType.default;
    }
    
    if (!typeHandlers || !typeHandlers[action]) {
      alert(`No handler for ${action} on ${requestType}`);
      return;
    }

    try {
      const result = await typeHandlers[action](req.id || req.requestId || req.visitId, req);
      if (result.success) {
        if (result.deleted) {
          // Remove the item from the list if it was deleted
          // Get the unique identifier for this request
          const reqIdentifier = req.id || req.requestId || req.visitId;
          
          setItems(prev => prev.filter(item => {
            const itemIdentifier = item.id || item.requestId || item.visitId;
            return itemIdentifier !== reqIdentifier;
          }));
          
          if (detailOpen) {
            setDetailOpen(false);
            setSelectedRequest(null);
          }
        } else {
          // Update the status for approve/reject
          const reqIdentifier = req.id || req.requestId || req.visitId;
          
          setItems(prev => prev.map(item => {
            const itemIdentifier = item.id || item.requestId || item.visitId;
            return itemIdentifier === reqIdentifier
              ? { ...item, status: result.status }
              : item;
          }));
          
          if (detailOpen) {
            setSelectedRequest(prev => ({ ...prev, status: result.status }));
          }
        }
      }
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setConfirmOpen(false);
      setPendingAction(null);
    }
  };

  const uniqueTypes = useMemo(() => {
    const types = new Set(['all']);
    items.forEach(r => types.add(r.requestType || r.type || 'unknown'));
    return Array.from(types).sort();
  }, [items]);

  const filteredRequests = useMemo(() => {
    const base = items || [];
    const f1 = filter === 'all' ? base : base.filter(r => (r.requestType || r.type || 'unknown') === filter);
    const term = q.trim().toLowerCase();
    if (!term) return f1;
    
    return f1.filter(r => {
      const id = r.id || r.requestId || r.visitId || '';
      const name = r.data?.contactName || r.data?.userName || '';
      const email = r.data?.contactEmail || r.data?.userEmail || '';
      const org = r.data?.organizationName || '';
      const type = r.requestType || r.type || '';
      const status = r.status || '';
      
      return [id, name, email, org, type, status].some(field => 
        String(field).toLowerCase().includes(term)
      );
    });
  }, [items, filter, q]);

  useEffect(() => {
    loadRequests();
  }, []);

  return (
    <div className="museo-section">
      {/* Filters and Search */}
      <div className="museo-toolbar" style={{ 
        display: 'flex',
        gap: 'var(--museo-space-3)',
        marginBottom: 'var(--museo-space-4)',
        flexWrap: 'wrap'
      }}>
        <div style={{ 
          flex: 1, 
          minWidth: '250px'
        }}>
          <input
            type="search"
            className="museo-input"
            placeholder="Search requests..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        
        <select
          className="museo-select"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            minWidth: '150px'
          }}
        >
          {uniqueTypes.map(type => (
            <option key={type} value={type}>
              {type === 'all' ? 'All Types' : type.replace('_', ' ').toUpperCase()}
            </option>
          ))}
        </select>
        
        <button 
          className="btn btn-ghost btn-sm"
          onClick={loadRequests}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--museo-space-2)'
          }}
        >
          <span style={{ fontSize: '18px' }}>↻</span>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Content */}
      {loading && <MuseoLoadingBox />}
      
      {!loading && error && (
        <div className="museo-message museo-message--error">
          <strong>Error:</strong> {error}
          <button className="btn btn-secondary btn-sm" onClick={loadRequests} style={{ marginLeft: '12px' }}>
            Retry
          </button>
        </div>
      )}
      
      {!loading && !error && filteredRequests.length === 0 && (
        <div className="museo-empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <h3>No requests found</h3>
          <p>{q ? 'Try adjusting your search terms' : 'New requests will appear here'}</p>
        </div>
      )}

      {!loading && !error && filteredRequests.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: 'var(--museo-space-4)',
          marginTop: 'var(--museo-space-4)'
        }}>
          {filteredRequests.map((r) => {
            const id = r.id || r.requestId || r.visitId;
            const data = r.data || {};
            const isVisit = r.requestType === 'visit_booking' || r.type === 'visit_booking';
            const isArtistVerification = r.requestType === 'artist_verification' || r.type === 'artist_verification';
            
            // Get display name based on request type
            const getDisplayName = () => {
              if (isVisit) {
                return data.organizationName || data.contactName || 'Visit Request';
              }
              if (isArtistVerification || data.firstName || data.lastName) {
                const name = [data.firstName, data.midInit, data.lastName].filter(Boolean).join(' ');
                return name || data.userName || 'Request';
              }
              return data.userName || data.title || 'Request';
            };
            
            // Get display email/contact
            const getContactInfo = () => {
              if (isVisit) {
                return data.contactEmail || data.contactPhone || 'No contact info';
              }
              return data.email || data.phone || 'No email provided';
            };
            
            return (
              <article 
                key={id} 
                className="museo-card"
                style={{
                  padding: 0,
                  border: '1px solid var(--museo-border)',
                  borderRadius: 'var(--museo-border-radius-lg)',
                  background: 'var(--museo-bg-primary)',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '320px'
                }}
                onClick={() => {
                  setSelectedRequest(r);
                  setDetailOpen(true);
                }}
              >
                {/* Card Content */}
                <div style={{
                  padding: 'var(--museo-space-4)',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {/* Header */}
                  <div style={{ marginBottom: 'var(--museo-space-3)' }}>
                    <h3 style={{
                      fontSize: 'var(--museo-font-size-lg)',
                      fontWeight: 'var(--museo-font-weight-bold)',
                      color: 'var(--museo-text-primary)',
                      marginBottom: 'var(--museo-space-2)'
                    }}>
                      {getDisplayName()}
                    </h3>
                    <p style={{
                      color: 'var(--museo-text-muted)',
                      fontSize: 'var(--museo-font-size-sm)',
                      textTransform: 'capitalize'
                    }}>
                      {(r.requestType || r.type || 'unknown').replace(/_/g, ' ')}
                    </p>
                  </div>
                  
                  {/* Content */}
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: 'var(--museo-space-2)'
                  }}>
                    {isVisit ? (
                      <>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--museo-space-2)'
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          <span style={{ fontSize: 'var(--museo-font-size-sm)' }}>
                            {data.preferredDate ? new Date(data.preferredDate).toLocaleDateString() : 'No date'}
                          </span>
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--museo-space-2)'
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                          <span style={{ fontSize: 'var(--museo-font-size-sm)' }}>
                            {data.preferredTime || 'morning'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--museo-space-2)'
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6">
                          {isArtistVerification ? (
                            <path d="M12 2L2 7L12 12L22 7L12 2Z M2 17L12 22L22 17V7L12 12L2 7V17Z"/>
                          ) : (
                            <>
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                              <circle cx="9" cy="7" r="4"/>
                            </>
                          )}
                        </svg>
                        <span style={{ fontSize: 'var(--museo-font-size-sm)' }}>
                          {getContactInfo()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Footer with Date */}
                  <div style={{
                    marginTop: 'var(--museo-space-3)',
                    paddingTop: 'var(--museo-space-3)',
                    borderTop: '1px solid var(--museo-border)'
                  }}>
                    <span style={{
                      color: 'var(--museo-text-muted)',
                      fontSize: 'var(--museo-font-size-xs)'
                    }}>
                      Submitted: {new Date(r.createdAt || r.created_at || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                {/* Actions - Always at bottom */}
                <div style={{
                  display: 'flex',
                  gap: 'var(--museo-space-2)',
                  padding: 'var(--museo-space-3) var(--museo-space-4)',
                  borderTop: '1px solid var(--museo-border)',
                  background: 'var(--museo-bg-secondary)'
                }}>
                  {r.status === 'pending' ? (
                    <>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRequestAction(r, 'approve');
                        }}
                        style={{ flex: 1 }}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRequestAction(r, 'delete');
                        }}
                        style={{ flex: 1 }}
                      >
                        Delete
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRequestAction(r, 'reject');
                        }}
                        style={{ flex: 1 }}
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ 
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: r.status === 'approved' ? 'var(--museo-success)' : 'var(--museo-error)',
                        fontSize: 'var(--museo-font-size-sm)',
                        fontWeight: 'var(--museo-font-weight-medium)'
                      }}>
                        {r.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                      </div>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRequestAction(r, 'delete');
                        }}
                        style={{ flex: 1 }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {detailOpen && selectedRequest && (
        <RequestDetailModal
          open={detailOpen}
          request={selectedRequest}
          onClose={() => {
            setDetailOpen(false);
            setSelectedRequest(null);
          }}
        />
      )}

      <ConfirmModal
        open={confirmOpen}
        title="Confirm Action"
        message={`Are you sure you want to ${pendingAction?.action} this request?`}
        confirmText={
          pendingAction?.action === 'approve' ? 'Approve' : 
          pendingAction?.action === 'delete' ? 'Delete' : 
          'Reject'
        }
        onConfirm={executePendingAction}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingAction(null);
        }}
      />
    </div>
  );
}
