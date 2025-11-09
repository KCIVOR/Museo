/**
 * Payout Cron Job
 * Runs daily to process ready payouts
 */

import cron from 'node-cron';
import payoutService from '../services/payoutService.js';

/**
 * Daily payout processing job
 * Runs every day at 9:00 AM Philippine time
 */
const dailyPayoutJob = cron.schedule('0 9 * * *', async () => {
  console.log('═══════════════════════════════════════════');
  console.log('🏦 Starting Daily Payout Processing');
  console.log('Time:', new Date().toISOString());
  console.log('═══════════════════════════════════════════');
  
  try {
    // Process ready payouts
    const result = await payoutService.processReadyPayouts();
    
    console.log(`✅ Processed ${result.processed} payouts`);
    
    if (result.errors && result.errors.length > 0) {
      console.log('⚠️ Errors encountered:');
      result.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    console.log('═══════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('🚨 Critical error in payout cron:', error);
  }
}, {
  scheduled: true,
  timezone: 'Asia/Manila' // Philippine timezone
});

// Start message
console.log('💰 Payout cron job initialized');
console.log('   Schedule: Daily at 9:00 AM (Asia/Manila)');
console.log('   Next run:', dailyPayoutJob.nextRun());

// Export for testing
export default dailyPayoutJob;
