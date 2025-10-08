# 🍞 Toast Notification System

A reusable, customizable toast notification component for real-time notifications.

## Features

- ✅ **Reusable & Configurable** - Customize position, duration, max toasts
- ✅ **Socket Integration** - Automatically handles socket notifications
- ✅ **Custom Handlers** - Define custom notification types and behaviors
- ✅ **Programmatic API** - Add toasts manually via JavaScript
- ✅ **Multiple Positions** - 6 different positioning options
- ✅ **Auto-dismiss** - Configurable auto-removal timing
- ✅ **Click Actions** - Custom click handlers for each notification type
- ✅ **Responsive Design** - Works on all screen sizes

## Basic Usage

```jsx
import ToastNotification from './components/ToastNotification'

function App() {
  return (
    <div>
      {/* Your app content */}
      <ToastNotification />
    </div>
  )
}
```

## Configuration Options

```jsx
<ToastNotification 
  position="bottom-left"        // Position on screen
  duration={6000}              // Auto-dismiss time (ms)
  maxToasts={5}                // Max simultaneous toasts
  enableSocket={true}          // Enable socket notifications
  customHandlers={{            // Custom notification handlers
    user_login: (payload) => ({
      title: 'User Login',
      message: `${payload.username} logged in`,
      type: 'user_login',
      clickAction: null
    })
  }}
/>
```

## Position Options

- `bottom-left` (default)
- `bottom-right`
- `bottom-center`
- `top-left`
- `top-right`
- `top-center`

## Programmatic Usage

Add toasts manually from anywhere in your app:

```javascript
// Simple toast
window.addToast({
  title: 'Success!',
  message: 'Your action was completed',
  type: 'success'
})

// Toast with custom click action
window.addToast({
  title: 'New Message',
  message: 'You have a new message from John',
  type: 'message',
  image: '/path/to/avatar.jpg',
  clickAction: (toast) => {
    // Navigate to messages
    window.location.href = '/messages'
  }
})

// Event notification
window.addToast({
  title: 'New Event',
  message: 'Art Exhibition at Gallery X',
  type: 'event_created',
  image: '/path/to/event-image.jpg',
  eventId: 'event-123',
  duration: 8000 // Custom duration
})
```

## Custom Notification Handlers

Define how different notification types should be displayed:

```jsx
const customHandlers = {
  // Custom event handler
  auction_started: (payload) => ({
    id: payload.auctionId,
    type: 'auction_started',
    title: 'Auction Started!',
    message: `Bidding is now open for "${payload.artworkTitle}"`,
    image: payload.artworkImage,
    duration: 10000, // 10 seconds
    clickAction: (toast) => {
      navigate(`/auction/${payload.auctionId}`)
    }
  }),
  
  // System notification
  maintenance: (payload) => ({
    type: 'maintenance',
    title: 'System Maintenance',
    message: payload.message,
    duration: 15000, // 15 seconds
    clickAction: null // Not clickable
  })
}

<ToastNotification customHandlers={customHandlers} />
```

## Styling

The component uses CSS classes that can be customized:

```css
/* Container positioning */
.toast-container--bottom-left { }
.toast-container--top-right { }

/* Toast appearance */
.toast { }
.toast--event_created { }
.toast--user_login { }

/* Content elements */
.toast__title { }
.toast__message { }
.toast__image { }
.toast__close { }
```

## Examples

### Different Positions
```jsx
{/* Bottom right corner */}
<ToastNotification position="bottom-right" />

{/* Top center */}
<ToastNotification position="top-center" maxToasts={3} />
```

### Custom Event Types
```jsx
const artHandlers = {
  artwork_sold: (payload) => ({
    title: 'Artwork Sold!',
    message: `"${payload.title}" by ${payload.artist}`,
    image: payload.image,
    type: 'artwork_sold',
    clickAction: (toast) => navigate(`/artwork/${payload.id}`)
  }),
  
  new_follower: (payload) => ({
    title: 'New Follower',
    message: `${payload.username} started following you`,
    image: payload.avatar,
    type: 'new_follower',
    clickAction: (toast) => navigate(`/profile/${payload.userId}`)
  })
}

<ToastNotification 
  position="top-right"
  customHandlers={artHandlers}
  duration={8000}
/>
```

### Manual Toast Triggers
```jsx
// In a component
const handleSuccess = () => {
  window.addToast({
    title: 'Upload Complete',
    message: 'Your artwork has been uploaded successfully',
    type: 'success'
  })
}

// In an API response
fetch('/api/submit-artwork')
  .then(response => {
    if (response.ok) {
      window.addToast({
        title: 'Artwork Submitted',
        message: 'Your artwork is now under review',
        type: 'submission'
      })
    }
  })
```

## Integration with Socket.io

The component automatically listens for socket notifications when `enableSocket={true}`:

```javascript
// Backend - emit notification
io.emit('notification', {
  type: 'event_created',
  title: 'New Art Exhibition',
  venueName: 'Modern Art Gallery',
  image: 'https://example.com/event.jpg',
  eventId: 'event-123'
})

// Frontend - automatically shows toast
// No additional code needed!
```

## Best Practices

1. **Limit notification types** - Don't overwhelm users
2. **Use appropriate durations** - Important notifications should stay longer
3. **Provide clear actions** - Make clickable toasts obvious
4. **Test on mobile** - Ensure toasts work on small screens
5. **Handle errors gracefully** - Fallback for missing images/data
