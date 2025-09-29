import React, { useEffect, useState } from "react";

// A lightweight modal-style uploader similar in UX to SetProfile
// Props:
// - open: boolean
// - onClose: () => void
// - onUploaded?: (art) => void  // optional callback with created art row
export default function UploadArt({ open, onClose, onUploaded }) {
  const [image, setImage] = useState(null); // { file, url }
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [medium, setMedium] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setImage(null);
    setTitle("");
    setDescription("");
    setMedium("");
    setErrors({});
  }, [open]);

  const pickImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      const url = URL.createObjectURL(f);
      setImage({ file: f, url });
    };
    input.click();
  };

  const validate = () => {
    const v = {};
    if (!image?.file) v.image = "Image is required";
    if (!title.trim()) v.title = "Title is required";
    if (!description.trim()) v.description = "Description is required";
    if (!medium.trim()) v.medium = "Medium is required";
    setErrors(v);
    return Object.keys(v).length === 0;
  };

  const submit = async () => {
    if (submitting) return;
    if (!validate()) return;
    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append("image", image.file);
      fd.append("title", title);
      fd.append("description", description);
      fd.append("medium", medium);

      const res = await fetch("http://localhost:3000/api/profile/uploadArt", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || "Failed to upload");
      }
      const data = await res.json();
      onUploaded?.(data.art);
      onClose?.();
    } catch (err) {
      alert(err.message || "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="pe__scrim" onClick={onClose}>
      <section
        className="pe__dialog"
        role="dialog"
        aria-label="Upload artwork"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="pe__header">
          <h3 className="pe__title">Upload Artwork</h3>
          <p className="pe__subtitle">Add your image, title, description, and medium</p>
        </header>

        {/* Match SetProfile: full-width cover preview placed before form body */}
        <div className="pe__coverBox">
          {image ? (
            <img className="pe__coverImg" src={image.url} alt="" onError={(e) => { e.currentTarget.src = ""; }} />
          ) : (
            <div className="pe__coverEmpty">Artwork image</div>
          )}
          <button type="button" className="pe__coverBtn" onClick={pickImage}>
            Choose image
          </button>
          {errors.image && <div className="pe__error" style={{ marginTop: 6 }}>{errors.image}</div>}
        </div>

        <div className="pe__body" style={{ gridTemplateColumns: '1fr' }}>
          <div className="pe__form">
            <label className="pe__label">
              Title *
              <input
                type="text"
                className={`pe__input ${errors.title ? 'pe__input--error' : ''}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Artwork title"
              />
              {errors.title && <span className="pe__error">{errors.title}</span>}
            </label>

            <label className="pe__label">
              Description *
              <textarea
                className={`pe__input pe__input--area ${
                  errors.description ? "pe__input--error" : ""
                }`}
                placeholder="Describe your artwork…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
              {errors.description && (
                <span className="pe__error">{errors.description}</span>
              )}
            </label>

            <label className="pe__label">
              Medium *
              <input
                type="text"
                className={`pe__input ${errors.medium ? "pe__input--error" : ""}`}
                value={medium}
                onChange={(e) => setMedium(e.target.value)}
                placeholder="e.g., Oil on canvas, Digital, Watercolor"
              />
              {errors.medium && (
                <span className="pe__error">{errors.medium}</span>
              )}
            </label>
          </div>
        </div>

        <footer className="pe__footer">
          <button className="pe__btn" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            className="pe__btn pe__btn--primary"
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? "Uploading..." : "Upload"}
          </button>
        </footer>
      </section>
    </div>
  );
}
