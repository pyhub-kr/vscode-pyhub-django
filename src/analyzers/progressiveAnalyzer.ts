import { injectable } from 'inversify';
import * as vscode from 'vscode';
import * as path from 'path';
import { PerformanceProfiler } from '../utils/performanceProfiler';

export interface AnalysisTask {
    id: string;
    type: 'model' | 'url' | 'view' | 'template';
    filePath: string;
    priority: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    retryCount: number;
}

export interface AnalysisProgress {
    totalFiles: number;
    analyzedFiles: number;
    pendingFiles: number;
    failedFiles: number;
    percentage: number;
}

/**
 * Progressive analysis system for large Django projects
 * Analyzes files based on priority and user activity
 */
@injectable()
export class ProgressiveAnalyzer {
    private analysisQueue: AnalysisTask[] = [];
    private processingTasks: Map<string, AnalysisTask> = new Map();
    private completedTasks: Set<string> = new Set();
    private failedTasks: Map<string, Error> = new Map();
    private isProcessing: boolean = false;
    private batchSize: number = 10;
    private profiler: PerformanceProfiler = new PerformanceProfiler();
    
    // Event emitters
    private _onProgressUpdate = new vscode.EventEmitter<AnalysisProgress>();
    public readonly onProgressUpdate = this._onProgressUpdate.event;
    
    private _onTaskComplete = new vscode.EventEmitter<AnalysisTask>();
    public readonly onTaskComplete = this._onTaskComplete.event;

    /**
     * Add files to analysis queue with priority
     */
    addToQueue(files: string[], type: 'model' | 'url' | 'view' | 'template', basePriority: number = 0): void {
        for (const filePath of files) {
            if (this.completedTasks.has(filePath)) {
                continue; // Skip already analyzed files
            }

            const priority = this.calculatePriority(filePath, type, basePriority);
            const task: AnalysisTask = {
                id: filePath,
                type,
                filePath,
                priority,
                status: 'pending',
                retryCount: 0
            };

            this.analysisQueue.push(task);
        }

        // Sort by priority (higher priority first)
        this.analysisQueue.sort((a, b) => b.priority - a.priority);
        this.emitProgress();
    }

    /**
     * Calculate priority based on various factors
     */
    private calculatePriority(filePath: string, type: string, basePriority: number): number {
        let priority = basePriority;

        // Boost priority for currently open files
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.uri.fsPath === filePath) {
            priority += 100;
        }

        // Boost priority for files in open tabs
        const openFiles = vscode.window.visibleTextEditors.map(e => e.document.uri.fsPath);
        if (openFiles.includes(filePath)) {
            priority += 50;
        }

        // Boost priority based on file type
        switch (type) {
            case 'model':
                priority += 30; // Models are high priority
                break;
            case 'url':
                priority += 20; // URLs are medium-high priority
                break;
            case 'view':
                priority += 10; // Views are medium priority
                break;
            case 'template':
                priority += 5; // Templates are lower priority
                break;
        }

        // Boost priority for smaller files (faster to analyze)
        try {
            const stats = require('fs').statSync(filePath);
            if (stats.size < 10000) { // Less than 10KB
                priority += 10;
            }
        } catch (error) {
            // Ignore file stat errors
        }

        return priority;
    }

    /**
     * Start processing the analysis queue
     */
    async startProcessing(
        analyzeCallback: (task: AnalysisTask) => Promise<void>,
        options: { batchSize?: number; concurrency?: number } = {}
    ): Promise<void> {
        if (this.isProcessing) {
            return; // Already processing
        }

        this.isProcessing = true;
        this.batchSize = options.batchSize || 10;
        const concurrency = options.concurrency || 3;

        while (this.analysisQueue.length > 0 && this.isProcessing) {
            // Process tasks in batches
            const batch = this.analysisQueue.splice(0, this.batchSize);
            
            // Process batch with limited concurrency
            await this.processBatch(batch, analyzeCallback, concurrency);
            
            // Small delay between batches to prevent UI blocking
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.isProcessing = false;
    }

    /**
     * Process a batch of tasks with limited concurrency
     */
    private async processBatch(
        batch: AnalysisTask[],
        analyzeCallback: (task: AnalysisTask) => Promise<void>,
        concurrency: number
    ): Promise<void> {
        const promises: Promise<void>[] = [];
        
        for (let i = 0; i < batch.length; i += concurrency) {
            const chunk = batch.slice(i, i + concurrency);
            const chunkPromises = chunk.map(task => this.processTask(task, analyzeCallback));
            await Promise.all(chunkPromises);
        }
    }

    /**
     * Process a single analysis task
     */
    private async processTask(task: AnalysisTask, analyzeCallback: (task: AnalysisTask) => Promise<void>): Promise<void> {
        task.status = 'processing';
        this.processingTasks.set(task.id, task);

        try {
            await this.profiler.measureAsync(
                `analyze_${task.type}`,
                () => analyzeCallback(task),
                { filePath: task.filePath }
            );

            task.status = 'completed';
            this.completedTasks.add(task.id);
            this._onTaskComplete.fire(task);
        } catch (error) {
            task.status = 'failed';
            task.retryCount++;
            
            if (task.retryCount < 3) {
                // Retry with lower priority
                task.priority = Math.max(0, task.priority - 10);
                this.analysisQueue.push(task);
            } else {
                this.failedTasks.set(task.id, error as Error);
                console.error(`Failed to analyze ${task.filePath}:`, error);
            }
        } finally {
            this.processingTasks.delete(task.id);
            this.emitProgress();
        }
    }

    /**
     * Stop processing
     */
    stopProcessing(): void {
        this.isProcessing = false;
    }

    /**
     * Clear all queues and caches
     */
    clear(): void {
        this.analysisQueue = [];
        this.processingTasks.clear();
        this.completedTasks.clear();
        this.failedTasks.clear();
        this.profiler.clear();
    }

    /**
     * Get current progress
     */
    getProgress(): AnalysisProgress {
        const totalFiles = this.analysisQueue.length + this.processingTasks.size + 
                          this.completedTasks.size + this.failedTasks.size;
        const analyzedFiles = this.completedTasks.size;
        const pendingFiles = this.analysisQueue.length;
        const failedFiles = this.failedTasks.size;
        const percentage = totalFiles > 0 ? (analyzedFiles / totalFiles) * 100 : 0;

        return {
            totalFiles,
            analyzedFiles,
            pendingFiles,
            failedFiles,
            percentage
        };
    }

    /**
     * Emit progress update
     */
    private emitProgress(): void {
        this._onProgressUpdate.fire(this.getProgress());
    }

    /**
     * Get performance summary
     */
    getPerformanceSummary(): Record<string, any> {
        return this.profiler.getSummary();
    }

    /**
     * Re-prioritize a file (e.g., when user opens it)
     */
    reprioritizeFile(filePath: string, priorityBoost: number = 100): void {
        const taskIndex = this.analysisQueue.findIndex(t => t.filePath === filePath);
        if (taskIndex !== -1) {
            const task = this.analysisQueue[taskIndex];
            task.priority += priorityBoost;
            
            // Re-sort the queue
            this.analysisQueue.sort((a, b) => b.priority - a.priority);
        }
    }

    /**
     * Get failed tasks
     */
    getFailedTasks(): Map<string, Error> {
        return new Map(this.failedTasks);
    }

    dispose(): void {
        this.stopProcessing();
        this.clear();
        this._onProgressUpdate.dispose();
        this._onTaskComplete.dispose();
    }
}