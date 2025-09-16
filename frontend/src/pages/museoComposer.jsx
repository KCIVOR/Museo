import React, { useEffect, useRef, useState } from "react";
import "./css/museoComposer.css";

export default function MuseoComposer({
  me = {
    name: "Rovick",
    avatar:
      "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/2ooze2k90v5e1.jpeg",
  },
  onSubmit,
}) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]); // [{url,type,file}]
  const taRef = useRef(null);


  // Auto-grow
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = ta.scrollHeight + "px";
  }, [text]);

  const pickFiles = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,video/*";
    input.multiple = true;
    input.onchange = () => {
      const sel = Array.from(input.files || []).slice(0, 4).map((f) => ({
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
    const removed = next.splice(i, 1);
    if (removed?.url?.startsWith("blob:")) URL.revokeObjectURL(removed.url);
    setFiles(next);
  };

  const canPost = text.trim().length > 0 || files.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canPost) return;
    
    try {
      const formData = new FormData();
      formData.append("description", text);
      formData.append("createdAt", new Date().toISOString());
      files.forEach((f) => {
        formData.append("media", f.file);
      });

      const res = await fetch("http://localhost:3000/api/homepage/createPost", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
      
      const data = await res.json();
      console.log("Post created:", data);
      
      // Clear form after successful post
      setText("");
      setFiles([]);
      
      // Trigger refresh in parent component
      if (onSubmit) {
        onSubmit(data);
      }
      
    } catch(err) {
      console.error("Failed to submit post", err);
    }
  };


  return (
    <form className="mc" onSubmit={handleSubmit} aria-label="Museo post composer">
      <img className="mc__avatar" src={me.avatar} alt={`${me.name} avatar`} />

      <div className="mc__body">
        <div className="mc__inputWrap">
          <label className={`mc__label ${text ? "is-floating" : ""}`} htmlFor="museo-ta">
            Share inspiration, artwork, or a thought…
          </label>
          <textarea
            id="museo-ta"
            ref={taRef}
            className="mc__ta"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={1}
            aria-label="Write post"
          />
          <div className="mc__grid" aria-hidden="true" />
        </div>

        {files.length > 0 && (
          <div className="mc__chips" role="list">
            {files.map((f, i) => (
              <div className="mc__chip" role="listitem" key={`${f.url}-${i}`}>
                {f.type === "image" ? (
                  <img className="mc__thumb" src={f.url} alt={`Attachment ${i + 1}`} />
                ) : (
                  <span className="mc__thumb mc__thumb--video">▶</span>
                )}
                <button type="button" className="mc__x" aria-label="Remove" onClick={() => removeAt(i)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mc__bar">
          <button type="button" className="mc__tool" onClick={pickFiles} aria-label="Add image or video">
            🖼 Add media
          </button>
          <button type="button" className="mc__tool" aria-label="Announce event">
            📅 Event
          </button>
          <div className="mc__spacer" />
          <button type="submit" className={`mc__post ${canPost ? "" : "is-disabled"}`} disabled={!canPost}>
            Post
          </button>
        </div>
      </div>
    </form>
  );
}
