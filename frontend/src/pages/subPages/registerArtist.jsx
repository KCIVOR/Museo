import { useState } from "react";
import ImageUploadZone from "../../components/modal-features/ImageUploadZone";
import "./css/registerArtist.css";
const API = import.meta.env.VITE_API_BASE;


export default function RegisterArtist({ open, onClose, onSubmitted }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  });
  const [images, setImages] = useState([]); // up to 2 image files
  const [fieldErrors, setFieldErrors] = useState({}); // { field: message }


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
    if (!images || images.length === 0) errs.files = "Please upload at least 1 image";
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
      if (images?.[0]?.file) fd.append("file", images[0].file);
      if (images?.[1]?.file) fd.append("file2", images[1].file);

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
    <div className="museo-modal-overlay" onClick={onClose}>
      <div className="museo-modal museo-modal--lg ra-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="museo-modal-header">
          <div>
            <h2 className="museo-modal-title">Apply as Artist</h2>
            <p className="museo-modal-subtitle">Provide your details and a valid ID with selfie</p>
          </div>
          <button className="museo-modal-close" onClick={onClose} title="Close">
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
                  <label className="museo-label museo-label--required">First Name</label>
                  <input
                    className={`museo-input ${fieldErrors.firstName ? 'museo-input--error' : ''}`}
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm((s) => ({ ...s, firstName: e.target.value }))}
                    required
                  />
                  {fieldErrors.firstName && <div className="museo-form-error">{fieldErrors.firstName}</div>}
                </div>
                
                <div className="ra-field">
                  <label className="museo-label">Middle Initial</label>
                  <input
                    className="museo-input"
                    type="text"
                    maxLength={2}
                    value={form.midInit}
                    onChange={(e) => setForm((s) => ({ ...s, midInit: e.target.value }))}
                  />
                </div>
              </div>

              
              <div className="ra-field">
                <label className="museo-label museo-label--required">Last Name</label>
                <input
                  className={`museo-input ${fieldErrors.lastName ? 'museo-input--error' : ''}`}
                  type="text"
                  value={form.lastName}
                  onChange={(e) => setForm((s) => ({ ...s, lastName: e.target.value }))}
                  required
                />
                {fieldErrors.lastName && <div className="museo-form-error">{fieldErrors.lastName}</div>}
              </div>

              
              <div className="ra-field">
                <label className="museo-label museo-label--required">Phone Number</label>
                <input
                  className={`museo-input ${fieldErrors.phone ? 'museo-input--error' : ''}`}
                  type="tel"
                  inputMode="tel"
                  placeholder="+63 ..."
                  value={form.phone}
                  onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                  required
                />
                {fieldErrors.phone && <div className="museo-form-error">{fieldErrors.phone}</div>}
              </div>

              
              <div className="ra-row">
                <div className="ra-field">
                  <label className="museo-label museo-label--required">Age</label>
                  <input
                    className={`museo-input ${fieldErrors.age ? 'museo-input--error' : ''}`}
                    type="number"
                    min="13"
                    max="120"
                    value={form.age}
                    onChange={(e) => setForm((s) => ({ ...s, age: e.target.value }))}
                    required
                    placeholder="Age"
                  />
                  {fieldErrors.age && <div className="museo-form-error">{fieldErrors.age}</div>}
                </div>
                
                <div className="ra-field">
                  <label className="museo-label museo-label--required">Sex</label>
                  <select
                    className={`museo-select ${fieldErrors.sex ? 'museo-select--error' : ''}`}
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
                  {fieldErrors.sex && <div className="museo-form-error">{fieldErrors.sex}</div>}
                </div>
              </div>

              
              <div className="ra-field">
                <label className="museo-label museo-label--required">Birthdate</label>
                <input
                  className={`museo-date-input ${fieldErrors.birthdate ? 'museo-input--error' : ''}`}
                  type="date"
                  value={form.birthdate}
                  onChange={(e) => setForm((s) => ({ ...s, birthdate: e.target.value }))}
                  required
                />
                {fieldErrors.birthdate && <div className="museo-form-error">{fieldErrors.birthdate}</div>}
              </div>

              
              <div className="ra-field">
                <label className="museo-label museo-label--required">Address</label>
                <input
                  className={`museo-input ${fieldErrors.address ? 'museo-input--error' : ''}`}
                  type="text"
                  placeholder="House/Street, Barangay, City, Province, ZIP"
                  value={form.address}
                  onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
                  required
                />
                {fieldErrors.address && <div className="museo-form-error">{fieldErrors.address}</div>}
              </div>
            </div>

            
            {/* Document Upload Section */}
            <div className="ra-section">
              <h3 className="ra-section-title">Identity Verification</h3>
              
              <ImageUploadZone
                type="multiple"
                maxFiles={2}
                maxSize={10}
                title="Valid ID & Selfie"
                hint="Support: JPG, PNG up to 10MB • Maximum 2 images • Valid ID + Selfie required"
                value={images}
                onChange={setImages}
                error={fieldErrors.files}
              />
            </div>

            
            {/* Optional Information Section */}
            <div className="ra-section">
              <h3 className="ra-section-title">Additional Information (Optional)</h3>
              
              <div className="ra-field">
                <label className="museo-label">Portfolio Link</label>
                <input
                  className="museo-input"
                  type="url"
                  placeholder="https://yourportfolio.com or social profile"
                  value={form.portfolio}
                  onChange={(e) => setForm((s) => ({ ...s, portfolio: e.target.value }))}
                />
              </div>
              
              <div className="ra-field">
                <label className="museo-label">Artist Statement</label>
                <textarea
                  className="museo-textarea"
                  rows={3}
                  placeholder="Briefly describe your art or links reviewers should check"
                  value={form.bio}
                  onChange={(e) => setForm((s) => ({ ...s, bio: e.target.value }))}
                />
              </div>
            </div>

            
            <div className="ra-consent-container"><label className="ra-consent-label"><input type="checkbox" className="museo-checkbox" checked={form.consent} onChange={(e) => setForm((s) => ({ ...s, consent: e.target.checked }))} required /> I consent to Museo reviewing and storing the submitted documents for the purpose of artist verification.</label>{fieldErrors.consent && <div className="museo-form-error">{fieldErrors.consent}</div>}</div>
          </div>
          
          {/* Footer */}
          <div className="ra-footer">
            <div className="ra-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

