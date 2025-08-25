/**
 * Cache Manager for Policy Service
 * Manages Redis-based caching for policy evaluation performance optimization
 */

class CacheManager {
  constructor(fastify, config) {
    this.fastify = fastify;
    this.config = config;
    this.redis = fastify.redis;
    this.prefix = 'policy_service:';
  }

  async initialize() {
    // Test Redis connection
    try {
      await this.redis.ping();
      this.fastify.log.info('✅ Cache Manager: Redis connection established');
    } catch (error) {
      this.fastify.log.error('❌ Cache Manager: Redis connection failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // BASIC CACHE OPERATIONS
  // ============================================================================

  async get(key) {
    try {
      const fullKey = this.prefix + key;
      const cached = await this.redis.get(fullKey);
      
      if (cached) {
        // Update hit count and last hit time
        await this.updateCacheStats(fullKey, 'hit');
        return JSON.parse(cached);
      }
      
      await this.updateCacheStats(fullKey, 'miss');
      return null;
    } catch (error) {
      this.fastify.log.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttlSeconds = null) {
    try {
      const fullKey = this.prefix + key;
      const serialized = JSON.stringify(value);
      
      const ttl = ttlSeconds || this.config.POLICY_CACHE_TTL_SECONDS;
      
      await this.redis.setex(fullKey, ttl, serialized);
      
      // Store cache metadata
      await this.storeCacheMetadata(fullKey, ttl);
      
      return true;
    } catch (error) {
      this.fastify.log.error('Cache set error:', error);
      return false;
    }
  }

  async delete(key) {
    try {
      const fullKey = this.prefix + key;
      const result = await this.redis.del(fullKey);
      
      // Remove cache metadata
      await this.redis.del(fullKey + ':meta');
      
      return result > 0;
    } catch (error) {
      this.fastify.log.error('Cache delete error:', error);
      return false;
    }
  }

  async deleteByPattern(pattern) {
    try {
      const fullPattern = this.prefix + pattern;
      const keys = await this.redis.keys(fullPattern);
      
      if (keys.length > 0) {
        const pipeline = this.redis.pipeline();
        
        keys.forEach(key => {
          pipeline.del(key);
          pipeline.del(key + ':meta');
        });
        
        await pipeline.exec();
        this.fastify.log.debug(`Deleted ${keys.length} cache entries for pattern: ${pattern}`);
      }
      
      return keys.length;
    } catch (error) {
      this.fastify.log.error('Cache delete by pattern error:', error);
      return 0;
    }
  }

  async exists(key) {
    try {
      const fullKey = this.prefix + key;
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      this.fastify.log.error('Cache exists error:', error);
      return false;
    }
  }

  // ============================================================================
  // ADVANCED CACHE OPERATIONS
  // ============================================================================

  async getMultiple(keys) {
    try {
      const fullKeys = keys.map(key => this.prefix + key);
      const values = await this.redis.mget(fullKeys);
      
      const result = {};
      for (let i = 0; i < keys.length; i++) {
        const value = values[i];
        result[keys[i]] = value ? JSON.parse(value) : null;
        
        // Update stats
        await this.updateCacheStats(fullKeys[i], value ? 'hit' : 'miss');
      }
      
      return result;
    } catch (error) {
      this.fastify.log.error('Cache get multiple error:', error);
      return {};
    }
  }

  async setMultiple(keyValuePairs, ttlSeconds = null) {
    try {
      const pipeline = this.redis.pipeline();
      const ttl = ttlSeconds || this.config.POLICY_CACHE_TTL_SECONDS;
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const fullKey = this.prefix + key;
        const serialized = JSON.stringify(value);
        
        pipeline.setex(fullKey, ttl, serialized);
        
        // Store metadata
        const metadata = {
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
          hit_count: 0,
          last_hit_at: null
        };
        pipeline.setex(fullKey + ':meta', ttl, JSON.stringify(metadata));
      }
      
      await pipeline.exec();
      return true;
    } catch (error) {
      this.fastify.log.error('Cache set multiple error:', error);
      return false;
    }
  }

  // ============================================================================
  // POLICY-SPECIFIC CACHE OPERATIONS
  // ============================================================================

  async getPolicyDecision(user, toolSlug, action, resourceType, resourceId) {
    const key = this.buildPolicyDecisionKey(user, toolSlug, action, resourceType, resourceId);
    return await this.get(key);
  }

  async setPolicyDecision(user, toolSlug, action, resourceType, resourceId, decision, ttlSeconds = null) {
    const key = this.buildPolicyDecisionKey(user, toolSlug, action, resourceType, resourceId);
    return await this.set(key, decision, ttlSeconds);
  }

  async invalidatePolicyDecisions(userSub = null, toolSlug = null) {
    let pattern = 'policy_decision:';
    
    if (userSub) {
      pattern += userSub + ':';
      if (toolSlug) {
        pattern += toolSlug + ':*';
      } else {
        pattern += '*';
      }
    } else if (toolSlug) {
      pattern += '*:' + toolSlug + ':*';
    } else {
      pattern += '*';
    }
    
    return await this.deleteByPattern(pattern);
  }

  async getPoliciesForTool(toolSlug, resourceType = 'any') {
    const key = `policies:${toolSlug}:${resourceType}`;
    return await this.get(key);
  }

  async setPoliciesForTool(toolSlug, resourceType = 'any', policies, ttlSeconds = null) {
    const key = `policies:${toolSlug}:${resourceType}`;
    return await this.set(key, policies, ttlSeconds);
  }

  // ============================================================================
  // CACHE WARMING
  // ============================================================================

  async warmUpPolicyCache(policies) {
    try {
      this.fastify.log.info('Starting policy cache warm-up...');
      
      const warmUpData = {};
      
      // Group policies by tool and resource type
      for (const policy of policies) {
        const toolId = policy.tool_id || 'global';
        const key = `policies:${toolId}:any`;
        
        if (!warmUpData[key]) {
          warmUpData[key] = [];
        }
        warmUpData[key].push(policy);
      }
      
      // Set all cache entries
      await this.setMultiple(warmUpData, this.config.POLICY_CACHE_TTL_SECONDS);
      
      this.fastify.log.info(`Policy cache warmed up with ${Object.keys(warmUpData).length} entries`);
    } catch (error) {
      this.fastify.log.error('Policy cache warm-up failed:', error);
    }
  }

  // ============================================================================
  // CACHE STATISTICS
  // ============================================================================

  async getCacheStats() {
    try {
      const info = await this.redis.info('memory');
      const dbsize = await this.redis.dbsize();
      
      // Get policy service specific stats
      const policyKeys = await this.redis.keys(this.prefix + '*');
      const policyKeyCount = policyKeys.length;
      
      // Calculate hit rates
      const hitStats = await this.getHitRateStats();
      
      return {
        total_keys: dbsize,
        policy_service_keys: policyKeyCount,
        memory_info: this.parseRedisInfo(info),
        hit_rate: hitStats.hit_rate,
        total_requests: hitStats.total_requests,
        cache_hits: hitStats.hits,
        cache_misses: hitStats.misses,
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      this.fastify.log.error('Failed to get cache stats:', error);
      return {
        error: 'Failed to retrieve cache statistics',
        last_updated: new Date().toISOString()
      };
    }
  }

  async getDetailedCacheStats() {
    try {
      const keys = await this.redis.keys(this.prefix + '*:meta');
      const stats = {
        entries: [],
        summary: {
          total_entries: 0,
          total_hits: 0,
          average_hit_count: 0,
          most_accessed: null,
          least_accessed: null
        }
      };
      
      if (keys.length === 0) {
        return stats;
      }
      
      const metadataList = await this.redis.mget(keys);
      
      for (let i = 0; i < keys.length; i++) {
        if (metadataList[i]) {
          try {
            const metadata = JSON.parse(metadataList[i]);
            const originalKey = keys[i].replace(':meta', '').replace(this.prefix, '');
            
            stats.entries.push({
              key: originalKey,
              ...metadata
            });
            
            stats.summary.total_hits += metadata.hit_count || 0;
          } catch (parseError) {
            // Skip invalid metadata
          }
        }
      }
      
      stats.summary.total_entries = stats.entries.length;
      stats.summary.average_hit_count = stats.summary.total_entries > 0 
        ? Math.round(stats.summary.total_hits / stats.summary.total_entries) 
        : 0;
      
      // Find most and least accessed
      if (stats.entries.length > 0) {
        stats.entries.sort((a, b) => (b.hit_count || 0) - (a.hit_count || 0));
        stats.summary.most_accessed = stats.entries[0];
        stats.summary.least_accessed = stats.entries[stats.entries.length - 1];
      }
      
      return stats;
    } catch (error) {
      this.fastify.log.error('Failed to get detailed cache stats:', error);
      return { error: 'Failed to retrieve detailed cache statistics' };
    }
  }

  // ============================================================================
  // CACHE MAINTENANCE
  // ============================================================================

  async cleanupExpiredEntries() {
    try {
      this.fastify.log.info('Starting cache cleanup...');
      
      const metaKeys = await this.redis.keys(this.prefix + '*:meta');
      let cleanedCount = 0;
      
      for (const metaKey of metaKeys) {
        const metadata = await this.redis.get(metaKey);
        if (metadata) {
          try {
            const meta = JSON.parse(metadata);
            const expiresAt = new Date(meta.expires_at);
            
            if (expiresAt < new Date()) {
              const originalKey = metaKey.replace(':meta', '');
              await this.redis.del(originalKey);
              await this.redis.del(metaKey);
              cleanedCount++;
            }
          } catch (parseError) {
            // Remove invalid metadata
            await this.redis.del(metaKey);
          }
        }
      }
      
      this.fastify.log.info(`Cache cleanup completed. Removed ${cleanedCount} expired entries`);
      return cleanedCount;
    } catch (error) {
      this.fastify.log.error('Cache cleanup failed:', error);
      return 0;
    }
  }

  async clearAllCache() {
    try {
      const keys = await this.redis.keys(this.prefix + '*');
      if (keys.length > 0) {
        await this.redis.del(keys);
        this.fastify.log.info(`Cleared ${keys.length} cache entries`);
      }
      return keys.length;
    } catch (error) {
      this.fastify.log.error('Failed to clear cache:', error);
      return 0;
    }
  }

  async close() {
    try {
      // Perform final cleanup
      await this.cleanupExpiredEntries();
      this.fastify.log.info('Cache manager closed successfully');
    } catch (error) {
      this.fastify.log.error('Error closing cache manager:', error);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  buildPolicyDecisionKey(user, toolSlug, action, resourceType, resourceId) {
    return `policy_decision:${user.sub}:${toolSlug}:${action}:${resourceType || 'any'}:${resourceId || 'any'}`;
  }

  async updateCacheStats(key, type) {
    try {
      const metaKey = key + ':meta';
      const metadata = await this.redis.get(metaKey);
      
      if (metadata) {
        const meta = JSON.parse(metadata);
        
        if (type === 'hit') {
          meta.hit_count = (meta.hit_count || 0) + 1;
          meta.last_hit_at = new Date().toISOString();
        }
        
        // Update with same TTL as original key
        const ttl = await this.redis.ttl(key);
        if (ttl > 0) {
          await this.redis.setex(metaKey, ttl, JSON.stringify(meta));
        }
      }
    } catch (error) {
      // Don't log metadata update errors as they're not critical
    }
  }

  async storeCacheMetadata(key, ttl) {
    try {
      const metadata = {
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
        hit_count: 0,
        last_hit_at: null
      };
      
      await this.redis.setex(key + ':meta', ttl, JSON.stringify(metadata));
    } catch (error) {
      // Metadata storage is not critical
    }
  }

  async getHitRateStats() {
    try {
      // This is a simplified implementation
      // In production, you might want to maintain separate counters
      const metaKeys = await this.redis.keys(this.prefix + '*:meta');
      let totalHits = 0;
      let totalEntries = 0;
      
      const metadataList = await this.redis.mget(metaKeys);
      
      for (const metadata of metadataList) {
        if (metadata) {
          try {
            const meta = JSON.parse(metadata);
            totalHits += meta.hit_count || 0;
            totalEntries++;
          } catch (parseError) {
            // Skip invalid metadata
          }
        }
      }
      
      const hitRate = totalEntries > 0 ? (totalHits / (totalHits + totalEntries)) : 0;
      
      return {
        hit_rate: Math.round(hitRate * 100) / 100,
        total_requests: totalHits + totalEntries,
        hits: totalHits,
        misses: totalEntries
      };
    } catch (error) {
      return {
        hit_rate: 0,
        total_requests: 0,
        hits: 0,
        misses: 0
      };
    }
  }

  parseRedisInfo(info) {
    const lines = info.split('\r\n');
    const memoryInfo = {};
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        if (key.includes('memory') || key.includes('used')) {
          memoryInfo[key] = value;
        }
      }
    }
    
    return memoryInfo;
  }
}

module.exports = CacheManager;
