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
  description = "Select categories that best describe your artwork"
}) {
  const handleToggle = (category) => {
    const newSelection = selected.includes(category)
      ? selected.filter(c => c !== category)
      : [...selected, category];
    onChange?.(newSelection);
  };

  return (
    <div className="museo-form-field museo-form-field--full">
      <label className="museo-label">
        {title} {required && <span className="museo-required">*</span>}
      </label>
      {description && (
        <p className="museo-field-hint">{description}</p>
      )}
      
      <div className={`museo-categories ${error ? 'museo-categories--error' : ''}`}>
        {ART_CATEGORIES.map(category => (
          <button
            key={category}
            type="button"
            className={`museo-category-btn ${
              selected.includes(category) ? 'museo-category-btn--active' : ''
            }`}
            onClick={() => handleToggle(category)}
          >
            {category}
          </button>
        ))}
      </div>
      
      {error && <div className="museo-error-message">{error}</div>}
      
      {selected.length > 0 && (
        <div className="museo-category-count">
          {selected.length} {selected.length === 1 ? 'category' : 'categories'} selected
        </div>
      )}
    </div>
  );
}
