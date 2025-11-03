// Test file for visit booking functionality
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api/visit-bookings';

// Test data for a school visit
const testBookingData = {
  visitorType: 'school',
  organizationName: 'Test Elementary School',
  howMany: '30',
  classification: 'elementary',
  institutional: 'public',
  yearLevel: 'Grade 6',
  location: 'Manila, Metro Manila',
  organizationDetails: 'Field trip for science class',
  contactName: 'Ms. Teacher',
  contactEmail: 'teacher@school.edu.ph',
  contactPhone: '09123456789',
  preferredDate: '2025-11-15',
  preferredTime: 'morning',
  purposeOfVisit: 'educational-tour',
  remarks: 'Students will bring packed lunch'
};

// Function to test creating a booking
async function testCreateBooking() {
  console.log('Testing: Create Visit Booking');
  console.log('Sending data:', JSON.stringify(testBookingData, null, 2));
  
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testBookingData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success:', result.message);
      console.log('Booking ID:', result.data.visitId);
      return result.data.visitId;
    } else {
      console.log('❌ Failed:', result.message);
      if (result.error) {
        console.log('Error details:', result.error);
      }
      return null;
    }
  } catch (error) {
    console.log('❌ Connection error:', error.message);
    return null;
  }
}

// Function to test getting all bookings (requires admin auth)
async function testGetAllBookings() {
  console.log('\nTesting: Get All Bookings (requires admin auth)');
  
  try {
    const response = await fetch(API_BASE, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add your admin token here if you have authentication setup
        // 'Authorization': 'Bearer YOUR_TOKEN_HERE'
      }
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success: Found', result.count, 'bookings');
      if (result.data && result.data.length > 0) {
        console.log('Latest booking:', result.data[0]);
      }
    } else {
      console.log('❌ Failed:', result.message || 'Unauthorized (need admin auth)');
    }
  } catch (error) {
    console.log('❌ Connection error:', error.message);
  }
}

// Function to test getting a single booking by ID
async function testGetBookingById(visitId) {
  console.log('\nTesting: Get Booking by ID');
  
  if (!visitId) {
    console.log('⚠️ Skipping: No booking ID to test with');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/${visitId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success: Found booking');
      console.log('Visitor:', result.data.organization_name);
      console.log('Status:', result.data.status);
      console.log('Date:', result.data.preferred_date);
    } else {
      console.log('❌ Failed:', result.message);
    }
  } catch (error) {
    console.log('❌ Connection error:', error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('========================================');
  console.log('Visit Booking Controller Tests');
  console.log('========================================\n');
  
  // Test 1: Create a booking
  const bookingId = await testCreateBooking();
  
  // Test 2: Get all bookings
  await testGetAllBookings();
  
  // Test 3: Get single booking
  await testGetBookingById(bookingId);
  
  console.log('\n========================================');
  console.log('Tests completed!');
  console.log('========================================');
}

// Run the tests
runTests().catch(console.error);
