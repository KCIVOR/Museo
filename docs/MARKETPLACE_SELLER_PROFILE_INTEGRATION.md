# Marketplace & Seller Profile Integration - Recommendations

## Current State Analysis

### ✅ What You Have:
1. **Seller Profiles Table** - Stores approved seller information
2. **Marketplace Items** - Currently linked to `userId` only
3. **Seller Application System** - Creates seller profiles upon approval
4. **Artist Role System** - Users must be artists before becoming sellers

### 🎨 Business Rule:
**User → Artist → Seller** (hierarchical progression)
- Regular users can apply for artist verification
- Only artists can apply to become sellers
- Only approved sellers can list marketplace items

### ❌ What's Missing:
The marketplace items are NOT linked to seller profiles, only to user IDs. This creates several issues:

---

## 🔴 Critical Issues

### 1. **No Seller Profile Validation**
**Problem:** Anyone with a `userId` can create marketplace items, even if they're not approved sellers.

**Current Code:**
```javascript
const newItem = {
  userId: userId,  // ❌ Only checks user authentication, not seller status
  title,
  price,
  // ...
};
```

**Risk:** Non-sellers can list items in the marketplace.

---

### 2. **Missing Seller Information in Listings**
**Problem:** When buyers view items, they can't see seller details (shop name, ratings, location, etc.)

**Current Response:**
```javascript
{
  marketItemId: "...",
  userId: "...",  // ❌ Just a UUID, no seller context
  title: "...",
  price: 100
}
```

**What Buyers Need:**
- Shop name
- Seller reputation
- Seller location
- Contact information

---

### 3. **No Seller Dashboard Context**
**Problem:** Sellers can't easily manage their shop or see their profile linked to items.

---

## ✅ Recommended Solution

### **Option 1: Add `sellerProfileId` to Marketplace Items (RECOMMENDED)**

#### Database Schema Update:
```sql
ALTER TABLE marketplace_items 
ADD COLUMN "sellerProfileId" UUID REFERENCES "sellerProfiles"("sellerProfileId") ON DELETE CASCADE;

-- Add index for faster queries
CREATE INDEX idx_marketplace_items_sellerProfileId 
ON marketplace_items("sellerProfileId");

-- Make it required for new items
ALTER TABLE marketplace_items 
ALTER COLUMN "sellerProfileId" SET NOT NULL;
```

#### Updated Controller Logic:

**Create Item:**
```javascript
export const createMarketplaceItem = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    // ✅ STEP 1: Check if user is an artist (required before being a seller)
    const { data: userProfile, error: profileError } = await db
      .from('profile')
      .select('role')
      .eq('userId', userId)
      .single();

    if (profileError || !userProfile || userProfile.role !== 'artist') {
      return res.status(403).json({ 
        success: false, 
        error: 'You must be a verified artist to list items. Please apply for artist verification first.' 
      });
    }

    // ✅ STEP 2: Check if user has an active seller profile
    const { data: sellerProfile, error: sellerError } = await db
      .from('sellerProfiles')
      .select('*')
      .eq('userId', userId)
      .eq('isActive', true)
      .eq('isSuspended', false)
      .single();

    if (sellerError || !sellerProfile) {
      return res.status(403).json({ 
        success: false, 
        error: 'You must be an approved seller to list items. Please apply to become a seller first.' 
      });
    }

    const {
      title,
      description,
      price,
      // ... other fields
    } = req.body;

    // Validation
    if (!title || !price) {
      return res.status(400).json({ 
        success: false, 
        error: 'Title and price are required' 
      });
    }

    // ✅ Include seller profile ID
    const newItem = {
      userId: userId,
      sellerProfileId: sellerProfile.sellerProfileId,  // ✅ Link to seller profile
      title,
      description: description || null,
      price,
      // ... rest of fields
      status: 'active'
    };

    const { data, error } = await db
      .from('marketplace_items')
      .insert([newItem])
      .select()
      .single();

    if (error) {
      console.error('Error creating marketplace item:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    res.status(201).json({ 
      success: true, 
      message: 'Marketplace item created successfully',
      data: data
    });

  } catch (error) {
    console.error('Error in createMarketplaceItem:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};
```

**Get Items (with Seller Info):**
```javascript
export const getMarketplaceItems = async (req, res) => {
  try {
    const { status } = req.query;
    
    // ✅ Join with seller profiles to get shop information
    let query = db
      .from('marketplace_items')
      .select(`
        *,
        sellerProfiles!inner (
          sellerProfileId,
          shopName,
          city,
          province,
          isActive,
          isSuspended
        )
      `)
      .eq('sellerProfiles.isActive', true)
      .eq('sellerProfiles.isSuspended', false)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data: items, error } = await query;

    if (error) {
      console.error('Error fetching items:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    // ✅ Transform response to include seller info at root level
    const transformedItems = items.map(item => ({
      ...item,
      seller: {
        shopName: item.sellerProfiles.shopName,
        location: `${item.sellerProfiles.city}, ${item.sellerProfiles.province}`
      }
    }));

    res.json({ 
      success: true, 
      data: transformedItems,
      count: transformedItems.length
    });

  } catch (error) {
    console.error('Error in getMarketplaceItems:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};
```

**Get Single Item (with Full Seller Details):**
```javascript
export const getMarketplaceItem = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Include full seller profile information
    const { data: item, error } = await db
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
          street,
          city,
          province,
          region
        )
      `)
      .eq('marketItemId', id)
      .single();

    if (error || !item) {
      return res.status(404).json({ 
        success: false, 
        error: 'Item not found' 
      });
    }

    // ✅ Check if seller is still active
    if (!item.sellerProfiles || 
        !item.sellerProfiles.isActive || 
        item.sellerProfiles.isSuspended) {
      return res.status(404).json({ 
        success: false, 
        error: 'This item is no longer available (seller inactive)' 
      });
    }

    res.json({ 
      success: true, 
      data: item
    });

  } catch (error) {
    console.error('Error in getMarketplaceItem:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};
```

---

## 🎨 Artist Role Validation

### Enforce Artist Requirement in Seller Application:

```javascript
export const submitSellerApplication = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    // ✅ CRITICAL: Check if user is an artist first
    const { data: userProfile, error: profileError } = await db
      .from('profile')
      .select('role')
      .eq('userId', userId)
      .single();

    if (profileError || !userProfile) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to verify user profile' 
      });
    }

    if (userProfile.role !== 'artist') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only verified artists can apply to become sellers. Please apply for artist verification first.',
        requiresArtistRole: true
      });
    }

    // Continue with seller application...
  }
};
```

### User Progression Flow:

```
┌─────────────┐
│ Regular User│
└──────┬──────┘
       │
       │ Apply for Artist Verification
       ▼
┌─────────────┐
│   Artist    │ ✅ Can create artworks, exhibitions
└──────┬──────┘
       │
       │ Apply to Become Seller
       ▼
┌─────────────┐
│   Seller    │ ✅ Can list items in marketplace
└─────────────┘
```

---

## 🎯 Additional Recommendations

### 1. **Add Seller Dashboard Endpoint**
```javascript
export const getMySellerItems = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    const { data: sellerProfile } = await db
      .from('sellerProfiles')
      .select('sellerProfileId')
      .eq('userId', userId)
      .single();

    if (!sellerProfile) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not a seller' 
      });
    }

    const { data: items, error } = await db
      .from('marketplace_items')
      .select('*')
      .eq('sellerProfileId', sellerProfile.sellerProfileId)
      .order('created_at', { ascending: false });

    res.json({ 
      success: true, 
      data: items,
      sellerProfile: sellerProfile
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};
```

### 2. **Cascade Deletion**
When a seller profile is deleted/suspended, handle their items:
```javascript
// Option A: Delete all items
// Already handled by ON DELETE CASCADE

// Option B: Mark items as inactive
export const suspendSellerProfile = async (sellerProfileId) => {
  // Update seller profile
  await db
    .from('sellerProfiles')
    .update({ isSuspended: true })
    .eq('sellerProfileId', sellerProfileId);

  // Mark all items as inactive
  await db
    .from('marketplace_items')
    .update({ status: 'inactive' })
    .eq('sellerProfileId', sellerProfileId);
};
```

### 3. **Seller Statistics**
Track seller performance:
```javascript
export const getSellerStats = async (req, res) => {
  const { sellerProfileId } = req.params;

  const { data: stats } = await db.rpc('get_seller_stats', {
    seller_id: sellerProfileId
  });

  // Returns: total_items, total_sales, average_rating, etc.
};
```

---

## 📋 Migration Checklist

- [ ] Add `sellerProfileId` column to `marketplace_items` table
- [ ] Add foreign key constraint to `sellerProfiles`
- [ ] Create index on `sellerProfileId`
- [ ] Update `createMarketplaceItem` to check seller status
- [ ] Update `getMarketplaceItems` to join with seller profiles
- [ ] Update `getMarketplaceItem` to include seller details
- [ ] Add seller dashboard endpoints
- [ ] Update frontend to display seller information
- [ ] Add seller profile link on item pages
- [ ] Test cascade deletion behavior

---

## 🚨 Security Benefits

1. **Prevents Unauthorized Listings** - Only approved sellers can list
2. **Seller Accountability** - All items traced to verified sellers
3. **Easy Moderation** - Suspend seller = hide all their items
4. **Trust Building** - Buyers see verified seller information

---

## Summary

**YES, you should absolutely store `sellerProfileId` in marketplace items!**

This creates a proper relationship between sellers and their products, enables better moderation, improves buyer trust, and makes the marketplace more professional.
