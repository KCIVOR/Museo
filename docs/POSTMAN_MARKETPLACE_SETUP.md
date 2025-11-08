# 📦 Postman Guide: Create Marketplace Items

## Prerequisites

Before creating marketplace items, you need:

1. ✅ **User Account** - Registered and logged in
2. ✅ **Artist Role** - User must have `role: 'artist'` in profile table
3. ✅ **Approved Seller Profile** - Active seller profile in `sellerProfiles` table

---

## 🔐 Step 1: Login to Get Session Cookie

### Request:
```
POST http://localhost:3000/api/auth/login
```

### Headers:
```
Content-Type: application/json
```

### Body (raw JSON):
```json
{
  "email": "your-email@example.com",
  "password": "your-password"
}
```

### Response:
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user-uuid-here",
    "email": "your-email@example.com"
  }
}
```

**Important:** Postman will automatically save the session cookie from this response.

---

## 🎨 Step 2: Verify You're an Artist

### Request:
```
GET http://localhost:3000/api/profile/getProfile
```

### Headers:
```
(Cookies automatically included from login)
```

### Expected Response:
```json
{
  "success": true,
  "profile": {
    "userId": "user-uuid",
    "username": "yourname",
    "role": "artist",  // ← Must be 'artist'
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

**If role is NOT 'artist':**
You need to update the profile table in Supabase:
```sql
UPDATE profile 
SET role = 'artist' 
WHERE "userId" = 'your-user-uuid';
```

---

## 🏪 Step 3: Check Seller Status

### Request:
```
GET http://localhost:3000/api/marketplace/seller/status
```

### Headers:
```
(Cookies automatically included)
```

### Expected Response:
```json
{
  "success": true,
  "isSeller": true,
  "sellerProfile": {
    "sellerProfileId": "seller-uuid",
    "shopName": "My Art Shop",
    "isActive": true,
    "isSuspended": false
  }
}
```

**If NOT a seller yet:**
You need to create a seller application first (see below).

---

## 📝 Step 3a: Create Seller Application (If Needed)

### Request:
```
POST http://localhost:3000/api/marketplace/seller/apply
```

### Headers:
```
Content-Type: application/json
```

### Body (raw JSON):
```json
{
  "shopName": "My Art Gallery",
  "shopDescription": "Beautiful handcrafted artworks",
  "fullName": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "+639123456789",
  "street": "123 Main Street",
  "barangay": "Barangay 1",
  "city": "Quezon City",
  "province": "Metro Manila",
  "region": "NCR",
  "postalCode": "1100",
  "idDocumentUrl": "https://example.com/id-document.jpg"
}
```

**Then approve it in Supabase:**
```sql
UPDATE "sellerProfiles" 
SET "isActive" = true, 
    "approvedAt" = NOW(),
    "approvedBy" = 'admin-user-id'
WHERE "userId" = 'your-user-uuid';
```

---

## 🛍️ Step 4: Create Marketplace Item

### Request:
```
POST http://localhost:3000/api/marketplace/items
```

### Headers:
```
Content-Type: application/json
```

### Body (raw JSON):

#### Example 1: Simple Painting
```json
{
  "title": "Sunset Over Mountains",
  "description": "A beautiful oil painting capturing the golden hour over mountain peaks",
  "price": 2500,
  "medium": "Oil on Canvas",
  "dimensions": "24x36 inches",
  "year_created": 2024,
  "weight_kg": 2.5,
  "is_original": true,
  "is_framed": true,
  "condition": "excellent",
  "primary_image": "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/gallery/your-image.jpg",
  "images": [
    "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/gallery/image1.jpg",
    "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/gallery/image2.jpg"
  ],
  "quantity": 1,
  "categories": ["landscape", "painting"],
  "tags": ["sunset", "mountains", "nature"]
}
```

#### Example 2: Digital Art Print
```json
{
  "title": "Abstract Dreams",
  "description": "Modern digital art print, limited edition",
  "price": 500,
  "medium": "Digital Print",
  "dimensions": "18x24 inches",
  "year_created": 2024,
  "weight_kg": 0.5,
  "is_original": false,
  "is_framed": false,
  "condition": "new",
  "primary_image": "https://your-image-url.jpg",
  "images": ["https://image1.jpg", "https://image2.jpg"],
  "quantity": 50,
  "categories": ["digital", "abstract"],
  "tags": ["modern", "colorful", "print"]
}
```

#### Example 3: Sculpture
```json
{
  "title": "Bronze Dancer",
  "description": "Hand-crafted bronze sculpture of a ballet dancer",
  "price": 8500,
  "medium": "Bronze",
  "dimensions": "12x6x18 inches (HxWxD)",
  "year_created": 2023,
  "weight_kg": 15.5,
  "is_original": true,
  "is_framed": false,
  "condition": "excellent",
  "primary_image": "https://your-sculpture-image.jpg",
  "images": ["https://front.jpg", "https://side.jpg", "https://back.jpg"],
  "quantity": 1,
  "categories": ["sculpture", "bronze"],
  "tags": ["dancer", "ballet", "bronze", "handcrafted"]
}
```

### Expected Response:
```json
{
  "success": true,
  "message": "Marketplace item created successfully",
  "data": {
    "marketItemId": "item-uuid",
    "userId": "user-uuid",
    "sellerProfileId": "seller-uuid",
    "title": "Sunset Over Mountains",
    "price": 2500,
    "status": "active",
    "created_at": "2024-01-08T10:30:00Z"
  }
}
```

---

## 📋 Field Reference

### Required Fields:
- `title` (string) - Item name
- `price` (number) - Price in your currency

### Optional Fields:
- `description` (string) - Detailed description
- `medium` (string) - Art medium (Oil, Acrylic, Digital, etc.)
- `dimensions` (string) - Size (e.g., "24x36 inches")
- `year_created` (number) - Year artwork was created
- `weight_kg` (number) - Weight for shipping
- `is_original` (boolean) - true for original, false for prints
- `is_framed` (boolean) - Whether item comes framed
- `condition` (string) - "excellent", "good", "fair", "poor"
- `primary_image` (string) - Main display image URL
- `images` (array) - Additional image URLs
- `quantity` (number) - Stock quantity (default: 1)
- `categories` (array) - Category tags
- `tags` (array) - Search tags

---

## 🔍 Step 5: Verify Item Was Created

### Request:
```
GET http://localhost:3000/api/marketplace/items
```

### Response:
```json
{
  "success": true,
  "data": [
    {
      "marketItemId": "item-uuid",
      "title": "Sunset Over Mountains",
      "price": 2500,
      "primary_image": "https://...",
      "seller": {
        "shopName": "My Art Gallery",
        "location": "Quezon City, Metro Manila"
      },
      "created_at": "2024-01-08T10:30:00Z"
    }
  ],
  "count": 1
}
```

---

## 🚀 Quick Test Data Script

Create multiple items quickly:

### Request 1: Painting
```json
{
  "title": "Ocean Waves",
  "price": 1800,
  "medium": "Watercolor",
  "dimensions": "16x20 inches",
  "is_original": true,
  "quantity": 1,
  "categories": ["landscape", "seascape"]
}
```

### Request 2: Print
```json
{
  "title": "City Lights",
  "price": 350,
  "medium": "Digital Print",
  "dimensions": "12x18 inches",
  "is_original": false,
  "quantity": 100,
  "categories": ["urban", "photography"]
}
```

### Request 3: Abstract
```json
{
  "title": "Chaos Theory",
  "price": 3200,
  "medium": "Acrylic on Canvas",
  "dimensions": "30x40 inches",
  "is_original": true,
  "quantity": 1,
  "categories": ["abstract", "modern"]
}
```

---

## ⚠️ Common Errors

### Error: "Only verified artists can list items"
**Solution:** Update profile role to 'artist'
```sql
UPDATE profile SET role = 'artist' WHERE "userId" = 'your-uuid';
```

### Error: "You must be an approved seller"
**Solution:** Create and approve seller profile (see Step 3a)

### Error: "Unauthorized"
**Solution:** Login again to get fresh session cookie

### Error: "Title and price are required"
**Solution:** Include both `title` and `price` in request body

---

## 📸 Image URLs

You can use:
1. **Supabase Storage URLs** (recommended)
2. **External image URLs** (imgur, cloudinary, etc.)
3. **Placeholder images** for testing

Example Supabase URL format:
```
https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/gallery/your-image.jpg
```

---

## ✅ Checklist

- [ ] Logged in successfully
- [ ] User has 'artist' role
- [ ] Seller profile created and approved
- [ ] Created first marketplace item
- [ ] Verified item appears in GET /marketplace/items
- [ ] Item displays in frontend marketplace page

---

## 🎯 Next Steps

After creating items:
1. Visit `http://localhost:5173/marketplace` to see your items
2. Test filtering by category
3. Test search functionality
4. Test add to cart
5. Test checkout flow

**Happy Testing! 🚀**
