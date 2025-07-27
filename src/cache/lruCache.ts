/**
 * LRU (Least Recently Used) Cache implementation with size limits
 */
export class LRUCache<K, V> {
    private cache: Map<K, V> = new Map();
    private readonly maxSize: number;
    private readonly maxMemoryMB: number;
    private currentMemoryUsage: number = 0;

    constructor(maxSize: number = 1000, maxMemoryMB: number = 50) {
        this.maxSize = maxSize;
        this.maxMemoryMB = maxMemoryMB;
    }

    /**
     * Get value from cache
     */
    get(key: K): V | undefined {
        if (!this.cache.has(key)) {
            return undefined;
        }

        // Move to end (most recently used)
        const value = this.cache.get(key)!;
        this.cache.delete(key);
        this.cache.set(key, value);
        
        return value;
    }

    /**
     * Set value in cache
     */
    set(key: K, value: V): void {
        // Remove if exists (to update position)
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }

        // Add to end (most recently used)
        this.cache.set(key, value);

        // Check size limit
        if (this.cache.size > this.maxSize) {
            // Remove least recently used (first item)
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        // Update memory usage estimate
        this.updateMemoryUsage();
    }

    /**
     * Check if key exists
     */
    has(key: K): boolean {
        return this.cache.has(key);
    }

    /**
     * Delete from cache
     */
    delete(key: K): boolean {
        const result = this.cache.delete(key);
        this.updateMemoryUsage();
        return result;
    }

    /**
     * Clear all cache
     */
    clear(): void {
        this.cache.clear();
        this.currentMemoryUsage = 0;
    }

    /**
     * Get cache size
     */
    get size(): number {
        return this.cache.size;
    }

    /**
     * Get all keys
     */
    keys(): IterableIterator<K> {
        return this.cache.keys();
    }

    /**
     * Get all values
     */
    values(): IterableIterator<V> {
        return this.cache.values();
    }

    /**
     * Get memory usage estimate in MB
     */
    getMemoryUsageMB(): number {
        return this.currentMemoryUsage;
    }

    /**
     * Update memory usage estimate
     */
    private updateMemoryUsage(): void {
        // Rough estimate of memory usage
        let totalSize = 0;
        
        for (const [key, value] of this.cache) {
            totalSize += this.estimateSize(key) + this.estimateSize(value);
        }

        this.currentMemoryUsage = totalSize / 1024 / 1024; // Convert to MB

        // If memory limit exceeded, remove oldest items
        while (this.currentMemoryUsage > this.maxMemoryMB && this.cache.size > 0) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
            
            // Recalculate
            totalSize = 0;
            for (const [key, value] of this.cache) {
                totalSize += this.estimateSize(key) + this.estimateSize(value);
            }
            this.currentMemoryUsage = totalSize / 1024 / 1024;
        }
    }

    /**
     * Estimate size of an object in bytes
     */
    private estimateSize(obj: any): number {
        if (obj === null || obj === undefined) {
            return 0;
        }

        switch (typeof obj) {
            case 'string':
                return obj.length * 2; // 2 bytes per character (UTF-16)
            case 'number':
                return 8;
            case 'boolean':
                return 4;
            case 'object':
                if (obj instanceof Map || obj instanceof Set) {
                    let size = 0;
                    obj.forEach((value: any) => {
                        size += this.estimateSize(value);
                    });
                    return size;
                } else if (Array.isArray(obj)) {
                    return obj.reduce((size, item) => size + this.estimateSize(item), 0);
                } else {
                    // Regular object
                    let size = 0;
                    for (const key in obj) {
                        if (obj.hasOwnProperty(key)) {
                            size += this.estimateSize(key) + this.estimateSize(obj[key]);
                        }
                    }
                    return size;
                }
            default:
                return 0;
        }
    }

    /**
     * Get cache statistics
     */
    getStats(): {
        size: number;
        maxSize: number;
        memoryUsageMB: number;
        maxMemoryMB: number;
        hitRate?: number;
    } {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            memoryUsageMB: this.currentMemoryUsage,
            maxMemoryMB: this.maxMemoryMB
        };
    }
}

/**
 * File-based cache with hash validation
 */
export class FileCache<V> extends LRUCache<string, { hash: string; value: V }> {
    private crypto = require('crypto');

    /**
     * Set value with file hash
     */
    setWithHash(filePath: string, content: string, value: V): void {
        const hash = this.computeHash(content);
        super.set(filePath, { hash, value });
    }

    /**
     * Get value if hash matches
     */
    getIfValid(filePath: string, content: string): V | undefined {
        const cached = super.get(filePath);
        if (!cached) {
            return undefined;
        }

        const currentHash = this.computeHash(content);
        if (currentHash === cached.hash) {
            return cached.value;
        }

        // Hash mismatch, remove from cache
        this.delete(filePath);
        return undefined;
    }

    /**
     * Compute hash of content
     */
    private computeHash(content: string): string {
        return this.crypto.createHash('md5').update(content).digest('hex');
    }
}