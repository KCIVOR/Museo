import { useEffect, useRef, useState } from "react";
import "./css/registerArtist.css";

export default function RegisterArtist() {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    midInit: "",
    lastName: "",
    phone: "",
    age: "",
    sex: "",
    birthdate: "",
    address: "",
    file: null
  });

  useEffect(() => {
    if (!form.file) return setPreview("");
    const url = URL.createObjectURL(form.file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [form.file]);

  const onFile = (f) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return alert("Please select an image file.");
    setForm((s) => ({ ...s, file: f }));
  };

  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    onFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    // TODO: send to backend (form + file)
    console.log("Artist application:", form);
    alert("Submitted (demo). Hook this to your backend.");
  };

  return (
    <div className="raPage">
      <div className="raCard">
        <header className="raHead">
          <h1 className="raTitle">Register as Artist</h1>
        </header>

        <form className="raForm" onSubmit={submit}>
          <label className="raLabel">First name:</label>
          <input
            className="raInput"
            type="text"
            value={form.firstName}
            onChange={(e) => setForm((s) => ({ ...s, firstName: e.target.value }))}
            required
          />

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
            className="raInput"
            type="text"
            value={form.lastName}
            onChange={(e) => setForm((s) => ({ ...s, lastName: e.target.value }))}
            required
          />

          <label className="raLabel">Phone Number:</label>
          <input
            className="raInput"
            type="tel"
            inputMode="tel"
            placeholder="+63 ..."
            value={form.phone}
            onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
            required
          />

          {/* Fixed: Age + Sex under one label */}
          <label className="raLabel">Age & Sex:</label>
          <div className="raRow">
            <div className="raCol">
              <label>Age</label>
              <input
                className="raInput"
                type="number"
                min="13"
                max="120"
                value={form.age}
                onChange={(e) => setForm((s) => ({ ...s, age: e.target.value }))}
                required
                placeholder="Age"
              />
            </div>
            <div className="raCol">
              <label>Sex</label>
              <select
                className="raInput"
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
            </div>
          </div>

          <label className="raLabel">Birthdate:</label>
          <input
            className="raInput"
            type="date"
            value={form.birthdate}
            onChange={(e) => setForm((s) => ({ ...s, birthdate: e.target.value }))}
            required
          />

          <label className="raLabel">Address:</label>
          <input
            className="raInput"
            type="text"
            placeholder="House/Street, Barangay, City, Province, ZIP"
            value={form.address}
            onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
            required
          />

          <label className="raLabel">Valid ID & Selfie:</label>
          <div
            className={`raDrop ${preview ? "raDrop--has" : ""}`}
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
          >
            {preview ? (
              <img src={preview} alt="" className="raPreview" />
            ) : (
              <div className="raDropInner">
                <div className="raCloud">☁️</div>
                <div className="raDropText">Upload Image</div>
                <div className="raDropHint">Click or drag & drop</div>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={(e) => onFile(e.target.files?.[0])}
              hidden
            />
          </div>

          <div className="raActions">
            <button type="submit" className="raBtn raBtn--primary">Submit</button>
          </div>
        </form>
      </div>
    </div>
  );
}
