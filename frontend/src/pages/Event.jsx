import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import "./css/events.css";
import "../components/MuseoGalleryContainer.css";
import EventModal from "./EventModal.jsx";
import PublishEventModal from "./PublishEventModal.jsx";
import ConfirmModal from "./ConfirmModal.jsx";
import { NavLink } from "react-router-dom";
import { 
  MuseoPage, 
  MuseoFeed, 
  MuseoHeading, 
  MuseoGrid,
  MuseoCard,
  MuseoMedia,
  MuseoBody,
  MuseoTitle,
  MuseoDesc,
  MuseoBadge,
  MuseoActions,
  MuseoBtn
} from "../components/MuseoGalleryContainer.jsx";
import MuseoLoadingBox from "../components/MuseoLoadingBox.jsx";
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

  const getEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/event/getEvents`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch events: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      // backend returns { data: [...] }
      setEvents(Array.isArray(data?.data) ? data.data : []);
    } catch (error) {
      console.error("Error fetching events:", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  // When navigated to /event/:eventId, fetch that event and open the modal
  useEffect(() => {
    const openByRoute = async () => {
      if (!routeEventId) return;
      try {
        // Try find in current list first
        const found = events.find(e => (e.eventId || e.id) == routeEventId);
        if (found) { openEvent(found); return; }
        // Fetch all events then locate the one by id
        const allRes = await fetch(`${API}/event/getEvents`, { credentials: 'include' });
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
        if (byId) { openEvent(byId); return; }
        throw new Error('Event not found');
      } catch (e) {
        console.error(e);
        // If failed, navigate back to list
        navigate('/event', { replace: true });
      }
    };
    openByRoute();
    // we want this to run when routeEventId or events change
  }, [routeEventId, events]);

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

  useEffect(() => {
    getEvents();
    fetchRole();
  }, []);

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
    <MuseoPage>
      <MuseoFeed>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <MuseoHeading>Events</MuseoHeading>
        </div>

        {/* Admin Actions */}
        {(role === 'admin' || role?.role === 'admin') && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            marginBottom: '32px' 
          }}>
            <button
              className="evmCalBtn"
              onClick={() => setShowPublish(true)}
            >
              Publish Event
            </button>
          </div>
        )}

        {/* Loading State */}
        <MuseoLoadingBox 
          show={loading} 
          message={MuseoLoadingBox.messages.events} 
        />

        {/* Events Grid */}
        {!loading && (
          <MuseoGrid columns={3}>
            {items.map((e, i) => (
            <MuseoCard
              key={e.eventId || e.id || e.title}
              variant="event"
              animationDelay={i * 80}
              onClick={() => navigate(`/event/${e.eventId || e.id}`)}
            >
              <MuseoMedia src={e.image} alt={e.title} />
              <MuseoBadge>
                Participants ({participantCounts[e.eventId || e.id] ?? 0})
              </MuseoBadge>
              <MuseoBody>
                <MuseoTitle>{e.title}</MuseoTitle>
                <MuseoDesc>
                  {(() => {
                    const text = typeof e.details === 'string' ? e.details : '';
                    const limit = 120; // Reduced for compact design
                    if (text.length <= limit) return text;
                    const clipped = text.slice(0, limit);
                    const trimmed = clipped.replace(/\s+\S*$/, "");
                    return trimmed + "...";
                  })()}
                </MuseoDesc>
                <MuseoActions onClick={(ev) => ev.stopPropagation()}>
                  <MuseoBtn onClick={() => openEvent(e)}>View More</MuseoBtn>
                  {(role === 'admin' || role?.role === 'admin') && (
                    <>
                      <MuseoBtn variant="ghost" onClick={() => openEdit(e)}>Edit</MuseoBtn>
                      <MuseoBtn variant="danger" onClick={() => askDelete(e)}>Delete</MuseoBtn>
                    </>
                  )}
                </MuseoActions>
              </MuseoBody>
            </MuseoCard>
            ))}
          </MuseoGrid>
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
      </MuseoFeed>
    </MuseoPage>
  );
}
