import { useEffect, useRef, useState } from "react";
import "./css/events.css";
const API = import.meta.env.VITE_API_BASE;

export default function PublishEventModal({ open, onClose, onPublished, mode = "create", initialData = null }) {
  const FALLBACK_COVER = import.meta.env.VITE_FALLBACKEVENTCOVER_URL || "";
  const overlayRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
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
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [origImageUrl, setOrigImageUrl] = useState("");
  const fileInputRef = useRef(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [dragActive, setDragActive] = useState(false);

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

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

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
        setOrigImageUrl(initialData.image);
        setImagePreview(initialData.image);
      } else {
        setOrigImageUrl("");
        setImagePreview("");
      }
      setImageFile(null);
      setFieldErrors({});
    }
    if (open && mode === "create" && !initialData) {
      // ensure clean state when creating
      setOrigImageUrl("");
    }
  }, [open, mode, initialData]);

  if (!open) return null;

  const update = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setFieldErrors((fe) => ({ ...fe, [name]: "" }));
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const handleFiles = (files) => {
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      return isImage && isValidSize;
    });

    if (validFiles.length !== files.length) {
      setError('Some files were rejected. Only image files under 10MB are allowed.');
    }

    // Take only the first valid file for event cover
    const file = validFiles[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const openPicker = () => fileInputRef.current?.click();

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
      if (imageFile) {
        fd.append("image", imageFile, imageFile.name);
      } else if (mode === "edit" && origImageUrl) {
        fd.append("image", origImageUrl);
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
      setImageFile(null);
      setImagePreview("");
      setOrigImageUrl("");
      setFieldErrors({});
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="museo-modal-overlay evmOverlay"
      ref={overlayRef}
      onMouseDown={(e) => e.target === overlayRef.current && onClose?.()}
    >
      <article 
        className="museo-modal evmDialog"
        role="dialog" 
        aria-modal="true" 
        aria-label="Publish Event" 
        style={{
          borderRadius: isMobile ? '12px' : '20px'
        }}
      >
        <button 
          aria-label="Close" 
          onClick={onClose} 
          className="btn-x"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 10
          }}
        >
          ✕
        </button>

        <div style={{
          padding: isMobile ? '16px' : '20px',
          borderBottom: '2px solid var(--museo-border)',
          background: 'linear-gradient(180deg, rgba(255,255,255,.95), rgba(255,255,255,.85))',
          backdropFilter: 'blur(6px)'
        }}>
          <h1 style={{
            fontSize: isMobile ? '24px' : '28px',
            fontWeight: '700',
            color: 'var(--museo-charcoal)',
            margin: '0 0 8px',
            lineHeight: '1.2',
            letterSpacing: '-0.01em'
          }}>
            Publish New Event
          </h1>
          <p style={{
            fontSize: '15px',
            color: 'var(--museo-navy)',
            margin: '0',
            lineHeight: '1.4'
          }}>
            Add details, set time and venue, attach a cover, and list activities.
          </p>
        </div>

        <div style={{
          padding: isMobile ? '16px' : '20px',
          borderBottom: '2px solid var(--museo-border)'
        }}>
          <div className="uam-section">
            <h3 className="uam-section-title">Event Cover Image</h3>
            
            <div 
              className={`uam-dropzone ${dragActive ? 'uam-dropzone--active' : ''} ${imagePreview ? 'uam-dropzone--has-files' : ''} ${error ? 'uam-dropzone--error' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="uam-dropzone-content">
                <div className="uam-dropzone-icon">🎨</div>
                <div className="uam-dropzone-text">
                  <strong>Drop your event cover here</strong> or click to browse
                </div>
                <div className="uam-dropzone-hint">
                  Support: JPG, PNG up to 10MB • Single image only
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleFileSelect}
                  className="uam-file-input"
                />
              </div>
            </div>

            {error && <div className="uam-error">{error}</div>}

            {/* Image Preview */}
            {imagePreview && (
              <div className="uam-image-previews">
                <div className="uam-image-preview">
                  <img src={imagePreview} alt="Event cover preview" />
                  <button
                    type="button"
                    className="uam-image-remove"
                    onClick={() => { setImageFile(null); setImagePreview(""); }}
                    title="Remove image"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={submit} style={{ padding: isMobile ? '16px' : '20px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: '16px'
          }}>
            <div className="pvmField">
              <label className="museo-form-label">Title</label>
              <input className={`museo-input ${fieldErrors.title ? 'pe__input--error' : ''}`} name="title" value={form.title} onChange={update} required aria-invalid={!!fieldErrors.title} />
              {fieldErrors.title && <div className="pe__error">{fieldErrors.title}</div>}
            </div>
            
            <div className="pvmField">
              <label className="museo-form-label">Venue Name</label>
              <input className={`museo-input ${fieldErrors.venueName ? 'pe__input--error' : ''}`} name="venueName" value={form.venueName} onChange={update} required aria-invalid={!!fieldErrors.venueName} />
              {fieldErrors.venueName && <div className="pe__error">{fieldErrors.venueName}</div>}
            </div>
            <div className="pvmField">
              <label className="museo-form-label">Venue Address</label>
              <input className={`museo-input ${fieldErrors.venueAddress ? 'pe__input--error' : ''}`} name="venueAddress" value={form.venueAddress} onChange={update} required aria-invalid={!!fieldErrors.venueAddress} />
              {fieldErrors.venueAddress && <div className="pe__error">{fieldErrors.venueAddress}</div>}
            </div>
            <div className="pvmField">
              <label className="museo-form-label">Starts At</label>
              <input type="datetime-local" className={`museo-date-input ${fieldErrors.startsAt ? 'pe__input--error' : ''}`} name="startsAt" value={form.startsAt} onChange={update} required aria-invalid={!!fieldErrors.startsAt} />
              {fieldErrors.startsAt && <div className="pe__error">{fieldErrors.startsAt}</div>}
            </div>
            <div className="pvmField">
              <label className="museo-form-label">Ends At</label>
              <input type="datetime-local" className={`museo-date-input ${fieldErrors.endsAt ? 'pe__input--error' : ''}`} name="endsAt" value={form.endsAt} onChange={update} required aria-invalid={!!fieldErrors.endsAt} />
              {fieldErrors.endsAt && <div className="pe__error">{fieldErrors.endsAt}</div>}
            </div>
            <div className="pvmField pvmSpan2">
              <label className="museo-form-label">Details</label>
              <textarea className={`museo-input museo-textarea ${fieldErrors.details ? 'pe__input--error' : ''}`} name="details" rows={4} value={form.details} onChange={update} required aria-invalid={!!fieldErrors.details} />
              {fieldErrors.details && <div className="pe__error">{fieldErrors.details}</div>}
            </div>
            <div className="pvmField pvmSpan2">
              <label className="museo-form-label">Admission</label>
              <input className={`museo-input ${fieldErrors.admission ? 'pe__input--error' : ''}`} name="admission" value={form.admission} onChange={update} required aria-invalid={!!fieldErrors.admission} />
              {fieldErrors.admission && <div className="pe__error">{fieldErrors.admission}</div>}
            </div>
            <div className="pvmField pvmSpan2">
              <label className="museo-form-label">Admission Note</label>
              <input className={`museo-input ${fieldErrors.admissionNote ? 'pe__input--error' : ''}`} name="admissionNote" value={form.admissionNote} onChange={update} required aria-invalid={!!fieldErrors.admissionNote} />
              {fieldErrors.admissionNote && <div className="pe__error">{fieldErrors.admissionNote}</div>}
            </div>
            <div className="pvmField pvmSpan2">
              <label className="museo-form-label">Activities</label>
              <div className="pvmActivities">
                {activities.map((val, idx) => (
                  <div className="pvmActRow" key={idx}>
                    <input
                      className={`museo-input ${fieldErrors[`activity_${idx}`] ? 'pe__input--error' : ''}`}
                      value={val}
                      onChange={(e) => setActivity(idx, e.target.value)}
                      placeholder={`Activity ${idx + 1}`}
                      required
                      aria-invalid={!!fieldErrors[`activity_${idx}`]}
                    />
                    {fieldErrors[`activity_${idx}`] && <div className="pe__error">{fieldErrors[`activity_${idx}`]}</div>}
                    {activities.length > 1 && (
                      <button 
                        type="button" 
                        className="btn-x" 
                        onClick={() => removeActivity(idx)}
                        title="Remove activity"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-secondary btn-sm" onClick={addActivity}>Add Activity</button>
              </div>
              {fieldErrors.activities && <div className="pe__error">{fieldErrors.activities}</div>}
            </div>
          </div>

          <div className="pvmActions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>{submitting ? "Publishing..." : "Publish"}</button>
          </div>
        </form>
      </article>
    </div>
  );
}
