/**
 * Cache Duration Configuration for Museo
 * 
 * Guidelines:
 * - Frequently changing data: 1-5 minutes
 * - Occasionally changing data: 10-30 minutes
 * - Rarely changing data: 1-24 hours
 * - Static data: 7+ days
 */

export const CACHE_DURATION = {
  // Comments - Active discussions, changes frequently
  COMMENTS: 120, // 2 minutes
  
  // Posts - New posts added often
  POSTS: 180, // 3 minutes
  
  // User profiles - Changes occasionally
  USER_PROFILE: 600, // 10 minutes
  
  // Gallery artworks - Rarely changes
  GALLERY_ARTWORKS: 1800, // 30 minutes
  
  // Events - Changes rarely
  EVENTS: 3600, // 1 hour
  
  // Top arts of the week - Changes weekly
  TOP_ARTS_WEEKLY: 86400, // 24 hours
  
  // Artist list - Rarely changes
  ARTISTS: 3600, // 1 hour
  
  // Search results - Can be cached briefly
  SEARCH_RESULTS: 300, // 5 minutes
  
  // Static content (about, terms, etc.)
  STATIC_CONTENT: 604800, // 7 days
  
  // Notifications - Should be fresh
  NOTIFICATIONS: 60, // 1 minute
  
  // Messages - Real-time feel
  MESSAGES: 30, // 30 seconds
};

/**
 * Helper function to get cache duration with fallback
 */
export function getCacheDuration(type, defaultDuration = 300) {
  return CACHE_DURATION[type] || defaultDuration;
}

export default CACHE_DURATION;
