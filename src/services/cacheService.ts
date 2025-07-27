import { injectable } from 'inversify';

interface CacheEntry<T> {
    value: T;
    timestamp: number;
    ttl: number;
}

@injectable()
export class CacheService {
    private cache: Map<string, CacheEntry<any>> = new Map();
    private defaultTTL: number = 60000; // 60 seconds default
    private cleanupInterval: NodeJS.Timeout;
    private maxSize: number = 1000; // Maximum number of entries

    constructor() {
        // Periodically clean up expired entries
        this.cleanupInterval = setInterval(() => this.cleanup(), 30000); // Every 30 seconds
    }

    /**
     * Get a value from the cache
     */
    get<T>(key: string): T | undefined {
        const entry = this.cache.get(key);
        
        if (!entry) {
            return undefined;
        }
        
        // Check if expired
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return undefined;
        }
        
        return entry.value as T;
    }

    /**
     * Set a value in the cache
     */
    set<T>(key: string, value: T, ttl?: number): void {
        // Check cache size limit
        if (this.cache.size >= this.maxSize) {
            // Remove oldest entry
            const oldestKey = this.findOldestKey();
            if (oldestKey) {
                this.cache.delete(oldestKey);
            }
        }
        
        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            ttl: ttl || this.defaultTTL
        });
    }

    /**
     * Check if a key exists in the cache
     */
    has(key: string): boolean {
        const value = this.get(key);
        return value !== undefined;
    }

    /**
     * Delete a value from the cache
     */
    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    /**
     * Clear all values from the cache
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Clear all values with a specific prefix
     */
    clearPrefix(prefix: string): void {
        const keysToDelete: string[] = [];
        
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => this.cache.delete(key));
    }

    /**
     * Get the size of the cache
     */
    size(): number {
        return this.cache.size;
    }

    /**
     * Clean up expired entries
     */
    private cleanup(): void {
        const now = Date.now();
        const keysToDelete: string[] = [];
        
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => this.cache.delete(key));
    }

    /**
     * Find the oldest key in the cache
     */
    private findOldestKey(): string | undefined {
        let oldestKey: string | undefined;
        let oldestTimestamp = Date.now();
        
        for (const [key, entry] of this.cache.entries()) {
            if (entry.timestamp < oldestTimestamp) {
                oldestTimestamp = entry.timestamp;
                oldestKey = key;
            }
        }
        
        return oldestKey;
    }

    /**
     * Dispose of the cache service
     */
    dispose(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.cache.clear();
    }
}
