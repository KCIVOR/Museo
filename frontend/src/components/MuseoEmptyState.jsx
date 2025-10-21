import React from 'react';

const MuseoEmptyState = ({ 
  title = "No items found", 
  subtitle = "Check back soon or browse to find something interesting.",
  className = ""
}) => {
  return (
    <div className={`museo-message ${className}`}>
      <div style={{ fontSize: '18px', marginBottom: '8px' }}>
        {title}
      </div>
      
      {subtitle && (
        <small style={{ 
          opacity: 0.7, 
          fontSize: '14px', 
          marginTop: '8px', 
          display: 'block',
          lineHeight: '1.4'
        }}>
          {subtitle}
        </small>
      )}
    </div>
  );
};

// Predefined configurations for common use cases
MuseoEmptyState.presets = {
  events: {
    title: "No events found",
    subtitle: "Check back soon or browse all events to find something interesting."
  },
  
  artworks: {
    title: "No artworks found",
    subtitle: "Upload your first artwork or browse the gallery to discover amazing pieces."
  },
  
  artists: {
    title: "No artists found",
    subtitle: "Explore our community of talented artists and creators."
  },
  
  posts: {
    title: "No posts yet",
    subtitle: "Be the first to share something with the community."
  },
  
  search: {
    title: "No results found",
    subtitle: "Try adjusting your search terms or browse all items."
  },
  
  generic: {
    title: "Nothing here yet",
    subtitle: "Content will appear here when available."
  }
};

export default MuseoEmptyState;
