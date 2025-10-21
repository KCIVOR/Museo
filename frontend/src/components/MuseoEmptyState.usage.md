# MuseoEmptyState Component Usage Guide

## Basic Usage

```jsx
import MuseoEmptyState from '../components/MuseoEmptyState';

// Simple usage
<MuseoEmptyState 
  title="No items found"
  subtitle="Try again later"
/>
```

## Using Presets

```jsx
// Events page
<MuseoEmptyState {...MuseoEmptyState.presets.events} />

// Gallery page
<MuseoEmptyState {...MuseoEmptyState.presets.artworks} />

// Artists page
<MuseoEmptyState {...MuseoEmptyState.presets.artists} />

// Search results
<MuseoEmptyState {...MuseoEmptyState.presets.search} />

// Posts/Feed
<MuseoEmptyState {...MuseoEmptyState.presets.posts} />
```

## Custom Configuration

```jsx
<MuseoEmptyState 
  title="Custom Title"
  subtitle="Custom subtitle message"
/>
```

## Dynamic Content

```jsx
// Gallery with category filtering
<MuseoEmptyState 
  {...MuseoEmptyState.presets.artworks}
  title={hasFilters ? "No results for your filters" : "No artworks found"}
  subtitle={hasFilters 
    ? `Try adjusting your filters: ${activeFilters.join(', ')}`
    : "Upload your first artwork to get started"
  }
/>

// Upcoming Events with time filtering
<MuseoEmptyState 
  title={activeFilter === 'All' ? "No upcoming events found" : `No events found for "${activeFilter}"`}
  subtitle={activeFilter === 'All' 
    ? "Check back soon or browse all events to find something interesting."
    : `Try selecting a different time period or browse all events.`
  }
/>
```

## Available Presets

- `events` - For event listings
- `artworks` - For gallery/artwork pages
- `artists` - For artist directories
- `posts` - For social posts/feeds
- `search` - For search results
- `generic` - Default fallback

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | string | "No items found" | Main heading text |
| `subtitle` | string | "Check back soon..." | Secondary description |
| `className` | string | "" | Additional CSS classes |

## Styling

The component uses the `museo-message` CSS class for consistent styling with your design system. You can add additional classes via the `className` prop.
