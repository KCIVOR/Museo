import React from 'react';
import MuseoModal, { MuseoModalBody, MuseoModalActions } from '../../../components/MuseoModal';

export default function OrderDetailsModal({ 
  isOpen, 
  onClose, 
  order,
  onCancelOrder,
  onMarkAsDelivered,
  getReturnByOrder,
  openReturnDetails,
  openReturnModal,
  getStatusBadge,
  formatDate,
  formatPrice 
}) {
  // Safety checks
  if (!isOpen) return null;
  if (!order) {
    console.error('Order data is missing in OrderDetailsModal');
    return null;
  }
  
  // Ensure we have clean data to work with
  const safeOrder = {
    orderId: order.orderId || 'Unknown ID',
    status: order.status || 'unknown',
    paymentStatus: order.paymentStatus || 'unknown',
    createdAt: order.createdAt || new Date().toISOString(),
    paidAt: order.paidAt,
    totalAmount: typeof order.totalAmount === 'number' ? order.totalAmount : 0,
    paymentFee: typeof order.paymentFee === 'number' ? order.paymentFee : 0,
    items: Array.isArray(order.items) ? order.items : [],
    shippingAddress: order.shippingAddress || {},
    trackingNumber: order.trackingNumber,
    shippedAt: order.shippedAt
  };

  return (
    <MuseoModal
      open={isOpen}
      onClose={onClose}
      title="Order Details"
      size="lg"
    >
      <MuseoModalBody style={{ backgroundColor: '#faf5f0' }}>
          {/* Order Info */}
          <div className="order-details-section" style={{ borderBottom: '1px solid #e6ddd0', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#1e293b' }}>Order Information</h3>
            <div className="order-details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <div className="detail-item" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span className="detail-label" style={{ fontSize: '0.85rem', color: '#64748b' }}>Order ID:</span>
                <span className="detail-value" style={{ fontFamily: 'monospace', color: '#334155' }}>{safeOrder.orderId}</span>
              </div>
              <div className="detail-item" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span className="detail-label" style={{ fontSize: '0.85rem', color: '#64748b' }}>Status:</span>
                <span className="detail-value">{getStatusBadge(safeOrder)}</span>
              </div>
              <div className="detail-item" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span className="detail-label" style={{ fontSize: '0.85rem', color: '#64748b' }}>Order Date:</span>
                <span className="detail-value" style={{ color: '#334155' }}>{formatDate(safeOrder.createdAt)}</span>
              </div>
              {safeOrder.paidAt && (
                <div className="detail-item" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span className="detail-label" style={{ fontSize: '0.85rem', color: '#64748b' }}>Paid At:</span>
                  <span className="detail-value" style={{ color: '#334155' }}>{formatDate(safeOrder.paidAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="order-details-section" style={{ borderBottom: '1px solid #e6ddd0', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#1e293b' }}>Order Items</h3>
            <div className="order-items-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {safeOrder.items.map((item, index) => {
                // Make sure price is a valid number
                const price = typeof item.price === 'number' ? item.price : 0;
                const quantity = typeof item.quantity === 'number' ? item.quantity : 1;
                const total = price * quantity;
                
                return (
                  <div key={index} className="order-item" style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '80px 1fr auto', 
                    gap: '1rem',
                    alignItems: 'center',
                    padding: '0.75rem',
                    backgroundColor: '#faf5f0',
                    borderRadius: '4px',
                    borderBottom: '1px solid #e6ddd0'
                  }}>
                    <img 
                      src={item.itemImage || '/assets/default-art.jpg'} 
                      alt={item.itemTitle || 'Product'}
                      style={{ 
                        width: '80px', 
                        height: '80px', 
                        objectFit: 'cover',
                        borderRadius: '4px',
                        border: '1px solid #e6ddd0'
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ 
                        margin: '0 0 0.35rem 0', 
                        fontSize: '0.95rem', 
                        fontWeight: 500,
                        color: '#1e293b'
                      }}>{item.itemTitle || 'Untitled Product'}</h4>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', gap: '0.5rem' }}>
                        <span>Qty: {quantity}</span>
                        <span>•</span>
                        <span>{formatPrice(price)} each</span>
                      </div>
                    </div>
                    <div style={{ fontWeight: 600, color: '#1e293b', textAlign: 'right' }}>
                      {formatPrice(total)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shipping Address */}
          {Object.keys(safeOrder.shippingAddress).length > 0 && (
            <div className="order-details-section" style={{ borderBottom: '1px solid #e6ddd0', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#1e293b' }}>Shipping Address</h3>
              <div style={{ 
                padding: '0.75rem 1rem', 
                lineHeight: 1.5,
                fontSize: '0.95rem',
                color: '#334155'
              }}>
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>{safeOrder.shippingAddress?.fullName || 'No name provided'}</p>
                <p style={{ margin: '0 0 0.5rem 0' }}>{safeOrder.shippingAddress?.phone || 'No phone provided'}</p>
                <p style={{ margin: '0 0 0.25rem 0' }}>{safeOrder.shippingAddress?.street || 'No street provided'}</p>
                {(safeOrder.shippingAddress?.barangay || safeOrder.shippingAddress?.city) && (
                  <p style={{ margin: '0 0 0.25rem 0' }}>
                    {safeOrder.shippingAddress?.barangay || ''}
                    {safeOrder.shippingAddress?.barangay && safeOrder.shippingAddress?.city ? ', ' : ''}
                    {safeOrder.shippingAddress?.city || ''}
                  </p>
                )}
                <p style={{ margin: 0 }}>
                  {safeOrder.shippingAddress?.province || ''}
                  {safeOrder.shippingAddress?.province && safeOrder.shippingAddress?.postalCode ? ' ' : ''}
                  {safeOrder.shippingAddress?.postalCode || ''}
                </p>
              </div>
            </div>
          )}

          {/* Tracking Information */}
          {safeOrder.trackingNumber && (
            <div className="order-details-section" style={{ borderBottom: '1px solid #e6ddd0', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#1e293b' }}>Tracking Information</h3>
              <div style={{ 
                padding: '0.75rem 1rem', 
                lineHeight: 1.5 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2">
                    <rect x="1" y="3" width="15" height="13"/>
                    <path d="M16 8h5l3 3v5h-2"/>
                    <circle cx="5.5" cy="18.5" r="2.5"/>
                    <circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                  <div>
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', color: '#64748b' }}>Tracking Number</p>
                    <p style={{ margin: 0, fontWeight: 500, fontFamily: 'monospace', fontSize: '1rem', color: '#1e293b' }}>{safeOrder.trackingNumber}</p>
                  </div>
                </div>
                {safeOrder.shippedAt && (
                  <p style={{ 
                    margin: '0.75rem 0 0 0',
                    paddingTop: '0.75rem',
                    borderTop: '1px dashed #e6ddd0',
                    fontSize: '0.85rem', 
                    color: '#64748b',
                    textAlign: 'right'
                  }}>
                    Shipped on: {formatDate(safeOrder.shippedAt)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Payment Summary */}
          <div className="order-details-section">
            <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#1e293b' }}>Payment Summary</h3>
            <div style={{ 
              padding: '0.75rem 1rem', 
              fontSize: '0.95rem' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span style={{ color: '#64748b' }}>Subtotal:</span>
                <span style={{ color: '#334155' }}>{formatPrice(safeOrder.totalAmount)}</span>
              </div>
              {safeOrder.paymentFee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                  <span style={{ color: '#64748b' }}>Payment Fee:</span>
                  <span style={{ color: '#334155' }}>{formatPrice(safeOrder.paymentFee)}</span>
                </div>
              )}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '0.75rem 0 0.25rem', 
                marginTop: '0.5rem',
                borderTop: '2px solid #e6ddd0', 
                fontSize: '1.1rem',
                fontWeight: 600 
              }}>
                <span style={{ color: '#1e293b' }}>Total:</span>
                <span style={{ color: '#1e293b' }}>{formatPrice(safeOrder.totalAmount)}</span>
              </div>
            </div>
          </div>
      </MuseoModalBody>
      
      <MuseoModalActions>
        <button 
          className="btn btn-secondary btn-sm"
          onClick={onClose}
        >
          Close
        </button>
        
        {safeOrder.paymentStatus === 'pending' && safeOrder.status !== 'cancelled' && (
          <button 
            className="btn btn-danger btn-sm"
            onClick={() => onCancelOrder(safeOrder.orderId)}
          >
            Cancel Order
          </button>
        )}
        
        {safeOrder.status === 'shipped' && (
          <button 
            className="btn btn-success btn-sm"
            onClick={() => onMarkAsDelivered(safeOrder.orderId)}
          >
            Mark as Received
          </button>
        )}
        
        {/* Returns within details modal */}
        {safeOrder.status === 'delivered' && (
          (() => {
            const existing = getReturnByOrder(safeOrder.orderId);
            if (existing) {
              return (
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => { onClose(); openReturnDetails(existing.returnId); }}
                >
                  View Return
                </button>
              );
            }
            return (
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => { onClose(); openReturnModal(safeOrder); }}
              >
                Request Return
              </button>
            );
          })()
        )}
      </MuseoModalActions>
    </MuseoModal>
  );
}
