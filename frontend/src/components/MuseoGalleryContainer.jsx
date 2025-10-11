// Reusable Museo Gallery Container Component
import React from 'react';
import './MuseoGalleryContainer.css';

// Main page wrapper
export const MuseoPage = ({ children, className = '', ...props }) => {
  return (
    <div className={`museo-page ${className}`} {...props}>
      {children}
    </div>
  );
};

// Content feed wrapper
export const MuseoFeed = ({ children, className = '', ...props }) => {
  return (
    <div className={`museo-feed ${className}`} {...props}>
      {children}
    </div>
  );
};

// Gallery heading with decorative underline
export const MuseoHeading = ({ children, className = '', ...props }) => {
  return (
    <h1 className={`museo-heading ${className}`} {...props}>
      {children}
    </h1>
  );
};

// Grid layout with different column options
export const MuseoGrid = ({ 
  children, 
  columns = 3, 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`museo-grid museo-grid--${columns} ${className}`} {...props}>
      {children}
    </div>
  );
};

// Universal card component
export const MuseoCard = ({ 
  children, 
  variant = 'default', 
  className = '', 
  style = {},
  animationDelay = 0,
  ...props 
}) => {
  const cardClass = variant !== 'default' ? `museo-card--${variant}` : '';
  const cardStyle = {
    animationDelay: `${animationDelay}ms`,
    ...style
  };
  
  return (
    <div 
      className={`museo-card ${cardClass} ${className}`} 
      style={cardStyle}
      {...props}
    >
      {children}
    </div>
  );
};

// Card media (images)
export const MuseoMedia = ({ src, alt, className = '', ...props }) => {
  return (
    <img 
      src={src} 
      alt={alt} 
      className={`museo-media ${className}`} 
      {...props}
    />
  );
};

// Avatar component
export const MuseoAvatar = ({ src, alt, className = '', ...props }) => {
  return (
    <img 
      src={src} 
      alt={alt} 
      className={`museo-avatar ${className}`} 
      {...props}
    />
  );
};

// Card body content
export const MuseoBody = ({ children, variant = 'default', className = '', ...props }) => {
  const bodyClass = variant !== 'default' ? `museo-body--${variant}` : '';
  
  return (
    <div className={`museo-body ${bodyClass} ${className}`} {...props}>
      {children}
    </div>
  );
};

// Typography components
export const MuseoTitle = ({ children, variant = 'default', className = '', ...props }) => {
  const titleClass = variant !== 'default' ? `museo-title--${variant}` : '';
  
  return (
    <h3 className={`museo-title ${titleClass} ${className}`} {...props}>
      {children}
    </h3>
  );
};

export const MuseoDesc = ({ children, className = '', ...props }) => {
  return (
    <p className={`museo-desc ${className}`} {...props}>
      {children}
    </p>
  );
};

export const MuseoPrice = ({ children, className = '', ...props }) => {
  return (
    <span className={`museo-price ${className}`} {...props}>
      {children}
    </span>
  );
};

// Badge component
export const MuseoBadge = ({ children, className = '', ...props }) => {
  return (
    <div className={`museo-badge ${className}`} {...props}>
      {children}
    </div>
  );
};

// Actions container
export const MuseoActions = ({ children, className = '', ...props }) => {
  return (
    <div className={`museo-actions ${className}`} {...props}>
      {children}
    </div>
  );
};

// Button component
export const MuseoBtn = ({ 
  children, 
  variant = 'default', 
  className = '', 
  onClick,
  ...props 
}) => {
  const btnClass = variant !== 'default' ? `museo-btn--${variant}` : '';
  
  return (
    <button 
      className={`museo-btn ${btnClass} ${className}`} 
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

// Link button (for navigation)
export const MuSeoBtnLink = ({ 
  children, 
  variant = 'default', 
  className = '', 
  to,
  onClick,
  ...props 
}) => {
  const btnClass = variant !== 'default' ? `museo-btn--${variant}` : '';
  
  return (
    <a 
      href={to}
      className={`museo-btn ${btnClass} ${className}`} 
      onClick={onClick}
      {...props}
    >
      {children}
    </a>
  );
};

// Message/Loading states
export const MuseoMessage = ({ children, className = '', ...props }) => {
  return (
    <div className={`museo-message ${className}`} {...props}>
      {children}
    </div>
  );
};

export const MuseoRetryBtn = ({ children, onClick, className = '', ...props }) => {
  return (
    <button 
      className={`museo-retry-btn ${className}`} 
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

// Pre-built card templates for common use cases

// Artist Card Template
export const MuseoArtistCard = ({ 
  artist, 
  onView, 
  animationDelay = 0,
  className = '',
  ...props 
}) => {
  return (
    <MuseoCard 
      variant="artist" 
      animationDelay={animationDelay}
      className={className}
      onClick={onView}
      {...props}
    >
      <MuseoAvatar 
        src={artist.hero || artist.avatar} 
        alt={artist.name}
        onError={(e) => { e.currentTarget.src = "/assets/artist-placeholder.jpg"; }}
      />
      <MuseoTitle variant="artist">{artist.name}</MuseoTitle>
    </MuseoCard>
  );
};

// Event Card Template
export const MuseoEventCard = ({ 
  event, 
  participantCount = 0,
  onView, 
  onEdit,
  onDelete,
  isAdmin = false,
  animationDelay = 0,
  className = '',
  ...props 
}) => {
  return (
    <MuseoCard 
      variant="event" 
      animationDelay={animationDelay}
      className={className}
      onClick={onView}
      {...props}
    >
      <MuseoMedia src={event.image} alt={event.title} />
      <MuseoBadge>
        Participants ({participantCount})
      </MuseoBadge>
      <MuseoBody>
        <MuseoTitle>{event.title}</MuseoTitle>
        <MuseoDesc>{event.details}</MuseoDesc>
        <MuseoActions onClick={(e) => e.stopPropagation()}>
          <MuseoBtn onClick={onView}>View More</MuseoBtn>
          {isAdmin && onEdit && (
            <MuseoBtn variant="ghost" onClick={onEdit}>Edit</MuseoBtn>
          )}
          {isAdmin && onDelete && (
            <MuseoBtn variant="danger" onClick={onDelete}>Delete</MuseoBtn>
          )}
        </MuseoActions>
      </MuseoBody>
    </MuseoCard>
  );
};

// Artwork Card Template
export const MuseoArtworkCard = ({ 
  artwork, 
  onView, 
  onLike,
  onComment,
  likes = 0,
  comments = 0,
  animationDelay = 0,
  className = '',
  ...props 
}) => {
  return (
    <MuseoCard 
      variant="artwork" 
      animationDelay={animationDelay}
      className={className}
      onClick={onView}
      {...props}
    >
      <MuseoMedia src={artwork.image || artwork.src} alt={artwork.title} />
      <MuseoBody>
        <MuseoTitle>{artwork.title}</MuseoTitle>
        {artwork.artist && <MuseoDesc>by {artwork.artist}</MuseoDesc>}
        {artwork.price && <MuseoPrice>{artwork.price}</MuseoPrice>}
        <MuseoActions onClick={(e) => e.stopPropagation()}>
          <MuseoBtn onClick={onView}>View</MuseoBtn>
          {onLike && <MuseoBtn variant="ghost" onClick={onLike}>♥ {likes}</MuseoBtn>}
          {onComment && <MuseoBtn variant="ghost" onClick={onComment}>💬 {comments}</MuseoBtn>}
        </MuseoActions>
      </MuseoBody>
    </MuseoCard>
  );
};

// Complete page template
export const MuseoGalleryPage = ({ 
  title,
  items = [],
  columns = 3,
  renderCard,
  loading = false,
  error = null,
  onRetry,
  emptyMessage = "No items found.",
  loadingMessage = "Loading...",
  children
}) => {
  return (
    <MuseoPage>
      <MuseoFeed>
        {title && <MuseoHeading>{title}</MuseoHeading>}
        
        {children}
        
        {loading && (
          <MuseoMessage>{loadingMessage}</MuseoMessage>
        )}
        
        {error && !loading && (
          <MuseoMessage>
            {error}
            {onRetry && (
              <>
                <br />
                <MuseoRetryBtn onClick={onRetry}>Try Again</MuseoRetryBtn>
              </>
            )}
          </MuseoMessage>
        )}
        
        {!loading && !error && (
          <>
            {items.length > 0 ? (
              <MuseoGrid columns={columns}>
                {items.map((item, index) => 
                  renderCard ? renderCard(item, index) : (
                    <MuseoCard key={item.id || index} animationDelay={index * 80}>
                      {JSON.stringify(item)}
                    </MuseoCard>
                  )
                )}
              </MuseoGrid>
            ) : (
              <MuseoMessage>{emptyMessage}</MuseoMessage>
            )}
          </>
        )}
      </MuseoFeed>
    </MuseoPage>
  );
};

export default {
  MuseoPage,
  MuseoFeed,
  MuseoHeading,
  MuseoGrid,
  MuseoCard,
  MuseoMedia,
  MuseoAvatar,
  MuseoBody,
  MuseoTitle,
  MuseoDesc,
  MuseoPrice,
  MuseoBadge,
  MuseoActions,
  MuseoBtn,
  MuSeoBtnLink,
  MuseoMessage,
  MuseoRetryBtn,
  MuseoArtistCard,
  MuseoEventCard,
  MuseoArtworkCard,
  MuseoGalleryPage
};
