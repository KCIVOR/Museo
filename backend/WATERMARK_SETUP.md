# 🎨 Watermark Setup Guide

## Installation

### Step 1: Install Sharp
```bash
cd backend
npm install sharp
```

### Step 2: Restart Backend Server
```bash
npm run dev
# or
node server.js
```

## Testing the Watermark

### 1. Upload Test
1. Go to your profile page
2. Click "Upload Artwork"
3. Select an image
4. Make sure "🔒 Protect with watermark" is checked
5. Fill in title, description, medium
6. Click "Upload Artwork"

### 2. Verify Watermark
- Open the uploaded image
- Look for watermark in bottom-right corner
- Should show: "© Your Name 2025 • Museo"

## Customization Options

### Change Watermark Position
Edit `backend/controllers/profileController.js` line ~97:

```javascript
// Bottom-right (default)
imageBuffer = await addUserWatermark(imageBuffer, {
  username: displayName,
  userId: userId,
  date: new Date().getFullYear()
});

// Or use custom position:
imageBuffer = await addTextWatermark(imageBuffer, {
  text: `© ${displayName} ${new Date().getFullYear()} • Museo`,
  position: 'bottom-left', // Options: 'bottom-right', 'bottom-left', 'center'
  opacity: 0.6 // 0.0 to 1.0
});
```

### Use Diagonal Pattern
```javascript
imageBuffer = await addDiagonalWatermark(imageBuffer, {
  text: '© Museo',
  opacity: 0.15 // Very subtle
});
```

### Add Logo Watermark
```javascript
import path from 'path';

const logoPath = path.join(__dirname, '../assets/museo-logo.png');
imageBuffer = await addLogoWatermark(imageBuffer, logoPath, {
  position: 'bottom-right',
  size: 0.1, // 10% of image width
  opacity: 0.7
});
```

## Troubleshooting

### Error: Cannot find module 'sharp'
**Solution:** Run `npm install sharp` in the backend folder

### Error: Sharp installation failed
**Solution:** 
```bash
npm install --platform=win32 --arch=x64 sharp
```

### Watermark not showing
**Check:**
1. Backend console for watermark logs: `💧 Adding watermark...`
2. Checkbox is enabled in upload form
3. Sharp is installed correctly
4. Backend server restarted after installation

### Watermark too light/dark
**Adjust opacity in watermark.js:**
```javascript
fill="rgba(255, 255, 255, 0.5)" // Change 0.5 to 0.3-0.8
```

## API Endpoint

**POST** `/api/profile/uploadArt`

**FormData:**
- `images`: File[] (multiple images)
- `title`: string
- `description`: string
- `medium`: string
- `categories`: JSON string
- `applyWatermark`: "true" | "false" (default: "true")

**Response:**
```json
{
  "message": "Art uploaded",
  "artwork": {
    "id": 123,
    "title": "My Artwork",
    "image": ["https://...watermarked-image.jpg"],
    "userId": "user-id",
    ...
  }
}
```

## Performance

- **Sharp is fast:** ~100-500ms per image
- **Multiple images:** Processed sequentially
- **No quality loss:** High-quality watermarking
- **Memory efficient:** Streams processing

## Security

✅ **Server-side processing** - Cannot be bypassed
✅ **Original files never stored** - Only watermarked versions
✅ **User-specific watermarks** - Personalized protection
✅ **Optional toggle** - Artists can choose

## Future Enhancements

- [ ] Custom watermark text per upload
- [ ] Watermark preview before upload
- [ ] Multiple watermark styles (corner, diagonal, center)
- [ ] Watermark intensity slider
- [ ] Logo upload for personal branding
- [ ] Batch watermark existing artworks
