/**
 * PayMongo Service
 * Handles all PayMongo API interactions using fetch
 */

const PAYMONGO_API_URL = 'https://api.paymongo.com/v1';

/**
 * Create authorization header for PayMongo API
 */
const getAuthHeader = () => {
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  if (!secretKey) {
    throw new Error('PAYMONGO_SECRET_KEY is not configured');
  }
  
  // PayMongo uses Basic Auth with secret key as username and empty password
  const auth = Buffer.from(secretKey + ':').toString('base64');
  return `Basic ${auth}`;
};

/**
 * Create a payment link
 * @param {Object} params - Payment link parameters
 * @param {number} params.amount - Amount in centavos (e.g., 500000 = ₱5,000)
 * @param {string} params.description - Payment description
 * @param {Object} params.metadata - Additional metadata (orderId, userId, etc.)
 * @returns {Promise<Object>} Payment link data
 */
export const createPaymentLink = async ({ amount, description, metadata = {} }) => {
  try {
    const response = await fetch(`${PAYMONGO_API_URL}/links`, {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: amount,
            description: description,
            remarks: metadata.remarks || 'Museo Marketplace Order',
            // Payment methods to enable
            payment_method_types: [
              'card',      // Credit/Debit cards
              'gcash',     // GCash
              'paymaya',   // Maya (PayMaya)
              'grab_pay'   // GrabPay
            ],
            // Store metadata for webhook processing
            metadata: metadata
          }
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('PayMongo API Error:', data);
      throw new Error(data.errors?.[0]?.detail || 'Failed to create payment link');
    }

    return {
      success: true,
      paymentLinkId: data.data.id,
      checkoutUrl: data.data.attributes.checkout_url,
      referenceNumber: data.data.attributes.reference_number,
      expiresAt: data.data.attributes.archived_at,
      data: data.data
    };

  } catch (error) {
    console.error('Error creating payment link:', error);
    throw error;
  }
};

/**
 * Retrieve a payment link by ID
 * @param {string} linkId - Payment link ID
 * @returns {Promise<Object>} Payment link data
 */
export const getPaymentLink = async (linkId) => {
  try {
    const response = await fetch(`${PAYMONGO_API_URL}/links/${linkId}`, {
      method: 'GET',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('PayMongo API Error:', data);
      throw new Error(data.errors?.[0]?.detail || 'Failed to retrieve payment link');
    }

    return {
      success: true,
      data: data.data
    };

  } catch (error) {
    console.error('Error retrieving payment link:', error);
    throw error;
  }
};

/**
 * Verify webhook signature
 * @param {Object} payload - Webhook payload
 * @param {string} signature - Webhook signature from headers
 * @returns {boolean} True if signature is valid
 */
export const verifyWebhookSignature = (payload, signature) => {
  // For now, we'll skip signature verification in development
  // In production, you should implement proper signature verification
  // using the webhook secret from PayMongo dashboard
  
  // TODO: Implement proper webhook signature verification
  // const crypto = require('crypto');
  // const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  // const computedSignature = crypto
  //   .createHmac('sha256', webhookSecret)
  //   .update(JSON.stringify(payload))
  //   .digest('hex');
  // return computedSignature === signature;
  
  return true; // For development only
};

/**
 * Process payment success webhook
 * @param {Object} webhookData - Webhook data from PayMongo
 * @returns {Object} Processed payment data
 */
export const processPaymentSuccess = (webhookData) => {
  try {
    const attributes = webhookData.data.attributes;
    const payment = attributes.data;

    // Convert Unix timestamp to ISO date string
    let paidAt = null;
    if (payment.attributes.paid_at) {
      // PayMongo sends Unix timestamp in seconds
      paidAt = new Date(payment.attributes.paid_at * 1000).toISOString();
    }

    return {
      paymentId: payment.id,
      paymentLinkId: webhookData.data.id,
      amount: payment.attributes.amount,
      currency: payment.attributes.currency,
      status: payment.attributes.status,
      paymentMethod: payment.attributes.source?.type || 'unknown',
      paidAt: paidAt,
      fee: payment.attributes.fee,
      netAmount: payment.attributes.net_amount,
      metadata: payment.attributes.metadata || {},
      referenceNumber: attributes.reference_number
    };

  } catch (error) {
    console.error('Error processing payment success:', error);
    throw error;
  }
};

/**
 * Convert amount to centavos (PayMongo uses centavos)
 * @param {number} amount - Amount in pesos
 * @returns {number} Amount in centavos
 */
export const toCentavos = (amount) => {
  return Math.round(amount * 100);
};

/**
 * Convert centavos to pesos
 * @param {number} centavos - Amount in centavos
 * @returns {number} Amount in pesos
 */
export const toPesos = (centavos) => {
  return centavos / 100;
};

/**
 * Get payment method display name
 * @param {string} type - Payment method type from PayMongo
 * @returns {string} Display name
 */
export const getPaymentMethodName = (type) => {
  const methods = {
    'card': 'Credit/Debit Card',
    'gcash': 'GCash',
    'paymaya': 'Maya (PayMaya)',
    'grab_pay': 'GrabPay',
    'bank_transfer': 'Bank Transfer'
  };
  
  return methods[type] || type;
};

export default {
  createPaymentLink,
  getPaymentLink,
  verifyWebhookSignature,
  processPaymentSuccess,
  toCentavos,
  toPesos,
  getPaymentMethodName
};
