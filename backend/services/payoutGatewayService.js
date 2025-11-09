/**
 * Payout Gateway Service
 * Handles automated money transfers to sellers
 * Supports: Bank Transfer, GCash, Maya via Xendit
 */

class PayoutGatewayService {
  constructor() {
    this.xenditApiKey = process.env.XENDIT_SECRET_KEY;
    this.xenditBaseUrl = 'https://api.xendit.co';
    
    // Base64 encode the API key for Basic Auth
    this.authHeader = `Basic ${Buffer.from(this.xenditApiKey + ':').toString('base64')}`;
  }

  /**
   * Send payout to seller's bank account
   * Uses Xendit Disbursements API
   */
  async sendBankPayout(payoutDetails) {
    try {
      const {
        amount,
        bankCode,
        accountNumber,
        accountName,
        description,
        externalId
      } = payoutDetails;

      const response = await fetch(`${this.xenditBaseUrl}/disbursements`, {
        method: 'POST',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          external_id: externalId, // Your payout ID
          bank_code: bankCode, // e.g., 'BDO', 'BPI', 'UBP'
          account_holder_name: accountName,
          account_number: accountNumber,
          description: description || 'Museo Artist Payout',
          amount: amount,
          email_to: [], // Optional: notify seller
          email_cc: [],
          email_bcc: []
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Bank payout failed');
      }

      return {
        success: true,
        referenceId: data.id,
        status: data.status, // PENDING, COMPLETED, FAILED
        data: data
      };

    } catch (error) {
      console.error('Bank payout error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send payout to GCash
   * Uses Xendit eWallet Disbursements
   */
  async sendGCashPayout(payoutDetails) {
    try {
      const {
        amount,
        phoneNumber,
        description,
        externalId
      } = payoutDetails;

      // Remove leading 0 and add +63 for PH numbers
      const formattedPhone = phoneNumber.startsWith('0') 
        ? '+63' + phoneNumber.substring(1)
        : phoneNumber;

      const response = await fetch(`${this.xenditBaseUrl}/disbursements/ewallet`, {
        method: 'POST',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json',
          'Idempotency-key': externalId // Prevent duplicate payouts
        },
        body: JSON.stringify({
          reference_id: externalId,
          channel_code: 'PH_GCASH',
          channel_properties: {
            account_number: formattedPhone
          },
          amount: amount,
          description: description || 'Museo Artist Payout',
          currency: 'PHP'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'GCash payout failed');
      }

      return {
        success: true,
        referenceId: data.reference_id,
        status: data.status,
        data: data
      };

    } catch (error) {
      console.error('GCash payout error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send payout to Maya (PayMaya)
   * Uses Xendit eWallet Disbursements
   */
  async sendMayaPayout(payoutDetails) {
    try {
      const {
        amount,
        phoneNumber,
        description,
        externalId
      } = payoutDetails;

      const formattedPhone = phoneNumber.startsWith('0') 
        ? '+63' + phoneNumber.substring(1)
        : phoneNumber;

      const response = await fetch(`${this.xenditBaseUrl}/disbursements/ewallet`, {
        method: 'POST',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json',
          'Idempotency-key': externalId
        },
        body: JSON.stringify({
          reference_id: externalId,
          channel_code: 'PH_PAYMAYA',
          channel_properties: {
            account_number: formattedPhone
          },
          amount: amount,
          description: description || 'Museo Artist Payout',
          currency: 'PHP'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Maya payout failed');
      }

      return {
        success: true,
        referenceId: data.reference_id,
        status: data.status,
        data: data
      };

    } catch (error) {
      console.error('Maya payout error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check payout status
   * Used to verify if payout was successful
   */
  async checkPayoutStatus(disbursementId) {
    try {
      const response = await fetch(
        `${this.xenditBaseUrl}/disbursements/${disbursementId}`,
        {
          headers: {
            'Authorization': this.authHeader
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Status check failed');
      }

      return {
        success: true,
        status: data.status, // PENDING, COMPLETED, FAILED
        data: data
      };

    } catch (error) {
      console.error('Status check error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get available balance in Xendit account
   */
  async getBalance() {
    try {
      const response = await fetch(
        `${this.xenditBaseUrl}/balance`,
        {
          headers: {
            'Authorization': this.authHeader
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Balance check failed');
      }

      return {
        success: true,
        balance: data.balance,
        currency: data.currency
      };

    } catch (error) {
      console.error('Balance check error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Main function to process payout based on payment method
   */
  async processPayout(payoutData) {
    const { paymentMethod, amount, sellerInfo, payoutId } = payoutData;

    try {
      let result;

      switch (paymentMethod) {
        case 'bank':
          result = await this.sendBankPayout({
            amount: amount,
            bankCode: this.getBankCode(sellerInfo.bankName),
            accountNumber: sellerInfo.bankAccountNumber,
            accountName: sellerInfo.bankAccountName,
            description: `Payout for ${sellerInfo.shopName}`,
            externalId: payoutId
          });
          break;

        case 'gcash':
          result = await this.sendGCashPayout({
            amount: amount,
            phoneNumber: sellerInfo.gcashNumber,
            description: `Payout for ${sellerInfo.shopName}`,
            externalId: payoutId
          });
          break;

        case 'maya':
          result = await this.sendMayaPayout({
            amount: amount,
            phoneNumber: sellerInfo.mayaNumber,
            description: `Payout for ${sellerInfo.shopName}`,
            externalId: payoutId
          });
          break;

        default:
          throw new Error(`Unsupported payment method: ${paymentMethod}`);
      }

      return result;

    } catch (error) {
      console.error('Process payout error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Map bank names to Xendit bank codes
   */
  getBankCode(bankName) {
    const bankCodes = {
      'BDO': 'BDO',
      'BPI': 'BPI',
      'Metrobank': 'MBTC',
      'UnionBank': 'UBP',
      'Landbank': 'LBP',
      'PNB': 'PNB',
      'Security Bank': 'SECB',
      'RCBC': 'RCBC',
      'Chinabank': 'CBC',
      'EastWest': 'EWB'
    };

    return bankCodes[bankName] || bankName;
  }
}

export default new PayoutGatewayService();
