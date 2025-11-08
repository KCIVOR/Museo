import { createClient } from 'redis';

// Check if Redis is configured
const REDIS_ENABLED = !!process.env.REDIS_URL;

let redis = null;

// Only create and connect Redis if URL is provided
if (REDIS_ENABLED) {
  // Fix Upstash URL - change redis:// to rediss:// for TLS
  let redisUrl = process.env.REDIS_URL;
  if (redisUrl.includes('upstash.io') && redisUrl.startsWith('redis://')) {
    redisUrl = redisUrl.replace('redis://', 'rediss://');
  }

  // Create Redis client configuration
  const redisConfig = {
    url: redisUrl
  };

  redis = createClient(redisConfig);

  // Event handlers
  redis.on('error', (err) => console.error('❌ Redis error:', err));
  redis.on('connect', () => console.log('✅ Redis connected'));
  redis.on('ready', () => console.log('✅ Redis ready'));

  // Connect to Redis
  try {
    await redis.connect();
  } catch (err) {
    console.error('❌ Failed to connect to Redis:', err.message);
    redis = null; // Disable Redis if connection fails
  }
}
// Redis is optional - app runs fine without it

// Cache utility functions
export const cache = {
  /**
   * Get cached data
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} - Parsed data or null
   */
  async get(key) {
    if (!redis) return null; // No cache available
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
    if (!redis) return; // No cache available
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
    if (!redis) return; // No cache available
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
    if (!redis) return; // No cache available
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
    if (!redis) return; // No cache available
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
    if (!redis) return null; // No cache available
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
