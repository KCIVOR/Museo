import React, { useEffect, useRef, useState } from "react";
const API = import.meta.env.VITE_API_BASE;

export default function MuseoComposer({
  onSubmit,
}) {
  const FALLBACK_AVATAR = import.meta.env.FALLBACKPHOTO_URL || "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/fallbackphoto.png";
  const resolveAvatar = (raw) => {
    if (!raw) return FALLBACK_AVATAR;
    // Allow absolute http(s) or local paths only; reject bucket-relative strings
    if (raw.startsWith("/") || /^https?:\/\//i.test(raw)) return raw;
    return FALLBACK_AVATAR;
  };

  const [text, setText] = useState("");
  const [files, setFiles] = useState([]); // [{url,type,file}]
  const taRef = useRef(null);
  const [meData, setMeData] = useState({
    
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-grow
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    
    // If text is empty, reset to original height
    if (text.trim() === "") {
      ta.style.height = "48px";
      return;
    }
    
    // Auto-grow for content
    ta.style.height = "0px";
    ta.style.height = ta.scrollHeight + "px";
  }, [text]);

  // Fetch current user profile
  useEffect(() => {
    let abort = false;
    const loadUser = async () => {
      try {
        const res = await fetch(`${API}/profile/getProfile`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch profile");
        const data = await res.json();
        const p = data?.profile || {};

        const name = [p.firstName, p.lastName].filter(Boolean).join(" ") || "You";
        const avatarRaw = p.profilePicture;

        if (!abort) setMeData({ name, avatar: resolveAvatar(avatarRaw) });
      } catch (err) {
        // Keep defaults and fallback
        if (!abort) {
          setMeData((prev) => ({
            ...prev,
            avatar: FALLBACK_AVATAR,
          }));
        }
        console.error(err);
      }
    };
    loadUser();
    return () => {
      abort = true;
    };
  }, []);

  const pickFiles = () => {
    const input = document.createElement("input");
    input.type = "file";
      // Allow images and MP4 only
    input.accept = "image/*,video/mp4";
    input.multiple = true;
    input.onchange = () => {
      const MAX_MB = 50; // match server multer limit
      const sel = Array.from(input.files || [])
        .filter(f => f && (f.type.startsWith('image/') || f.type === 'video/mp4'))
        .filter(f => {
          const ok = f.size <= MAX_MB * 1024 * 1024;
          if (!ok) {
            console.warn(`Skipped ${f.name}: exceeds ${MAX_MB}MB`);
          }
          return ok;
        })
        .slice(0, 4)
        .map((f) => ({
          file: f,
          url: URL.createObjectURL(f),
          type: f.type.startsWith("video/") ? "video" : "image",
        }));
      setFiles((prev) => [...prev, ...sel].slice(0, 4));
    };
    input.click();
  };

  const removeAt = (i) => {
    const next = [...files];
    const [removed] = next.splice(i, 1);
    if (removed?.url?.startsWith?.("blob:")) URL.revokeObjectURL(removed.url);
    setFiles(next);
  };

  const canPost = text.trim().length > 0 || files.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canPost) return;
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("description", text);
      formData.append("createdAt", new Date().toISOString());
      
      // Append files with specific field names like registerArtist
      files.forEach((f, index) => {
        if (index === 0) {
          formData.append("file", f.file);
        } else {
          formData.append(`file${index + 1}`, f.file);
        }
      });

      const res = await fetch(`${API}/homepage/createPost`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);

      const data = await res.json();
      console.log("Post created:", data);

      setText("");
      setFiles([]);

      // Reset textarea height to original size
      if (taRef.current) {
        taRef.current.style.height = "auto";
        taRef.current.style.height = "48px"; // Original height
      }

      onSubmit?.(data);
    } catch (err) {
      console.error("Failed to submit post", err);
    }finally{
      setIsSubmitting(false);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      aria-label="Museo post composer"
      style={{
        display: 'flex',
        gap: '16px',
        padding: '20px',
        background: 'var(--museo-white)',
        borderRadius: '16px',
        border: '1px solid var(--museo-border)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
      }}
    >
      <img
        src={resolveAvatar(meData?.avatar)}
        alt={`${meData?.name || "You"} avatar`}
        referrerPolicy="no-referrer"
        onError={(e) => {
          e.currentTarget.src = FALLBACK_AVATAR;
        }}
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          border: '2px solid var(--museo-border)'
        }}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <textarea
            id="museo-ta"
            ref={taRef}
            className="museo-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            aria-label="Write post"
            placeholder="Share inspiration, artwork, or a thought…"
            style={{
              minHeight: '48px',
              maxHeight: '200px',
              resize: 'none'
            }}
          />
        </div>

        {files.length > 0 && (
          <div 
            role="list"
            style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap'
            }}
          >
            {files.map((f, i) => (
              <div 
                role="listitem" 
                key={`${f.url}-${i}`}
                style={{
                  position: 'relative',
                  width: '80px',
                  height: '80px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '2px solid var(--museo-border)'
                }}
              >
                {f.type === "image" ? (
                  <img 
                    src={f.url} 
                    alt={`Attachment ${i + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <span 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      height: '100%',
                      background: 'var(--museo-bg-secondary)',
                      fontSize: '24px',
                      color: 'var(--museo-text-muted)'
                    }}
                  >
                    ▶
                  </span>
                )}
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={() => removeAt(i)}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    lineHeight: '1'
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={pickFiles}
            aria-label="Attach image or video"
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
          </button>
          
          <button 
            type="submit" 
            disabled={!canPost || isSubmitting}
            className="btn btn-primary btn-sm"
          >
            {isSubmitting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </form>
  );
}
