# Frontend P2P Migration Checklist

Goal: Remove cart and batch-buying UI/flows. Switch to single-item “Buy Now” while keeping My Orders, Seller Dashboard, Returns, and Payments working.

## Phase 0 — Pre-checks
- [ ] Backup current frontend build
- [ ] Confirm backend exposes `POST /marketplace/orders/buy-now`
- [ ] Confirm Xendit success/failure redirect targets (prefer `/marketplace/myorders`)

## Phase 1 — Remove/Hide Cart UI & Routes
- [ ] Remove cart entry points in UI (navbar/cart icon, badges)
- [ ] Remove/hide Cart and Checkout routes in router (`frontend/src/App.jsx`)
- [ ] Remove/hide checkout page: `frontend/src/pages/Marketplace/checkout.jsx`
- [ ] Clean cart-specific states in `Marketplace.jsx` and related components
- [ ] Ensure no links point to `/marketplace/cart`

## Phase 2 — Replace with “Buy Now”
- [ ] Product listing: update actions in `frontend/src/pages/Marketplace/Marketplace.jsx`
  - [ ] Replace “Add to Cart” with “Buy Now”
  - [ ] On click → call API → open `checkoutUrl` in new tab
- [ ] Product detail: update actions in `frontend/src/pages/Marketplace/ProductDetailModal.jsx`
  - [ ] Replace “Add to Cart” with “Buy Now”
  - [ ] Optional quantity selector (default 1) if item supports quantity
- [ ] Optional: `marketPlaceItem.jsx` item cards that expose Add-to-Cart → convert to Buy Now

## Phase 3 — API Client (Frontend)
- [ ] Create `buyNow()` client (new file or extend existing):
  - [ ] `frontend/src/api/orders.js` or `frontend/src/api/marketplace.js`
  - [ ] `POST /marketplace/orders/buy-now` with `{ marketItemId, quantity: 1 }`
  - [ ] Expect `{ checkoutUrl, referenceNumber, amount }`
  - [ ] `window.open(checkoutUrl, '_blank')`
- [ ] Update Xendit success/failure redirects consumption (success returns to `MyOrders`)

## Phase 4 — Preserve Orders, Returns, Seller flows
- [ ] Keep `MyOrders.jsx` unchanged functionally (still lists orders and status)
- [ ] Keep Returns modals/components intact (`ReturnRequestModal.jsx`, `ReturnDetailsModal.jsx`)
- [ ] Keep Seller Dashboard tabs except anything cart-related (none expected)

## Phase 5 — Styling Cleanup
- [ ] Remove cart-related selectors from `frontend/src/pages/Marketplace/css/marketplace.css`
- [ ] Ensure buttons use existing styles in `styles/components/buttons.css`
- [ ] Ensure inputs use `styles/components/inputs.css`

## Phase 6 — Router & Nav
- [ ] Remove cart/checkout routes in `frontend/src/App.jsx`
- [ ] Replace nav cart icon with link to `My Orders` or remove entirely
- [ ] Validate deep links to `/marketplace/cart` don’t exist

## Phase 7 — Regression Tests
- [ ] Listing → Buy Now → Xendit page opens → Pay → Redirect to `My Orders`
- [ ] Order appears in `MyOrders` with correct status and total
- [ ] Seller Dashboard: order visible and actionable (process/ship/deliver)
- [ ] Returns: Buyer can request, Seller can approve/reject, Admin can resolve
- [ ] Error handling: out-of-stock, inactive seller, expired invoice

## Phase 8 — Clean Up & Docs
- [ ] Remove dead cart components and unused hooks
- [ ] Update user-facing copy (remove references to cart)
- [ ] Update README and UI screenshots

## File Pointers
- [ ] Listing actions: `frontend/src/pages/Marketplace/Marketplace.jsx`
- [ ] Product modal actions: `frontend/src/pages/Marketplace/ProductDetailModal.jsx`
- [ ] Checkout page (to remove): `frontend/src/pages/Marketplace/checkout.jsx`
- [ ] My Orders (keep): `frontend/src/pages/Marketplace/MyOrders.jsx`
- [ ] Seller Dashboard (keep): `frontend/src/pages/Marketplace/SellerDashboard.jsx`
- [ ] Returns components (keep): `frontend/src/pages/Marketplace/components/ReturnRequestModal.jsx`, `ReturnDetailsModal.jsx`
- [ ] Styles: `frontend/src/styles/components/buttons.css`, `frontend/src/styles/components/inputs.css`, `frontend/src/pages/Marketplace/css/marketplace.css`

---

Owner: Frontend
Status: Planned
Last Updated: <fill-on-execution>
