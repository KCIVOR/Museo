import { useEffect, useRef, useState } from "react";
import "./css/registerArtist.css";
const API = import.meta.env.VITE_API_BASE;


export default function RegisterArtist({ open, onClose, onSubmitted }) {
  const fileRef = useRef(null);
  const [previews, setPreviews] = useState([]); // array of object URLs
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    midInit: "",
    lastName: "",
    phone: "",
    age: "",
    sex: "",
    birthdate: "",
    address: "",
    portfolio: "", // optional link
    bio: "",       // optional short statement
    consent: false, // must be true to submit
    files: [] // up to 2 image files
  });
  const [fieldErrors, setFieldErrors] = useState({}); // { field: message }

  useEffect(() => {
    // build previews for selected files
    if (!form.files || form.files.length === 0) { setPreviews([]); return; }
    const urls = form.files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [form.files]);

  const onFiles = (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const imgs = Array.from(fileList).filter((f) => f.type?.startsWith("image/"));
    if (imgs.length === 0) { alert("Please select image file(s)."); return; }
    setForm((s) => {
      const current = s.files || [];
      const remaining = Math.max(0, 2 - current.length);
      const toAdd = imgs.slice(0, remaining);
      const next = [...current, ...toAdd].slice(0, 2);
      return { ...s, files: next };
    });
  };

  const onDrop = (e) => {
    e.preventDefault();
    const fl = e.dataTransfer?.files;
    onFiles(fl);
  };

  const removeImage = (index) => {
    setForm((s) => {
      const next = [...(s.files || [])];
      next.splice(index, 1);
      return { ...s, files: next };
    });
  };

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = "First name is required";
    if (!form.lastName.trim()) errs.lastName = "Last name is required";
    if (!form.phone.trim()) errs.phone = "Phone number is required";
    if (!String(form.age).trim()) errs.age = "Age is required";
    if (!form.sex) errs.sex = "Please select sex";
    if (!form.birthdate) errs.birthdate = "Birthdate is required";
    if (!form.address.trim()) errs.address = "Address is required";
    if (!form.consent) errs.consent = "You must agree to the consent";
    if (!form.files || form.files.length === 0) errs.files = "Please upload at least 1 image";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    try{
      if (isSubmitting) return;
      if (!validate()) return;
      setIsSubmitting(true)

      // Build multipart form data to match multer backend
      const fd = new FormData();
      fd.append("requestType", "artist_verification");
      fd.append("firstName", form.firstName);
      fd.append("midInit", form.midInit);
      fd.append("lastName", form.lastName);
      fd.append("phone", form.phone);
      fd.append("age", form.age);
      fd.append("sex", form.sex);
      fd.append("birthdate", form.birthdate);
      fd.append("address", form.address);
      if (form.portfolio) fd.append("portfolio", form.portfolio);
      if (form.bio) fd.append("bio", form.bio);
      fd.append("consent", String(!!form.consent));
      if (form.files?.[0]) fd.append("file", form.files[0]);
      if (form.files?.[1]) fd.append("file2", form.files[1]);

      const res = await fetch(`${API}/request/registerAsArtist`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });

      if (!res.ok) throw new Error("requesting error"); 
      const dataResp = await res.json().catch(() => null);
      console.log(dataResp);
      onSubmitted?.(dataResp);
      onClose?.();



    }catch(err){
      console.log(err)
    }finally{
      setIsSubmitting(false)
    }
    
    
  };

  if (!open) return null;

  return (
    <div className="pe__scrim" onClick={onClose}>
      <section
        className="pe__dialog raDialog"
        role="dialog"
        aria-label="Register as Artist"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="pe__header">
          <h3 className="pe__title">Apply as Artist</h3>
          <p className="pe__subtitle">Provide your details and a valid ID with selfie</p>
        </header>

        <div className="raScroll">
          <form className="raForm" onSubmit={submit}>
          <label className="raLabel">First name:</label>
          <input
            className={`raInput ${fieldErrors.firstName ? 'raInput--error' : ''}`}
            type="text"
            value={form.firstName}
            onChange={(e) => setForm((s) => ({ ...s, firstName: e.target.value }))}
            required
          />
          {fieldErrors.firstName && <div className="raFieldError">{fieldErrors.firstName}</div>}

          <label className="raLabel">Middle initial:</label>
          <input
            className="raInput"
            type="text"
            maxLength={2}
            value={form.midInit}
            onChange={(e) => setForm((s) => ({ ...s, midInit: e.target.value }))}
          />

          <label className="raLabel">Last Name:</label>
          <input
            className={`raInput ${fieldErrors.lastName ? 'raInput--error' : ''}`}
            type="text"
            value={form.lastName}
            onChange={(e) => setForm((s) => ({ ...s, lastName: e.target.value }))}
            required
          />
          {fieldErrors.lastName && <div className="raFieldError">{fieldErrors.lastName}</div>}

          <label className="raLabel">Phone Number:</label>
          <input
            className={`raInput ${fieldErrors.phone ? 'raInput--error' : ''}`}
            type="tel"
            inputMode="tel"
            placeholder="+63 ..."
            value={form.phone}
            onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
            required
          />
          {fieldErrors.phone && <div className="raFieldError">{fieldErrors.phone}</div>}

          {/* Fixed: Age + Sex under one label */}
          <label className="raLabel">Age & Sex:</label>
          <div className="raRow">
            <div className="raCol">
              <label>Age</label>
              <input
                className={`raInput ${fieldErrors.age ? 'raInput--error' : ''}`}
                type="number"
                min="13"
                max="120"
                value={form.age}
                onChange={(e) => setForm((s) => ({ ...s, age: e.target.value }))}
                required
                placeholder="Age"
              />
              {fieldErrors.age && <div className="raFieldError">{fieldErrors.age}</div>}
            </div>
            <div className="raCol">
              <label>Sex</label>
              <select
                className={`raInput ${fieldErrors.sex ? 'raInput--error' : ''}`}
                value={form.sex}
                onChange={(e) => setForm((s) => ({ ...s, sex: e.target.value }))}
                required
              >
                <option value="">Select…</option>
                <option>Female</option>
                <option>Male</option>
                <option>Prefer not to say</option>
                <option>Other</option>
              </select>
              {fieldErrors.sex && <div className="raFieldError">{fieldErrors.sex}</div>}
            </div>
          </div>

          <label className="raLabel">Birthdate:</label>
          <input
            className={`raInput ${fieldErrors.birthdate ? 'raInput--error' : ''}`}
            type="date"
            value={form.birthdate}
            onChange={(e) => setForm((s) => ({ ...s, birthdate: e.target.value }))}
            required
          />
          {fieldErrors.birthdate && <div className="raFieldError">{fieldErrors.birthdate}</div>}

          <label className="raLabel">Address:</label>
          <input
            className={`raInput ${fieldErrors.address ? 'raInput--error' : ''}`}
            type="text"
            placeholder="House/Street, Barangay, City, Province, ZIP"
            value={form.address}
            onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
            required
          />
          {fieldErrors.address && <div className="raFieldError">{fieldErrors.address}</div>}

          <label className="raLabel">Valid ID & Selfie (up to 2 images):</label>
          <div
            className={`raDrop ${previews.length ? "raDrop--has" : ""} ${isDragging ? "raDrop--active" : ""}`}
            onDrop={(e)=>{ onDrop(e); setIsDragging(false); }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
          >
            {previews.length ? (
              <div className={`raPreviewGrid ${previews.length > 1 ? 'raPreviewGrid--two' : ''}`}>
                {previews.map((src, idx) => (
                  <div key={idx} className="raPreviewItem">
                    <img src={src} alt="" className="raPreview" />
                    <button
                      type="button"
                      aria-label="Remove image"
                      className="raRemoveBtn"
                      onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="raDropInner">
                <div className="raCloud">☁️</div>
                <div className="raDropText">Upload up to 2 Images</div>
                <div className="raDropHint">Click or drag & drop</div>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => onFiles(e.target.files)}
              hidden
            />
          </div>
          {fieldErrors.files && (
            <div className="raFieldError" style={{ gridColumn: '2 / 3' }}>{fieldErrors.files}</div>
          )}

          {/* Optional: Portfolio link */}
          <label className="raLabel">Portfolio link (optional):</label>
          <input
            className="raInput"
            type="url"
            placeholder="https://yourportfolio.com or social profile"
            value={form.portfolio}
            onChange={(e) => setForm((s) => ({ ...s, portfolio: e.target.value }))}
          />

          {/* Optional: Short artist statement */}
          <label className="raLabel">Artist statement (optional):</label>
          <textarea
            className="raInput"
            rows={3}
            placeholder="Briefly describe your art or links reviewers should check"
            value={form.bio}
            onChange={(e) => setForm((s) => ({ ...s, bio: e.target.value }))}
          />

          {/* Consent */}
          <div className="raLabel" aria-hidden="true"></div>
          <label className="pe__label" style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(e) => setForm((s) => ({ ...s, consent: e.target.checked }))}
              style={{ marginTop: 3 }}
              required
            />
            <span style={{ fontSize: 14 }}>
              I consent to Museo reviewing and storing the submitted documents for the purpose of artist verification.
            </span>
          </label>
          {fieldErrors.consent && (
            <div className="raFieldError" style={{ gridColumn: '2 / 3' }}>{fieldErrors.consent}</div>
          )}

          </form>
        </div>

        <footer className="pe__footer">
          <button type="button" className="pe__btn" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button form="" type="submit" className="pe__btn pe__btn--primary" disabled={isSubmitting} onClick={(e)=>{ e.preventDefault(); const f = e.currentTarget.closest('section')?.querySelector('form'); f?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); }}>
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </footer>
      </section>
    </div>
  );
}

