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
    <div className="museo-modal-overlay ra-overlay" onClick={onClose}>
      <div className="museo-modal ra-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ra-header">
          <div className="ra-header-content">
            <h2 className="ra-title">Apply as Artist</h2>
            <p className="ra-subtitle">Provide your details and a valid ID with selfie</p>
          </div>
          <button className="ra-close" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {/* Form */}
        <form className="ra-form" onSubmit={submit}>
          <div className="ra-content">
            {/* Personal Information Section */}
            <div className="ra-section">
              <h3 className="ra-section-title">Personal Information</h3>
              
              <div className="ra-row">
                <div className="ra-field">
                  <label className="ra-label">First Name *</label>
                  <input
                    className={`ra-input ${fieldErrors.firstName ? 'ra-input--error' : ''}`}
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm((s) => ({ ...s, firstName: e.target.value }))}
                    required
                  />
                  {fieldErrors.firstName && <div className="ra-error">{fieldErrors.firstName}</div>}
                </div>
                
                <div className="ra-field">
                  <label className="ra-label">Middle Initial</label>
                  <input
                    className="ra-input"
                    type="text"
                    maxLength={2}
                    value={form.midInit}
                    onChange={(e) => setForm((s) => ({ ...s, midInit: e.target.value }))}
                  />
                </div>
              </div>

              
              <div className="ra-field">
                <label className="ra-label">Last Name *</label>
                <input
                  className={`ra-input ${fieldErrors.lastName ? 'ra-input--error' : ''}`}
                  type="text"
                  value={form.lastName}
                  onChange={(e) => setForm((s) => ({ ...s, lastName: e.target.value }))}
                  required
                />
                {fieldErrors.lastName && <div className="ra-error">{fieldErrors.lastName}</div>}
              </div>

              
              <div className="ra-field">
                <label className="ra-label">Phone Number *</label>
                <input
                  className={`ra-input ${fieldErrors.phone ? 'ra-input--error' : ''}`}
                  type="tel"
                  inputMode="tel"
                  placeholder="+63 ..."
                  value={form.phone}
                  onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                  required
                />
                {fieldErrors.phone && <div className="ra-error">{fieldErrors.phone}</div>}
              </div>

              
              <div className="ra-row">
                <div className="ra-field">
                  <label className="ra-label">Age *</label>
                  <input
                    className={`ra-input ${fieldErrors.age ? 'ra-input--error' : ''}`}
                    type="number"
                    min="13"
                    max="120"
                    value={form.age}
                    onChange={(e) => setForm((s) => ({ ...s, age: e.target.value }))}
                    required
                    placeholder="Age"
                  />
                  {fieldErrors.age && <div className="ra-error">{fieldErrors.age}</div>}
                </div>
                
                <div className="ra-field">
                  <label className="ra-label">Sex *</label>
                  <select
                    className={`ra-input ${fieldErrors.sex ? 'ra-input--error' : ''}`}
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
                  {fieldErrors.sex && <div className="ra-error">{fieldErrors.sex}</div>}
                </div>
              </div>

              
              <div className="ra-field">
                <label className="ra-label">Birthdate *</label>
                <input
                  className={`ra-input ${fieldErrors.birthdate ? 'ra-input--error' : ''}`}
                  type="date"
                  value={form.birthdate}
                  onChange={(e) => setForm((s) => ({ ...s, birthdate: e.target.value }))}
                  required
                />
                {fieldErrors.birthdate && <div className="ra-error">{fieldErrors.birthdate}</div>}
              </div>

              
              <div className="ra-field">
                <label className="ra-label">Address *</label>
                <input
                  className={`ra-input ${fieldErrors.address ? 'ra-input--error' : ''}`}
                  type="text"
                  placeholder="House/Street, Barangay, City, Province, ZIP"
                  value={form.address}
                  onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
                  required
                />
                {fieldErrors.address && <div className="ra-error">{fieldErrors.address}</div>}
              </div>
            </div>

            
            {/* Document Upload Section */}
            <div className="ra-section">
              <h3 className="ra-section-title">Identity Verification</h3>
              
              <div className="ra-field">
                <label className="ra-label">Valid ID & Selfie (up to 2 images) *</label>
                
                <div 
                  className={`ra-dropzone ${isDragging ? 'ra-dropzone--active' : ''} ${previews.length > 0 ? 'ra-dropzone--has-files' : ''} ${fieldErrors.files ? 'ra-dropzone--error' : ''}`}
                  onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDrop={(e) => { onDrop(e); setIsDragging(false); }}
                >
                  <div className="ra-dropzone-content">
                    <div className="ra-dropzone-text">
                      <strong>Drop your ID & selfie here</strong> or click to browse
                    </div>
                    <div className="ra-dropzone-hint">
                      Support: JPG, PNG up to 10MB • Maximum 2 images • Valid ID + Selfie required
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      multiple
                      onChange={(e) => onFiles(e.target.files)}
                      className="ra-file-input"
                    />
                  </div>
                </div>

                {fieldErrors.files && <div className="ra-error">{fieldErrors.files}</div>}

                {/* Image Previews */}
                {previews.length > 0 && (
                  <div className="ra-image-previews">
                    {previews.map((src, idx) => (
                      <div key={idx} className="ra-image-preview">
                        <img src={src} alt="Preview" />
                        <button
                          type="button"
                          className="ra-image-remove"
                          onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                          title="Remove image"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            
            {/* Optional Information Section */}
            <div className="ra-section">
              <h3 className="ra-section-title">Additional Information (Optional)</h3>
              
              <div className="ra-field">
                <label className="ra-label">Portfolio Link</label>
                <input
                  className="ra-input"
                  type="url"
                  placeholder="https://yourportfolio.com or social profile"
                  value={form.portfolio}
                  onChange={(e) => setForm((s) => ({ ...s, portfolio: e.target.value }))}
                />
              </div>
              
              <div className="ra-field">
                <label className="ra-label">Artist Statement</label>
                <textarea
                  className="ra-input ra-textarea"
                  rows={3}
                  placeholder="Briefly describe your art or links reviewers should check"
                  value={form.bio}
                  onChange={(e) => setForm((s) => ({ ...s, bio: e.target.value }))}
                />
              </div>
            </div>

            
            <div className="ra-consent-container"><label className="ra-consent-label"><input type="checkbox" className="ra-checkbox" checked={form.consent} onChange={(e) => setForm((s) => ({ ...s, consent: e.target.checked }))} required /> I consent to Museo reviewing and storing the submitted documents for the purpose of artist verification.</label>{fieldErrors.consent && <div className="ra-error">{fieldErrors.consent}</div>}</div>
          </div>
          
          {/* Footer */}
          <div className="ra-footer">
            <div className="ra-actions">
              <button type="button" className="ra-btn ra-btn--secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="ra-btn ra-btn--primary" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

