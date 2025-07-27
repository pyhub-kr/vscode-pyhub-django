/**
 * Performance profiling utilities for measuring and tracking performance
 */

export interface PerformanceMetrics {
    operation: string;
    startTime: number;
    endTime: number;
    duration: number;
    metadata?: Record<string, any>;
}

export class PerformanceProfiler {
    private metrics: PerformanceMetrics[] = [];
    private activeOperations: Map<string, number> = new Map();

    /**
     * Start measuring an operation
     */
    startOperation(operation: string): void {
        this.activeOperations.set(operation, Date.now());
    }

    /**
     * End measuring an operation
     */
    endOperation(operation: string, metadata?: Record<string, any>): number {
        const startTime = this.activeOperations.get(operation);
        if (!startTime) {
            console.warn(`No active operation found for: ${operation}`);
            return 0;
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        this.metrics.push({
            operation,
            startTime,
            endTime,
            duration,
            metadata
        });

        this.activeOperations.delete(operation);
        return duration;
    }

    /**
     * Measure a synchronous operation
     */
    measureSync<T>(operation: string, fn: () => T, metadata?: Record<string, any>): T {
        this.startOperation(operation);
        try {
            const result = fn();
            this.endOperation(operation, metadata);
            return result;
        } catch (error) {
            this.endOperation(operation, { ...metadata, error: true });
            throw error;
        }
    }

    /**
     * Measure an asynchronous operation
     */
    async measureAsync<T>(operation: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
        this.startOperation(operation);
        try {
            const result = await fn();
            this.endOperation(operation, metadata);
            return result;
        } catch (error) {
            this.endOperation(operation, { ...metadata, error: true });
            throw error;
        }
    }

    /**
     * Get all metrics
     */
    getMetrics(): PerformanceMetrics[] {
        return [...this.metrics];
    }

    /**
     * Get metrics for a specific operation
     */
    getMetricsForOperation(operation: string): PerformanceMetrics[] {
        return this.metrics.filter(m => m.operation === operation);
    }

    /**
     * Get average duration for an operation
     */
    getAverageDuration(operation: string): number {
        const operationMetrics = this.getMetricsForOperation(operation);
        if (operationMetrics.length === 0) {
            return 0;
        }
        const total = operationMetrics.reduce((sum, m) => sum + m.duration, 0);
        return total / operationMetrics.length;
    }

    /**
     * Get performance summary
     */
    getSummary(): Record<string, { count: number; avgDuration: number; totalDuration: number }> {
        const summary: Record<string, { count: number; avgDuration: number; totalDuration: number }> = {};

        for (const metric of this.metrics) {
            if (!summary[metric.operation]) {
                summary[metric.operation] = { count: 0, avgDuration: 0, totalDuration: 0 };
            }
            summary[metric.operation].count++;
            summary[metric.operation].totalDuration += metric.duration;
        }

        // Calculate averages
        for (const operation in summary) {
            summary[operation].avgDuration = summary[operation].totalDuration / summary[operation].count;
        }

        return summary;
    }

    /**
     * Clear all metrics
     */
    clear(): void {
        this.metrics = [];
        this.activeOperations.clear();
    }

    /**
     * Export metrics to CSV format
     */
    exportToCSV(): string {
        let csv = 'operation,startTime,endTime,duration,metadata\n';
        for (const metric of this.metrics) {
            csv += `"${metric.operation}",${metric.startTime},${metric.endTime},${metric.duration},"${JSON.stringify(metric.metadata || {})}"\n`;
        }
        return csv;
    }
}

// Global profiler instance
export const globalProfiler = new PerformanceProfiler();