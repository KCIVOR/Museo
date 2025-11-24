/**
 * Xendit Service
 * Handles all Xendit API interactions for payment collection
 * Replaces PayMongo for payment collection
 */

const XENDIT_API_URL = 'https://api.xendit.co';

/**
 * Create authorization header for Xendit API
 */
const getAuthHeader = () => {
  const secretKey = process.env.XENDIT_SECRET_KEY;
  if (!secretKey) {
    throw new Error('XENDIT_SECRET_KEY is not configured');
  }
  
  // Xendit uses Basic Auth with secret key as username and empty password
  const auth = Buffer.from(secretKey + ':').toString('base64');
  return `Basic ${auth}`;
};

/**
 * Create an invoice (payment link) in Xendit
 * @param {Object} params - Invoice parameters
 * @param {number} params.amount - Amount in pesos (e.g., 5000 = ₱5,000)
 * @param {string} params.description - Payment description
 * @param {Object} params.metadata - Additional metadata (orderId, userId, etc.)
 * @returns {Promise<Object>} Invoice data
 */
export const createPaymentLink = async ({ amount, description, metadata = {} }) => {
  try {
    // Generate external ID (unique identifier)
    const externalId = `MUSEO_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Create invoice request
    const invoiceData = {
      external_id: externalId,
      amount: amount, // Xendit uses amount in regular currency (not centavos)
      description: description || 'Museo Marketplace Order',
      invoice_duration: 86400, // 24 hours in seconds
      currency: 'PHP',
      reminder_time: 1, // Send reminder 1 hour before expiry
      
      // Customer info (optional but recommended)
      customer: metadata.customerInfo || {
        given_names: metadata.customerInfo?.given_names || 'Museo',
        surname: metadata.customerInfo?.surname || 'Customer',
        email: metadata.customerInfo?.email || metadata.email || 'customer@museo.art'
      },
      
      // Success redirect (optional)
      success_redirect_url: metadata.successUrl || `${process.env.FRONTEND_URL || 'https://museofrontend.onrender.com/'}/marketplace/myorders`,
      failure_redirect_url: metadata.failureUrl || `${process.env.FRONTEND_URL || 'https://museofrontend.onrender.com/'}/marketplace`,
      
      // Payment methods to enable
      payment_methods: [
        'CREDIT_CARD',
        'DEBIT_CARD', 
        'GCASH',
        'PAYMAYA',
        'BPI',
        'BDO',
        'RCBC',
        'UNIONBANK'
      ],
      
      // Store metadata for webhook processing
      metadata: {
        ...metadata,
        source: 'museo_marketplace'
      }
    };

    console.log('🔄 Sending request to Xendit:', {
      url: `${XENDIT_API_URL}/v2/invoices`,
      amount: invoiceData.amount,
      external_id: invoiceData.external_id
    });

    const response = await fetch(`${XENDIT_API_URL}/v2/invoices`, {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invoiceData)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Xendit API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        error: data
      });
      
      // Check for specific error types
      if (data.error_code === 'API_VALIDATION_ERROR') {
        throw new Error(`Xendit validation error: ${data.message}`);
      } else if (data.error_code === 'INVALID_API_KEY') {
        throw new Error('Invalid Xendit API key. Please check your configuration.');
      } else {
        throw new Error(data.message || `Xendit error: ${response.status}`);
      }
    }

    console.log('✅ Xendit invoice created:', {
      invoiceId: data.id,
      invoiceUrl: data.invoice_url,
      amount: data.amount,
      externalId: data.external_id
    });

    return {
      success: true,
      paymentLinkId: data.id,
      checkoutUrl: data.invoice_url,
      referenceNumber: data.external_id,
      expiresAt: data.expiry_date,
      data: data
    };

  } catch (error) {
    console.error('Error creating Xendit payment link:', error);
    throw error;
  }
};

/**
 * Retrieve an invoice by ID
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<Object>} Invoice data
 */
export const getPaymentLink = async (invoiceId) => {
  try {
    const response = await fetch(`${XENDIT_API_URL}/v2/invoices/${invoiceId}`, {
      method: 'GET',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Xendit API Error:', data);
      throw new Error(data.message || 'Failed to retrieve invoice');
    }

    return {
      success: true,
      checkoutUrl: data.invoice_url,
      referenceNumber: data.external_id,
      status: data.status.toLowerCase(), // PENDING, PAID, EXPIRED
      expiresAt: data.expiry_date,
      data: data
    };

  } catch (error) {
    console.error('Error retrieving Xendit invoice:', error);
    throw error;
  }
};

/**
 * Get payment status (for manual checking)
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<Object>} Payment status
 */
export const getPaymentLinkStatus = async (invoiceId) => {
  try {
    const response = await fetch(`${XENDIT_API_URL}/v2/invoices/${invoiceId}`, {
      method: 'GET',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Xendit API Error:', data);
      throw new Error(data.message || 'Failed to get invoice status');
    }
    
    // Map Xendit status to our system status
    const statusMap = {
      'PENDING': 'pending',
      'PAID': 'paid',
      'EXPIRED': 'expired',
      'SETTLED': 'paid'
    };

    return {
      success: true,
      status: statusMap[data.status] || 'pending',
      referenceNumber: data.external_id,
      checkoutUrl: data.invoice_url,
      payments: data.payment_details ? [data.payment_details] : [],
      paidAt: data.paid_at,
      paymentMethod: data.payment_method,
      paymentChannel: data.payment_channel,
      amount: data.amount,
      data: data
    };

  } catch (error) {
    console.error('Error checking Xendit payment status:', error);
    throw error;
  }
};

/**
 * Cancel an invoice
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<Object>} Cancellation result
 */
export const cancelPaymentLink = async (invoiceId) => {
  try {
    const response = await fetch(`${XENDIT_API_URL}/v2/invoices/${invoiceId}/expire`, {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle specific error cases gracefully
      if (response.status === 404) {
        console.warn(`⚠️ Payment link ${invoiceId} not found (already expired or deleted)`);
        return {
          success: true,
          message: 'Payment link already expired or not found',
          alreadyExpired: true
        };
      }
      
      if (response.status === 400 && data.error_code === 'INVOICE_ALREADY_EXPIRED') {
        console.warn(`⚠️ Payment link ${invoiceId} already expired`);
        return {
          success: true,
          message: 'Payment link already expired',
          alreadyExpired: true
        };
      }
      
      console.error('Xendit API Error:', data);
      throw new Error(data.message || 'Failed to cancel invoice');
    }

    return {
      success: true,
      message: 'Invoice cancelled successfully',
      data: data
    };

  } catch (error) {
    console.error('Error cancelling Xendit invoice:', error);
    throw error;
  }
};

/**
 * Process successful payment from webhook
 * @param {Object} webhookData - Webhook payload from Xendit
 * @returns {Object} Processed payment data
 */
export const processPaymentSuccess = (webhookData) => {
  try {
    // Xendit webhook structure for invoice payment
    const paymentId = webhookData.id;
    const externalId = webhookData.external_id;
    const amount = webhookData.amount;
    const status = webhookData.status;
    const paidAt = webhookData.paid_at;
    const paymentMethod = webhookData.payment_method;
    const paymentChannel = webhookData.payment_channel;
    const paymentDetails = webhookData.payment_details;
    
    // Calculate fees (Xendit fees are separate)
    const fees = webhookData.fees_paid_amount || 0;

    console.log('Processing Xendit payment:', {
      paymentId,
      externalId,
      amount,
      status,
      paymentMethod
    });

    return {
      paymentId: paymentId,
      referenceNumber: externalId,
      amount: amount,
      fee: fees,
      netAmount: amount - fees,
      paymentMethod: paymentMethod,
      paymentChannel: paymentChannel,
      paidAt: paidAt,
      status: status,
      paymentDetails: paymentDetails
    };

  } catch (error) {
    console.error('Error processing Xendit payment data:', error);
    throw error;
  }
};

/**
 * Verify webhook signature (optional but recommended)
 * @param {Object} webhookData - Webhook payload
 * @param {string} signature - Webhook signature from headers
 * @returns {boolean} Whether signature is valid
 */
export const verifyWebhookSignature = (webhookData, signature) => {
  try {
    // Xendit webhook verification token (set in dashboard)
    const webhookVerificationToken = process.env.XENDIT_WEBHOOK_TOKEN;
    
    if (!webhookVerificationToken) {
      console.warn('XENDIT_WEBHOOK_TOKEN not configured, skipping signature verification');
      return true; // Skip verification if not configured
    }

    // Xendit uses a different signature method than PayMongo
    // For now, we'll skip verification in test mode
    // In production, implement proper HMAC verification
    
    return true; // Placeholder - implement proper verification

  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
};

/**
 * Create a refund for a payment
 * @param {Object} params - Refund parameters
 * @param {string} params.paymentIntentId - Original payment/invoice ID
 * @param {number} params.amount - Amount to refund
 * @param {string} params.reason - Reason for refund
 * @returns {Promise<Object>} Refund data
 */
export const createRefund = async ({ paymentIntentId, amount, reason }) => {
  try {
    console.log('🔄 Creating Xendit refund:', {
      paymentIntentId,
      amount,
      reason
    });

    // Normalize reason to Xendit's allowed enum
    const normalizeReason = (val) => {
      const allowed = ['FRAUDULENT','DUPLICATE','REQUESTED_BY_CUSTOMER','CANCELLATION','OTHERS'];
      if (!val) return 'CANCELLATION';
      const r = String(val).toUpperCase();
      if (allowed.includes(r)) return r;
      if (r.includes('FRAUD')) return 'FRAUDULENT';
      if (r.includes('DUPLICATE')) return 'DUPLICATE';
      if (r.includes('REQUEST') || r.includes('CUSTOMER') || r.includes('RETURN')) return 'REQUESTED_BY_CUSTOMER';
      if (r.includes('CANCEL')) return 'CANCELLATION';
      return 'OTHERS';
    };
    const reasonEnum = normalizeReason(reason);

    // First attempt: refund using invoice_id (works for some channels)
    let response = await fetch(`${XENDIT_API_URL}/refunds`, {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        invoice_id: paymentIntentId,
        amount: Number(amount),
        reason: reasonEnum
      })
    });

    let data = await response.json();

    if (!response.ok) {
      console.error('❌ Xendit Refund Error:', {
        status: response.status,
        error: data
      });

      // If validation error, try deriving payment_id from invoice and retry
      if (data?.error_code === 'API_VALIDATION_ERROR') {
        try {
          // Retrieve invoice details to find the underlying payment id
          const invRes = await fetch(`${XENDIT_API_URL}/v2/invoices/${paymentIntentId}`, {
            method: 'GET',
            headers: {
              'Authorization': getAuthHeader(),
              'Content-Type': 'application/json'
            }
          });
          const invData = await invRes.json();
          if (!invRes.ok) {
            console.error('❌ Failed to fetch invoice for refund fallback:', invData);
            throw new Error(invData?.message || 'Could not retrieve invoice to resolve payment id');
          }

          // Attempt to extract payment id from invoice payload
          // Common locations: root payment_id, payment_details.id, or payments[0].id
          const pd = invData?.payment_details || null;
          const payments = Array.isArray(invData?.payments) ? invData.payments : (pd ? [pd] : []);
          const paymentId = invData?.payment_id || payments?.[0]?.id || pd?.id || pd?.payment_id || null;

          if (!paymentId) {
            console.error('❌ Could not resolve payment id from invoice payload:', invData);
            throw new Error('Unable to resolve payment id for refund');
          }

          // Retry refund using payment_id
          response = await fetch(`${XENDIT_API_URL}/refunds`, {
            method: 'POST',
            headers: {
              'Authorization': getAuthHeader(),
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              payment_id: paymentId,
              amount: Number(amount),
              reason: reasonEnum
            })
          });
          data = await response.json();

          if (!response.ok) {
            console.error('❌ Xendit Refund Retry Error (payment_id):', { status: response.status, error: data });
            // Bubble up with details if present
            const details = data?.errors ? ` Details: ${JSON.stringify(data.errors)}` : '';
            throw new Error((data?.message || 'Failed to create refund via payment_id.') + details);
          }
        } catch (fallbackErr) {
          // Re-throw to caller
          throw fallbackErr;
        }
      } else if (data.error_code === 'INVOICE_NOT_FOUND') {
        throw new Error('Payment not found. Cannot process refund.');
      } else if (data.error_code === 'REFUND_AMOUNT_INVALID') {
        throw new Error('Invalid refund amount.');
      } else {
        const details = data?.errors ? ` Details: ${JSON.stringify(data.errors)}` : '';
        throw new Error((data?.message || 'Failed to create refund') + details);
      }
    }

    console.log('✅ Xendit refund created:', {
      refundId: data.id,
      amount: data.amount,
      status: data.status
    });

    return {
      success: true,
      id: data.id,
      amount: data.amount,
      status: data.status,
      data: data
    };

  } catch (error) {
    console.error('Error creating Xendit refund:', error);
    throw error;
  }
};

/**
 * Get refund status
 * @param {string} refundId - Refund ID
 * @returns {Promise<Object>} Refund status
 */
export const getRefundStatus = async (refundId) => {
  try {
    const response = await fetch(`${XENDIT_API_URL}/refunds/${refundId}`, {
      method: 'GET',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Xendit API Error:', data);
      throw new Error(data.message || 'Failed to get refund status');
    }

    return {
      success: true,
      status: data.status,
      amount: data.amount,
      data: data
    };

  } catch (error) {
    console.error('Error getting refund status:', error);
    throw error;
  }
};

/**
 * Helper: Convert pesos to centavos (if needed)
 * Note: Xendit uses regular currency amounts, not centavos
 */
export const toCentavos = (pesos) => Math.round(pesos * 100);

/**
 * Helper: Convert centavos to pesos (if needed)
 */
export const toPesos = (centavos) => centavos / 100;

export default {
  createPaymentLink,
  getPaymentLink,
  getPaymentLinkStatus,
  cancelPaymentLink,
  processPaymentSuccess,
  verifyWebhookSignature,
  createRefund,
  getRefundStatus,
  toCentavos,
  toPesos
};
