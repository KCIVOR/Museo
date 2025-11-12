# 🔄 Museo Marketplace Returns System Implementation Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [Business Rules](#business-rules)
6. [API Documentation](#api-documentation)
7. [Testing Checklist](#testing-checklist)
8. [Deployment Guide](#deployment-guide)

---

## 📌 Overview

The Museo Marketplace Returns System provides a comprehensive solution for handling product returns, refunds, and disputes between buyers and sellers.

### Key Features
- ✅ 7-day return window from delivery
- ✅ 48-hour seller response time
- ✅ Evidence upload (up to 5 images)
- ✅ Automatic refund processing via Xendit
- ✅ Dispute escalation to admin
- ✅ Return status tracking
- ✅ Seller payout adjustments

### System Architecture
```
Buyer → Return Request → Seller Review → Approval/Rejection
                                ↓
                          Refund Processing
                                ↓
                          Payout Adjustment
```

---

## 🗄️ Database Schema

### 1. Returns Table
```sql
CREATE TABLE IF NOT EXISTS "returns" (
  "returnId" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "orderId" UUID NOT NULL REFERENCES "orders"("orderId") ON DELETE RESTRICT,
  "buyerId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  "sellerProfileId" UUID NOT NULL REFERENCES "sellerProfiles"("sellerProfileId") ON DELETE RESTRICT,
  
  -- Core fields
  "reason" VARCHAR(50) NOT NULL CHECK ("reason" IN (
    'defective_damaged',
    'wrong_item',
    'not_as_described',
    'changed_mind',
    'other'
  )),
  "description" TEXT NOT NULL,
  
  -- Status flow
  "status" VARCHAR(20) DEFAULT 'pending' CHECK ("status" IN (
    'pending',    -- Waiting for seller response
    'approved',   -- Seller approved, processing refund
    'rejected',   -- Seller rejected
    'refunded',   -- Money refunded to buyer
    'disputed'    -- Escalated to admin
  )),
  
  -- Evidence
  "evidenceImages" TEXT[], -- Max 5 images
  
  -- Refund details
  "refundAmount" DECIMAL(10,2),
  "refundId" VARCHAR(255), -- Xendit refund ID
  
  -- Response
  "sellerResponse" TEXT,
  "adminNotes" TEXT,
  
  -- Timestamps
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP WITH TIME ZONE,
  "refundedAt" TIMESTAMP WITH TIME ZONE,
  "disputedAt" TIMESTAMP WITH TIME ZONE,
  "resolvedAt" TIMESTAMP WITH TIME ZONE
);
```

### 2. Return Messages Table
```sql
CREATE TABLE IF NOT EXISTS "returnMessages" (
  "messageId" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "returnId" UUID NOT NULL REFERENCES "returns"("returnId") ON DELETE CASCADE,
  "senderId" UUID NOT NULL REFERENCES auth.users(id),
  "message" TEXT NOT NULL,
  "isAdmin" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Orders Table Updates
```sql
ALTER TABLE "orders" 
ADD COLUMN IF NOT EXISTS "hasReturn" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "returnStatus" VARCHAR(20);
```

### 4. Indexes
```sql
CREATE INDEX idx_returns_order ON "returns"("orderId");
CREATE INDEX idx_returns_buyer ON "returns"("buyerId");
CREATE INDEX idx_returns_seller ON "returns"("sellerId");
CREATE INDEX idx_returns_status ON "returns"("status");
CREATE INDEX idx_return_messages_return ON "returnMessages"("returnId");
```

---

## 🔧 Backend Implementation

### File Structure
```
backend/
├── services/
│   ├── returnService.js       # Business logic
│   └── xenditService.js       # Refund processing
├── controllers/
│   └── returnController.js    # API endpoints
├── routes/
│   └── returnRoutes.js        # Route definitions
└── database/
    └── migrations/
        └── 004_returns_system.sql
```

### returnService.js
```javascript
// Core functions
- createReturn(orderId, buyerId, reason, description, images)
- getReturnById(returnId)
- getReturnsByBuyer(buyerId)
- getReturnsBySeller(sellerId)
- updateReturnStatus(returnId, status, response)
- addDisputeMessage(returnId, senderId, message)
- processRefund(returnId)
- checkReturnWindow(orderDate)
- autoRejectExpiredReturns()
```

### returnController.js
```javascript
// API Endpoints
- createReturnRequest    // POST /api/returns
- getReturnDetails       // GET /api/returns/:id
- getBuyerReturns        // GET /api/returns/buyer
- getSellerReturns       // GET /api/returns/seller
- updateReturnStatus     // PUT /api/returns/:id/status
- escalateToDispute      // POST /api/returns/:id/dispute
- addMessage            // POST /api/returns/:id/message
```

### xenditService.js Updates
```javascript
// New refund functions
async function createRefund(paymentId, amount, reason) {
  const refund = await xendit.Refund.create({
    payment_id: paymentId,
    amount: amount,
    reason: reason,
    metadata: {
      type: 'marketplace_return'
    }
  });
  return refund;
}

async function getRefundStatus(refundId) {
  const refund = await xendit.Refund.get(refundId);
  return refund.status;
}
```

---

## 💻 Frontend Implementation

### File Structure
```
frontend/src/
├── components/
│   ├── ReturnModal.jsx         # Return request form
│   ├── ReturnDetails.jsx       # Return details view
│   └── SellerReturnModal.jsx   # Seller review modal
├── pages/
│   ├── MyReturns.jsx          # Buyer returns page
│   ├── OrderHistory.jsx       # Updated with return button
│   └── SellerDashboard.jsx    # Updated with returns tab
└── styles/
    └── returns.css            # Return-specific styles
```

### ReturnModal.jsx
```jsx
// Component structure
function ReturnModal({ order, onClose, onSubmit }) {
  // States
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  
  // Return window validation
  const isWithinReturnWindow = () => {
    const deliveryDate = new Date(order.deliveredAt);
    const daysSinceDelivery = (Date.now() - deliveryDate) / (1000 * 60 * 60 * 24);
    return daysSinceDelivery <= 7;
  };
  
  // Image upload handler
  const handleImageUpload = (files) => {
    if (images.length + files.length > 5) {
      alert('Maximum 5 images allowed');
      return;
    }
    // Upload logic
  };
  
  return (
    <div className="return-modal">
      {/* Form content */}
    </div>
  );
}
```

### MyReturns.jsx
```jsx
// Returns management page
function MyReturns() {
  const [returns, setReturns] = useState([]);
  const [filter, setFilter] = useState('all');
  
  // Fetch user's returns
  useEffect(() => {
    fetchBuyerReturns();
  }, []);
  
  // Status filter
  const filteredReturns = returns.filter(ret => {
    if (filter === 'all') return true;
    return ret.status === filter;
  });
  
  return (
    <div className="my-returns">
      {/* Returns list with filters */}
    </div>
  );
}
```

---

## 📐 Business Rules

### Escrow Period
- **Duration**: 7 days from delivery date
- **Purpose**: Hold payment until return window closes
- **Release**: Automatic after 7 days if no return requested
- **Protection**: Ensures funds available for refunds

### Return Window
- **Duration**: 7 days from delivery date (matches escrow)
- **Validation**: Checked on frontend and backend
- **Exception**: Admin can override
- **Deadline**: Must request return before escrow releases

### Response Time
- **Seller Response**: 48 hours from return request
- **Auto-Rejection**: After 48 hours of no response
- **Notification**: Email sent at 24 hours
- **Urgency**: Must respond before escrow period ends

### Refund Processing
- **Trigger**: When status changes to 'approved'
- **Method**: Xendit API (from escrowed funds)
- **Amount**: Full order amount (no partial refunds)
- **Timeline**: Immediate (funds still in escrow)

### Dispute Escalation
- **When**: After seller rejection
- **Who**: Buyer can escalate
- **Resolution**: Admin decision is final

### Evidence Requirements
- **Images**: Maximum 5 images
- **Size**: Max 5MB per image
- **Format**: JPG, PNG, WEBP
- **Storage**: Cloudinary or S3

---

## 📚 API Documentation

### Create Return Request
```http
POST /api/returns
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "uuid",
  "reason": "defective_damaged",
  "description": "Item arrived broken",
  "evidenceImages": ["url1", "url2"]
}

Response: 201 Created
{
  "success": true,
  "returnId": "uuid",
  "status": "pending"
}
```

### Get Return Details
```http
GET /api/returns/:returnId
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "return": {
    "returnId": "uuid",
    "orderId": "uuid",
    "status": "pending",
    "reason": "defective_damaged",
    "description": "Item arrived broken",
    "evidenceImages": ["url1", "url2"],
    "createdAt": "2024-11-11T00:00:00Z"
  }
}
```

### Update Return Status (Seller)
```http
PUT /api/returns/:returnId/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "approved",
  "sellerResponse": "We apologize for the inconvenience"
}

Response: 200 OK
{
  "success": true,
  "message": "Return approved, refund processing"
}
```

### Escalate to Dispute
```http
POST /api/returns/:returnId/dispute
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Seller rejected valid return"
}

Response: 200 OK
{
  "success": true,
  "message": "Return escalated to admin"
}
```

---

## ✅ Testing Checklist

### Unit Tests
- [ ] Return window calculation
- [ ] Status transitions
- [ ] Refund amount calculation
- [ ] Image upload validation
- [ ] Permission checks

### Integration Tests
- [ ] Create return → Email notification
- [ ] Approve return → Process refund
- [ ] Auto-rejection after 48 hours
- [ ] Dispute escalation flow
- [ ] Payout adjustment

### E2E Tests
- [ ] Complete return flow (buyer perspective)
- [ ] Complete review flow (seller perspective)
- [ ] Admin dispute resolution
- [ ] Edge cases (expired window, invalid data)

### Manual Testing
- [ ] UI responsiveness
- [ ] Image upload/preview
- [ ] Error messages
- [ ] Loading states
- [ ] Success confirmations

---

## 🚀 Deployment Guide

### Prerequisites
- [ ] Xendit API credentials configured
- [ ] Email service configured
- [ ] Image storage service ready
- [ ] Database migrations run

### Environment Variables
```env
# Payment
XENDIT_SECRET_KEY=xnd_production_xxx
XENDIT_PUBLIC_KEY=xnd_public_production_xxx

# Email
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.xxx

# Storage
CLOUDINARY_URL=cloudinary://xxx
```

### Deployment Steps

1. **Database Migration**
```bash
# Run migration
npm run migrate:up 004_returns_system
```

2. **Backend Deployment**
```bash
# Test endpoints
npm test

# Deploy to production
npm run deploy:backend
```

3. **Frontend Deployment**
```bash
# Build frontend
npm run build

# Deploy to production
npm run deploy:frontend
```

4. **Post-Deployment**
- [ ] Verify database tables created
- [ ] Test return creation
- [ ] Test email notifications
- [ ] Monitor error logs
- [ ] Check refund processing

### Rollback Plan
```bash
# If issues occur
npm run migrate:down 004_returns_system
git revert <commit>
npm run deploy:rollback
```

---

## 📊 Monitoring

### Key Metrics
- Return request rate
- Average resolution time
- Dispute rate
- Refund success rate
- Auto-rejection rate

### Alerts
- Failed refund processing
- High dispute rate (>10%)
- Slow response time (>48 hours average)
- Database errors

### Logs
```javascript
// Log structure
{
  "timestamp": "2024-11-11T00:00:00Z",
  "level": "info",
  "service": "returns",
  "action": "create_return",
  "userId": "uuid",
  "orderId": "uuid",
  "returnId": "uuid",
  "status": "success"
}
```

---

## 📝 Notes

### Future Enhancements
- [ ] Partial returns support
- [ ] Store credit option
- [ ] Return shipping labels
- [ ] Automated return approval for trusted sellers
- [ ] Return analytics dashboard
- [ ] Mobile app support

### Known Limitations
- No partial refunds (full amount only)
- Maximum 5 evidence images
- 7-day return window is fixed
- No international returns support

### Support Contact
- **Technical Issues**: dev@museo.com
- **Business Questions**: support@museo.com
- **Emergency**: +63 123 456 7890

---

*Last Updated: November 11, 2024*
*Version: 1.0.0*
