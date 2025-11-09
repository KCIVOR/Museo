# 🛠️ Marketplace Critical Fixes Checklist

**Created:** 2025-11-09  
**Priority:** URGENT - Complete Today  
**Status:** 🔴 Not Started

---

## 🚨 **PHASE 1: CRITICAL SECURITY FIXES** (2-3 hours)

### Authentication & Authorization
- [ ] **Add authentication middleware to ALL marketplace routes**
  - [ ] `/marketplace/items` (POST, PUT, DELETE)
  - [ ] `/marketplace/cart/*` (all cart routes)
  - [ ] `/marketplace/orders/*` (all order routes)
  - [ ] `/marketplace/seller/*` (all seller routes)
  - File: `backend/routes/marketplaceRoutes.js`

- [ ] **Re-enable self-purchase prevention**
  - [ ] Remove comment from lines 963-968 in `marketplaceController.js`
  - [ ] Add proper error message
  - File: `backend/controllers/marketplaceController.js`

- [ ] **Add input validation middleware**
  - [ ] Install `express-validator` package
  - [ ] Validate `addToCart` (quantity, marketplace_item_id)
  - [ ] Validate `createMarketplaceItem` (title, price, quantity)
  - [ ] Validate `updateCartQuantity` (quantity min/max)
  - [ ] Validate price ranges (no negative values)
  - File: `backend/routes/marketplaceRoutes.js`

- [ ] **Add role-based access control**
  - [ ] Verify seller role before creating items
  - [ ] Verify admin role for seller application approvals
  - [ ] Add middleware: `requireRole(['artist', 'admin'])`
  - File: `backend/middleware/auth.js`

---

## 💔 **PHASE 2: DATA INTEGRITY FIXES** (3-4 hours)

### Transaction Management
- [ ] **Wrap order creation in database transaction**
  - [ ] Use Supabase transaction for multi-table inserts
  - [ ] Rollback if any step fails (order, order_items, inventory update)
  - [ ] Add proper error handling
  - File: `backend/controllers/marketplaceController.js` (Line 1233-1534)

- [ ] **Add inventory locking mechanism**
  - [ ] Implement pessimistic locking for stock checks
  - [ ] Use `SELECT FOR UPDATE` or equivalent
  - [ ] Prevent race conditions on popular items
  - File: `backend/controllers/marketplaceController.js` (addToCart, createOrder)

- [ ] **Clear cart after successful order**
  - [ ] Delete cart_items after order creation succeeds
  - [ ] Add to transaction block
  - File: `backend/controllers/marketplaceController.js` (Line 1498)

### Idempotency
- [ ] **Replace time-based duplicate prevention with idempotency keys**
  - [ ] Add `idempotency_key` column to orders table
  - [ ] Generate UUID on frontend before order creation
  - [ ] Check for existing order with same key
  - [ ] Return existing order if key matches
  - Files: Database migration, `marketplaceController.js` (Line 1246-1274)

---

## ⚡ **PHASE 3: PERFORMANCE OPTIMIZATION** (2-3 hours)

### Server-Side Filtering & Pagination
- [ ] **Move ALL filtering to backend**
  - [ ] Remove client-side filters from `Marketplace.jsx`
  - [ ] Add query params: `category`, `minPrice`, `maxPrice`, `listingType`
  - [ ] Implement in `getMarketplaceItems` controller
  - Files: `marketplaceController.js`, `Marketplace.jsx`

- [ ] **Add pagination to marketplace items**
  - [ ] Add `page` and `limit` query parameters
  - [ ] Default: 20 items per page
  - [ ] Return total count for pagination UI
  - [ ] Use `.range()` for efficient queries
  - File: `backend/controllers/marketplaceController.js` (Line 329-399)

- [ ] **Fix N+1 query in getBuyerOrders**
  - [ ] Use JOIN to fetch orders with items in single query
  - [ ] Remove Promise.all loop
  - [ ] Optimize with `.select()` relationships
  - File: `backend/controllers/marketplaceController.js` (Line 1564-1587)

- [ ] **Add database indexes**
  - [ ] Index on `marketplace_items.status`
  - [ ] Index on `marketplace_items.sellerProfileId`
  - [ ] Index on `orders.userId`
  - [ ] Index on `orders.paymentGroupId`
  - [ ] Composite index on `cart_items(userId, marketItemId)`
  - File: New migration file

---

## 🎨 **PHASE 4: FRONTEND IMPROVEMENTS** (2 hours)

### Error Handling
- [ ] **Replace ALL alert() calls with toast notifications**
  - [ ] Install/create toast notification component
  - [ ] Replace alerts in `handleAddToCart` (Line 227)
  - [ ] Replace alerts in `handleRemoveFromCart` (Line 251)
  - [ ] Replace alerts in `handlePlaceBid` (Line 314)
  - [ ] Replace alerts in error handlers
  - File: `frontend/src/pages/Marketplace/Marketplace.jsx`

- [ ] **Add proper error states**
  - [ ] Show error messages in UI (not alerts)
  - [ ] Add retry buttons for failed operations
  - [ ] Show loading states during API calls
  - File: `Marketplace.jsx`

### Remove Duplicate Logic
- [ ] **Remove client-side filtering**
  - [ ] Delete filter logic from lines 563-588
  - [ ] Rely on server-side filtering only
  - [ ] Update useEffect to refetch when filters change
  - File: `Marketplace.jsx`

- [ ] **Remove duplicate price/category filters**
  - [ ] Keep only server-side implementation
  - [ ] Remove lines 78-108 (redundant filtering)
  - File: `Marketplace.jsx`

---

## 🔧 **PHASE 5: MISSING CRITICAL FEATURES** (3-4 hours)

### Rate Limiting
- [ ] **Add rate limiting middleware**
  - [ ] Install `express-rate-limit`
  - [ ] Limit cart additions: 30 per minute
  - [ ] Limit order creation: 5 per hour
  - [ ] Limit item creation: 10 per hour
  - File: `backend/routes/marketplaceRoutes.js`

### Input Validation
- [ ] **Validate all numeric inputs**
  - [ ] Price: min 0, max 1000000
  - [ ] Quantity: min 1, max 100
  - [ ] Year: min 1900, max current year
  - [ ] Weight: min 0, max 1000
  - Files: `marketplaceController.js` (all create/update functions)

### Audit Logging
- [ ] **Create audit log table**
  - [ ] Track: item creation, updates, deletions
  - [ ] Track: order status changes
  - [ ] Track: seller application approvals/rejections
  - [ ] Store: userId, action, timestamp, metadata
  - Files: New migration, new `auditLogger.js` middleware

### Business Logic
- [ ] **Make platform fee configurable**
  - [ ] Create `settings` table
  - [ ] Add `platform_fee_rate` setting (default 0.10)
  - [ ] Load from database instead of hardcoded value
  - File: `marketplaceController.js` (Line 1349)

- [ ] **Add proper return policy handling**
  - [ ] Create `return_policies` table
  - [ ] Link to seller profiles
  - [ ] Calculate return window dynamically
  - File: `marketplaceController.js` (Line 716-728)

---

## 🧪 **PHASE 6: TESTING & VALIDATION** (2 hours)

### API Testing
- [ ] **Test all security fixes**
  - [ ] Try accessing protected routes without auth
  - [ ] Try self-purchasing items
  - [ ] Try invalid input values
  - [ ] Try SQL injection attempts

- [ ] **Test transaction rollback**
  - [ ] Simulate order creation failure
  - [ ] Verify no orphaned records
  - [ ] Verify inventory not reduced

- [ ] **Test race conditions**
  - [ ] Multiple users buying last item simultaneously
  - [ ] Verify only one succeeds
  - [ ] Verify proper error messages

### Load Testing
- [ ] **Test pagination performance**
  - [ ] Load 1000+ items
  - [ ] Verify page load time < 1 second
  - [ ] Test filter combinations

- [ ] **Test concurrent orders**
  - [ ] 10+ users creating orders simultaneously
  - [ ] Verify no duplicate orders
  - [ ] Verify inventory accuracy

---

## 📋 **PHASE 7: CODE CLEANUP** (1 hour)

### Remove Test Code
- [ ] **Remove test endpoints from production**
  - [ ] Remove `/items/test` endpoint (Line 66)
  - [ ] Remove `createTestItems` function
  - [ ] Remove `/seller/cancel-my-application` test endpoint (Line 215)
  - File: `marketplaceRoutes.js`, `marketplaceController.js`

### Documentation
- [ ] **Add JSDoc comments to all functions**
  - [ ] Document parameters and return types
  - [ ] Add usage examples
  - [ ] Document error scenarios
  - Files: All controller functions

- [ ] **Update API documentation**
  - [ ] Document all query parameters
  - [ ] Document authentication requirements
  - [ ] Document rate limits
  - [ ] Add example requests/responses
  - File: `docs/MARKETPLACE_API.md`

---

## 🎯 **SUCCESS CRITERIA**

Before marking as complete, verify:
- [ ] All routes require authentication
- [ ] No `alert()` calls in frontend
- [ ] All database operations use transactions
- [ ] Pagination works with 1000+ items
- [ ] No N+1 queries
- [ ] Rate limiting prevents abuse
- [ ] Input validation prevents invalid data
- [ ] Self-purchase is blocked
- [ ] Cart clears after successful order
- [ ] No race conditions on inventory

---

## 📊 **PROGRESS TRACKER**

| Phase | Tasks | Completed | Progress |
|-------|-------|-----------|----------|
| Phase 1: Security | 4 | 0 | 0% |
| Phase 2: Data Integrity | 4 | 0 | 0% |
| Phase 3: Performance | 4 | 0 | 0% |
| Phase 4: Frontend | 3 | 0 | 0% |
| Phase 5: Features | 5 | 0 | 0% |
| Phase 6: Testing | 3 | 0 | 0% |
| Phase 7: Cleanup | 2 | 0 | 0% |
| **TOTAL** | **25** | **0** | **0%** |

---

## ⏱️ **ESTIMATED TIME**

- **Total Estimated Time:** 15-19 hours
- **Realistic Timeline:** 2-3 days (with testing)
- **Today's Goal:** Complete Phases 1-3 (7-10 hours)

---

## 🔥 **START HERE - TODAY'S PRIORITIES**

### Morning Session (4 hours)
1. ✅ Phase 1: Add authentication middleware (1 hour)
2. ✅ Phase 1: Re-enable self-purchase prevention (15 min)
3. ✅ Phase 1: Add input validation (1.5 hours)
4. ✅ Phase 2: Wrap order creation in transaction (1.5 hours)

### Afternoon Session (4 hours)
5. ✅ Phase 2: Add inventory locking (1 hour)
6. ✅ Phase 2: Clear cart after order (30 min)
7. ✅ Phase 3: Server-side filtering (1.5 hours)
8. ✅ Phase 3: Add pagination (1 hour)

### Evening Session (2 hours)
9. ✅ Phase 4: Replace alerts with toasts (1 hour)
10. ✅ Phase 4: Remove duplicate filtering (1 hour)

---

## 📝 **NOTES**

- Keep backup of current code before making changes
- Test each phase before moving to next
- Commit after each completed phase
- Deploy to staging after Phase 3
- Get code review before deploying to production

---

**Last Updated:** 2025-11-09 13:00  
**Next Review:** After completing Phase 3
