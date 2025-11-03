import { useEffect, useState } from "react";
import MuseoModal, { MuseoModalBody, MuseoModalActions } from "../components/MuseoModal";
import ImageUploadZone from "../components/modal-features/ImageUploadZone";
import "./css/events.css";
const API = import.meta.env.VITE_API_BASE;

export default function PublishEventModal({ open, onClose, onPublished, mode = "create", initialData = null }) {
  const FALLBACK_COVER = import.meta.env.VITE_FALLBACKEVENTCOVER_URL || "";
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    details: "",
    venueName: "",
    venueAddress: "",
    startsAt: "",
    endsAt: "",
    admission: "",
    admissionNote: "",
  });
  const [activities, setActivities] = useState([""]); // dynamic list, start with one
  const [coverImage, setCoverImage] = useState(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Format a date string into the exact value that <input type="datetime-local"> expects (local time, no Z)
  const toLocalInput = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const min = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };


  // Populate form in edit mode
  useEffect(() => {
    if (open && mode === "edit" && initialData) {
      setForm({
        title: initialData.title || "",
        details: initialData.details || "",
        venueName: initialData.venueName || "",
        venueAddress: initialData.venueAddress || "",
        startsAt: toLocalInput(initialData.startsAt),
        endsAt: toLocalInput(initialData.endsAt),
        admission: initialData.admission || "",
        admissionNote: initialData.admissionNote || "",
      });
      const acts = Array.isArray(initialData.activities) ? initialData.activities : (initialData.activities ? [initialData.activities] : []);
      setActivities(acts.length ? acts : [""]);
      if (initialData.image) {
        setCoverImage({ url: initialData.image });
      } else {
        setCoverImage(null);
      }
      setFieldErrors({});
    }
    if (open && mode === "create" && !initialData) {
      // Reset form for create mode
      setForm({
        title: "",
        details: "",
        venueName: "",
        venueAddress: "",
        startsAt: "",
        endsAt: "",
        admission: "",
        admissionNote: "",
      });
      setActivities([""]);
      setCoverImage(null);
      setFieldErrors({});
    }
  }, [open, mode, initialData]);

  if (!open) return null;

  const update = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setFieldErrors((fe) => ({ ...fe, [name]: "" }));
  };


  const setActivity = (idx, val) => {
    setActivities((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
    setFieldErrors((fe) => ({ ...fe, [`activity_${idx}`]: "" }));
  };
  const addActivity = () => setActivities((prev) => [...prev, ""]);
  const removeActivity = (idx) => setActivities((prev) => prev.filter((_, i) => i !== idx));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      // Frontend validation: trim and validate all fields
      const errs = {};
      const trim = (v) => (typeof v === 'string' ? v.trim() : v);
      const title = trim(form.title);
      const details = trim(form.details);
      const venueName = trim(form.venueName);
      const venueAddress = trim(form.venueAddress);
      const admission = trim(form.admission);
      const admissionNote = trim(form.admissionNote);
      if (!title) errs.title = "Title is required";
      if (!venueName) errs.venueName = "Venue name is required";
      if (!venueAddress) errs.venueAddress = "Venue address is required";
      if (!details) errs.details = "Details are required";
      if (!admission) errs.admission = "Admission is required";
      if (!admissionNote) errs.admissionNote = "Admission note is required";
      if (!form.startsAt) errs.startsAt = "Start date/time is required";
      if (!form.endsAt) errs.endsAt = "End date/time is required";
      // Dates validity and order
      if (form.startsAt && form.endsAt) {
        const start = new Date(form.startsAt);
        const end = new Date(form.endsAt);
        if (Number.isNaN(start.getTime())) errs.startsAt = "Invalid start date";
        if (Number.isNaN(end.getTime())) errs.endsAt = "Invalid end date";
        if (!errs.startsAt && !errs.endsAt && end <= start) errs.endsAt = "End must be after start";
      }
      // Image: if none selected, we'll use fallback later
      // Activities required (each non-empty)
      const acts = activities.map((a) => trim(a)).filter(Boolean);
      if (acts.length === 0) {
        errs.activities = "Add at least one activity";
      } else {
        activities.forEach((val, idx) => {
          if (!trim(val)) errs[`activity_${idx}`] = "Required";
        });
      }

      if (Object.keys(errs).length) {
        setFieldErrors(errs);
        throw new Error("Please fix the highlighted fields.");
      }

      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ""));
      fd.append("activities", JSON.stringify(acts));
      
      // Handle cover image
      if (coverImage?.file) {
        fd.append("image", coverImage.file, coverImage.file.name);
      } else if (mode === "edit" && coverImage?.url) {
        fd.append("image", coverImage.url);
      } else if (FALLBACK_COVER) {
        fd.append("image", FALLBACK_COVER);
      }

      const url = mode === "edit" && initialData?.eventId
        ? `${API}/event/update/${initialData.eventId}`
        : `${API}/event/create`;
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, { method, credentials: "include", body: fd });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to publish event");
      }
      onPublished?.();
      onClose?.();
      setForm({
        title: "",
        details: "",
        venueName: "",
        venueAddress: "",
        startsAt: "",
        endsAt: "",
        admission: "",
        admissionNote: "",
      });
      setActivities([""]);
      setCoverImage(null);
      setFieldErrors({});
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MuseoModal
      open={open}
      onClose={onClose}
      title={mode === "edit" ? "Edit Event" : "Publish New Event"}
      subtitle="Add details, set time and venue, attach a cover, and list activities."
      size="lg"
    >
      {error && (
        <div className="museo-error-banner" style={{
          padding: 'var(--museo-space-3)',
          background: 'var(--museo-error-bg)',
          border: '1px solid var(--museo-error)',
          borderRadius: 'var(--museo-radius-md)',
          color: 'var(--museo-error)',
          margin: 'var(--museo-space-4)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>⚠️ {error}</span>
          <button 
            onClick={() => setError("")}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--museo-error)',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ✕
          </button>
        </div>
      )}
      
      <MuseoModalBody>
        <ImageUploadZone
          type="single"
          title="Event Cover Image"
          hint="Support: JPG, PNG up to 10MB • Single image only"
          value={coverImage}
          onChange={setCoverImage}
          error={fieldErrors.image}
        />

        <form onSubmit={submit}>
          <div className="museo-form-grid">
            <div className="museo-form-field">
              <label className="museo-label">Title</label>
              <input className={`museo-input ${fieldErrors.title ? 'museo-input--error' : ''}`} name="title" value={form.title} onChange={update} required aria-invalid={!!fieldErrors.title} />
              {fieldErrors.title && <div className="museo-error-message">{fieldErrors.title}</div>}
            </div>
            
            <div className="museo-form-field">
              <label className="museo-label">Venue Name</label>
              <input className={`museo-input ${fieldErrors.venueName ? 'museo-input--error' : ''}`} name="venueName" value={form.venueName} onChange={update} required aria-invalid={!!fieldErrors.venueName} />
              {fieldErrors.venueName && <div className="museo-error-message">{fieldErrors.venueName}</div>}
            </div>
            <div className="museo-form-field museo-form-field--full">
              <label className="museo-label">Venue Address</label>
              <input className={`museo-input ${fieldErrors.venueAddress ? 'museo-input--error' : ''}`} name="venueAddress" value={form.venueAddress} onChange={update} required aria-invalid={!!fieldErrors.venueAddress} />
              {fieldErrors.venueAddress && <div className="museo-error-message">{fieldErrors.venueAddress}</div>}
            </div>
            <div className="museo-form-field">
              <label className="museo-label">Starts At</label>
              <input type="datetime-local" className={`museo-input ${fieldErrors.startsAt ? 'museo-input--error' : ''}`} name="startsAt" value={form.startsAt} onChange={update} required aria-invalid={!!fieldErrors.startsAt} />
              {fieldErrors.startsAt && <div className="museo-error-message">{fieldErrors.startsAt}</div>}
            </div>
            <div className="museo-form-field">
              <label className="museo-label">Ends At</label>
              <input type="datetime-local" className={`museo-input ${fieldErrors.endsAt ? 'museo-input--error' : ''}`} name="endsAt" value={form.endsAt} onChange={update} required aria-invalid={!!fieldErrors.endsAt} />
              {fieldErrors.endsAt && <div className="museo-error-message">{fieldErrors.endsAt}</div>}
            </div>
            <div className="museo-form-field museo-form-field--full">
              <label className="museo-label">Details</label>
              <textarea className={`museo-textarea ${fieldErrors.details ? 'museo-textarea--error' : ''}`} name="details" rows={4} value={form.details} onChange={update} required aria-invalid={!!fieldErrors.details} />
              {fieldErrors.details && <div className="museo-error-message">{fieldErrors.details}</div>}
            </div>
            <div className="museo-form-field">
              <label className="museo-label">Admission</label>
              <input className={`museo-input ${fieldErrors.admission ? 'museo-input--error' : ''}`} name="admission" value={form.admission} onChange={update} required aria-invalid={!!fieldErrors.admission} />
              {fieldErrors.admission && <div className="museo-error-message">{fieldErrors.admission}</div>}
            </div>
            <div className="museo-form-field">
              <label className="museo-label">Admission Note</label>
              <input className={`museo-input ${fieldErrors.admissionNote ? 'museo-input--error' : ''}`} name="admissionNote" value={form.admissionNote} onChange={update} required aria-invalid={!!fieldErrors.admissionNote} />
              {fieldErrors.admissionNote && <div className="museo-error-message">{fieldErrors.admissionNote}</div>}
            </div>
            <div className="museo-form-field museo-form-field--full">
              <label className="museo-label">Activities</label>
              <div className="museo-activities-list">
                {activities.map((val, idx) => (
                  <div className="museo-activity-row" key={idx}>
                    <input
                      className={`museo-input ${fieldErrors[`activity_${idx}`] ? 'museo-input--error' : ''}`}
                      value={val}
                      onChange={(e) => setActivity(idx, e.target.value)}
                      placeholder={`Activity ${idx + 1}`}
                      required
                      aria-invalid={!!fieldErrors[`activity_${idx}`]}
                    />
                    {fieldErrors[`activity_${idx}`] && <div className="museo-error-message">{fieldErrors[`activity_${idx}`]}</div>}
                    {activities.length > 1 && (
                      <button 
                        type="button" 
                        className="btn-icon" 
                        onClick={() => removeActivity(idx)}
                        title="Remove activity"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-secondary btn-sm" onClick={addActivity}>+ Add Activity</button>
              </div>
              {fieldErrors.activities && <div className="museo-error-message">{fieldErrors.activities}</div>}
            </div>
          </div>

          <MuseoModalActions>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
              {submitting ? "Publishing..." : (mode === "edit" ? "Update Event" : "Publish Event")}
            </button>
          </MuseoModalActions>
        </form>
      </MuseoModalBody>
    </MuseoModal>
  );
}
