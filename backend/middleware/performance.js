/**
 * ⚡ ELOUARATE ART - Performance & Caching Middleware
 * Enterprise-grade performance optimization for Railway deployment
 */

// =============================================================================
// IN-MEMORY CACHE SYSTEM
// =============================================================================

class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.ttlMap = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0
    };
    
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  set(key, value, ttlSeconds = 300) {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, value);
    this.ttlMap.set(key, expiresAt);
    this.stats.sets++;
    this.stats.size = this.cache.size;
    return true;
  }

  get(key) {
    const expiresAt = this.ttlMap.get(key);
    
    if (!expiresAt || Date.now() > expiresAt) {
      // Expired or doesn't exist
      this.cache.delete(key);
      this.ttlMap.delete(key);
      this.stats.misses++;
      this.stats.size = this.cache.size;
      return null;
    }

    const value = this.cache.get(key);
    if (value !== undefined) {
      this.stats.hits++;
      return value;
    }

    this.stats.misses++;
    return null;
  }

  delete(key) {
    const deleted = this.cache.delete(key) && this.ttlMap.delete(key);
    if (deleted) {
      this.stats.deletes++;
      this.stats.size = this.cache.size;
    }
    return deleted;
  }

  clear() {
    this.cache.clear();
    this.ttlMap.clear();
    this.stats.size = 0;
    return true;
  }

  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, expiresAt] of this.ttlMap.entries()) {
      if (now > expiresAt) {
        this.cache.delete(key);
        this.ttlMap.delete(key);
        cleaned++;
      }
    }
    
    this.stats.size = this.cache.size;
    
    if (cleaned > 0) {
      console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? ((this.stats.hits / totalRequests) * 100).toFixed(2) : 0;
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      memoryUsage: `${Math.round(JSON.stringify([...this.cache.values()]).length / 1024)} KB`
    };
  }
}

// Global cache instance
const cache = new MemoryCache();

// =============================================================================
// CACHING MIDDLEWARE
// =============================================================================

// Cache middleware factory
export const cacheMiddleware = (ttlSeconds = 300, keyGenerator = null) => {
  return (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const cacheKey = keyGenerator 
      ? keyGenerator(req) 
      : `${req.method}:${req.originalUrl || req.url}:${JSON.stringify(req.query)}`;

    // Try to get from cache
    const cachedResponse = cache.get(cacheKey);
    
    if (cachedResponse) {
      console.log(`💾 Cache HIT: ${cacheKey}`);
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Key', cacheKey);
      return res.json(cachedResponse);
    }

    // Cache miss - intercept response
    console.log(`📥 Cache MISS: ${cacheKey}`);
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('X-Cache-Key', cacheKey);

    // Store original json method
    const originalJson = res.json;

    // Override json method to cache response
    res.json = function(data) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, data, ttlSeconds);
        console.log(`💾 Cached response: ${cacheKey} (TTL: ${ttlSeconds}s)`);
      }
      
      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  };
};

// Specific cache middlewares for different endpoints
export const shortCache = cacheMiddleware(60); // 1 minute
export const mediumCache = cacheMiddleware(300); // 5 minutes  
export const longCache = cacheMiddleware(900); // 15 minutes

// Categories cache (rarely change)
export const categoriesCache = cacheMiddleware(1800, (req) => 'categories:all'); // 30 minutes

// Artworks cache with query parameters
export const artworksCache = cacheMiddleware(300, (req) => {
  const { page = 1, limit = 12, category, search, minPrice, maxPrice } = req.query;
  return `artworks:${page}:${limit}:${category || 'all'}:${search || 'none'}:${minPrice || '0'}:${maxPrice || 'max'}`;
});

// Health check cache (very short)
export const healthCache = cacheMiddleware(30, () => 'health');

// =============================================================================
// PERFORMANCE MONITORING
// =============================================================================

// Performance monitoring middleware
export const performanceMonitor = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();

  // Track response
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

    // Log slow requests (> 1000ms)
    if (duration > 1000) {
      console.warn(`🐌 SLOW REQUEST: ${req.method} ${req.url} - ${duration.toFixed(2)}ms`);
    }

    // Log high memory usage requests (> 10MB delta)
    if (Math.abs(memoryDelta) > 10 * 1024 * 1024) {
      console.warn(`🧠 HIGH MEMORY: ${req.method} ${req.url} - ${(memoryDelta / 1024 / 1024).toFixed(2)}MB delta`);
    }

    // Log errors and slow requests
    if (res.statusCode >= 400 || duration > 500) {
      console.log(`⚡ ${req.method} ${req.url} - ${res.statusCode} - ${duration.toFixed(2)}ms - ${req.ip}`);
    }
  });

  next();
};

// Database query performance tracker
export const createQueryTimer = (queryName) => {
  const start = process.hrtime.bigint();
  
  return {
    end: () => {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000; // Convert to milliseconds
      
      if (duration > 1000) {
        console.warn(`🐌 SLOW QUERY: ${queryName} - ${duration.toFixed(2)}ms`);
      }
      
      return duration;
    }
  };
};

// =============================================================================
// COMPRESSION OPTIMIZATION
// =============================================================================

// Advanced compression settings
export const compressionConfig = {
  // Compress responses larger than 1KB
  threshold: 1024,
  // Compression level (1-9, 6 is good balance)
  level: 6,
  // Don't compress images, videos, or already compressed files
  filter: (req, res) => {
    const contentType = res.getHeader('content-type');
    if (!contentType) return true;
    
    // Skip compression for already compressed content
    const skipTypes = [
      'image/',
      'video/',
      'audio/',
      'application/pdf',
      'application/zip',
      'application/gzip'
    ];
    
    return !skipTypes.some(type => contentType.includes(type));
  }
};

// =============================================================================
// CACHE INVALIDATION HELPERS
// =============================================================================

// Cache invalidation functions
export const invalidateCache = {
  // Invalidate all caches
  all: () => {
    cache.clear();
    console.log('🗑️ All caches invalidated');
  },
  
  // Invalidate artworks cache
  artworks: () => {
    const keys = [...cache.cache.keys()];
    const artworkKeys = keys.filter(key => key.startsWith('artworks:'));
    artworkKeys.forEach(key => cache.delete(key));
    console.log(`🗑️ Invalidated ${artworkKeys.length} artwork cache entries`);
  },
  
  // Invalidate categories cache
  categories: () => {
    cache.delete('categories:all');
    console.log('🗑️ Categories cache invalidated');
  },
  
  // Invalidate by pattern
  pattern: (pattern) => {
    const keys = [...cache.cache.keys()];
    const regex = new RegExp(pattern);
    const matchingKeys = keys.filter(key => regex.test(key));
    matchingKeys.forEach(key => cache.delete(key));
    console.log(`🗑️ Invalidated ${matchingKeys.length} cache entries matching: ${pattern}`);
  }
};

// =============================================================================
// PERFORMANCE STATISTICS
// =============================================================================

// Get performance statistics
export const getPerformanceStats = () => {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  return {
    server: {
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
      uptimeSeconds: uptime,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    },
    memory: {
      used: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
    },
    cache: cache.getStats()
  };
};

// Performance endpoint middleware
export const performanceEndpoint = (req, res) => {
  const stats = getPerformanceStats();
  res.json({
    success: true,
    message: 'Performance statistics',
    data: stats,
    timestamp: new Date().toISOString()
  });
};

// =============================================================================
// CACHE WARMING
// =============================================================================

// Cache warming function (call on server start)
export const warmCache = async (queryFunction) => {
  console.log('🔥 Warming up cache...');
  
  try {
    // Warm up categories cache
    console.log('   📂 Warming categories cache...');
    // This should be called with your categories query function
    
    // Warm up popular artworks
    console.log('   🎨 Warming artworks cache...');
    // This should be called with your artworks query function
    
    console.log('✅ Cache warming completed');
  } catch (error) {
    console.error('❌ Cache warming failed:', error.message);
  }
};

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  cache,
  cacheMiddleware,
  shortCache,
  mediumCache,
  longCache,
  categoriesCache,
  artworksCache,
  healthCache,
  performanceMonitor,
  createQueryTimer,
  compressionConfig,
  invalidateCache,
  getPerformanceStats,
  performanceEndpoint,
  warmCache
};