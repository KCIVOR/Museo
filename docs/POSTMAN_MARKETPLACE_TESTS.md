# Postman Testing Guide - Marketplace Endpoints

## 🔧 Setup

### 1. **Base URL**
```
http://localhost:5000/api
```

### 2. **Authentication**
All endpoints require authentication. Make sure you:
- Have cookies enabled in Postman
- Login first to get session cookie
- Use the same Postman tab/session for all requests

---

## 📋 Test Sequence

### **Phase 1: User Setup & Authentication**

#### 1.1 Login as Artist/Seller
```http
POST /auth/login
Content-Type: application/json

{
  "email": "artist@example.com",
  "password": "password123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "email": "artist@example.com"
  }
}
```

**✅ Check:** Cookie `connect.sid` is set in Postman

---

#### 1.2 Check User Profile (Verify Artist Role)
```http
GET /profile/getProfile
```

**Expected Response:**
```json
{
  "success": true,
  "profile": {
    "userId": "user-uuid",
    "role": "artist",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

**✅ Check:** `role` should be `"artist"`

---

#### 1.3 Check Seller Status
```http
GET /marketplace/seller/status
```

**Expected Response (if seller):**
```json
{
  "success": true,
  "isSeller": true,
  "sellerProfile": {
    "sellerProfileId": "seller-uuid",
    "shopName": "John's Art Shop",
    "shopDescription": "...",
    "fullName": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+1234567890",
    "street": "123 Main St",
    "city": "Manila",
    "province": "Metro Manila",
    "region": "NCR",
    "isActive": true,
    "isSuspended": false
  }
}
```

**Expected Response (if not seller):**
```json
{
  "success": true,
  "isSeller": false,
  "sellerProfile": null
}
```

**✅ Check:** If `isSeller: false`, you need to apply as seller first

---

### **Phase 2: Seller Application (If Not a Seller)**

#### 2.1 Submit Seller Application
```http
POST /marketplace/seller/apply
Content-Type: multipart/form-data

Form Data:
- shopName: "John's Art Shop"
- shopDescription: "Specializing in abstract paintings"
- fullName: "John Doe"
- email: "john@example.com"
- phoneNumber: "+1234567890"
- street: "123 Main St"
- landmark: "Near City Hall"
- region: "NCR"
- province: "Metro Manila"
- city: "Manila"
- barangay: "Barangay 1"
- postalCode: "1000"
- idDocument: [Upload a file]
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Seller application submitted successfully",
  "data": {
    "requestId": "request-uuid",
    "status": "pending"
  }
}
```

**✅ Check:** Application created with `status: "pending"`

---

#### 2.2 Admin Approves Application (Login as Admin)
```http
PUT /marketplace/seller/applications/{applicationId}/approve
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Seller application approved and profile created",
  "sellerProfile": {
    "sellerProfileId": "seller-uuid",
    "shopName": "John's Art Shop"
  }
}
```

**✅ Check:** Seller profile created, `isActive: true`

---

### **Phase 3: Create Marketplace Item**

#### 3.1 Create Item (As Seller)
```http
POST /marketplace/items
Content-Type: application/json

{
  "title": "Sunset Over Mountains",
  "description": "Beautiful landscape painting",
  "price": 2500,
  "medium": "Oil on Canvas",
  "dimensions": "24x36 inches",
  "year_created": 2024,
  "weight_kg": 2.5,
  "is_original": true,
  "is_framed": false,
  "condition": "excellent",
  "images": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ],
  "primary_image": "https://example.com/image1.jpg",
  "quantity": 1,
  "categories": ["landscape", "painting"],
  "tags": ["sunset", "mountains", "nature"]
}
```

**Expected Response:**
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
    "is_available": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

**✅ Check:** 
- Item created successfully
- `sellerProfileId` is present
- `status: "active"`

---

#### 3.2 Create Item (As Non-Seller) - Should Fail
```http
POST /marketplace/items
Content-Type: application/json

{
  "title": "Test Item",
  "price": 100
}
```

**Expected Response:**
```json
{
  "success": false,
  "error": "You must be an approved seller to list items. Please apply to become a seller first.",
  "requiresSellerProfile": true
}
```

**✅ Check:** Request rejected with 403 status

---

### **Phase 4: Get Marketplace Items**

#### 4.1 Get All Items
```http
GET /marketplace/items
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "marketItemId": "item-uuid",
      "userId": "user-uuid",
      "sellerProfileId": "seller-uuid",
      "title": "Sunset Over Mountains",
      "price": 2500,
      "status": "active",
      "sellerProfiles": {
        "sellerProfileId": "seller-uuid",
        "shopName": "John's Art Shop",
        "city": "Manila",
        "province": "Metro Manila",
        "isActive": true,
        "isSuspended": false
      },
      "seller": {
        "shopName": "John's Art Shop",
        "location": "Manila, Metro Manila"
      }
    }
  ],
  "count": 1
}
```

**✅ Check:**
- Items include `seller` object
- Items include `sellerProfiles` object
- Only active sellers' items shown

---

#### 4.2 Get Items by Seller Profile (For Dashboard)
```http
GET /marketplace/items?sellerProfileId={your-seller-profile-id}
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    // Only items from this seller
  ],
  "count": 1
}
```

**✅ Check:** Only returns items from specified seller

---

#### 4.3 Get Items by Status
```http
GET /marketplace/items?status=active
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    // Only active items
  ],
  "count": 1
}
```

**✅ Check:** Only returns items with specified status

---

### **Phase 5: Get Single Item**

#### 5.1 Get Item Details
```http
GET /marketplace/items/{marketItemId}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "marketItemId": "item-uuid",
    "title": "Sunset Over Mountains",
    "price": 2500,
    "sellerProfiles": {
      "sellerProfileId": "seller-uuid",
      "shopName": "John's Art Shop",
      "shopDescription": "Specializing in abstract paintings",
      "fullName": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "+1234567890",
      "street": "123 Main St",
      "city": "Manila",
      "province": "Metro Manila",
      "region": "NCR",
      "isActive": true,
      "isSuspended": false
    }
  }
}
```

**✅ Check:**
- Full seller profile included
- All item details present

---

#### 5.2 Get Item from Suspended Seller - Should Fail
```http
GET /marketplace/items/{item-from-suspended-seller}
```

**Expected Response:**
```json
{
  "success": false,
  "error": "This item is no longer available (seller inactive or suspended)"
}
```

**✅ Check:** Returns 404 status

---

### **Phase 6: Update Item**

#### 6.1 Update Own Item
```http
PUT /marketplace/items/{marketItemId}
Content-Type: application/json

{
  "title": "Sunset Over Mountains - Updated",
  "price": 2800,
  "description": "Updated description"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Item updated successfully",
  "data": {
    "marketItemId": "item-uuid",
    "title": "Sunset Over Mountains - Updated",
    "price": 2800,
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**✅ Check:**
- Item updated successfully
- `updated_at` timestamp changed

---

#### 6.2 Update Someone Else's Item - Should Fail
```http
PUT /marketplace/items/{other-seller-item-id}
Content-Type: application/json

{
  "title": "Hacked Title"
}
```

**Expected Response:**
```json
{
  "success": false,
  "error": "You can only edit your own items"
}
```

**✅ Check:** Request rejected with 403 status

---

#### 6.3 Update as Non-Seller - Should Fail
```http
PUT /marketplace/items/{marketItemId}
Content-Type: application/json

{
  "title": "Test"
}
```

**Expected Response:**
```json
{
  "success": false,
  "error": "You must be an active seller to update items"
}
```

**✅ Check:** Request rejected with 403 status

---

### **Phase 7: Delete Item**

#### 7.1 Delete Own Item
```http
DELETE /marketplace/items/{marketItemId}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Item deleted successfully"
}
```

**✅ Check:** Item deleted from database

---

#### 7.2 Delete Someone Else's Item - Should Fail
```http
DELETE /marketplace/items/{other-seller-item-id}
```

**Expected Response:**
```json
{
  "success": false,
  "error": "You can only delete your own items"
}
```

**✅ Check:** Request rejected with 403 status

---

#### 7.3 Delete as Non-Seller - Should Fail
```http
DELETE /marketplace/items/{marketItemId}
```

**Expected Response:**
```json
{
  "success": false,
  "error": "You must be an active seller to delete items"
}
```

**✅ Check:** Request rejected with 403 status

---

### **Phase 8: Admin Operations**

#### 8.1 Get All Seller Applications (Admin Only)
```http
GET /marketplace/seller/applications
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "requestId": "request-uuid",
      "userId": "user-uuid",
      "requestType": "seller_application",
      "status": "pending",
      "data": {
        "shopName": "John's Art Shop",
        "fullName": "John Doe",
        "email": "john@example.com"
      },
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**✅ Check:** Only admins can access

---

#### 8.2 Suspend Seller (Admin - Future Feature)
```http
PUT /marketplace/seller/{sellerProfileId}/suspend
Content-Type: application/json

{
  "reason": "Violation of terms"
}
```

**Note:** This endpoint needs to be implemented

---

## 🧪 Complete Test Checklist

### **Authentication & Roles:**
- [ ] Login as regular user
- [ ] Login as artist
- [ ] Login as seller
- [ ] Login as admin
- [ ] Check seller status endpoint

### **Seller Application:**
- [ ] Submit application as artist
- [ ] Submit application as non-artist (should fail)
- [ ] Admin approves application
- [ ] Admin rejects application
- [ ] Check seller profile created after approval

### **Create Items:**
- [ ] Create item as seller (success)
- [ ] Create item as non-seller (fail)
- [ ] Create item as non-artist (fail)
- [ ] Verify `sellerProfileId` stored

### **Read Items:**
- [ ] Get all items (includes seller info)
- [ ] Get items by seller profile
- [ ] Get items by status
- [ ] Get single item (includes full seller details)
- [ ] Get item from suspended seller (fail)

### **Update Items:**
- [ ] Update own item (success)
- [ ] Update other seller's item (fail)
- [ ] Update as non-seller (fail)
- [ ] Verify `sellerProfileId` can't be changed

### **Delete Items:**
- [ ] Delete own item (success)
- [ ] Delete other seller's item (fail)
- [ ] Delete as non-seller (fail)

### **Security:**
- [ ] Non-artists can't apply as seller
- [ ] Non-sellers can't create items
- [ ] Sellers can only edit/delete own items
- [ ] Suspended sellers' items hidden
- [ ] `sellerProfileId` validated on all operations

---

## 🚨 Common Issues & Solutions

### Issue 1: "Unauthorized" Error
**Solution:** Make sure you're logged in and cookies are enabled in Postman

### Issue 2: "Only verified artists can list items"
**Solution:** User needs artist role first. Admin must approve artist verification request.

### Issue 3: "You must be an approved seller"
**Solution:** Submit seller application and have admin approve it.

### Issue 4: Items don't show seller info
**Solution:** Check database - items must have `sellerProfileId` column populated.

### Issue 5: Can't update/delete items
**Solution:** Verify you're the owner via `sellerProfileId` match.

---

## 📊 Expected Database State After Tests

### `sellerProfiles` Table:
```sql
SELECT * FROM "sellerProfiles";
```
Should show active seller profiles with `isActive = true`

### `marketplace_items` Table:
```sql
SELECT "marketItemId", "userId", "sellerProfileId", "title", "status" 
FROM marketplace_items;
```
Should show items with `sellerProfileId` populated

### `request` Table:
```sql
SELECT * FROM request WHERE "requestType" = 'seller_application';
```
Should show seller applications with various statuses

---

## 🎯 Success Criteria

✅ All endpoints return expected responses
✅ Security validations work (artist role, seller profile)
✅ Seller info included in item responses
✅ Only sellers can CRUD their own items
✅ Suspended sellers' items are hidden
✅ `sellerProfileId` properly stored and validated

---

## 📝 Notes

- Test in order (Phase 1 → Phase 8)
- Use the same Postman session for all tests
- Save the IDs returned in responses for subsequent tests
- Check database directly to verify data integrity
- Test both success and failure cases

**Happy Testing! 🚀**
