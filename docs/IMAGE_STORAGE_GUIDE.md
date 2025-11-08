# Image Storage & Deletion Guide

## Overview
This document explains how images are stored and deleted in the Museo application.

## Storage Structure

All images are stored in the Supabase `uploads` bucket with the following path structures:

### 1. Artist Verification Images
**Path:** `requests/${userId}/${fileName}`
- **Files:** Up to 2 images for verification
- **Stored in:** `request.data.images[]` (JSONB array)
- **Example URL:** `https://xxx.supabase.co/storage/v1/object/public/uploads/requests/user123/1234567890-artwork.jpg`

### 2. Seller Application ID Documents
**Path:** `seller-documents/${userId}/${fileName}`
- **Files:** 1 ID document (image or PDF)
- **Stored in:** `request.data.idDocumentUrl` (JSONB field)
- **Example URL:** `https://xxx.supabase.co/storage/v1/object/public/uploads/seller-documents/user456/1234567890-id-document.pdf`

### 3. Visit Bookings
**No uploaded files** - All data is text/form data only

### 4. Profile Pictures
**Path:** `profile/${userId}/${fileName}`
- **Files:** 1 profile picture
- **Stored in:** `profile.profilePicture` column
- **Example URL:** `https://xxx.supabase.co/storage/v1/object/public/uploads/profile/user789/1234567890-avatar.jpg`

### 5. Event Images
**Path:** `events/${fileName}` or `events/${eventId}/${fileName}`
- **Files:** Event poster/image
- **Stored in:** `events.image` column

## Deletion Logic

### When Deleting Requests

The `deleteRequest` function in `requestController.js` handles image deletion for all request types:

```javascript
// For artist verification
if (request.requestType === 'artist_verification' && request.data?.images) {
  // Deletes all images in the array
  for (const imageUrl of images) {
    // Extract path and delete from storage
  }
}

// For seller applications
else if (request.requestType === 'seller_application' && request.data?.idDocumentUrl) {
  // Deletes the single ID document
  // Extract path and delete from storage
}

// Visit bookings don't have uploaded files
```

### Specialized Delete Functions

#### `deleteSellerApplication` (marketplaceController.js)
- Fetches application to get `idDocumentUrl`
- Extracts file path from URL
- Deletes from Supabase storage
- Then deletes database record

## How to Extract File Path

```javascript
// From URL: https://xxx.supabase.co/storage/v1/object/public/uploads/seller-documents/userId/filename.pdf
const urlParts = imageUrl.split('/uploads/');
if (urlParts.length > 1) {
  const filePath = urlParts[1]; // "seller-documents/userId/filename.pdf"
  
  // Delete from storage
  const { error } = await db.storage
    .from('uploads')
    .remove([filePath]);
}
```

## Best Practices

1. **Always fetch the record first** before deletion to get image URLs
2. **Handle errors gracefully** - Continue with deletion even if image removal fails
3. **Log successes and failures** for debugging
4. **Use try-catch blocks** around image deletion to prevent main operation failure
5. **Confirm with user** before deleting records with images

## Testing Checklist

- [ ] Upload artist verification with 2 images
- [ ] Delete artist verification → Check images are removed
- [ ] Upload seller application with ID document
- [ ] Delete seller application → Check document is removed
- [ ] Delete via RequestsTab → Verify images removed
- [ ] Delete via specific endpoints → Verify images removed

## Error Handling

The system is designed to be resilient:
- If image deletion fails, the record deletion still proceeds
- Errors are logged but don't block the operation
- Users get success response even if image cleanup partially fails

This ensures data consistency while maintaining system reliability.
