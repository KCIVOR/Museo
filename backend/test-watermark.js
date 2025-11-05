/**
 * 🧪 Watermark Test Script
 * Run this to test watermarking without uploading
 * 
 * Usage: node test-watermark.js
 */

import { addTextWatermark, addUserWatermark, addDiagonalWatermark, addClearWatermark } from './utils/watermark.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testWatermark() {
  try {
    console.log('🎨 Testing Watermark Utility...\n');

    // Check if test image exists
    const testImagePath = path.join(__dirname, 'test-image.jpg');
    
    if (!fs.existsSync(testImagePath)) {
      console.log('❌ Test image not found!');
      console.log('📝 Please add a test image named "test-image.jpg" to the backend folder\n');
      console.log('You can use any JPG/PNG image for testing.');
      return;
    }

    console.log('✅ Test image found:', testImagePath);
    
    // Read test image
    const imageBuffer = fs.readFileSync(testImagePath);
    console.log(`📦 Image size: ${(imageBuffer.length / 1024).toFixed(2)} KB\n`);

    // Test 1: Simple text watermark
    console.log('🧪 Test 1: Simple text watermark (bottom-right)...');
    const watermarked1 = await addTextWatermark(imageBuffer, {
      text: '© Museo 2025',
      position: 'bottom-right',
      opacity: 0.6
    });
    const output1 = path.join(__dirname, 'test-output-1-simple.jpg');
    fs.writeFileSync(output1, watermarked1);
    console.log(`✅ Saved: ${output1}\n`);

    // Test 2: User watermark
    console.log('🧪 Test 2: User watermark with name...');
    const watermarked2 = await addUserWatermark(imageBuffer, {
      username: 'John Artist',
      userId: 'test-123',
      date: 2025
    });
    const output2 = path.join(__dirname, 'test-output-2-user.jpg');
    fs.writeFileSync(output2, watermarked2);
    console.log(`✅ Saved: ${output2}\n`);

    // Test 3: Diagonal watermark
    console.log('🧪 Test 3: Diagonal repeating pattern...');
    const watermarked3 = await addDiagonalWatermark(imageBuffer, {
      text: '© Museo',
      opacity: 0.15
    });
    const output3 = path.join(__dirname, 'test-output-3-diagonal.jpg');
    fs.writeFileSync(output3, watermarked3);
    console.log(`✅ Saved: ${output3}\n`);

    // Test 4: Bottom-left position
    console.log('🧪 Test 4: Bottom-left position...');
    const watermarked4 = await addTextWatermark(imageBuffer, {
      text: '© Museo Gallery',
      position: 'bottom-left',
      opacity: 0.5
    });
    const output4 = path.join(__dirname, 'test-output-4-left.jpg');
    fs.writeFileSync(output4, watermarked4);
    console.log(`✅ Saved: ${output4}\n`);

    // Test 5: Center position
    console.log('🧪 Test 5: Center position...');
    const watermarked5 = await addTextWatermark(imageBuffer, {
      text: '© MUSEO',
      position: 'center',
      opacity: 0.3
    });
    const output5 = path.join(__dirname, 'test-output-5-center.jpg');
    fs.writeFileSync(output5, watermarked5);
    console.log(`✅ Saved: ${output5}\n`);

    // Test 6: Ultra-clear with background box
    console.log('🧪 Test 6: Ultra-clear watermark with background...');
    const watermarked6 = await addClearWatermark(imageBuffer, {
      text: '© Museo Gallery 2025',
      position: 'bottom-right',
      opacity: 0.95
    });
    const output6 = path.join(__dirname, 'test-output-6-ultra-clear.jpg');
    fs.writeFileSync(output6, watermarked6);
    console.log(`✅ Saved: ${output6}\n`);

    console.log('🎉 All tests completed successfully!');
    console.log('📁 Check the backend folder for output images\n');
    console.log('Files created:');
    console.log('  - test-output-1-simple.jpg (enhanced with stroke)');
    console.log('  - test-output-2-user.jpg (user watermark - clearer)');
    console.log('  - test-output-3-diagonal.jpg (diagonal pattern)');
    console.log('  - test-output-4-left.jpg (bottom-left)');
    console.log('  - test-output-5-center.jpg (center)');
    console.log('  - test-output-6-ultra-clear.jpg (with background box - CLEAREST)\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\n💡 Make sure Sharp is installed:');
    console.error('   npm install sharp\n');
  }
}

// Run tests
testWatermark();
