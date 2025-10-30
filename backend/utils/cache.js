import { createClient } from 'redis';

// Debug: Check if REDIS_URL is loaded
console.log('🔍 REDIS_URL:', process.env.REDIS_URL ? 'Found' : 'NOT FOUND');

// Fix Upstash URL - change redis:// to rediss:// for TLS
let redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
if (redisUrl.includes('upstash.io') && redisUrl.startsWith('redis://')) {
  redisUrl = redisUrl.replace('redis://', 'rediss://');
  console.log('🔧 Fixed URL for TLS: rediss://...');
}

console.log('🔍 Using URL:', redisUrl);

// Create Redis client configuration
const redisConfig = {
  url: redisUrl
};

const redis = createClient(redisConfig);

// Event handlers
redis.on('error', (err) => console.error('❌ Redis error:', err));
redis.on('connect', () => console.log('✅ Redis connected successfully'));
redis.on('ready', () => console.log('🚀 Redis is ready to use'));

// Connect to Redis
await redis.connect();

// Cache utility functions
export const cache = {
  /**
   * Get cached data
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} - Parsed data or null
   */
  async get(key) {
    try {
      const data = await redis.get(key);
      if (!data) return null;
      return JSON.parse(data);
    } catch (err) {
      console.error('Cache get error:', err);
      return null; // Fail gracefully
    }
  },

  /**
   * Set cached data with TTL
   * @param {string} key - Cache key
   * @param {any} value - Data to cache
   * @param {number} ttl - Time to live in seconds (default: 300 = 5 minutes)
   */
  async set(key, value, ttl = 300) {
    try {
      await redis.setEx(key, ttl, JSON.stringify(value));
    } catch (err) {
      console.error('Cache set error:', err);
    }
  },

  /**
   * Delete cached data by pattern
   * @param {string} pattern - Key pattern (e.g., "comments:post:123:*")
   */
  async del(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
        console.log(`🗑️ Deleted ${keys.length} cache keys matching: ${pattern}`);
      }
    } catch (err) {
      console.error('Cache delete error:', err);
    }
  },

  /**
   * Clear all cache (use with caution!)
   */
  async clear() {
    try {
      await redis.flushAll();
      console.log('🗑️ All cache cleared');
    } catch (err) {
      console.error('Cache clear error:', err);
    }
  },

  /**
   * Clear cache by pattern
   */
  async clearPattern(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
        console.log(`🗑️ Cleared ${keys.length} keys matching: ${pattern}`);
      }
    } catch (err) {
      console.error('Cache clear pattern error:', err);
    }
  },

  /**
   * Get cache statistics
   */
  async stats() {
    try {
      const info = await redis.info('stats');
      return info;
    } catch (err) {
      console.error('Cache stats error:', err);
      return null;
    }
  }
};

export default cache;
