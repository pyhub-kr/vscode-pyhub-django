import { injectable, inject } from 'inversify';
import * as vscode from 'vscode';
import * as path from 'path';
import { TYPES } from '../container/types';
import { DjangoProjectAnalyzer, FileSystem } from './djangoProjectAnalyzer';
import { AdvancedModelAnalyzer } from './advancedModelAnalyzer';
import { ProgressiveAnalyzer, AnalysisTask } from './progressiveAnalyzer';
import { FileCache } from '../cache/lruCache';
import { AnalysisWorkerPool, DebouncedTaskExecutor } from '../workers/analysisWorkerPool';
import { PerformanceProfiler } from '../utils/performanceProfiler';

/**
 * Optimized Django Project Analyzer with progressive analysis,
 * caching, and background processing
 */
@injectable()
export class OptimizedDjangoProjectAnalyzer extends DjangoProjectAnalyzer {
    private progressiveAnalyzer: ProgressiveAnalyzer;
    private fileCache: FileCache<any>;
    private workerPool: AnalysisWorkerPool;
    private debouncedExecutor: DebouncedTaskExecutor;
    private profiler: PerformanceProfiler;
    private statusBarItem: vscode.StatusBarItem;

    constructor(
        @inject(TYPES.AdvancedModelAnalyzer) advancedAnalyzer: AdvancedModelAnalyzer,
        fileSystem?: FileSystem
    ) {
        super(advancedAnalyzer, fileSystem);
        
        // Read configuration from VS Code settings
        const config = vscode.workspace.getConfiguration('djangoPowerTools.performance');
        const analysisWorkers = config.get<number>('analysisWorkers', 3);
        const cacheMaxSizeMB = config.get<number>('cacheMaxSizeMB', 100);
        const debounceDelay = config.get<number>('debounceDelay', 500);
        
        this.progressiveAnalyzer = new ProgressiveAnalyzer();
        this.fileCache = new FileCache<any>(1000, cacheMaxSizeMB);
        this.workerPool = new AnalysisWorkerPool(analysisWorkers);
        this.debouncedExecutor = new DebouncedTaskExecutor(debounceDelay);
        this.profiler = new PerformanceProfiler();
        
        // Create status bar item for progress
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        this.statusBarItem.text = '$(sync~spin) Django Analysis...';
        
        this.setupWorkers();
        this.setupProgressHandlers();
    }

    /**
     * Initialize with progressive analysis
     */
    async initialize(): Promise<boolean> {
        return this.profiler.measureAsync('initialize', async () => {
            const result = await super.initialize();
            if (!result) {
                return false;
            }

            // Start progressive analysis in background
            this.startProgressiveAnalysis();
            return true;
        });
    }

    /**
     * Analyze project with optimizations
     */
    async analyzeProject(): Promise<void> {
        if (!this.projectRoot) {
            return;
        }

        await this.profiler.measureAsync('analyzeProject', async () => {
            console.log('Starting optimized Django project analysis...');
            
            // Quick initial scan for high-priority files
            await this.quickInitialScan();
            
            // Queue remaining files for progressive analysis
            await this.queueRemainingFiles();
            
            console.log('Initial analysis completed, background processing continues...');
        });
    }

    /**
     * Quick initial scan for immediately needed files
     */
    private async quickInitialScan(): Promise<void> {
        if (!this.projectRoot) {
            return;
        }

        // Priority 1: Settings file
        const settingsPath = await this.findSettingsFile();
        if (settingsPath) {
            await this.analyzeSettings(settingsPath);
        }

        // Priority 2: Open files
        const openFiles = vscode.window.visibleTextEditors
            .map(editor => editor.document.uri.fsPath)
            .filter(path => path.endsWith('.py'));

        for (const filePath of openFiles) {
            if (filePath.endsWith('models.py')) {
                await this.analyzeModelsWithCache(filePath);
            } else if (filePath.endsWith('urls.py')) {
                await this.analyzeUrlsWithCache(filePath);
            }
        }
    }

    /**
     * Queue remaining files for progressive analysis
     */
    private async queueRemainingFiles(): Promise<void> {
        // Find all Python files
        const modelFiles = await vscode.workspace.findFiles('**/models.py', '**/node_modules/**');
        const urlFiles = await vscode.workspace.findFiles('**/urls.py', '**/node_modules/**');
        const viewFiles = await vscode.workspace.findFiles('**/views.py', '**/node_modules/**');

        // Add to progressive analyzer queue
        this.progressiveAnalyzer.addToQueue(
            modelFiles.map(f => f.fsPath),
            'model',
            50 // High priority
        );

        this.progressiveAnalyzer.addToQueue(
            urlFiles.map(f => f.fsPath),
            'url',
            40 // Medium-high priority
        );

        this.progressiveAnalyzer.addToQueue(
            viewFiles.map(f => f.fsPath),
            'view',
            30 // Medium priority
        );
    }

    /**
     * Start progressive analysis
     */
    private startProgressiveAnalysis(): void {
        this.progressiveAnalyzer.startProcessing(
            async (task: AnalysisTask) => {
                switch (task.type) {
                    case 'model':
                        await this.analyzeModelsWithCache(task.filePath);
                        break;
                    case 'url':
                        await this.analyzeUrlsWithCache(task.filePath);
                        break;
                    case 'view':
                        // Future: analyze views
                        break;
                }
            },
            { batchSize: 10, concurrency: 3 }
        );
    }

    /**
     * Analyze models with caching
     */
    private async analyzeModelsWithCache(filePath: string): Promise<void> {
        try {
            const content = this.fileSystem.readFileSync(filePath, 'utf8') as string;
            
            // Check cache first
            const cached = this.fileCache.getIfValid(filePath, content);
            if (cached) {
                // Use cached result
                this.applyCachedModelAnalysis(cached, filePath);
                return;
            }

            // Analyze file
            const result = await this.profiler.measureAsync(
                'analyzeModel',
                () => super.analyzeModels(filePath),
                { filePath }
            );

            // Cache the result
            const analysisResult = this.extractModelAnalysisResult(filePath);
            this.fileCache.setWithHash(filePath, content, analysisResult);
        } catch (error) {
            console.error(`Error analyzing model ${filePath}:`, error);
        }
    }

    /**
     * Analyze URLs with caching
     */
    private async analyzeUrlsWithCache(filePath: string): Promise<void> {
        try {
            const content = this.fileSystem.readFileSync(filePath, 'utf8') as string;
            
            // Check cache first
            const cached = this.fileCache.getIfValid(filePath, content);
            if (cached) {
                // Use cached result
                this.applyCachedUrlAnalysis(cached, filePath);
                return;
            }

            // Analyze file
            await this.profiler.measureAsync(
                'analyzeUrl',
                () => super.analyzeUrls(filePath),
                { filePath }
            );

            // Cache the result
            const analysisResult = this.extractUrlAnalysisResult(filePath);
            this.fileCache.setWithHash(filePath, content, analysisResult);
        } catch (error) {
            console.error(`Error analyzing URLs ${filePath}:`, error);
        }
    }

    /**
     * Handle file changes with debouncing
     */
    protected async onPythonFileChanged(uri: vscode.Uri): Promise<void> {
        const filePath = uri.fsPath;
        
        // Debounce file changes
        this.debouncedExecutor.execute(filePath, async () => {
            // Reprioritize file in progressive analyzer
            this.progressiveAnalyzer.reprioritizeFile(filePath, 100);
            
            // Invalidate cache
            this.fileCache.delete(filePath);
            
            // Analyze with high priority
            if (filePath.endsWith('models.py')) {
                await this.analyzeModelsWithCache(filePath);
            } else if (filePath.endsWith('urls.py')) {
                await this.analyzeUrlsWithCache(filePath);
            } else if (filePath.endsWith('settings.py')) {
                await this.analyzeSettings(filePath);
            }
        });
    }

    /**
     * Setup worker pool handlers
     */
    private setupWorkers(): void {
        // Register analysis handlers
        this.workerPool.registerHandler('analyzeModel', async (filePath: string) => {
            await this.analyzeModelsWithCache(filePath);
        });

        this.workerPool.registerHandler('analyzeUrl', async (filePath: string) => {
            await this.analyzeUrlsWithCache(filePath);
        });

        // Start worker pool
        this.workerPool.start();
    }

    /**
     * Setup progress handlers
     */
    private setupProgressHandlers(): void {
        // Update status bar on progress
        this.progressiveAnalyzer.onProgressUpdate(progress => {
            if (progress.percentage >= 100) {
                this.statusBarItem.text = '$(check) Django Analysis Complete';
                setTimeout(() => {
                    this.statusBarItem.hide();
                }, 3000);
            } else {
                this.statusBarItem.text = `$(sync~spin) Django Analysis ${progress.percentage.toFixed(0)}%`;
                this.statusBarItem.show();
            }
        });

        // Handle task completion
        this.progressiveAnalyzer.onTaskComplete(task => {
            console.log(`Analyzed: ${task.filePath}`);
        });
    }

    /**
     * Extract model analysis result for caching
     */
    private extractModelAnalysisResult(filePath: string): any {
        const app = this.getAppNameFromPath(filePath);
        if (!app) {
            return null;
        }

        const models: any[] = [];
        for (const [name, info] of this.modelCache) {
            if (info.app === app) {
                models.push({ ...info });
            }
        }

        return { app, models };
    }

    /**
     * Extract URL analysis result for caching
     */
    private extractUrlAnalysisResult(filePath: string): any {
        // Extract only patterns from this specific file
        const patterns: any[] = [];
        const filePathNormalized = filePath.replace(/\\/g, '/');
        
        // Filter patterns that belong to this file
        for (const [key, pattern] of this.urlPatternCache) {
            // URL patterns typically include file information in their key or metadata
            // We need to check if this pattern belongs to the current file
            if (key.includes(filePathNormalized) || key.startsWith(path.basename(filePath, '.py'))) {
                patterns.push({ key, ...pattern });
            }
        }
        
        return { filePath, patterns };
    }

    /**
     * Apply cached model analysis
     */
    private applyCachedModelAnalysis(cached: any, filePath: string): void {
        if (!cached || !cached.models) {
            return;
        }

        for (const model of cached.models) {
            this.modelCache.set(model.name, {
                name: model.name,
                app: model.app,
                fields: model.fields,
                methods: model.methods,
                managers: model.managers
            });
        }
    }

    /**
     * Apply cached URL analysis
     */
    private applyCachedUrlAnalysis(cached: any, filePath: string): void {
        if (!cached || !cached.patterns) {
            return;
        }

        for (const pattern of cached.patterns) {
            this.urlPatternCache.set(pattern.key, {
                name: pattern.name,
                pattern: pattern.pattern,
                view: pattern.view
            });
        }
    }

    /**
     * Get performance report
     */
    getPerformanceReport(): any {
        return {
            profilerSummary: this.profiler.getSummary(),
            progressiveSummary: this.progressiveAnalyzer.getPerformanceSummary(),
            cacheStats: this.fileCache.getStats(),
            workerStatus: this.workerPool.getStatus()
        };
    }

    /**
     * Clear analysis cache
     */
    clearCache(): void {
        this.fileCache.clear();
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.progressiveAnalyzer.dispose();
        this.workerPool.stop();
        this.debouncedExecutor.cancelAll();
        this.statusBarItem.dispose();
        this.fileCache.clear();
    }
}