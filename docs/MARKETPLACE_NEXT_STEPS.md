# Marketplace Implementation - Next Steps

## ✅ What We've Completed

### 1. **Unified Request Table Architecture**
- ✅ Refactored visit bookings to use `request` table
- ✅ Fixed statistics tab to work with JSONB data
- ✅ Image deletion handling for all request types (artist verification, seller applications, visit bookings)

### 2. **Seller Profile System**
- ✅ Artist role requirement enforced (User → Artist → Seller)
- ✅ Seller application validation in backend
- ✅ Seller status endpoint (`GET /api/marketplace/seller/status`)
- ✅ UserContext integration with `isSeller` and `sellerProfile` data
- ✅ Settings page shows correct seller status
- ✅ Seller Dashboard protected (only accessible to verified sellers)
- ✅ Marketplace button visibility (only sellers see dashboard button)

---

## 🚧 Critical Next Steps

### **Phase 1: Database Schema Updates (HIGH PRIORITY)**

#### 1. Add `sellerProfileId` to `marketplace_items` table
```sql
-- Add seller profile reference
ALTER TABLE marketplace_items 
ADD COLUMN "sellerProfileId" UUID REFERENCES "sellerProfiles"("sellerProfileId") ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX idx_marketplace_items_sellerProfileId 
ON marketplace_items("sellerProfileId");

-- Make it required for new items (optional: do this after migrating existing data)
-- ALTER TABLE marketplace_items 
-- ALTER COLUMN "sellerProfileId" SET NOT NULL;
```

**Why this is critical:**
- Currently, marketplace items only store `userId`
- No validation that the user is an approved seller
- Can't display seller shop information to buyers
- Can't track which items belong to which seller profile

---

### **Phase 2: Update Backend Controllers**

#### 1. **Update `createMarketplaceItem`** ⚠️ CRITICAL
**File:** `backend/controllers/marketplaceController.js`

**Current Issue:** Anyone can create marketplace items (no seller validation)

**Required Changes:**
```javascript
export const createMarketplaceItem = async (req, res) => {
  const userId = req.user?.id;
  
  // ✅ Step 1: Verify user is an artist
  const { data: userProfile } = await db
    .from('profile')
    .select('role')
    .eq('userId', userId)
    .single();

  if (userProfile?.role !== 'artist') {
    return res.status(403).json({ 
      error: 'Only verified artists can list items.' 
    });
  }

  // ✅ Step 2: Get active seller profile
  const { data: sellerProfile } = await db
    .from('sellerProfiles')
    .select('*')
    .eq('userId', userId)
    .eq('isActive', true)
    .eq('isSuspended', false)
    .single();

  if (!sellerProfile) {
    return res.status(403).json({ 
      error: 'You must be an approved seller to list items.' 
    });
  }

  // ✅ Step 3: Create item with sellerProfileId
  const newItem = {
    userId: userId,
    sellerProfileId: sellerProfile.sellerProfileId, // ✅ ADD THIS
    title,
    price,
    // ... other fields
  };

  const { data, error } = await db
    .from('marketplace_items')
    .insert([newItem])
    .select()
    .single();

  // Return success
};
```

#### 2. **Update `getMarketplaceItems`** - Join with seller profiles
```javascript
export const getMarketplaceItems = async (req, res) => {
  const { data: items, error } = await db
    .from('marketplace_items')
    .select(`
      *,
      sellerProfiles!inner (
        sellerProfileId,
        shopName,
        city,
        province
      )
    `)
    .eq('sellerProfiles.isActive', true)
    .eq('sellerProfiles.isSuspended', false)
    .order('created_at', { ascending: false });

  // Transform to include seller info
  const transformedItems = items.map(item => ({
    ...item,
    seller: {
      shopName: item.sellerProfiles.shopName,
      location: `${item.sellerProfiles.city}, ${item.sellerProfiles.province}`
    }
  }));

  res.json({ success: true, data: transformedItems });
};
```

#### 3. **Update `getMarketplaceItem`** - Include full seller details
```javascript
export const getMarketplaceItem = async (req, res) => {
  const { data: item } = await db
    .from('marketplace_items')
    .select(`
      *,
      sellerProfiles (
        sellerProfileId,
        shopName,
        shopDescription,
        fullName,
        email,
        phoneNumber,
        city,
        province
      )
    `)
    .eq('marketItemId', id)
    .single();

  // Check if seller is still active
  if (!item.sellerProfiles?.isActive || item.sellerProfiles?.isSuspended) {
    return res.status(404).json({ 
      error: 'This item is no longer available' 
    });
  }

  res.json({ success: true, data: item });
};
```

---

### **Phase 3: Frontend Updates**

#### 1. **Update Marketplace Item Cards**
**File:** `frontend/src/pages/Marketplace/Marketplace.jsx`

Display seller information on each card:
```jsx
<div className="mp-card-seller">
  <span className="seller-shop-name">{item.seller?.shopName}</span>
  <span className="seller-location">{item.seller?.location}</span>
</div>
```

#### 2. **Update Product Detail Modal**
**File:** `frontend/src/pages/Marketplace/ProductDetailModal.jsx`

Show full seller profile:
```jsx
<div className="seller-info-section">
  <h3>Sold by</h3>
  <div className="seller-card">
    <h4>{item.sellerProfiles?.shopName}</h4>
    <p>{item.sellerProfiles?.shopDescription}</p>
    <p>📍 {item.sellerProfiles?.city}, {item.sellerProfiles?.province}</p>
    <button onClick={() => navigate(`/seller/${item.sellerProfiles?.sellerProfileId}`)}>
      View Shop
    </button>
  </div>
</div>
```

#### 3. **Update Seller Dashboard**
**File:** `frontend/src/pages/Marketplace/SellerDashboard.jsx`

- Fetch only items belonging to the seller's profile
- Use `sellerProfileId` from `userData.sellerProfile.sellerProfileId`

```javascript
const fetchMyProducts = async () => {
  const response = await fetch(
    `${API}/marketplace/items?sellerProfileId=${userData.sellerProfile.sellerProfileId}`,
    { credentials: 'include' }
  );
  const data = await response.json();
  setProducts(data.items);
};
```

---

### **Phase 4: Additional Features**

#### 1. **Seller Public Profile Page**
Create a page where buyers can view all items from a specific seller:
- Route: `/seller/:sellerProfileId`
- Shows shop name, description, location
- Lists all active items from that seller
- Shows seller ratings/reviews (future feature)

#### 2. **Seller Dashboard Enhancements**
- Real sales statistics (not mock data)
- Order management
- Inventory tracking
- Revenue analytics

#### 3. **Admin Features**
- Suspend seller accounts
- View all marketplace items by seller
- Seller performance metrics

---

## 📋 Implementation Priority

### **🔴 Must Do Now (Blocking)**
1. ✅ Add `sellerProfileId` column to `marketplace_items` table
2. ✅ Update `createMarketplaceItem` to validate seller status
3. ✅ Update `createMarketplaceItem` to store `sellerProfileId`

### **🟡 Should Do Soon (Important)**
4. Update `getMarketplaceItems` to join with seller profiles
5. Update `getMarketplaceItem` to include seller info
6. Update frontend to display seller information
7. Create seller public profile page

### **🟢 Nice to Have (Enhancement)**
8. Seller dashboard real data integration
9. Order management system
10. Seller ratings/reviews
11. Analytics and reporting

---

## 🎯 Recommended Workflow

### **Today:**
1. Run the SQL migration to add `sellerProfileId` column
2. Update `createMarketplaceItem` controller
3. Test creating a new marketplace item as a seller

### **This Week:**
4. Update all marketplace queries to join with seller profiles
5. Update frontend to display seller information
6. Create seller public profile page

### **Next Week:**
7. Integrate real sales data into seller dashboard
8. Build order management features
9. Add seller analytics

---

## 🔍 Testing Checklist

- [ ] Non-artists cannot apply to be sellers
- [ ] Non-sellers cannot create marketplace items
- [ ] Marketplace items store `sellerProfileId`
- [ ] Seller information displays on item cards
- [ ] Seller information displays on item detail page
- [ ] Suspended sellers' items are hidden
- [ ] Seller dashboard only shows seller's own items
- [ ] Seller dashboard button only visible to sellers
- [ ] Non-sellers redirected from seller dashboard

---

## 📚 Related Documentation

- `MARKETPLACE_SELLER_PROFILE_INTEGRATION.md` - Detailed integration guide
- `IMAGE_STORAGE_GUIDE.md` - Image handling for marketplace items
- Database schema files in `database/schema/`

---

## 💡 Notes

- The current marketplace items are using mock data
- You'll need to migrate existing items to have `sellerProfileId` if any exist
- Consider adding a "featured sellers" section on the marketplace homepage
- Think about commission/fee structure for sales (stored in seller profile)
