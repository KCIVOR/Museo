# 🎨 Museo Modal Features - Usage Guide

Reusable components for all modals in the Museo application.

## 📦 Components

### 1. ImageUploadZone
Unified image upload component supporting:
- Single image upload
- Multiple image upload (up to 5)
- Cover photo upload
- Avatar upload

### 2. CategorySelector
Art category multi-select component with 15 predefined categories.

---

## 🚀 Usage Examples

### Example 1: UploadArtModal (Multiple Images + Categories)

```jsx
import MuseoModal, { MuseoModalBody, MuseoModalActions } from "../components/MuseoModal";
import ImageUploadZone from "../components/modal-features/ImageUploadZone";
import CategorySelector from "../components/modal-features/CategorySelector";

export default function UploadArtModal({ open, onClose }) {
  const [images, setImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", medium: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("medium", form.medium);
      formData.append("categories", JSON.stringify(categories));
      images.forEach(img => formData.append("images", img.file));
      
      const res = await fetch(`${API}/artwork/upload`, {
        method: "POST",
        credentials: "include",
        body: formData
      });
      
      if (!res.ok) throw new Error("Upload failed");
      
      onClose();
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MuseoModal
      open={open}
      onClose={onClose}
      title="Upload Artwork"
      subtitle="Share your masterpiece with the Museo community"
      size="lg"
    >
      <MuseoModalBody>
        <form onSubmit={handleSubmit}>
          {/* Multiple Image Upload */}
          <ImageUploadZone
            type="multiple"
            maxFiles={5}
            title="Artwork Images"
            value={images}
            onChange={setImages}
            error={errors.images}
          />
          
          {/* Form Fields */}
          <div className="museo-form-grid">
            <div className="museo-form-field">
              <label className="museo-label">Title *</label>
              <input
                className="museo-input"
                value={form.title}
                onChange={(e) => setForm({...form, title: e.target.value})}
              />
            </div>
            
            <div className="museo-form-field">
              <label className="museo-label">Medium *</label>
              <input
                className="museo-input"
                value={form.medium}
                onChange={(e) => setForm({...form, medium: e.target.value})}
              />
            </div>
            
            <div className="museo-form-field museo-form-field--full">
              <label className="museo-label">Description</label>
              <textarea
                className="museo-textarea"
                rows={4}
                value={form.description}
                onChange={(e) => setForm({...form, description: e.target.value})}
              />
            </div>
          </div>
          
          {/* Category Selector */}
          <CategorySelector
            selected={categories}
            onChange={setCategories}
            error={errors.categories}
          />
          
          {/* Submit */}
          <MuseoModalActions>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Uploading..." : "Share Artwork"}
            </button>
          </MuseoModalActions>
        </form>
      </MuseoModalBody>
    </MuseoModal>
  );
}
```

---

### Example 2: PublishEventModal (Single Image)

```jsx
export default function PublishEventModal({ open, onClose, mode, initialData }) {
  const [coverImage, setCoverImage] = useState(null);
  const [form, setForm] = useState({ title: "", venue: "", details: "" });

  return (
    <MuseoModal
      open={open}
      onClose={onClose}
      title={mode === "edit" ? "Edit Event" : "Publish Event"}
      size="lg"
    >
      <MuseoModalBody>
        <form onSubmit={handleSubmit}>
          {/* Single Image Upload */}
          <ImageUploadZone
            type="single"
            title="Event Cover Image"
            value={coverImage}
            onChange={setCoverImage}
            error={errors.image}
          />
          
          {/* Form fields... */}
          
          <MuseoModalActions>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {mode === "edit" ? "Update Event" : "Publish Event"}
            </button>
          </MuseoModalActions>
        </form>
      </MuseoModalBody>
    </MuseoModal>
  );
}
```

---

### Example 3: EditProfileModal (Cover + Avatar)

```jsx
export default function EditProfileModal({ open, onClose, initial }) {
  const [cover, setCover] = useState(initial?.cover || null);
  const [avatar, setAvatar] = useState(initial?.avatar || null);
  const [form, setForm] = useState({ bio: "", about: "" });

  return (
    <MuseoModal
      open={open}
      onClose={onClose}
      title="Edit Profile"
      size="md"
    >
      <MuseoModalBody>
        <form onSubmit={handleSubmit}>
          {/* Cover Photo */}
          <ImageUploadZone
            type="cover"
            title="Cover Photo"
            value={cover}
            onChange={setCover}
          />
          
          {/* Avatar */}
          <ImageUploadZone
            type="avatar"
            title="Profile Picture"
            value={avatar}
            onChange={setAvatar}
          />
          
          {/* Form fields... */}
          
          <MuseoModalActions>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Profile
            </button>
          </MuseoModalActions>
        </form>
      </MuseoModalBody>
    </MuseoModal>
  );
}
```

---

### Example 4: EditPostModal (Multiple Images, No Categories)

```jsx
export default function EditPostModal({ open, onClose, post }) {
  const [images, setImages] = useState(post?.images || []);
  const [description, setDescription] = useState(post?.text || "");

  return (
    <MuseoModal
      open={open}
      onClose={onClose}
      title="Edit Post"
      size="md"
    >
      <MuseoModalBody>
        <form onSubmit={handleSubmit}>
          {/* Multiple Image Upload */}
          <ImageUploadZone
            type="multiple"
            maxFiles={5}
            title="Post Images"
            value={images}
            onChange={setImages}
          />
          
          <div className="museo-form-field">
            <label className="museo-label">Description</label>
            <textarea
              className="museo-textarea"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          
          <MuseoModalActions>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Update Post
            </button>
          </MuseoModalActions>
        </form>
      </MuseoModalBody>
    </MuseoModal>
  );
}
```

---

## 🎯 Component Props

### ImageUploadZone

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `"single" \| "multiple" \| "cover" \| "avatar"` | `"single"` | Upload type |
| `maxFiles` | `number` | `1` | Max files (for multiple) |
| `maxSize` | `number` | `10` | Max file size in MB |
| `accept` | `string` | `"image/jpeg,image/jpg,image/png"` | Accepted file types |
| `value` | `Array \| Object` | `[]` | Current images |
| `onChange` | `Function` | - | Callback when images change |
| `error` | `string` | - | Error message |
| `title` | `string` | - | Section title |
| `hint` | `string` | - | Helper text |

### CategorySelector

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `selected` | `Array` | `[]` | Selected categories |
| `onChange` | `Function` | - | Callback when selection changes |
| `error` | `string` | - | Error message |
| `required` | `boolean` | `true` | Show required indicator |
| `title` | `string` | `"Categories"` | Section title |
| `description` | `string` | - | Helper text |

---

## 📁 File Structure

```
components/
├── MuseoModal.jsx                    # Base modal wrapper
├── modal-features/
│   ├── ImageUploadZone.jsx          # Image upload component
│   ├── CategorySelector.jsx         # Category selector
│   └── README.md                     # This file
└── styles/
    └── modal-features.css            # Unified styles

pages/
├── PublishEventModal.jsx            # Uses: ImageUploadZone (single)
├── subPages/
│   ├── UploadArtModal.jsx          # Uses: ImageUploadZone (multiple) + CategorySelector
│   ├── EditPostModal.jsx           # Uses: ImageUploadZone (multiple)
│   └── EditProfileModal.jsx        # Uses: ImageUploadZone (cover + avatar)
```

---

## ✅ Migration Checklist

- [ ] Import MuseoModal and feature components
- [ ] Replace custom dropzone with ImageUploadZone
- [ ] Replace custom category UI with CategorySelector
- [ ] Use museo-form-grid for form layout
- [ ] Use MuseoModalActions for buttons
- [ ] Remove old CSS imports
- [ ] Test all functionality

---

## 🎨 Design System Integration

All components use design-system variables:
- Colors: `var(--museo-*)`
- Spacing: `var(--museo-space-*)`
- Typography: `var(--museo-text-*)`, `var(--museo-font-*)`
- Borders: `var(--museo-radius-*)`
- Shadows: `var(--museo-shadow-*)`

This ensures consistency across all modals! 🎉
