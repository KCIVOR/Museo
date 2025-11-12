# Returns Ship-Back Flow Implementation Checklist

## Overview
This implementation adds a ship-back flow to the returns system, ensuring buyers physically return items before refunds are processed. The database already has the necessary fields: `shippingStatus`, `returnAddress`, `buyerShippedAt`, `sellerReceivedAt`, `receivedCondition`, and `trackingNumber`.

## Phase 1: Backend Service Implementation

### 1. Update ReturnService.approveReturn()
- [x] Modify to store return address from seller's profile
- [x] Set `shippingStatus` to "pendingShipment"
- [x] Keep existing status as 'approved' for compatibility
- [x] Do NOT process refund immediately
- [x] Update order's returnStatus only

### 2. Create ReturnService.markShipped()
- [x] Add method that accepts returnId, buyerId, trackingNumber
- [x] Validate buyer owns the return
- [x] Validate return is in approved state with "pendingShipment" shipping status
- [x] Set `buyerShippedAt` to current timestamp
- [x] Update `shippingStatus` to "inTransit"
- [x] Store optional trackingNumber
- [x] Send notification to seller

### 3. Create ReturnService.markReceived()
- [x] Add method that accepts returnId, sellerProfileId, receivedCondition
- [x] Validate seller owns the return
- [x] Validate return has "inTransit" shipping status
- [x] Set `sellerReceivedAt` to current timestamp
- [x] Set optional receivedCondition
- [x] Update `shippingStatus` to "received"
- [x] Process refund via processRefund()
- [x] Update status to 'refunded'
- [x] Update `shippingStatus` to "completed"
- [x] Update order.status to 'returned'

### 4. Update Notification Messages
- [x] Add "return_shipped" message to createSellerNotification()
- [x] Add "return_refunded" message to createBuyerNotification()

## Phase 2: Controller Implementation

### 5. Add Controller Endpoints
- [x] Create markShipped() controller function
- [x] Create markReceived() controller function
- [x] Add proper authentication and validation
- [x] Add error handling with appropriate status codes

### 6. Configure Routes
- [x] Add POST /api/returns/:returnId/shipped route
- [x] Add PUT /api/returns/:returnId/received route
- [x] Apply authentication middleware

## Phase 3: Frontend Implementation

### 7. Update API Client
- [x] Add markReturnShipped() function
- [x] Add markReturnReceived() function

### 8. Update ReturnDetailsModal.jsx
- [x] Add UI for "pendingShipment" state (buyer view)
  - [x] Display return address
  - [x] Add optional tracking number input
  - [x] Add "Mark as Shipped" button
- [x] Add UI for "inTransit" state (seller view)
  - [x] Display shipping date and tracking number
  - [x] Add optional received condition input
  - [x] Add "Confirm Receipt & Process Refund" button
- [x] Update UI for "completed" state
  - [x] Display refund details and shipping info

## Phase 4: Testing

### 9. Test Flow
- [ ] Database schema validation
- [ ] Full return flow testing:
  - [ ] Create return
  - [ ] Approve return (verify address stored)
  - [ ] Mark shipped (verify status updates)
  - [ ] Mark received (verify refund processes)
- [ ] Error case testing:
  - [ ] Wrong user trying to mark shipped/received
  - [ ] Invalid state transitions
  - [ ] Missing required fields

## Implementation Code Examples

### Step 1: Update ReturnService.approveReturn()
```javascript
async approveReturn(returnId, sellerProfileId, sellerResponse = '') {
  // Existing code...
  
  // Add this code to get seller info and build returnAddress
  const { data: sellerInfo } = await db
    .from('sellerProfiles')
    .select('*')
    .eq('sellerProfileId', sellerProfileId)
    .single();

  const returnAddress = {
    name: sellerInfo?.shopName || 'Seller',
    phone: sellerInfo?.phoneNumber || null,
    street: sellerInfo?.street || null,
    landmark: sellerInfo?.landmark || null,
    barangay: sellerInfo?.barangay || null,
    city: sellerInfo?.city || null,
    province: sellerInfo?.province || null,
    postalCode: sellerInfo?.postalCode || null
  };
  
  // Update return - don't call processRefund() yet
  await db.from('returns')
    .update({
      status: 'approved',
      shippingStatus: "pendingShipment",
      returnAddress,
      sellerResponse,
      respondedAt: new Date().toISOString()
    })
    .eq('returnId', returnId);
  
  // Only update returnStatus on order
  await db.from('orders')
    .update({ returnStatus: 'approved' })
    .eq('orderId', returnData.orderId);
}
```

### Step 2: Create ReturnService.markShipped()
```javascript
async markShipped(returnId, buyerId, trackingNumber = null) {
  // Validate return exists and belongs to buyer
  const { data: returnData, error } = await db
    .from('returns')
    .select('*')
    .eq('returnId', returnId)
    .eq('buyerId', buyerId)
    .single();
    
  if (error || !returnData) throw new Error('Return not found');
  if (returnData.shippingStatus !== "pendingShipment") {
    throw new Error('Return is not in pending shipment state');
  }
  
  // Update return with shipped status
  const { error: updateError } = await db
    .from('returns')
    .update({
      shippingStatus: "inTransit",
      buyerShippedAt: new Date().toISOString(),
      trackingNumber: trackingNumber || null
    })
    .eq('returnId', returnId);
    
  if (updateError) throw new Error('Failed to mark as shipped');
  
  // Notify seller
  await this.createSellerNotification(returnData.sellerProfileId, returnId, 'return_shipped');
  
  return { success: true, message: 'Return marked as shipped' };
}
```

### Step 3: Create ReturnService.markReceived()
```javascript
async markReceived(returnId, sellerProfileId, receivedCondition = null) {
  // Validate return exists and belongs to seller
  const { data: returnData, error } = await db
    .from('returns')
    .select('*')
    .eq('returnId', returnId)
    .eq('sellerProfileId', sellerProfileId)
    .single();
    
  if (error || !returnData) throw new Error('Return not found');
  if (returnData.shippingStatus !== "inTransit") {
    throw new Error('Return is not in transit');
  }
  
  // Update return with received status
  const { error: updateError } = await db
    .from('returns')
    .update({
      shippingStatus: "received",
      sellerReceivedAt: new Date().toISOString(),
      receivedCondition: receivedCondition || null
    })
    .eq('returnId', returnId);
    
  if (updateError) throw new Error('Failed to mark as received');
  
  // Process refund now
  await this.processRefund(returnId);
  
  // Update final statuses
  await db
    .from('returns')
    .update({
      status: 'refunded',
      shippingStatus: "completed"
    })
    .eq('returnId', returnId);
  
  // Update order status
  await db
    .from('orders')
    .update({
      status: 'returned',
      returnStatus: 'refunded'
    })
    .eq('orderId', returnData.orderId);
  
  // Notify buyer
  await this.createBuyerNotification(returnData.buyerId, returnId, 'return_refunded');
  
  return { success: true, message: 'Return received and refund processed' };
}
```

### Step 4: Update Notification Messages
```javascript
// In createBuyerNotification()
const messages = {
  return_approved: 'Your return request has been approved',
  return_rejected: 'Your return request has been rejected',
  dispute_approved: 'Your dispute has been resolved in your favor',
  dispute_rejected: 'Your dispute has been resolved',
  return_refunded: 'Your item has been received and refund processed'
};

// In createSellerNotification()
const messages = {
  new_return: 'You have a new return request',
  dispute_approved: 'A return dispute was resolved against you',
  dispute_rejected: 'A return dispute was resolved in your favor',
  return_shipped: 'Buyer has shipped the return item'
};
```
