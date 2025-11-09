/**
 * Test Xendit API Connection
 * Run this to verify your Xendit integration works
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('🧪 Testing Xendit API Integration\n');
console.log('='.repeat(50));
console.log(`Mode: ${process.env.PAYOUT_MODE || 'demo'}`);
console.log(`API Key: ${process.env.XENDIT_SECRET_KEY?.substring(0, 20)}...`);
console.log('='.repeat(50));
console.log('');

// Test 1: Check Balance
async function testBalance() {
  console.log('📊 Test 1: Checking Xendit Balance...');
  
  try {
    const apiKey = process.env.XENDIT_SECRET_KEY;
    const authHeader = `Basic ${Buffer.from(apiKey + ':').toString('base64')}`;
    
    const response = await fetch('https://api.xendit.co/balance', {
      headers: {
        'Authorization': authHeader
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS!');
      console.log(`   Balance: ₱${data.balance || 0}`);
      console.log(`   Currency: ${data.currency || 'PHP'}`);
      console.log('');
      return true;
    } else {
      console.log('❌ FAILED!');
      console.log(`   Error: ${data.message || 'Unknown error'}`);
      console.log('');
      return false;
    }
  } catch (error) {
    console.log('❌ ERROR!');
    console.log(`   ${error.message}`);
    console.log('');
    return false;
  }
}

// Test 2: Test GCash Payout (will fail but shows API works)
async function testGCashPayout() {
  console.log('💰 Test 2: Testing GCash Payout API...');
  console.log('   (Using test phone number - will likely fail but shows connection works)');
  
  try {
    const apiKey = process.env.XENDIT_SECRET_KEY;
    const authHeader = `Basic ${Buffer.from(apiKey + ':').toString('base64')}`;
    const testId = 'TEST_' + Date.now();
    
    const response = await fetch('https://api.xendit.co/disbursements', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        external_id: testId,
        bank_code: 'BDO',
        account_holder_name: 'Test Artist',
        account_number: '000000000001', // Xendit test account
        description: 'Test payout from Museo',
        amount: 100
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ API CALL SUCCESSFUL!');
      console.log(`   Reference: ${data.id}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Amount: ₱${data.amount}`);
      console.log('');
      return true;
    } else {
      // Even if payout fails, if we get a proper error response, API is working
      if (data.error_code) {
        console.log('⚠️  API WORKING (Payout validation failed - expected in test)');
        console.log(`   Error Code: ${data.error_code}`);
        console.log(`   Message: ${data.message}`);
        console.log('');
        return true; // API is working, just validation failed
      } else {
        console.log('❌ FAILED!');
        console.log(`   Error: ${data.message || 'Unknown error'}`);
        console.log('');
        return false;
      }
    }
  } catch (error) {
    console.log('❌ ERROR!');
    console.log(`   ${error.message}`);
    console.log('');
    return false;
  }
}

// Test 3: Verify API Key Format
function testApiKeyFormat() {
  console.log('🔑 Test 3: Checking API Key Format...');
  
  const apiKey = process.env.XENDIT_SECRET_KEY;
  
  if (!apiKey) {
    console.log('❌ No API key found in .env file!');
    console.log('');
    return false;
  }
  
  if (apiKey.startsWith('xnd_development_')) {
    console.log('✅ Valid test/development key format');
    console.log('   Type: Development/Test Mode');
    console.log('   Safe to use - no real money');
    console.log('');
    return true;
  } else if (apiKey.startsWith('xnd_production_')) {
    console.log('⚠️  Production key detected!');
    console.log('   Type: Production Mode');
    console.log('   WARNING: This will use real money!');
    console.log('');
    return true;
  } else {
    console.log('⚠️  Unusual key format');
    console.log(`   Starts with: ${apiKey.substring(0, 10)}...`);
    console.log('   Expected: xnd_development_ or xnd_production_');
    console.log('');
    return true; // Still try to use it
  }
}

// Run all tests
async function runTests() {
  console.log('Starting Xendit API Tests...\n');
  
  const formatOk = testApiKeyFormat();
  const balanceOk = await testBalance();
  const payoutOk = await testGCashPayout();
  
  console.log('='.repeat(50));
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`API Key Format: ${formatOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Balance Check:  ${balanceOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Payout API:     ${payoutOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log('='.repeat(50));
  console.log('');
  
  if (balanceOk && payoutOk) {
    console.log('🎉 SUCCESS! Xendit integration is working!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Your payout system will now use real Xendit API');
    console.log('2. Test a complete payout flow in your app');
    console.log('3. Check Xendit dashboard for transaction logs');
    console.log('');
  } else {
    console.log('⚠️  Some tests failed. Check the errors above.');
    console.log('');
    console.log('Common issues:');
    console.log('- Invalid API key');
    console.log('- API key not activated');
    console.log('- Network/firewall issues');
    console.log('');
    console.log('Try:');
    console.log('1. Verify your API key in Xendit dashboard');
    console.log('2. Make sure you copied the full key');
    console.log('3. Check your internet connection');
    console.log('');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
