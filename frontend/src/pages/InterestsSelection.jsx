import React, { useState, useEffect } from 'react';
import '../design-system.css';
import './css/InterestsSelection.css';

const InterestsSelection = ({ isOpen = true, onClose }) => {
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [animationDelay, setAnimationDelay] = useState(0);


  const artCategories = [
    {
      id: 'classical',
      name: 'Classical Art',
      description: 'Timeless masterpieces from the Renaissance era, where divine proportions meet human emotion in marble and canvas',
      svg: (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 56h48v4H8v-4zm4-4h40l-4-8H16l-4 8zm6-12h24v-8H18v8zm2-12h20v-4H20v4zm4-8h12v-4H24v4zm6-8h0v-4h0v4z" fill="currentColor"/>
          <circle cx="32" cy="12" r="3" fill="currentColor"/>
          <path d="M28 16h8v4h-8v-4z" fill="currentColor"/>
        </svg>
      ),
      color: 'var(--museo-primary)'
    },
    {
      id: 'contemporary',
      name: 'Contemporary Art',
      description: 'Bold expressions of our modern world, where traditional boundaries dissolve into innovative artistic languages',
      svg: (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 8h8l4 8-4 8h-8l-4-8 4-8z" fill="currentColor"/>
          <circle cx="40" cy="20" r="8" fill="currentColor"/>
          <path d="M20 36l8-4 8 4v16l-8 4-8-4V36z" fill="currentColor"/>
          <rect x="44" y="36" width="12" height="12" rx="2" fill="currentColor"/>
        </svg>
      ),
      color: 'var(--museo-accent)'
    },
    {
      id: 'impressionist',
      name: 'Impressionist',
      description: 'Capturing the ephemeral dance of light and shadow, where fleeting moments become eternal poetry',
      svg: (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="16" r="8" fill="currentColor" opacity="0.8"/>
          <path d="M8 32c4-2 8-1 12 1s8 3 12 1 8-3 12-1 8 2 12 0" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.6"/>
          <path d="M6 40c6-1 10 1 14 2s8 1 12-1 8-2 12 0 8 3 12 1" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.7"/>
          <path d="M10 48c4 0 8-1 12 0s8 2 12 0 8-1 12 1" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.5"/>
        </svg>
      ),
      color: 'var(--museo-gold)'
    },
    {
      id: 'abstract',
      name: 'Abstract Art',
      description: 'Pure form and color liberated from representation, speaking directly to the soul through visual harmony',
      svg: (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 32L32 8l24 24-24 24L8 32z" fill="currentColor" opacity="0.7"/>
          <circle cx="20" cy="20" r="6" fill="currentColor"/>
          <path d="M40 40c0-8 8-8 8 0s-8 8-8 0z" fill="currentColor"/>
          <rect x="36" y="16" width="4" height="16" rx="2" fill="currentColor" transform="rotate(45 38 24)"/>
        </svg>
      ),
      color: 'var(--museo-success)'
    },
    {
      id: 'sculpture',
      name: 'Sculpture',
      description: 'Three-dimensional poetry carved from stone, cast in bronze, where space itself becomes the canvas',
      svg: (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="32" cy="56" rx="16" ry="4" fill="currentColor" opacity="0.3"/>
          <path d="M24 52V24c0-4 4-8 8-8s8 4 8 8v28" stroke="currentColor" strokeWidth="4" fill="none"/>
          <circle cx="32" cy="16" r="6" fill="currentColor"/>
          <path d="M28 24h8v8h-8v-8z" fill="currentColor"/>
          <path d="M26 32h12v12h-12v-12z" fill="currentColor"/>
        </svg>
      ),
      color: 'var(--museo-primary-dark)'
    },
    {
      id: 'photography',
      name: 'Photography',
      description: 'Frozen moments in time, where light becomes memory and reality transforms into eternal narrative',
      svg: (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="16" width="48" height="32" rx="4" fill="currentColor"/>
          <circle cx="32" cy="32" r="8" fill="none" stroke="white" strokeWidth="2"/>
          <circle cx="32" cy="32" r="4" fill="white"/>
          <rect x="12" y="20" width="6" height="4" rx="1" fill="white"/>
          <path d="M24 16l4-4h8l4 4" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
      ),
      color: 'var(--museo-info)'
    },
    {
      id: 'digital',
      name: 'Digital Art',
      description: 'Pixels as paint, algorithms as brushes, where technology births new realms of creative possibility',
      svg: (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="12" width="48" height="32" rx="2" fill="currentColor"/>
          <rect x="12" y="16" width="40" height="24" rx="1" fill="white"/>
          <path d="M16 20h8v4h-8v-4zm12 0h8v4h-8v-4zm12 0h8v4h-8v-4z" fill="currentColor"/>
          <path d="M16 28h12v8h-12v-8zm16 0h12v8h-12v-8z" fill="currentColor"/>
          <circle cx="32" cy="48" r="2" fill="currentColor"/>
        </svg>
      ),
      color: 'var(--museo-accent-hover)'
    },
    {
      id: 'street',
      name: 'Street Art',
      description: 'Urban canvases where rebellion meets beauty, transforming city walls into galleries of social expression',
      svg: (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 48h48v8H8v-8z" fill="currentColor"/>
          <path d="M12 48V16h40v32" fill="currentColor" opacity="0.8"/>
          <path d="M20 24c0-4 4-4 8 0s4 8 0 8-8-4-8-8z" fill="white"/>
          <path d="M36 28h8v4h-8v-4zm0 8h12v4H36v-4z" fill="white"/>
          <circle cx="24" cy="40" r="3" fill="white"/>
          <path d="M32 36l8 8h-16l8-8z" fill="white"/>
        </svg>
      ),
      color: 'var(--museo-warning)'
    },
    {
      id: 'minimalist',
      name: 'Minimalist',
      description: 'The profound eloquence of simplicity, where every element serves purpose and silence speaks volumes',
      svg: (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="16" y="16" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2"/>
          <circle cx="32" cy="32" r="4" fill="currentColor"/>
          <line x1="8" y1="32" x2="56" y2="32" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
          <line x1="32" y1="8" x2="32" y2="56" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
        </svg>
      ),
      color: 'var(--museo-gray-600)'
    },
    {
      id: 'surrealist',
      name: 'Surrealist',
      description: 'Dreams made visible, where logic surrenders to imagination and the impossible becomes beautifully real',
      svg: (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M32 8c8 0 16 8 16 16 0 12-8 20-16 20s-16-8-16-20c0-8 8-16 16-16z" fill="currentColor" opacity="0.7"/>
          <circle cx="28" cy="20" r="3" fill="white"/>
          <circle cx="36" cy="20" r="3" fill="white"/>
          <path d="M24 28c4 4 8 4 12 0" stroke="white" strokeWidth="2" fill="none"/>
          <path d="M16 44c8-4 16-4 24 0s16 8 8 12-24-4-32-12z" fill="currentColor" opacity="0.5"/>
        </svg>
      ),
      color: 'var(--museo-error)'
    },
    {
      id: 'landscape',
      name: 'Landscape',
      description: 'Nature\'s grandeur captured in pigment and light, where earth and sky dance in eternal composition',
      svg: (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 40l8-8 8 4 8-8 8 4 8-8 8 4v24H8V40z" fill="currentColor"/>
          <path d="M8 32l12-8 12 4 12-8 12 4 8-4v8l-8 4-12-4-12 8-12-4L8 40v-8z" fill="currentColor" opacity="0.7"/>
          <circle cx="48" cy="16" r="6" fill="currentColor" opacity="0.6"/>
          <path d="M16 24l8-4 8 2 8-4 8 2v8l-8 2-8-2-8 4-8-2v-6z" fill="currentColor" opacity="0.4"/>
        </svg>
      ),
      color: 'var(--museo-success)'
    },
    {
      id: 'portrait',
      name: 'Portrait',
      description: 'Windows to the human soul, where every brushstroke reveals the infinite complexity of human character',
      svg: (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="32" cy="24" rx="12" ry="16" fill="currentColor"/>
          <circle cx="28" cy="20" r="2" fill="white"/>
          <circle cx="36" cy="20" r="2" fill="white"/>
          <path d="M28 28c2 2 4 2 6 0" stroke="white" strokeWidth="1.5" fill="none"/>
          <path d="M20 40c0-8 5.5-12 12-12s12 4 12 12v16H20V40z" fill="currentColor"/>
          <rect x="16" y="8" width="32" height="48" rx="4" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
        </svg>
      ),
      color: 'var(--museo-primary-light)'
    },
    {
      id: 'miniature',
      name: 'Miniature',
      description: 'Intricate worlds captured in intimate scale, where precision and detail create universes within tiny frames',
      svg: (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="16" y="16" width="32" height="24" rx="2" fill="currentColor"/>
          <rect x="18" y="18" width="28" height="20" rx="1" fill="white"/>
          <circle cx="24" cy="24" r="2" fill="currentColor"/>
          <rect x="28" y="22" width="12" height="2" fill="currentColor"/>
          <rect x="28" y="26" width="8" height="2" fill="currentColor"/>
          <rect x="28" y="30" width="10" height="2" fill="currentColor"/>
          <circle cx="38" cy="32" r="1.5" fill="currentColor"/>
          <rect x="12" y="12" width="8" height="6" rx="1" fill="currentColor" opacity="0.6"/>
          <rect x="44" y="12" width="8" height="6" rx="1" fill="currentColor" opacity="0.6"/>
          <rect x="12" y="46" width="8" height="6" rx="1" fill="currentColor" opacity="0.6"/>
          <rect x="44" y="46" width="8" height="6" rx="1" fill="currentColor" opacity="0.6"/>
        </svg>
      ),
      color: 'var(--museo-warning)'
    },
    {
      id: 'expressionist',
      name: 'Expressionist',
      description: 'Raw emotion unleashed through bold strokes and vivid colors, where feeling takes precedence over form',
      svg: (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 32c8-16 16 8 24-8s16 16 24 0" stroke="currentColor" strokeWidth="4" fill="none"/>
          <path d="M12 20c6-8 12 4 18-4s12 8 18 0" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.7"/>
          <path d="M10 44c8-12 14 6 20-6s14 12 20 0" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.8"/>
          <circle cx="20" cy="16" r="4" fill="currentColor" opacity="0.6"/>
          <circle cx="44" cy="48" r="3" fill="currentColor" opacity="0.7"/>
          <path d="M32 8l4 8-4 8-4-8 4-8z" fill="currentColor" opacity="0.5"/>
        </svg>
      ),
      color: 'var(--museo-error)'
    },
    {
      id: 'realism',
      name: 'Realism',
      description: 'Truth captured with meticulous precision, where every detail serves to mirror life in its purest form',
      svg: (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="12" y="12" width="40" height="30" rx="2" fill="currentColor"/>
          <rect x="14" y="14" width="36" height="26" rx="1" fill="white"/>
          <path d="M18 36l6-6 8 4 6-8 8 6v8H18v-4z" fill="currentColor"/>
          <circle cx="22" cy="22" r="3" fill="currentColor"/>
          <rect x="16" y="44" width="32" height="4" rx="1" fill="currentColor"/>
          <rect x="20" y="48" width="24" height="2" rx="1" fill="currentColor" opacity="0.6"/>
        </svg>
      ),
      color: 'var(--museo-success)'
    },
    {
      id: 'conceptual',
      name: 'Conceptual Art',
      description: 'Ideas made manifest, where the concept behind the work transcends its physical form and material presence',
      svg: (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="20" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
          <circle cx="32" cy="32" r="12" fill="none" stroke="currentColor" strokeWidth="2"/>
          <circle cx="32" cy="32" r="4" fill="currentColor"/>
          <path d="M32 12v8m0 24v8m20-20h-8m-24 0H12" stroke="currentColor" strokeWidth="2"/>
          <circle cx="20" cy="20" r="2" fill="currentColor" opacity="0.6"/>
          <circle cx="44" cy="20" r="2" fill="currentColor" opacity="0.6"/>
          <circle cx="20" cy="44" r="2" fill="currentColor" opacity="0.6"/>
          <circle cx="44" cy="44" r="2" fill="currentColor" opacity="0.6"/>
        </svg>
      ),
      color: 'var(--museo-info)'
    }
  ];

  const toggleInterest = (categoryId) => {
    setSelectedInterests(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleContinue = async () => {
    if (selectedInterests.length === 0) {
      // Don't allow continuing without selection
      console.log("No interests selected, cannot continue");
      return;
    }

    try {
      // Convert selected interests to database format
      const preferences = {
        classicalArt: selectedInterests.includes('classical'),
        contemporaryArt: selectedInterests.includes('contemporary'),
        impressionist: selectedInterests.includes('impressionist'),
        abstractArt: selectedInterests.includes('abstract'),
        sculpture: selectedInterests.includes('sculpture'),
        photography: selectedInterests.includes('photography'),
        digitalArt: selectedInterests.includes('digital'),
        streetArt: selectedInterests.includes('street'),
        minimalist: selectedInterests.includes('minimalist'),
        surrealist: selectedInterests.includes('surrealist'),
        landscape: selectedInterests.includes('landscape'),
        portrait: selectedInterests.includes('portrait'),
        miniature: selectedInterests.includes('miniature'),
        expressionist: selectedInterests.includes('expressionist'),
        realism: selectedInterests.includes('realism'),
        conceptual: selectedInterests.includes('conceptual')
      };

      // Save preferences to database
      const API = import.meta.env.VITE_API_BASE;
      const response = await fetch(`${API}/profile/saveArtPreferences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(preferences)
      });

      if (!response.ok) {
        throw new Error(`Failed to save preferences: ${response.statusText}`);
      }

      console.log("Art preferences saved successfully!");
      if (onClose) onClose(selectedInterests);
      
    } catch (error) {
      console.error("Error saving art preferences:", error);
      alert("Failed to save preferences. Please try again.");
    }
  };

  const handleClose = () => {
    if (onClose) onClose(null);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  useEffect(() => {
    // Stagger animation for cards
    const timer = setTimeout(() => {
      setAnimationDelay(100);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="interests-container" onClick={handleOverlayClick}>
      <div className="interests-modal">
        {/* Parchment texture overlay */}
        <div className="parchment-overlay" />

        <div className="interests-content">
        {/* Header Section */}
        <div className="interests-header">
          <div className="header-icon-container">
            <div className="header-icon">
              <span>🎨</span>
            </div>
            <h1 className="interests-title">
              Curate Your Gallery
            </h1>
          </div>
          
          <p className="interests-description">
            Select the art styles and movements that inspire you. We'll personalize your Museo experience 
            to showcase the masterpieces that speak to your artistic soul.
          </p>
          
          <div className="interests-hint">
            <span>✨</span>
            <span>Choose 3-8 interests for the best experience</span>
            <span>✨</span>
          </div>
        </div>

        {/* Interest Tags Grid */}
        <div className="interests-grid">
          {artCategories.map((category, index) => {
            const isSelected = selectedInterests.includes(category.id);
            
            return (
              <div
                key={category.id}
                className="interest-card animate"
                onClick={() => toggleInterest(category.id)}
                style={{
                  animationDelay: `${index * 0.1}s`
                }}
              >
                <div
                  className={`card-content ${isSelected ? 'selected' : ''}`}
                  style={{
                    background: isSelected 
                      ? `linear-gradient(135deg, ${category.color}15 0%, ${category.color}08 100%)`
                      : undefined,
                    borderColor: isSelected ? category.color : undefined,
                    boxShadow: isSelected 
                      ? `0 8px 25px -5px ${category.color}40, 0 4px 6px -2px ${category.color}20`
                      : undefined
                  }}
                >
                  {/* Selection indicator */}
                  {isSelected && (
                    <div 
                      className="selection-indicator"
                      style={{ 
                        background: category.color
                      }}
                    >
                      ✓
                    </div>
                  )}

                  {/* Decorative corner accents */}
                  <div className="corner-accent-top">
                    <div 
                      className="corner-accent-top-inner"
                      style={{ background: `linear-gradient(135deg, ${category.color} 0%, transparent 70%)` }}
                    />
                  </div>
                  <div className="corner-accent-bottom">
                    <div 
                      className="corner-accent-bottom-inner"
                      style={{ background: `linear-gradient(315deg, ${category.color} 0%, transparent 70%)` }}
                    />
                  </div>

                  {/* SVG Icon */}
                  <div className="card-svg-icon" style={{ color: category.color }}>
                    {category.svg}
                  </div>

                  {/* Content */}
                  <h3 
                    className={`card-title ${isSelected ? 'selected' : ''}`}
                    style={{
                      color: isSelected ? category.color : undefined
                    }}
                  >
                    {category.name}
                  </h3>
                  
                  <p className="card-description">
                    {category.description}
                  </p>

                  {/* Hover effect overlay */}
                  <div 
                    className="hover-overlay"
                    style={{
                      background: `linear-gradient(135deg, ${category.color}08 0%, transparent 100%)`
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Selection Summary */}
        {selectedInterests.length > 0 && (
          <div className="selection-summary">
            <div className="summary-badge">
              <span>🎯</span>
              <span>
                {selectedInterests.length} interest{selectedInterests.length !== 1 ? 's' : ''} selected
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="action-buttons">
          <button
            onClick={handleContinue}
            disabled={selectedInterests.length === 0}
            className={`btn-continue ${selectedInterests.length > 0 ? 'enabled' : 'disabled'}`}
          >
            Continue to Museo
            <span>→</span>
          </button>
        </div>

        {/* Progress indicator */}
        <div className="progress-section">
          <div className="progress-dots">
            <div className="progress-dot active" />
            <div className="progress-dot inactive" />
            <div className="progress-dot inactive" />
          </div>
          <p className="progress-text">
            Step 1 of 3 - Interest Selection
          </p>
        </div>
        </div>
      </div>
    </div>
  );
};

export default InterestsSelection;
