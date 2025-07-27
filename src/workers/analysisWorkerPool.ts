import { EventEmitter } from 'events';

export interface WorkerTask<T = any> {
    id: string;
    type: string;
    data: T;
    priority: number;
}

export interface WorkerResult<R = any> {
    taskId: string;
    result?: R;
    error?: Error;
    duration: number;
}

/**
 * Worker pool for background analysis tasks
 * Note: This is a simplified implementation using async operations
 * For true parallelism, consider using Worker Threads
 */
export class AnalysisWorkerPool extends EventEmitter {
    private taskQueue: WorkerTask[] = [];
    private activeTasks: Map<string, WorkerTask> = new Map();
    private workers: number;
    private isRunning: boolean = false;
    private taskHandlers: Map<string, (data: any) => Promise<any>> = new Map();

    constructor(workers: number = 3) {
        super();
        this.workers = Math.max(1, workers);
    }

    /**
     * Register a task handler
     */
    registerHandler(type: string, handler: (data: any) => Promise<any>): void {
        this.taskHandlers.set(type, handler);
    }

    /**
     * Add task to queue
     */
    addTask<T>(task: WorkerTask<T>): void {
        this.taskQueue.push(task);
        // Sort by priority (higher first)
        this.taskQueue.sort((a, b) => b.priority - a.priority);
        
        if (this.isRunning) {
            this.processNextTask();
        }
    }

    /**
     * Start processing tasks
     */
    start(): void {
        if (this.isRunning) {
            return;
        }

        this.isRunning = true;
        
        // Start workers
        for (let i = 0; i < this.workers; i++) {
            this.processNextTask();
        }
    }

    /**
     * Stop processing tasks
     */
    stop(): void {
        this.isRunning = false;
    }

    /**
     * Process next task in queue
     */
    private async processNextTask(): Promise<void> {
        if (!this.isRunning || this.taskQueue.length === 0) {
            return;
        }

        const task = this.taskQueue.shift();
        if (!task) {
            return;
        }

        this.activeTasks.set(task.id, task);
        const startTime = Date.now();

        try {
            const handler = this.taskHandlers.get(task.type);
            if (!handler) {
                throw new Error(`No handler registered for task type: ${task.type}`);
            }

            const result = await handler(task.data);
            const duration = Date.now() - startTime;

            const workerResult: WorkerResult = {
                taskId: task.id,
                result,
                duration
            };

            this.emit('taskComplete', workerResult);
        } catch (error) {
            const duration = Date.now() - startTime;
            const workerResult: WorkerResult = {
                taskId: task.id,
                error: error as Error,
                duration
            };

            this.emit('taskError', workerResult);
        } finally {
            this.activeTasks.delete(task.id);
            
            // Process next task
            if (this.isRunning) {
                setImmediate(() => this.processNextTask());
            }
        }
    }

    /**
     * Get queue status
     */
    getStatus(): {
        queueLength: number;
        activeTasks: number;
        isRunning: boolean;
    } {
        return {
            queueLength: this.taskQueue.length,
            activeTasks: this.activeTasks.size,
            isRunning: this.isRunning
        };
    }

    /**
     * Clear all pending tasks
     */
    clearQueue(): void {
        this.taskQueue = [];
    }

    /**
     * Wait for all tasks to complete
     */
    async waitForCompletion(): Promise<void> {
        return new Promise((resolve) => {
            const checkCompletion = () => {
                if (this.taskQueue.length === 0 && this.activeTasks.size === 0) {
                    resolve();
                } else {
                    setTimeout(checkCompletion, 100);
                }
            };
            checkCompletion();
        });
    }
}

/**
 * Debounced task executor for handling rapid file changes
 */
export class DebouncedTaskExecutor {
    private timeouts: Map<string, NodeJS.Timeout> = new Map();
    private delay: number;

    constructor(delay: number = 300) {
        this.delay = delay;
    }

    /**
     * Execute task with debouncing
     */
    execute(key: string, task: () => void | Promise<void>): void {
        // Clear existing timeout
        const existingTimeout = this.timeouts.get(key);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        // Set new timeout
        const timeout = setTimeout(async () => {
            this.timeouts.delete(key);
            try {
                await task();
            } catch (error) {
                console.error(`Error executing debounced task ${key}:`, error);
            }
        }, this.delay);

        this.timeouts.set(key, timeout);
    }

    /**
     * Cancel pending task
     */
    cancel(key: string): void {
        const timeout = this.timeouts.get(key);
        if (timeout) {
            clearTimeout(timeout);
            this.timeouts.delete(key);
        }
    }

    /**
     * Cancel all pending tasks
     */
    cancelAll(): void {
        for (const timeout of this.timeouts.values()) {
            clearTimeout(timeout);
        }
        this.timeouts.clear();
    }

    /**
     * Update delay
     */
    setDelay(delay: number): void {
        this.delay = delay;
    }
}