# MUSEO MARKETPLACE - VISUAL FLOWCHARTS
## Complete System Flow Diagrams

---

## 1. COMPLETE ORDER LIFECYCLE

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CUSTOMER JOURNEY                             │
└─────────────────────────────────────────────────────────────────────┘

START
  │
  ├─→ [Browse Marketplace]
  │        │
  │        ├─→ Filter by category
  │        ├─→ Search artworks
  │        └─→ View product details
  │
  ├─→ [Add to Cart]
  │        │
  │        ├─→ Select quantity
  │        ├─→ View cart (₱ total)
  │        └─→ Continue shopping or checkout
  │
  ├─→ [Checkout]
  │        │
  │        ├─→ Enter shipping address
  │        ├─→ Enter contact number
  │        ├─→ Review order
  │        └─→ Confirm payment
  │
  ├─→ [Payment Processing]
  │        │
  │        └─→ Money goes to ESCROW (not seller!)
  │                 │
  │                 └─→ Escrow record created
  │
  ├─→ [Order Created]
  │        │
  │        ├─→ Status: "To Ship"
  │        ├─→ Email sent to buyer
  │        └─→ Email sent to seller
  │
  ├─→ [Wait for Shipping] ⏰
  │        │
  │        └─→ Seller prepares item
  │
  ├─→ [Tracking Number Received]
  │        │
  │        ├─→ Status: "Shipped"
  │        ├─→ Email with tracking link
  │        └─→ Can track on J&T/LBC website
  │
  ├─→ [Package in Transit] 📦
  │        │
  │        ├─→ Track on courier website
  │        ├─→ Estimated delivery: 2-5 days
  │        └─→ Can report fake tracking (3 days)
  │
  ├─→ [Package Delivered] ✅
  │        │
  │        ├─→ Status: "Delivered"
  │        ├─→ Email: "Please confirm receipt"
  │        └─→ 7-day auto-complete timer starts
  │
  ├─→ [Verify Item] 🔍
  │        │
  │        ├─→ Question 1: Did you receive package?
  │        │        ├─→ YES → Continue
  │        │        └─→ NO → File "Not Received" dispute
  │        │
  │        ├─→ Question 2: Is it the correct item?
  │        │        ├─→ YES → Continue
  │        │        └─→ NO → Upload photos → File dispute
  │        │
  │        └─→ Question 3: Item condition?
  │                 ├─→ Perfect/Good → Continue
  │                 └─→ Damaged → Upload photos → File dispute
  │
  ├─→ [Confirm Receipt] ✓
  │        │
  │        ├─→ Status: "Completed"
  │        ├─→ Payment released to seller (after 3-day buffer)
  │        └─→ Can leave review
  │
  └─→ END


┌─────────────────────────────────────────────────────────────────────┐
│                         SELLER JOURNEY                               │
└─────────────────────────────────────────────────────────────────────┘

START
  │
  ├─→ [List Artwork]
  │        │
  │        ├─→ Upload photos
  │        ├─→ Set price
  │        ├─→ Add description
  │        └─→ Publish listing
  │
  ├─→ [Receive Order Notification] 📧
  │        │
  │        ├─→ View order details
  │        ├─→ See buyer's shipping address
  │        └─→ Check payment (in escrow)
  │
  ├─→ [Prepare Item]
  │        │
  │        ├─→ Pack artwork securely
  │        ├─→ Print shipping label
  │        └─→ Status: "Processing"
  │
  ├─→ [Ship via J&T/LBC]
  │        │
  │        ├─→ Bring to courier branch
  │        ├─→ Pay shipping fee
  │        └─→ Receive tracking number
  │
  ├─→ [Enter Tracking Number]
  │        │
  │        ├─→ Input tracking: JT123456789PH
  │        ├─→ Select carrier: J&T Express
  │        ├─→ System validates format ✓
  │        └─→ Status: "Shipped"
  │
  ├─→ [Wait for Delivery] ⏰
  │        │
  │        ├─→ Customer can track package
  │        ├─→ 7-day auto-complete timer
  │        └─→ Can upload delivery proof (optional)
  │
  ├─→ [Customer Confirms Receipt] ✅
  │        │
  │        ├─→ Status: "Completed"
  │        ├─→ 3-day payment buffer starts
  │        └─→ Email: "Payment will be released"
  │
  ├─→ [Payment Released] 💰
  │        │
  │        ├─→ Money transferred to wallet
  │        ├─→ Email: "Payment received"
  │        └─→ Seller stats updated
  │
  └─→ END
```

---

## 2. ESCROW PAYMENT FLOW

```
┌────────────────────────────────────────────────────────────────┐
│                    ESCROW SYSTEM FLOW                           │
└────────────────────────────────────────────────────────────────┘

CUSTOMER                 PLATFORM (ESCROW)              SELLER
   │                            │                          │
   │                            │                          │
   │  [1. Browse & Add to Cart] │                          │
   │────────────────────────────→│                          │
   │                            │                          │
   │  [2. Checkout]             │                          │
   │────────────────────────────→│                          │
   │                            │                          │
   │  [3. Pay ₱1,000]           │                          │
   │════════════════════════════→│                          │
   │                            │                          │
   │                      [MONEY HELD]                      │
   │                      ┌──────────┐                      │
   │                      │ Escrow   │                      │
   │                      │ ₱1,000   │                      │
   │                      └──────────┘                      │
   │                            │                          │
   │                            │  [4. Order Notification] │
   │                            │─────────────────────────→│
   │                            │                          │
   │                            │  [5. Ship Item]          │
   │                            │←─────────────────────────│
   │                            │                          │
   │  [6. Tracking Number]      │                          │
   │←───────────────────────────│                          │
   │                            │                          │
   │  [7. Track Package]        │                          │
   │────────────────────────────→│                          │
   │                            │                          │
   │  [8. Receive Package] 📦   │                          │
   │                            │                          │
   │  [9. Verify Item]          │                          │
   │     ├─→ Correct? ✓         │                          │
   │     └─→ Wrong? ✗           │                          │
   │          │                 │                          │
   │          │                 │                          │
   │  [10a. Confirm Receipt]    │                          │
   │────────────────────────────→│                          │
   │                            │                          │
   │                      [3-Day Buffer]                    │
   │                      ⏰ ⏰ ⏰                            │
   │                            │                          │
   │                      [Release Payment]                 │
   │                            │══════════════════════════→│
   │                            │      ₱1,000              │
   │                            │                          │
   │                            │                     [Wallet]
   │                            │                     +₱1,000
   │                            │                          │
   │                                                        │
   │  [10b. File Dispute] 🚨    │                          │
   │────────────────────────────→│                          │
   │                            │                          │
   │                      [HOLD PAYMENT]                    │
   │                      ┌──────────┐                      │
   │                      │ Escrow   │                      │
   │                      │ ₱1,000   │                      │
   │                      └──────────┘                      │
   │                            │                          │
   │                      [Admin Reviews]                   │
   │                            │                          │
   │                      ┌─────┴─────┐                    │
   │                      ↓           ↓                    │
   │              [Buyer Wins]   [Seller Wins]             │
   │                      │           │                    │
   │  [Refund ₱1,000]     │           │  [Release ₱1,000]  │
   │←════════════════════│           │══════════════════→│
   │                      │           │                    │
   │                 [Wallet]    [Wallet]                  │
   │                 +₱1,000     +₱1,000                   │
   │                      │           │                    │
```

---

## 3. AUTO-COMPLETE DECISION TREE

```
┌────────────────────────────────────────────────────────────────┐
│              AUTO-COMPLETE VALIDATION FLOW                      │
└────────────────────────────────────────────────────────────────┘

[7 Days After Shipped]
         │
         ↓
[Check Order Status]
         │
         ├─→ Customer Already Confirmed? ────→ SKIP (Already Done)
         │
         ├─→ Customer Filed Dispute? ────────→ SKIP (Under Review)
         │
         └─→ No Action Yet ──────────────────→ CONTINUE
                                                   │
                                                   ↓
                                    [VALIDATION CHECKS]
                                                   │
                                    ┌──────────────┴──────────────┐
                                    ↓                             ↓
                        [Check 1: Tracking Format]    [Check 2: Order Value]
                                    │                             │
                        ┌───────────┴───────────┐     ┌──────────┴──────────┐
                        ↓                       ↓     ↓                     ↓
                [Valid Format?]         [Invalid]  [< ₱500]            [> ₱500]
                        │                   │         │                     │
                        ↓                   ↓         ↓                     ↓
                    [PASS]            [FLAG] 🚨   [PASS]         [Has Delivery Proof?]
                                          │                              │
                                          │                   ┌──────────┴──────────┐
                                          │                   ↓                     ↓
                                          │               [YES]                  [NO]
                                          │                   │                     │
                                          │                   ↓                     ↓
                                          │               [PASS]         [REQUEST PROOF]
                                          │                                         │
                                          ↓                                         ↓
                                    [Admin Review]                          [Extend 2 Days]
                                          │
                                          ↓
                        ┌─────────────────┴─────────────────┐
                        ↓                                   ↓
                [Check 3: Seller History]      [Check 4: Tracking Status]
                        │                                   │
            ┌───────────┴───────────┐          ┌───────────┴───────────┐
            ↓                       ↓          ↓                       ↓
    [New Seller?]           [Established]  [Delivered]           [In Transit]
    (< 5 orders)                 │              │                     │
            │                    │              │                     │
            ↓                    ↓              ↓                     ↓
    [FLAG for Review]        [PASS]         [PASS]            [Extend 3 Days]
            │                    │              │                     │
            ↓                    │              │                     ↓
    [Manual Admin Check]         │              │              [Check Again Later]
                                 │              │
                                 └──────┬───────┘
                                        ↓
                            [ALL CHECKS PASSED] ✅
                                        │
                                        ↓
                            [Complete Order]
                                        │
                                        ├─→ Status: "Completed"
                                        ├─→ Completion Type: "Auto"
                                        ├─→ Payment Status: "Pending Release"
                                        └─→ Release Date: +3 days
                                                    │
                                                    ↓
                                        [Send Final Warning Email]
                                                    │
                                                    ↓
                                        "Did you really receive this?"
                                        "Report within 3 days!"
                                                    │
                                                    ↓
                                        [Wait 3 Days] ⏰
                                                    │
                                        ┌───────────┴───────────┐
                                        ↓                       ↓
                            [Customer Reports Issue]    [No Reports]
                                        │                       │
                                        ↓                       ↓
                                [Create Dispute]        [Release Payment] 💰
                                        │                       │
                                        ↓                       ↓
                                [Admin Review]          [Seller Gets Paid]
```

---

## 4. DISPUTE RESOLUTION FLOW

```
┌────────────────────────────────────────────────────────────────┐
│                  DISPUTE RESOLUTION PROCESS                     │
└────────────────────────────────────────────────────────────────┘

[Customer Files Dispute]
         │
         ├─→ Dispute Type?
         │
         ├─→ [NOT RECEIVED]
         │        │
         │        ├─→ Check tracking status
         │        │        ├─→ Shows "Delivered" → Seller wins
         │        │        └─→ Shows "Lost" → Customer wins
         │        │
         │        └─→ Admin Decision
         │
         ├─→ [FAKE TRACKING]
         │        │
         │        ├─→ Verify tracking on courier website
         │        │        ├─→ Valid → Seller wins
         │        │        └─→ Invalid → Customer wins + Seller banned
         │        │
         │        └─→ Admin Decision
         │
         └─→ [ITEM NOT AS DESCRIBED]
                  │
                  ├─→ Customer uploads photos 📸
                  │
                  ├─→ Admin reviews evidence
                  │        │
                  │        ├─→ Compare with listing photos
                  │        ├─→ Check customer comments
                  │        └─→ Review seller history
                  │
                  └─→ Admin Decision
                           │
                ┌──────────┴──────────┐
                ↓                     ↓
        [CUSTOMER WINS]       [SELLER WINS]
                │                     │
                ├─→ Refund ₱1,000     ├─→ Complete Order
                ├─→ Email customer    ├─→ Release Payment
                ├─→ Seller gets       └─→ Email both parties
                │   scam report
                └─→ Update stats
                         │
                ┌────────┴────────┐
                ↓                 ↓
        [1st Report]      [2nd Report]      [3rd Report]
                │                 │                 │
                ↓                 ↓                 ↓
        [Warning]         [Suspended]       [BANNED] 🚫
                │                 │                 │
                ↓                 ↓                 ↓
        [Can still sell]  [Cannot sell]    [Account locked]
        [Badge: ⚠️]       [30-day ban]     [Permanent]
```

---

## 5. RECEIPT VERIFICATION FLOW

```
┌────────────────────────────────────────────────────────────────┐
│              CUSTOMER RECEIPT VERIFICATION                      │
└────────────────────────────────────────────────────────────────┘

[Package Delivered]
         │
         ↓
[Customer Opens Package]
         │
         ↓
[Click "Confirm Receipt" Button]
         │
         ↓
┌─────────────────────────────────┐
│  VERIFICATION MODAL APPEARS     │
└─────────────────────────────────┘
         │
         ↓
[STEP 1: Did you receive the package?]
         │
    ┌────┴────┐
    ↓         ↓
  [YES]     [NO]
    │         │
    │         └─→ [File "Not Received" Dispute]
    │                    │
    │                    └─→ Upload tracking screenshot
    │                           │
    │                           └─→ Admin reviews
    │
    ↓
[STEP 2: Is it the correct item?]
         │
    ┌────┴────┐
    ↓         ↓
  [YES]     [NO] ← Wrong item / Fake item
    │         │
    │         ├─→ [REQUIRE PHOTOS] 📸
    │         │        │
    │         │        ├─→ Photo 1: Item received
    │         │        ├─→ Photo 2: Packaging
    │         │        └─→ Photo 3: Damage/issue
    │         │
    │         ├─→ [Enter Comments]
    │         │        │
    │         │        └─→ "Received a rock instead of artwork"
    │         │
    │         └─→ [Submit Dispute]
    │                    │
    │                    ├─→ Payment HELD
    │                    ├─→ Admin notified
    │                    └─→ Seller notified
    │
    ↓
[STEP 3: Item condition?]
         │
    ┌────┴────┬────────┐
    ↓         ↓        ↓
[Perfect] [Good]  [Damaged]
    │         │        │
    │         │        ├─→ [REQUIRE PHOTOS] 📸
    │         │        │
    │         │        └─→ [File Dispute]
    │         │
    └─────┬───┘
          ↓
[STEP 4: Final Confirmation]
          │
          ├─→ "You confirm:"
          ├─→ ✓ Received package
          ├─→ ✓ Correct item
          ├─→ ✓ Good condition
          │
          ↓
[Click "Confirm Receipt"]
          │
          ├─→ Order Status: "Completed"
          ├─→ Completion Type: "Manual"
          ├─→ Payment Status: "Pending Release"
          ├─→ Release Date: +3 days
          │
          ↓
[3-Day Buffer Period]
          │
          ├─→ Can still report issues
          ├─→ Email: "Last chance to report"
          │
          ↓
[Day 3: Release Payment]
          │
          └─→ Seller receives ₱1,000 💰
```

---

## 6. SECURITY LAYERS DIAGRAM

```
┌────────────────────────────────────────────────────────────────┐
│              MULTI-LAYER SECURITY SYSTEM                        │
└────────────────────────────────────────────────────────────────┘

LAYER 1: ESCROW SYSTEM
┌──────────────────────────────────────────────────────────┐
│  • Payment held by platform (not seller)                 │
│  • Released only after confirmation                      │
│  • Prevents "take money and run" scams                   │
└──────────────────────────────────────────────────────────┘
                        ↓
LAYER 2: TRACKING VALIDATION
┌──────────────────────────────────────────────────────────┐
│  • Validate tracking number format                       │
│  • Check against carrier patterns                        │
│  • Flag obviously fake tracking                          │
│  • Customer can report within 3 days                     │
└──────────────────────────────────────────────────────────┘
                        ↓
LAYER 3: SMART AUTO-COMPLETE
┌──────────────────────────────────────────────────────────┐
│  • Don't blindly complete after 7 days                   │
│  • Validate tracking shows "Delivered"                   │
│  • Require proof for high-value orders                   │
│  • Manual review for new sellers                         │
└──────────────────────────────────────────────────────────┘
                        ↓
LAYER 4: RECEIPT VERIFICATION
┌──────────────────────────────────────────────────────────┐
│  • Mandatory verification questions                      │
│  • Photo evidence required for disputes                  │
│  • Can't just click "Confirm" blindly                    │
│  • Automatic dispute creation                            │
└──────────────────────────────────────────────────────────┘
                        ↓
LAYER 5: PAYMENT BUFFER
┌──────────────────────────────────────────────────────────┐
│  • 3-day hold even after "Completed"                     │
│  • Final warning email to customer                       │
│  • Last chance to report issues                          │
│  • Total: 10 days protection                             │
└──────────────────────────────────────────────────────────┘
                        ↓
LAYER 6: DISPUTE RESOLUTION
┌──────────────────────────────────────────────────────────┐
│  • Photo evidence required                               │
│  • Admin human review                                    │
│  • Compare with listing                                  │
│  • Fair decision with proof                              │
└──────────────────────────────────────────────────────────┘
                        ↓
LAYER 7: SELLER ACCOUNTABILITY
┌──────────────────────────────────────────────────────────┐
│  • Track scam reports                                    │
│  • Public seller ratings                                 │
│  • 1 report = Warning ⚠️                                 │
│  • 2 reports = Suspended 🚫                              │
│  • 3 reports = Banned 🔴                                 │
└──────────────────────────────────────────────────────────┘

RESULT: COMPREHENSIVE PROTECTION FOR BOTH PARTIES ✅
```

---

## 7. TIMELINE DIAGRAM

```
┌────────────────────────────────────────────────────────────────┐
│                    ORDER TIMELINE                               │
└────────────────────────────────────────────────────────────────┘

DAY 0
│
├─→ [Order Placed]
│   • Customer pays ₱1,000
│   • Money in escrow
│   • Status: "To Ship"
│
DAY 1
│
├─→ [Seller Ships]
│   • Enters tracking number
│   • Status: "Shipped"
│   • 7-day timer starts ⏰
│
DAY 2-5
│
├─→ [Package in Transit]
│   • Customer tracks package
│   • Can report fake tracking (within 3 days of shipping)
│
DAY 6
│
├─→ [Package Delivered]
│   • Status: "Delivered"
│   • Email: "Please confirm receipt"
│   • Auto-complete in 1 day
│
DAY 7
│
├─→ [Auto-Complete Check]
│   • System validates tracking
│   • Checks seller history
│   • Requires proof if needed
│   │
│   ├─→ [If Valid] → Complete with buffer
│   └─→ [If Invalid] → Flag for review
│
DAY 7 (If Completed)
│
├─→ [Order Completed]
│   • Status: "Completed"
│   • Payment Status: "Pending Release"
│   • Release Date: Day 10
│   • Email: "Final warning - report issues now!"
│
DAY 8-9
│
├─→ [3-Day Buffer Period]
│   • Customer can still report
│   • Can file dispute with photos
│   • Last chance protection
│
DAY 10
│
└─→ [Payment Released]
    • Money transferred to seller
    • Seller gets ₱1,000 💰
    • Order fully completed ✅


ALTERNATIVE PATHS:

Customer Confirms Early (Day 3):
│
├─→ [Manual Confirmation]
│   • Status: "Completed"
│   • Still has 3-day buffer
│   • Payment on Day 6
│

Customer Files Dispute (Any time before Day 10):
│
├─→ [Dispute Filed]
│   • Payment HELD indefinitely
│   • Admin reviews (24-48 hours)
│   • Decision: Refund or Complete
│

Seller Doesn't Ship (After 3 days):
│
├─→ [Auto-Cancel]
│   • Order cancelled
│   • Full refund to customer
│   • Seller gets warning
│
```

---

## 8. DATABASE RELATIONSHIPS

```
┌────────────────────────────────────────────────────────────────┐
│                  DATABASE SCHEMA DIAGRAM                        │
└────────────────────────────────────────────────────────────────┘

┌─────────────┐
│    USERS    │
└──────┬──────┘
       │
       ├─────────────────────────────────────┐
       │                                     │
       ↓                                     ↓
┌──────────────────┐              ┌──────────────────┐
│ MARKETPLACE_ITEMS│              │  SELLER_STATS    │
│                  │              │                  │
│ • seller_id ────→│              │ • seller_id ────→│
│ • title          │              │ • total_orders   │
│ • price          │              │ • scam_reports   │
│ • image          │              │ • rating         │
│ • status         │              │ • account_status │
└────────┬─────────┘              └──────────────────┘
         │
         ↓
┌──────────────────┐
│   CART_ITEMS     │
│                  │
│ • user_id ──────→│
│ • item_id ──────→│
│ • quantity       │
└──────────────────┘
         │
         ↓ (Checkout)
┌──────────────────┐
│     ORDERS       │
│                  │
│ • buyer_id ─────→│
│ • seller_id ────→│
│ • item_id ──────→│
│ • total_price    │
│ • status         │
│ • tracking_number│
└────────┬─────────┘
         │
         ├──────────────────────┬──────────────────────┐
         ↓                      ↓                      ↓
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ESCROW_TRANSACTIONS│  │    DISPUTES      │  │FAKE_TRACKING_RPT │
│                  │  │                  │  │                  │
│ • order_id ─────→│  │ • order_id ─────→│  │ • order_id ─────→│
│ • amount         │  │ • filed_by ─────→│  │ • reported_by ──→│
│ • status         │  │ • dispute_type   │  │ • reason         │
│ • released_to    │  │ • evidence_photos│  │ • status         │
└──────────────────┘  │ • status         │  └──────────────────┘
                      │ • admin_notes    │
                      └──────────────────┘

RELATIONSHIPS:
• One user can have many marketplace items (seller)
• One user can have many cart items (buyer)
• One user can have many orders (buyer or seller)
• One order has one escrow transaction
• One order can have one dispute
• One order can have multiple fake tracking reports
• One user has one seller_stats record
```

---

**Document Purpose:** Visual reference for implementation and capstone defense  
**Use Case:** Print or display during presentation to explain system flow  
**Status:** Ready for use
