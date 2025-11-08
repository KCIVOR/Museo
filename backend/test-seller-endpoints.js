/**
 * Test file for seller dashboard endpoints
 * Run this to verify all endpoints are working correctly
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api';
const TEST_TOKEN = 'your-auth-token-here'; // Replace with actual auth token

async function testEndpoints() {
  console.log('🧪 Testing Seller Dashboard Endpoints...\n');

  const endpoints = [
    {
      name: 'Check Seller Status',
      method: 'GET',
      path: '/marketplace/seller/status',
      description: 'Checks if user is an active seller'
    },
    {
      name: 'Get My Items',
      method: 'GET', 
      path: '/marketplace/seller/my-items',
      description: 'Fetches all items for the current seller'
    },
    {
      name: 'Get Seller Stats (All Time)',
      method: 'GET',
      path: '/marketplace/seller/stats',
      description: 'Gets seller statistics for all time'
    },
    {
      name: 'Get Seller Stats (Weekly)',
      method: 'GET',
      path: '/marketplace/seller/stats?period=weekly',
      description: 'Gets seller statistics for the past week'
    },
    {
      name: 'Get Seller Stats (Monthly)',
      method: 'GET',
      path: '/marketplace/seller/stats?period=monthly',
      description: 'Gets seller statistics for the past month'
    }
  ];

  for (const endpoint of endpoints) {
    console.log(`\n📍 Testing: ${endpoint.name}`);
    console.log(`   ${endpoint.method} ${endpoint.path}`);
    console.log(`   ${endpoint.description}`);
    
    try {
      const response = await fetch(`${API_BASE}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Cookie': `token=${TEST_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log(`   ✅ Status: ${response.status} OK`);
        console.log(`   📊 Response:`, JSON.stringify(data, null, 2).slice(0, 200) + '...');
      } else {
        console.log(`   ❌ Status: ${response.status}`);
        console.log(`   ❌ Error:`, data.error || 'Unknown error');
      }
    } catch (error) {
      console.log(`   ❌ Failed:`, error.message);
    }
  }

  console.log('\n✅ Endpoint testing complete!');
}

// Instructions
console.log('=====================================');
console.log('SELLER ENDPOINT TEST SUITE');
console.log('=====================================');
console.log('\nTo run this test:');
console.log('1. Make sure the server is running (npm run dev)');
console.log('2. Log in as a seller and copy your auth token from browser cookies');
console.log('3. Replace TEST_TOKEN in this file with your actual token');
console.log('4. Run: node backend/test-seller-endpoints.js');
console.log('\n=====================================\n');

// Uncomment to run tests
// testEndpoints();

export default testEndpoints;
