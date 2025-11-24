import React, { useMemo, useState } from 'react';
import "../../styles/components/modal-features.css";

const ART_CATEGORIES = [
  'Classical Art', 'Abstract Art', 'Impressionist', 'Contemporary Art',
  'Digital Art', 'Photography', 'Sculpture', 'Street Art', 'Landscape',
  'Portrait', 'Surrealist', 'Minimalist', 'Expressionist', 'Realism', 'Conceptual'
];

/**
 * CategorySelector - Art category multi-select component
 * 
 * @param {Array} selected - Selected categories
 * @param {Function} onChange - Callback when selection changes
 * @param {string} error - Error message
 * @param {boolean} required - Show required indicator
 * @param {string} title - Section title
 * @param {string} description - Helper text
 */
export default function CategorySelector({
  selected = [],
  onChange,
  error,
  required = true,
  title = "Categories",
  description = "Select categories that best describe your artwork",
  options = [], // optional: [{ value: slug, label: name }]
  loading = false,
  maxPreview = 12
}) {
  // Normalize options: prefer provided options; fallback to legacy static list
  const normalized = useMemo(() => {
    const base = (Array.isArray(options) && options.length > 0
      ? options
      : ART_CATEGORIES
    );
    // Map and dedupe by value
    const map = new Map();
    base.forEach(opt => {
      if (typeof opt === 'string') {
        const key = String(opt);
        if (!map.has(key)) map.set(key, { value: key, label: key });
      } else {
        const value = String(opt.value ?? opt.slug ?? opt.id ?? opt.name ?? '');
        if (!value) return;
        const label = String(opt.label ?? opt.name ?? value);
        if (!map.has(value)) map.set(value, { value, label });
      }
    });
    return Array.from(map.values());
  }, [options]);

  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  // Build lookups for selected → label
  const labelByValue = useMemo(() => {
    const m = new Map();
    normalized.forEach(opt => m.set(opt.value, opt.label));
    return m;
  }, [normalized]);

  // Filter + sort (keep 'other' last)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const arr = normalized.filter(opt => {
      if (!q) return true;
      return opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q);
    }).sort((a, b) => {
      if (a.value === 'other') return 1;
      if (b.value === 'other') return -1;
      return a.label.localeCompare(b.label);
    });
    return arr;
  }, [normalized, query]);

  const visible = showAll ? filtered : filtered.slice(0, maxPreview);

  const handleToggle = (value) => {
    const exists = selected.includes(value);
    const next = exists ? selected.filter(v => v !== value) : [...selected, value];
    onChange?.(next);
  };

  const handleClear = () => onChange?.([]);
  const handleSelectAllFiltered = () => onChange?.(Array.from(new Set([...selected, ...filtered.map(f => f.value)])));

  return (
    <div className="museo-form-field museo-form-field--full">
      <label className="museo-label">
        {title} {required && <span className="museo-required">*</span>}
      </label>
      {description && (
        <p className="museo-field-hint">{description}</p>
      )}

      {/* Search + actions */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowAll(true); }}
          className="museo-input"
          placeholder="Search categories..."
          disabled={loading}
          aria-label="Search categories"
          style={{ flex: 1 }}
        />
        <button type="button" className="btn btn-ghost btn-sm" onClick={handleSelectAllFiltered} disabled={loading || filtered.length === 0}>
          Select all ({filtered.length})
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={handleClear} disabled={loading || selected.length === 0}>
          Clear
        </button>
      </div>

      {/* Selected chips */}
      {selected?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          {selected.map(val => (
            <span key={`sel-${val}`} className="museo-badge museo-badge--capsule" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {labelByValue.get(val) || val}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleToggle(val); }}
                aria-label={`Remove ${labelByValue.get(val) || val}`}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                  lineHeight: 1,
                  padding: '0 6px',
                  color: 'var(--museo-text-muted)'
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Options grid */}
      <div className={`museo-categories ${error ? 'museo-categories--error' : ''}`} style={{ maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
        {loading ? (
          <div className="museo-field-hint">Loading categories…</div>
        ) : (
          (visible.length > 0 ? visible : filtered).map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`museo-category-btn ${selected.includes(opt.value) ? 'museo-category-btn--active' : ''}`}
              onClick={() => handleToggle(opt.value)}
              title={opt.label}
              aria-pressed={selected.includes(opt.value)}
            >
              {opt.label}
            </button>
          ))
        )}
      </div>

      {/* Footer controls */}
      {!loading && filtered.length > maxPreview && query.trim() === '' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
          <span className="museo-field-hint">Showing {Math.min(filtered.length, showAll ? filtered.length : maxPreview)} of {filtered.length}</span>
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => setShowAll(s => !s)}>
            {showAll ? 'Show less' : `Show all (${filtered.length})`}
          </button>
        </div>
      )}

      {error && <div className="museo-error-message" style={{ marginTop: '6px' }}>{error}</div>}
      {selected.length > 0 && (
        <div className="museo-category-count" style={{ marginTop: '4px' }}>
          {selected.length} {selected.length === 1 ? 'category' : 'categories'} selected
        </div>
      )}
    </div>
  );
}
