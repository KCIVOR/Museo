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

  const onPickFile = (e) => {
    const file = e.target.files?.[0];
    setImageFile(file || null);
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview("");
    }
  };
  const onDropFile = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
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
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'var(--museo-ivory)',
            border: '2px solid var(--museo-border)',
            borderRadius: '8px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '14px',
            color: 'var(--museo-charcoal)',
            zIndex: 10,
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'var(--museo-cream)';
            e.target.style.borderColor = 'var(--museo-gold)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'var(--museo-ivory)';
            e.target.style.borderColor = 'var(--museo-border)';
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
          <div
            style={{
              border: '2px dashed var(--museo-border)',
              borderRadius: '12px',
              padding: imagePreview ? '0' : '40px 20px',
              textAlign: 'center',
              cursor: !imagePreview ? 'pointer' : 'default',
              transition: 'all 0.3s ease',
              background: imagePreview ? 'transparent' : 'var(--museo-cream)',
              position: 'relative',
              minHeight: isMobile ? '200px' : '250px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDropFile}
            onClick={!imagePreview ? openPicker : undefined}
          >
            {imagePreview ? (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <img 
                  src={imagePreview} 
                  alt="preview" 
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '10px'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  display: 'flex',
                  gap: '8px'
                }}>
                  <button 
                    type="button" 
                    onClick={openPicker}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '2px solid var(--museo-border)',
                      background: 'var(--museo-ivory)',
                      color: 'var(--museo-charcoal)',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(""); }}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      border: '2px solid var(--museo-border)',
                      background: 'var(--museo-ivory)',
                      color: 'var(--museo-charcoal)',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{
                  fontSize: '48px',
                  marginBottom: '12px',
                  opacity: 0.6
                }}>
                  📷
                </div>
                <div style={{
                  fontSize: '16px',
                  color: 'var(--museo-navy)',
                  fontWeight: '500'
                }}>
                  Event Cover — drag & drop or click
                </div>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickFile} hidden />
          </div>
        </div>

        <form onSubmit={submit} style={{ padding: isMobile ? '16px' : '20px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: '16px'
          }}>
            <div className="pvmField">
              <label className="pvmLabel">Title</label>
              <input className={`pvmInput ${fieldErrors.title ? 'pvmInputErr' : ''}`} name="title" value={form.title} onChange={update} required aria-invalid={!!fieldErrors.title} />
              {fieldErrors.title && <div className="pvmFieldError">{fieldErrors.title}</div>}
            </div>
            
            <div className="pvmField">
              <label className="pvmLabel">Venue Name</label>
              <input className={`pvmInput ${fieldErrors.venueName ? 'pvmInputErr' : ''}`} name="venueName" value={form.venueName} onChange={update} required aria-invalid={!!fieldErrors.venueName} />
              {fieldErrors.venueName && <div className="pvmFieldError">{fieldErrors.venueName}</div>}
            </div>
            <div className="pvmField">
              <label className="pvmLabel">Venue Address</label>
              <input className={`pvmInput ${fieldErrors.venueAddress ? 'pvmInputErr' : ''}`} name="venueAddress" value={form.venueAddress} onChange={update} required aria-invalid={!!fieldErrors.venueAddress} />
              {fieldErrors.venueAddress && <div className="pvmFieldError">{fieldErrors.venueAddress}</div>}
            </div>
            <div className="pvmField">
              <label className="pvmLabel">Starts At</label>
              <input type="datetime-local" className={`pvmInput ${fieldErrors.startsAt ? 'pvmInputErr' : ''}`} name="startsAt" value={form.startsAt} onChange={update} required aria-invalid={!!fieldErrors.startsAt} />
              {fieldErrors.startsAt && <div className="pvmFieldError">{fieldErrors.startsAt}</div>}
            </div>
            <div className="pvmField">
              <label className="pvmLabel">Ends At</label>
              <input type="datetime-local" className={`pvmInput ${fieldErrors.endsAt ? 'pvmInputErr' : ''}`} name="endsAt" value={form.endsAt} onChange={update} required aria-invalid={!!fieldErrors.endsAt} />
              {fieldErrors.endsAt && <div className="pvmFieldError">{fieldErrors.endsAt}</div>}
            </div>
            <div className="pvmField pvmSpan2">
              <label className="pvmLabel">Details</label>
              <textarea className={`pvmInput ${fieldErrors.details ? 'pvmInputErr' : ''}`} name="details" rows={4} value={form.details} onChange={update} required aria-invalid={!!fieldErrors.details} />
              {fieldErrors.details && <div className="pvmFieldError">{fieldErrors.details}</div>}
            </div>
            <div className="pvmField pvmSpan2">
              <label className="pvmLabel">Admission</label>
              <input className={`pvmInput ${fieldErrors.admission ? 'pvmInputErr' : ''}`} name="admission" value={form.admission} onChange={update} required aria-invalid={!!fieldErrors.admission} />
              {fieldErrors.admission && <div className="pvmFieldError">{fieldErrors.admission}</div>}
            </div>
            <div className="pvmField pvmSpan2">
              <label className="pvmLabel">Admission Note</label>
              <input className={`pvmInput ${fieldErrors.admissionNote ? 'pvmInputErr' : ''}`} name="admissionNote" value={form.admissionNote} onChange={update} required aria-invalid={!!fieldErrors.admissionNote} />
              {fieldErrors.admissionNote && <div className="pvmFieldError">{fieldErrors.admissionNote}</div>}
            </div>
            <div className="pvmField pvmSpan2">
              <label className="pvmLabel">Activities</label>
              <div className="pvmActivities">
                {activities.map((val, idx) => (
                  <div className="pvmActRow" key={idx}>
                    <input
                      className={`pvmInput ${fieldErrors[`activity_${idx}`] ? 'pvmInputErr' : ''}`}
                      value={val}
                      onChange={(e) => setActivity(idx, e.target.value)}
                      placeholder={`Activity ${idx + 1}`}
                      required
                      aria-invalid={!!fieldErrors[`activity_${idx}`]}
                    />
                    {fieldErrors[`activity_${idx}`] && <div className="pvmFieldError">{fieldErrors[`activity_${idx}`]}</div>}
                    {activities.length > 1 && (
                      <button type="button" className="pvmIconBtn" onClick={() => removeActivity(idx)}>✕</button>
                    )}
                  </div>
                ))}
                <button type="button" className="evmGhostBtn" onClick={addActivity}>Add Activity</button>
              </div>
              {fieldErrors.activities && <div className="pvmFieldError">{fieldErrors.activities}</div>}
            </div>
          </div>

          <div className="pvmActions">
            <button type="button" className="evmGhostBtn" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="evmCalBtn" disabled={submitting}>{submitting ? "Publishing..." : "Publish"}</button>
          </div>
        </form>
      </article>
    </div>
  );
}
