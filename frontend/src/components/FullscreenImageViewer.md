# FullscreenImageViewer Component

A reusable fullscreen image viewer component for the Museo application.

## Features

- **Single or Multiple Images**: Supports both single image and image gallery viewing
- **Keyboard Navigation**: ESC to close, arrow keys to navigate between images
- **Touch/Click Navigation**: Click outside to close, navigation buttons for multiple images
- **Responsive Design**: Scales images to fit viewport while maintaining aspect ratio
- **Customizable Styling**: Override default styles with custom styles object
- **Accessibility**: Proper alt text, keyboard navigation, and focus management

## Usage

### Basic Single Image

```jsx
import FullscreenImageViewer from '../components/FullscreenImageViewer';

function MyComponent() {
  const [showFullscreen, setShowFullscreen] = useState(false);
  const imageUrl = "https://example.com/image.jpg";

  return (
    <>
      <img 
        src={imageUrl} 
        onClick={() => setShowFullscreen(true)}
        style={{ cursor: 'pointer' }}
      />
      
      <FullscreenImageViewer
        isOpen={showFullscreen}
        onClose={() => setShowFullscreen(false)}
        images={imageUrl}
        alt="My Image"
      />
    </>
  );
}
```

### Multiple Images Gallery

```jsx
import FullscreenImageViewer from '../components/FullscreenImageViewer';

function GalleryComponent() {
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg",
    "https://example.com/image3.jpg"
  ];

  return (
    <>
      <div className="gallery-grid">
        {images.map((image, index) => (
          <img 
            key={index}
            src={image} 
            onClick={() => {
              setCurrentIndex(index);
              setShowFullscreen(true);
            }}
            style={{ cursor: 'pointer' }}
          />
        ))}
      </div>
      
      <FullscreenImageViewer
        isOpen={showFullscreen}
        onClose={() => setShowFullscreen(false)}
        images={images}
        currentIndex={currentIndex}
        onIndexChange={setCurrentIndex}
        alt="Gallery Image"
      />
    </>
  );
}
```

### Custom Styling

```jsx
<FullscreenImageViewer
  isOpen={showFullscreen}
  onClose={() => setShowFullscreen(false)}
  images={images}
  currentIndex={currentIndex}
  onIndexChange={setCurrentIndex}
  alt="Custom Styled Image"
  styles={{
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)' // Lighter overlay
    },
    image: {
      borderRadius: '16px', // More rounded corners
      maxWidth: '90vw'      // Smaller max width
    },
    counter: {
      background: 'rgba(255, 255, 255, 0.9)',
      color: 'black'
    }
  }}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | boolean | - | Whether the fullscreen viewer is open |
| `onClose` | function | - | Function called when closing the viewer |
| `images` | string \| array | - | Single image URL or array of image URLs |
| `currentIndex` | number | 0 | Current image index (for multiple images) |
| `onIndexChange` | function | - | Function called when image index changes |
| `alt` | string | "Image" | Alt text for the image |
| `styles` | object | {} | Custom styles override object |

## Keyboard Controls

- **ESC**: Close the fullscreen viewer
- **Arrow Left**: Previous image (if multiple images)
- **Arrow Right**: Next image (if multiple images)

## Style Override Structure

```jsx
styles = {
  overlay: {}, // Main fullscreen overlay
  image: {},   // The main image element
  counter: {}, // Image counter (1/3, 2/3, etc.)
  closeButton: {}, // Close button (X)
  navButton: {}    // Navigation buttons (< >)
}
```

## Integration Examples

### In Gallery.jsx
```jsx
// Add to your Gallery component for artwork viewing
<FullscreenImageViewer
  isOpen={showArtworkFullscreen}
  onClose={() => setShowArtworkFullscreen(false)}
  images={selectedArtwork.images}
  alt={selectedArtwork.title}
/>
```

### In Event.jsx
```jsx
// Add to your Event component for event image viewing
<FullscreenImageViewer
  isOpen={showEventImage}
  onClose={() => setShowEventImage(false)}
  images={event.image}
  alt={event.title}
/>
```

### In Artist Profile
```jsx
// Add to artist profile for portfolio viewing
<FullscreenImageViewer
  isOpen={showPortfolioImage}
  onClose={() => setShowPortfolioImage(false)}
  images={artist.portfolioImages}
  currentIndex={portfolioIndex}
  onIndexChange={setPortfolioIndex}
  alt={`${artist.name} Portfolio`}
/>
```
