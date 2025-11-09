/**
 * Test Xendit Webhook Locally
 * Simulates a Xendit webhook call to test your webhook handler
 */

// Simulate a Xendit invoice.paid webhook
const testWebhook = async () => {
  console.log('🧪 Testing Xendit Webhook Handler\n');
  console.log('='.repeat(50));
  
  // Sample webhook payload from Xendit
  const webhookPayload = {
    id: 'test_invoice_123456789',
    external_id: 'MUSEO_1762696933710_test',  // Replace with your actual order reference
    user_id: 'your_xendit_user_id',
    status: 'PAID',
    merchant_name: 'Museo Marketplace',
    amount: 2222,
    paid_amount: 2222,
    bank_code: 'GCASH',
    paid_at: new Date().toISOString(),
    payer_email: 'test@museo.art',
    description: 'Museo Orders (1 seller)',
    fees_paid_amount: 64.34,
    updated: new Date().toISOString(),
    created: new Date().toISOString(),
    currency: 'PHP',
    payment_method: 'EWALLET',
    payment_channel: 'GCASH',
    payment_destination: 'your_cash_account',
    metadata: {
      paymentGroupId: 'test-group-123',
      userId: 'test-user-456',
      orderCount: 1,
      source: 'museo_marketplace'
    }
  };
  
  const webhookHeaders = {
    'x-callback-event': 'invoice.paid',
    'content-type': 'application/json'
  };
  
  console.log('📤 Sending webhook to: http://localhost:3000/api/webhooks/xendit');
  console.log('📋 Payload:', JSON.stringify(webhookPayload, null, 2));
  console.log('');
  
  try {
    const response = await fetch('http://localhost:3000/api/webhooks/xendit', {
      method: 'POST',
      headers: webhookHeaders,
      body: JSON.stringify(webhookPayload)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Webhook received successfully!');
      console.log('📥 Response:', result);
      console.log('');
      console.log('='.repeat(50));
      console.log('✅ SUCCESS!');
      console.log('='.repeat(50));
      console.log('');
      console.log('Check your backend console for processing logs.');
      console.log('The order should now be marked as "paid" in the database.');
    } else {
      console.log('❌ Webhook failed!');
      console.log('Status:', response.status);
      console.log('Response:', result);
    }
  } catch (error) {
    console.log('❌ Error sending webhook:');
    console.log(error.message);
    console.log('');
    console.log('Make sure your backend is running on port 3000!');
    console.log('Run: npm run dev');
  }
};

// Instructions
console.log('');
console.log('📝 INSTRUCTIONS:');
console.log('1. Make sure your backend is running: npm run dev');
console.log('2. Create an order in your marketplace');
console.log('3. Copy the paymentReference from the order');
console.log('4. Update line 13 in this file with your reference');
console.log('5. Run: node test-webhook.js');
console.log('');
console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...');
console.log('');

// Wait 3 seconds then run
setTimeout(() => {
  testWebhook();
}, 3000);
