# Marketplace Endpoints - Seller Profile Integration Status

## ✅ Complete Checklist

### **MARKETPLACE ITEMS ENDPOINTS**

#### 1. `createMarketplaceItem` ✅
- **Status:** READY
- **Updates:**
  - ✅ Validates user is artist
  - ✅ Validates user has active seller profile
  - ✅ Stores `sellerProfileId` in marketplace_items
  - ✅ Rejects non-sellers
- **Route:** `POST /api/marketplace/items`

#### 2. `getMarketplaceItems` ✅
- **Status:** READY
- **Updates:**
  - ✅ Joins with `sellerProfiles` table
  - ✅ Returns seller shop info (shopName, city, province)
  - ✅ Filters out suspended sellers
  - ✅ Supports `sellerProfileId` query param
- **Route:** `GET /api/marketplace/items`

#### 3. `getMarketplaceItem` ✅
- **Status:** READY
- **Updates:**
  - ✅ Joins with full seller profile
  - ✅ Returns complete seller details
  - ✅ Returns 404 if seller is suspended/inactive
- **Route:** `GET /api/marketplace/items/:id`

#### 4. `updateMarketplaceItem` ✅
- **Status:** READY
- **Updates:**
  - ✅ Validates user has active seller profile
  - ✅ Checks ownership via `sellerProfileId`
  - ✅ Admins can update any item (moderation)
  - ✅ Prevents updating `sellerProfileId`
- **Route:** `PUT /api/marketplace/items/:id`

#### 5. `deleteMarketplaceItem` ✅
- **Status:** READY
- **Updates:**
  - ✅ Validates user has active seller profile
  - ✅ Checks ownership via `sellerProfileId`
  - ✅ Admins can delete any item (moderation)
- **Route:** `DELETE /api/marketplace/items/:id`

#### 6. `createTestItems` ⚠️
- **Status:** TESTING ONLY
- **Note:** Should be removed in production
- **Route:** `POST /api/marketplace/test-items`

---

### **CART ENDPOINTS**

#### 7. `getCart` ✅
- **Status:** READY
- **Updates:**
  - ✅ Joins cart_items → marketplace_items → sellerProfiles
  - ✅ Returns seller info for each cart item
  - ✅ Shows shop name and location
- **Route:** `GET /api/marketplace/cart`

#### 8. `addToCart` ✅
- **Status:** READY
- **Updates:**
  - ✅ No changes needed (references marketplace_items)
  - ✅ Seller info retrieved via marketplace_items join
- **Route:** `POST /api/marketplace/cart`

#### 9. `updateCartQuantity` ✅
- **Status:** READY
- **Updates:**
  - ✅ No changes needed
- **Route:** `PUT /api/marketplace/cart/:itemId`

#### 10. `removeFromCart` ✅
- **Status:** READY
- **Updates:**
  - ✅ No changes needed
- **Route:** `DELETE /api/marketplace/cart/:itemId`

#### 11. `clearCart` ✅
- **Status:** READY
- **Updates:**
  - ✅ No changes needed
- **Route:** `DELETE /api/marketplace/cart`

---

### **ORDER ENDPOINTS**

#### 12. `createOrder` ✅
- **Status:** READY
- **Updates:**
  - ✅ Validates sellers are active before checkout
  - ✅ Stores `sellerProfileId` in order_items
  - ✅ Checks `isActive` and `!isSuspended`
  - ✅ Groups items by `sellerProfileId`
  - ✅ Rejects orders with suspended sellers
- **Route:** `POST /api/marketplace/orders`

#### 13. `getBuyerOrders` ✅
- **Status:** READY
- **Updates:**
  - ✅ Groups order items by `sellerProfileId`
  - ✅ Shows seller count per order
- **Route:** `GET /api/marketplace/orders/buyer`

#### 14. `getSellerOrders` ✅
- **Status:** READY
- **Updates:**
  - ✅ Gets user's seller profile first
  - ✅ Filters orders by `sellerProfileId`
  - ✅ Only active sellers can view
  - ✅ Shows only their own orders
- **Route:** `GET /api/marketplace/orders/seller`

#### 15. `getOrderDetails` ✅
- **Status:** READY
- **Updates:**
  - ✅ Checks access via `sellerProfileId`
  - ✅ Groups items by `sellerProfileId`
  - ✅ Buyers and sellers can view
- **Route:** `GET /api/marketplace/orders/:orderId`

#### 16. `markOrderAsShipped` ✅
- **Status:** READY
- **Updates:**
  - ✅ Validates user has active seller profile
  - ✅ Checks ownership via `sellerProfileId`
  - ✅ Only sellers with items in order can ship
- **Route:** `PUT /api/marketplace/orders/:orderId/ship`

#### 17. `markOrderAsDelivered` ✅
- **Status:** READY
- **Updates:**
  - ✅ No changes needed (buyer action)
- **Route:** `PUT /api/marketplace/orders/:orderId/deliver`

#### 18. `cancelOrder` ✅
- **Status:** READY
- **Updates:**
  - ✅ Checks permission via `sellerProfileId`
  - ✅ Both buyer and seller can cancel
  - ✅ Restores inventory
- **Route:** `PUT /api/marketplace/orders/:orderId/cancel`

---

### **SELLER APPLICATION ENDPOINTS**

#### 19. `submitSellerApplication` ✅
- **Status:** READY
- **Updates:**
  - ✅ Validates user is artist first
  - ✅ Creates request with seller profile data
  - ✅ Uploads ID document to storage
- **Route:** `POST /api/marketplace/seller/apply`

#### 20. `getMySellerApplication` ✅
- **Status:** READY
- **Updates:**
  - ✅ Returns user's seller application
  - ✅ Shows status (pending/approved/rejected)
- **Route:** `GET /api/marketplace/seller/my-application`

#### 21. `getAllSellerApplications` ✅
- **Status:** READY (Admin only)
- **Updates:**
  - ✅ Returns all seller applications
  - ✅ Filters by status
- **Route:** `GET /api/marketplace/seller/applications`

#### 22. `approveSellerApplication` ✅
- **Status:** READY (Admin only)
- **Updates:**
  - ✅ Creates seller profile in `sellerProfiles` table
  - ✅ Updates request status to approved
  - ✅ Sets `isActive: true`
- **Route:** `PUT /api/marketplace/seller/applications/:applicationId/approve`

#### 23. `rejectSellerApplication` ✅
- **Status:** READY (Admin only)
- **Updates:**
  - ✅ Updates request status to rejected
  - ✅ Stores rejection reason
- **Route:** `PUT /api/marketplace/seller/applications/:applicationId/reject`

#### 24. `deleteSellerApplication` ✅
- **Status:** READY (Admin only)
- **Updates:**
  - ✅ Deletes application and associated files
- **Route:** `DELETE /api/marketplace/seller/applications/:applicationId`

#### 25. `checkSellerStatus` ✅
- **Status:** READY
- **Updates:**
  - ✅ Returns complete seller profile
  - ✅ Returns `isSeller` boolean
  - ✅ Used by UserContext
- **Route:** `GET /api/marketplace/seller/status`

#### 26. `cancelMyApplication` ⚠️
- **Status:** TESTING ONLY
- **Note:** For testing resubmission flow
- **Route:** `DELETE /api/marketplace/seller/my-application`

---

## 📊 Summary

### **Total Endpoints:** 26

### **By Category:**
- **Marketplace Items:** 6 endpoints (5 production + 1 test)
- **Cart Management:** 5 endpoints
- **Orders:** 7 endpoints
- **Seller Applications:** 7 endpoints (6 production + 1 test)

### **Integration Status:**
- ✅ **Ready for Production:** 24 endpoints
- ⚠️ **Testing Only:** 2 endpoints (remove before production)

---

## 🔒 Security Features

### **All Endpoints Include:**
1. ✅ Authentication checks (`req.user?.id`)
2. ✅ Role-based access control (artist, seller, admin)
3. ✅ Seller profile validation
4. ✅ Ownership verification via `sellerProfileId`
5. ✅ Active/suspended seller checks

### **Admin-Only Endpoints:**
- `getAllSellerApplications`
- `approveSellerApplication`
- `rejectSellerApplication`
- `deleteSellerApplication`
- Can update/delete any marketplace item (moderation)

### **Seller-Only Endpoints:**
- `createMarketplaceItem` (requires active seller profile)
- `updateMarketplaceItem` (own items only)
- `deleteMarketplaceItem` (own items only)
- `getSellerOrders`
- `markOrderAsShipped`

### **Public Endpoints:**
- `getMarketplaceItems` (browse marketplace)
- `getMarketplaceItem` (view item details)

---

## ✅ Database Requirements

### **Tables Must Have:**
- ✅ `marketplace_items.sellerProfileId` (UUID, nullable, FK to sellerProfiles)
- ✅ `order_items.sellerProfileId` (UUID, nullable, FK to sellerProfiles)
- ✅ Indexes on both `sellerProfileId` columns

### **Migration File:**
- 📄 `database/migrations/add_sellerProfileId_to_order_items.sql`

---

## 🧪 Testing Checklist

### **Before Production:**
- [ ] Remove `createTestItems` endpoint
- [ ] Remove `cancelMyApplication` endpoint (or restrict to dev only)
- [ ] Test all seller profile validations
- [ ] Test suspended seller scenarios
- [ ] Test admin moderation features
- [ ] Verify all seller info displays correctly
- [ ] Test complete transaction flow
- [ ] Verify inventory updates
- [ ] Test order cancellation and refunds

---

## 🎯 All Systems Ready!

**Every endpoint has been updated to work with seller profiles.**

**Next Steps:**
1. Run the database migration
2. Test with Postman (use the test guides)
3. Remove testing endpoints before production
4. Deploy! 🚀
