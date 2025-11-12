# Peer-to-Peer (P2P) Marketplace Migration Checklist

Goal: Remove cart and batch-buying. Switch to single-item, peer-to-peer buying while keeping payments, orders, returns, payouts, and webhooks intact.

## Phase 0 — Pre-checks
- [ ] Backup created and verified (code + DB)
- [ ] Confirm scope: remove cart + batch order only; keep items, orders, returns, payouts, webhooks
- [ ] Announce API changes to team (cart endpoints will be removed)

## Phase 1 — Disable Cart & Batch Endpoints (Backend)
- [ ] Edit `backend/routes/marketplaceRoutes.js`
  - [ ] Remove or comment routes:
    - [ ] `GET /marketplace/cart` → `getCart`
    - [ ] `POST /marketplace/cart/add` → `addToCart`
    - [ ] `PUT /marketplace/cart/:itemId` → `updateCartQuantity`
    - [ ] `DELETE /marketplace/cart/:itemId` → `removeFromCart`
    - [ ] `DELETE /marketplace/cart/clear` → `clearCart`
  - [ ] Remove `POST /marketplace/orders/create` (cart-based batch order)
- [ ] Run the server and confirm 404 for removed endpoints

## Phase 2 — Quarantine Cart/Batch Logic (Controller)
- [ ] In `backend/controllers/marketplaceController.js`, move the following to `backend/_deprecated/marketplace/` (or delete):
  - [ ] `getCart`
  - [ ] `addToCart`
  - [ ] `updateCartQuantity`
  - [ ] `removeFromCart`
  - [ ] `clearCart`
  - [ ] `createOrder` (the cart-based, batch-buy grouping flow)
- [ ] Keep intact (no changes):
  - [ ] Item CRUD (`/items`)
  - [ ] Orders read/detail (`/orders/buyer`, `/orders/seller`, `/orders/:orderId`)
  - [ ] Order status updates (process/ship/deliver/cancel)
  - [ ] Payment link retrieval `GET /orders/:orderId/payment-link`

## Phase 3 — Update Xendit Redirects
- [ ] In `backend/services/xenditService.js`
  - [ ] Change `failure_redirect_url` from `/marketplace/cart` to `/marketplace` or `/marketplace/myorders`
  - [ ] Confirm no other cart references exist

## Phase 4 — Add P2P "Buy Now" Endpoint
- [ ] Routes: add `POST /marketplace/orders/buy-now`
- [ ] Controller (new method):
  - [ ] Validate `marketItemId` and `quantity` (default 1)
  - [ ] Verify item availability and seller is active
  - [ ] Create a single `orders` row (1 seller, 1 item)
  - [ ] Create `order_items` row for the chosen item
  - [ ] Generate payment link via `xenditService.createPaymentLink`
  - [ ] Return `{ checkoutUrl, referenceNumber, amount }`
- [ ] Ensure webhook and manual `check-payment` still work with new orders

## Phase 5 — Frontend Adjustments
- [ ] Remove/hide cart UI and pages (e.g., `checkout.jsx`, cart badges, cart drawer)
- [ ] Replace "Add to Cart" with "Buy Now" on item cards/details
- [ ] "Buy Now" calls `POST /marketplace/orders/buy-now` then opens `checkoutUrl`
- [ ] Keep `MyOrders` and `SellerDashboard` flows intact
- [ ] Keep returns UI (already order-based)

## Phase 6 — Data Model Notes
- [ ] Leave `cart_items` table unused (do not drop immediately)
- [ ] Consider a later migration to drop `cart_items` after a grace period
- [ ] Ensure `orders`/`order_items` schema supports single-item orders cleanly

## Phase 7 — Regression Tests
- [ ] Buyer flow: Item → Buy Now → Pay → Order appears in `MyOrders`
- [ ] Seller flow: Order visible in `SellerDashboard` → process → ship → deliver
- [ ] Returns: Buyer submits return; Seller approves/rejects; Admin dispute resolve
- [ ] Refunds: On approve, refund path executes (mock or real depending on env)
- [ ] Payouts: Cron still processes paid/delivered orders
- [ ] Webhooks: Payment success updates order status
- [ ] Error cases: Out-of-stock, inactive seller, expired invoices

## Phase 8 — Cleanup & Docs
- [ ] Update API docs to remove cart endpoints and describe `buy-now`
- [ ] Update README and any postman collections
- [ ] Mark deprecated controller files clearly or remove them

## Phase 9 — Rollback Plan
- [ ] If needed, restore routes from backup and re-enable cart endpoints
- [ ] Revert xenditService redirect
- [ ] Restore UI components for cart/checkout

## Acceptance Criteria
- [ ] No cart endpoints exposed
- [ ] Single-item "Buy Now" works end-to-end with payments
- [ ] Existing returns and payouts continue to function
- [ ] Frontend has no cart UI remnants

---

Owner: Engineering
Status: In Progress
Last Updated: <fill-on-execution>
