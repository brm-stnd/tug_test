import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

export interface CacheConfig {
  ttl?: number; // TTL in milliseconds
  prefix?: string;
}

// TTL values in milliseconds
export const CACHE_TTL = {
  CARD_LOOKUP: 3600 * 1000, // 1 hour
  ORG_METADATA: 7200 * 1000, // 2 hours
  SPENDING_LIMIT: 300 * 1000, // 5 minutes
  TRANSACTION_STATUS: 60 * 1000, // 1 minute
  STATIC_DATA: 86400 * 1000, // 24 hours
};

export const CACHE_KEYS = {
  CARD: (id: string) => `card:${id}`,
  CARD_BY_HASH: (hash: string) => `card:hash:${hash}`,
  ORGANIZATION: (id: string) => `org:${id}`,
  ORGANIZATION_BALANCE: (id: string) => `org:balance:${id}`,
  CARD_SPENDING: (cardId: string, date: string) =>
    `card:spending:${cardId}:${date}`,
};

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value) {
        this.logger.debug(`Cache HIT: ${key}`);
      } else {
        this.logger.debug(`Cache MISS: ${key}`);
      }
      return value || null;
    } catch (error) {
      this.logger.warn(`Cache get error for key ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
      this.logger.debug(`Cache SET: ${key} (TTL: ${ttl || 'default'}ms)`);
    } catch (error) {
      this.logger.warn(`Cache set error for key ${key}: ${error.message}`);
    }
  }

  /**
   * Delete a value from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DEL: ${key}`);
    } catch (error) {
      this.logger.warn(`Cache del error for key ${key}: ${error.message}`);
    }
  }

  /**
   * Get or set pattern - fetch from cache or execute function and cache result
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetchFn();
    if (value !== null && value !== undefined) {
      await this.set(key, value, ttl);
    }
    return value;
  }

  /**
   * Invalidate multiple keys by pattern prefix
   */
  async invalidateByPrefix(prefix: string): Promise<void> {
    // Note: This is a simplified implementation
    // For production, you'd want to use Redis SCAN with pattern matching
    this.logger.debug(`Cache invalidate by prefix: ${prefix}*`);
    // The cache-manager doesn't support pattern deletion directly
    // In production, you'd implement this with Redis SCAN command
  }

  /**
   * Invalidate card cache
   */
  async invalidateCard(cardId: string, cardHash?: string): Promise<void> {
    await this.del(CACHE_KEYS.CARD(cardId));
    if (cardHash) {
      await this.del(CACHE_KEYS.CARD_BY_HASH(cardHash));
    }
  }

  /**
   * Invalidate organization cache
   */
  async invalidateOrganization(orgId: string): Promise<void> {
    await Promise.all([
      this.del(CACHE_KEYS.ORGANIZATION(orgId)),
      this.del(CACHE_KEYS.ORGANIZATION_BALANCE(orgId)),
    ]);
  }
}
