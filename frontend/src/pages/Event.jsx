import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import EventModal from "./EventModal.jsx";
import PublishEventModal from "./PublishEventModal.jsx";
import ConfirmModal from "./ConfirmModal.jsx";
import { NavLink } from "react-router-dom";
// Using CSS classes from design-system.css instead of components
import MuseoLoadingBox from "../components/MuseoLoadingBox.jsx";
import MuseoEmptyState from "../components/MuseoEmptyState.jsx";
const API = import.meta.env.VITE_API_BASE;

export default function Event() {
  const location = useLocation();
  const navigate = useNavigate();
  const { eventId: routeEventId } = useParams();
  const [events, setEvents] = useState([]);
  const items = events; // use fetched events instead of hardcoded
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [role, setRole] = useState(null);
  const [showPublish, setShowPublish] = useState(false);
  const [editData, setEditData] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [participantCounts, setParticipantCounts] = useState({}); // { [eventId]: number }
  
  // Pagination states (Homepage style)
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const EVENTS_PER_PAGE = 10;

  const getEvents = async (page = 1, append = false) => {
    try {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      const res = await fetch(`${API}/event/getEvents?page=${page}&limit=${EVENTS_PER_PAGE}`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch events: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      // backend returns { data: [...], pagination: {...} }
      const fetchedEvents = Array.isArray(data?.data) ? data.data : [];
      
      if (append) {
        // Append to existing events for infinite scroll, avoiding duplicates
        setEvents(prev => {
          const existingIds = new Set(prev.map(e => e.eventId || e.id));
          const newEvents = fetchedEvents.filter(e => !existingIds.has(e.eventId || e.id));
          return [...prev, ...newEvents];
        });
      } else {
        // Replace events for initial load
        setEvents(fetchedEvents);
      }
      
      // Update hasMore based on pagination info
      if (data.pagination) {
        setHasMore(data.pagination.hasMore);
      } else {
        setHasMore(fetchedEvents.length === EVENTS_PER_PAGE);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      if (!append) {
        setEvents([]);
      }
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // When navigated to /event/:eventId, fetch that event and open the modal
  const hasOpenedEventRef = useRef(false);
  
  useEffect(() => {
    const openByRoute = async () => {
      if (!routeEventId) {
        hasOpenedEventRef.current = false;
        return;
      }
      
      // If we already opened this event, don't do it again
      if (hasOpenedEventRef.current) return;
      
      try {
        // Try find in current list first
        const found = events.find(e => (e.eventId || e.id) == routeEventId);
        if (found) { 
          openEvent(found);
          hasOpenedEventRef.current = true;
          return;
        }
        
        // Only fetch all events if we have some events loaded (pagination started)
        // and the event is still not found
        if (events.length > 0) {
          // ✅ FIXED: Reduced limit from 1000 to 100 to save egress
          const allRes = await fetch(`${API}/event/getEvents?page=1&limit=100`, { credentials: 'include' });
          if (!allRes.ok) throw new Error('Failed to fetch events');
          const all = await allRes.json();
          const list = Array.isArray(all?.data)
            ? all.data
            : Array.isArray(all?.events)
              ? all.events
              : Array.isArray(all)
                ? all
                : [];
          const byId = list.find(e => (e.eventId || e.id) == routeEventId);
          if (byId) { 
            openEvent(byId);
            hasOpenedEventRef.current = true;
            return;
          }
          throw new Error('Event not found');
        }
      } catch (e) {
        console.error(e);
        // If failed, navigate back to list
        navigate('/event', { replace: true });
      }
    };
    openByRoute();
    // Only run when routeEventId changes or when events are first loaded
  }, [routeEventId, events.length > 0]);

  // Fetch role of current user
  const fetchRole = async () => {
    try {
      const response = await fetch(`${API}/users/role`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) throw new Error(`Failed to fetch user: ${response.statusText}`);
      const data = await response.json();
      setRole(data);
      console.log("Fetched user:", data);
    } catch (error) {
      console.error("Error fetching user:", error);
      setRole(null);
    }
  };

  // Load more events for infinite scroll
  const loadMoreEvents = async () => {
    if (!hasMore || isLoadingMore) return;
    
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    await getEvents(nextPage, true);
  };

  useEffect(() => {
    getEvents(1, false);
    fetchRole();
  }, []);

  // Infinite scroll observer (Homepage style)
  useEffect(() => {
    if (typeof window !== 'undefined' && events.length > 0) {
      const sentinel = document.getElementById('events-sentinel');
      if (!sentinel) return;

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry.isIntersecting && hasMore && !isLoadingMore) {
            loadMoreEvents();
          }
        },
        { rootMargin: '100px' }
      );

      observer.observe(sentinel);

      return () => {
        if (sentinel) {
          observer.unobserve(sentinel);
        }
      };
    }
  }, [hasMore, isLoadingMore, events.length]);

  // Fetch participant counts per event
  useEffect(() => {
    let abort = false;
    const run = async () => {
      try {
        if (!Array.isArray(items) || items.length === 0) {
          setParticipantCounts({});
          return;
        }
        const results = await Promise.all(items.map(async (e) => {
          const id = e.eventId || e.id;
          if (!id) return [id, 0];
          try {
            const res = await fetch(`${API}/event/eventParticipants`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ eventId: id })
            });
            if (!res.ok) return [id, 0];
            const data = await res.json();
            const count = Array.isArray(data?.participants) ? data.participants.length : 0;
            return [id, count];
          } catch {
            return [id, 0];
          }
        }));
        if (abort) return;
        const map = Object.fromEntries(results.filter(Boolean));
        setParticipantCounts(map);
      } catch {}
    };
    run();
    return () => { abort = true; };
  }, [items]);

  // Auto-open modal if URL has ?open=<eventId> or navigation state { open: <eventId> }
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search || window.location.search);
      const rawQuery = params.get('open');
      const rawState = location.state && (location.state.open || location.state?.open === 0 ? String(location.state.open) : null);
      const raw = rawState ?? rawQuery;
      
      if (!raw || !items?.length || selected) return;
      const openKey = String(raw).toLowerCase();
      
      const match = items.find(e => {
        const a = String(e.eventId || '').toLowerCase();
        const b = String(e.id || '').toLowerCase();
        const c = String(e.title || '').toLowerCase();
        return a === openKey || b === openKey || c === openKey;
      });
      
      if (match) {
        openEvent(match);
        // If opened via state, clear it so it doesn't keep re-opening
        if (rawState) {
          // Preserve current search, clear state
          const search = location.search || '';
          navigate({ pathname: location.pathname, search }, { replace: true, state: {} });
        }
      }
    } catch (e) {
      console.error('Error in auto-open effect:', e);
    }
  }, [items, selected, location.search, location.state]);

  const openEvent = (evt) => setSelected({
    eventId: evt.eventId || evt.id,
    slug: evt.eventId || evt.id || evt.title,
    title: evt.title,
    hero: evt.image,
    lead: evt.details, // full details shown in modal
    activities: Array.isArray(evt.activities)
      ? evt.activities
      : (evt.activities ? [evt.activities] : []),
    admission: evt.admission,
    admissionNote: evt.admissionNote,
    venueName: evt.venueName,
    venueAddress: evt.venueAddress,
    start: evt.startsAt,
    end: evt.endsAt,
  });

  const closeEventModal = () => {
    setSelected(null);
    // If opened via deep link /event/:eventId, go back to /Event
    if (routeEventId) {
      navigate('/event', { replace: true });
      return;
    }
    // Otherwise remove ?open= from URL if any
    try {
      const params = new URLSearchParams(location.search || '');
      params.delete('open');
      navigate({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : '' }, { replace: true });
    } catch {}
    // Refresh events when modal is closed
    getEvents();
  };

  const openEdit = (evt) => {
    setEditData({
      eventId: evt.eventId || evt.id,
      title: evt.title || "",
      details: evt.details || "",
      venueName: evt.venueName || "",
      venueAddress: evt.venueAddress || "",
      startsAt: evt.startsAt || "",
      endsAt: evt.endsAt || "",
      admission: evt.admission || "",
      admissionNote: evt.admissionNote || "",
      activities: Array.isArray(evt.activities) ? evt.activities : (evt.activities ? [evt.activities] : []),
      image: evt.image || "",
    });
  };

  const askDelete = (evt) => {
    const id = evt.eventId || evt.id;
    if (!id) return;
    setToDelete(evt);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const id = toDelete.eventId || toDelete.id;
    try {
      const res = await fetch(`${API}/event/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete event');
      setConfirmOpen(false);
      setToDelete(null);
      await getEvents();
    } catch (e) {
      console.error(e);
      setConfirmOpen(false);
      setToDelete(null);
      alert('Delete failed');
    }
  };

  return (
    <div className="museo-page">
      <div className="museo-feed">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 className="museo-heading">Events</h1>
        </div>

        {/* Admin Actions */}
        {(role === 'admin' || role?.role === 'admin') && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            marginBottom: '32px' 
          }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowPublish(true)}
            >
              Publish Event
            </button>
          </div>
        )}

        {/* Loading */}
        <MuseoLoadingBox 
          show={loading} 
          message={MuseoLoadingBox.messages.events} 
        />

        {/* Empty State */}
        {!loading && items.length === 0 && (
          <MuseoEmptyState {...MuseoEmptyState.presets.events} />
        )}

        {/* Events Grid */}
        {!loading && items.length > 0 && (
          <div className="museo-grid museo-grid--3">
            {items.map((e, i) => (
              <div
                key={e.eventId || e.id || e.title}
                className="museo-event-card"
                style={{ animationDelay: `${i * 0.02}s` }}
                onClick={() => navigate(`/event/${e.eventId || e.id}`)}
              >
                <img className="museo-event-image" src={e.image} alt={e.title} />
                {/* Event status indicator */}
                <div className={`event-status ${
                  (() => {
                    const now = new Date();
                    const startDate = new Date(e.startsAt);
                    const endDate = new Date(e.endsAt);
                    
                    if (now < startDate) return 'event-status--upcoming';
                    if (now >= startDate && now <= endDate) return 'event-status--happening';
                    return 'event-status--ended';
                  })()
                }`}>
                  {(() => {
                    const now = new Date();
                    const startDate = new Date(e.startsAt);
                    const endDate = new Date(e.endsAt);
                    
                    if (now < startDate) return 'Upcoming';
                    if (now >= startDate && now <= endDate) return 'Live';
                    return 'Ended';
                  })()}
                </div>

                {/* Attendance badge */}
                <div className="event-attendance-badge">
                  {participantCounts[e.eventId || e.id] ?? 0} attending
                </div>

                <div className="museo-event-content">
                  <h3 className="museo-title">{e.title}</h3>
                  
                  {/* Event metadata */}
                  <div className="event-metadata">
                    {e.startsAt && (
                      <div className={`event-metadata-item ${
                        new Date(e.startsAt).toDateString() === new Date().toDateString() ? 'urgent' : ''
                      }`}>
                        <span>📅</span>
                        <span>{new Date(e.startsAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: new Date(e.startsAt).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                        })}</span>
                      </div>
                    )}
                    {e.venue && (
                      <div className="event-metadata-item">
                        <span>📍</span>
                        <span>{e.venue}</span>
                      </div>
                    )}
                    {e.time && (
                      <div className="event-metadata-item">
                        <span>🕐</span>
                        <span>{e.time}</span>
                      </div>
                    )}
                  </div>

                  <p className="museo-desc">
                    {(() => {
                      const text = typeof e.details === 'string' ? e.details : '';
                      const limit = 85; // Reduced for better layout
                      if (text.length <= limit) return text;
                      const clipped = text.slice(0, limit);
                      const trimmed = clipped.replace(/\s+\S*$/, "");
                      return trimmed + "...";
                    })()}
                  </p>
                  <div 
                    className="museo-actions" 
                    onClick={(ev) => ev.stopPropagation()}
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      marginTop: 'auto',
                      paddingTop: '12px',
                      opacity: 0,
                      transform: 'translateY(8px)',
                      pointerEvents: 'none',
                      transition: 'opacity 300ms ease, transform 300ms ease',
                      alignSelf: 'stretch'
                    }}
                  >
                    <button className="btn btn-primary btn-sm" onClick={() => openEvent(e)}>View More</button>
                    {(role === 'admin' || role?.role === 'admin') && (
                      <>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(e)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => askDelete(e)}>Delete</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading more indicator */}
        {isLoadingMore && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '40px 20px',
            marginTop: '20px'
          }}>
            <MuseoLoadingBox show={true} />
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div id="events-sentinel" style={{ height: '20px', margin: '20px 0' }} />

        {/* End of events indicator */}
        {!hasMore && events.length > 0 && !loading && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '40px 20px',
            color: 'var(--museo-text-muted)',
            fontSize: '14px',
            fontStyle: 'italic'
          }}>
            You've reached the end of all events
          </div>
        )}

        <EventModal open={!!selected} event={selected} onClose={closeEventModal} />
        <PublishEventModal
          open={showPublish}
          onClose={() => setShowPublish(false)}
          onPublished={() => {
            setShowPublish(false);
            getEvents();
          }}
        />
        <PublishEventModal
          open={!!editData}
          mode="edit"
          initialData={editData}
          onClose={() => setEditData(null)}
          onPublished={() => {
            setEditData(null);
            getEvents();
          }}
        />
        <ConfirmModal
          open={confirmOpen}
          title="Delete event"
          message={toDelete ? `Are you sure you want to delete "${toDelete.title}"? This cannot be undone.` : ""}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDelete}
          onCancel={() => { setConfirmOpen(false); setToDelete(null); }}
        />
      </div>
    </div>
  );
}
