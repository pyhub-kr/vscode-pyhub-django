import { injectable, inject } from 'inversify';
import * as vscode from 'vscode';
import * as path from 'path';
import * as crypto from 'crypto';
import { TYPES } from '../container/types';
import { FileCache } from '../cache/lruCache';
import { FileWatcherService } from '../services/fileWatcherService';

export interface UrlPattern {
    name: string;
    pattern: string;
    params: string[];
    appName?: string;
    filePath: string;
    view?: string;
    line?: number;
    character?: number;
}

interface ParsedUrlFile {
    patterns: UrlPattern[];
    includes: string[];
    appName?: string;
}

interface CompiledPattern {
    regex: RegExp;
    source: string;
}

/**
 * Enhanced URL Pattern Analyzer with performance optimizations
 */
@injectable()
export class EnhancedUrlPatternAnalyzer {
    private urlPatterns: Map<string, UrlPattern> = new Map();
    private fileCache: FileCache<ParsedUrlFile>;
    private compiledPatterns: Map<string, CompiledPattern> = new Map();
    private pendingAnalysis: Set<string> = new Set();
    private isInitialized: boolean = false;
    private initializationPromise: Promise<void> | null = null;
    
    // Performance tracking
    private performanceMetrics = {
        cacheHits: 0,
        cacheMisses: 0,
        parseTime: 0,
        scanTime: 0
    };

    constructor(
        @inject(TYPES.FileWatcherService) private fileWatcher: FileWatcherService
    ) {
        // Initialize with larger cache for better performance
        this.fileCache = new FileCache<ParsedUrlFile>(500, 100);
        this.setupFileWatcher();
    }

    /**
     * Setup file watcher for urls.py files
     */
    private setupFileWatcher(): void {
        this.fileWatcher.watchPattern('**/urls.py', async (uri, changeType) => {
            if (changeType === vscode.FileChangeType.Deleted) {
                this.removeUrlsFromFile(uri.fsPath);
            } else {
                // Invalidate cache for changed file
                this.fileCache.delete(uri.fsPath);
                // Schedule re-analysis
                await this.analyzeUrlFileDebounced(uri.fsPath);
            }
        });
    }

    /**
     * Debounced URL file analysis to prevent rapid re-analysis
     */
    private async analyzeUrlFileDebounced(filePath: string): Promise<void> {
        if (this.pendingAnalysis.has(filePath)) {
            return;
        }

        this.pendingAnalysis.add(filePath);
        
        setTimeout(async () => {
            this.pendingAnalysis.delete(filePath);
            const document = await vscode.workspace.openTextDocument(filePath);
            await this.analyzeUrlFile(document.getText(), filePath);
        }, 500); // 500ms debounce
    }

    /**
     * Lazy initialization - only scan when first needed
     */
    private async ensureInitialized(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this.scanWorkspaceIncremental();
        await this.initializationPromise;
        this.isInitialized = true;
    }

    /**
     * Analyze URL file with enhanced caching
     */
    async analyzeUrlFile(content: string, filePath: string): Promise<void> {
        const startTime = Date.now();

        // Check cache first
        const cached = this.fileCache.getIfValid(filePath, content);
        if (cached) {
            this.performanceMetrics.cacheHits++;
            // Restore patterns from cache
            this.updatePatternsFromCache(filePath, cached);
            return;
        }

        this.performanceMetrics.cacheMisses++;

        // Parse the file
        const parsed = this.parseUrlFile(content, filePath);
        
        // Cache the results
        this.fileCache.setWithHash(filePath, content, parsed);
        
        // Update patterns
        this.updatePatternsFromCache(filePath, parsed);

        this.performanceMetrics.parseTime += Date.now() - startTime;
    }

    /**
     * Parse URL file into structured data
     */
    private parseUrlFile(content: string, filePath: string): ParsedUrlFile {
        const patterns: UrlPattern[] = [];
        const includes: string[] = [];
        
        // Extract app_name if present
        let appName: string | undefined;
        const appNameMatch = content.match(/app_name\s*=\s*['"]([^'"]+)['"]/);
        if (appNameMatch) {
            appName = appNameMatch[1];
        }

        // Get or compile regex patterns
        const pathRegex = this.getCompiledPattern(
            'path',
            /(?:path|re_path)\s*\(\s*r?['"]([^'"]*)['\"]\s*,\s*([^,]+(?:\([^)]*\))?[^,]*)(?:\s*,\s*name\s*=\s*['"]([^'"]+)['"])?\s*\)/g
        );

        // Parse patterns with line information
        const lines = content.split('\n');
        let currentIndex = 0;
        
        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];
            const lineStartIndex = currentIndex;
            
            // Check for URL patterns in this line
            let match;
            pathRegex.regex.lastIndex = 0;
            
            while ((match = pathRegex.regex.exec(line)) !== null) {
                const [fullMatch, pattern, view, name] = match;
                
                if (name) {
                    const params = this.extractUrlParams(pattern);
                    patterns.push({
                        name,
                        pattern,
                        params,
                        appName,
                        filePath,
                        view: view.trim(),
                        line: lineNum,
                        character: match.index!
                    });
                }
            }
            
            // Check for includes
            const includeMatch = line.match(/path\s*\(\s*['"]([^'"]+)['"]\s*,\s*include\s*\(\s*['"]([^'"]+)['"]\s*\)/);
            if (includeMatch) {
                includes.push(includeMatch[2]);
            }
            
            currentIndex = lineStartIndex + line.length + 1; // +1 for newline
        }

        return { patterns, includes, appName };
    }

    /**
     * Get or compile regex pattern with caching
     */
    private getCompiledPattern(key: string, pattern: RegExp): CompiledPattern {
        const cached = this.compiledPatterns.get(key);
        if (cached && cached.source === pattern.source) {
            return cached;
        }

        const compiled = { regex: pattern, source: pattern.source };
        this.compiledPatterns.set(key, compiled);
        return compiled;
    }

    /**
     * Update patterns from parsed data
     */
    private updatePatternsFromCache(filePath: string, parsed: ParsedUrlFile): void {
        // Remove old patterns from this file
        for (const [key, pattern] of this.urlPatterns.entries()) {
            if (pattern.filePath === filePath) {
                this.urlPatterns.delete(key);
            }
        }

        // Add new patterns
        for (const pattern of parsed.patterns) {
            const key = pattern.appName ? `${pattern.appName}:${pattern.name}` : pattern.name;
            this.urlPatterns.set(key, pattern);
        }
    }

    /**
     * Extract URL parameters efficiently
     */
    private extractUrlParams(pattern: string): string[] {
        const params: string[] = [];
        
        // Django path converters: <type:name>
        const pathParamRegex = /<(?:[^:]+:)?([^>]+)>/g;
        let match;
        while ((match = pathParamRegex.exec(pattern)) !== null) {
            params.push(match[1]);
        }

        // Django re_path named groups: (?P<name>...)
        const rePathParamRegex = /\(\?P<([^>]+)>/g;
        while ((match = rePathParamRegex.exec(pattern)) !== null) {
            params.push(match[1]);
        }

        return params;
    }

    /**
     * Get all URL patterns (with lazy initialization)
     */
    async getAllUrlPatterns(): Promise<UrlPattern[]> {
        await this.ensureInitialized();
        return Array.from(this.urlPatterns.values());
    }

    /**
     * Get specific URL pattern (with lazy initialization)
     */
    async getUrlPattern(name: string, appName?: string): Promise<UrlPattern | undefined> {
        await this.ensureInitialized();
        const key = appName ? `${appName}:${name}` : name;
        return this.urlPatterns.get(key);
    }

    /**
     * Incremental workspace scanning
     */
    private async scanWorkspaceIncremental(): Promise<void> {
        const startTime = Date.now();
        
        // Find all urls.py files
        const urlFiles = await vscode.workspace.findFiles('**/urls.py', '**/node_modules/**');
        
        // Process files in batches to avoid blocking
        const batchSize = 10;
        for (let i = 0; i < urlFiles.length; i += batchSize) {
            const batch = urlFiles.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (file) => {
                try {
                    const document = await vscode.workspace.openTextDocument(file);
                    await this.analyzeUrlFile(document.getText(), file.fsPath);
                } catch (error) {
                    console.error(`Error analyzing URL file ${file.fsPath}:`, error);
                }
            }));
            
            // Yield to other tasks
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        this.performanceMetrics.scanTime = Date.now() - startTime;
    }

    /**
     * Remove URL patterns from a deleted file
     */
    private removeUrlsFromFile(filePath: string): void {
        this.fileCache.delete(filePath);
        
        for (const [key, pattern] of this.urlPatterns.entries()) {
            if (pattern.filePath === filePath) {
                this.urlPatterns.delete(key);
            }
        }
    }

    /**
     * Clear all caches
     */
    clearCache(): void {
        this.fileCache.clear();
        this.urlPatterns.clear();
        this.compiledPatterns.clear();
        this.isInitialized = false;
        this.initializationPromise = null;
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics(): typeof this.performanceMetrics {
        return {
            ...this.performanceMetrics,
            cacheHitRate: this.performanceMetrics.cacheHits / 
                (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses) || 0
        };
    }

    /**
     * Search patterns by partial name (for autocomplete)
     */
    async searchPatterns(partial: string, limit: number = 50): Promise<UrlPattern[]> {
        await this.ensureInitialized();
        
        const results: UrlPattern[] = [];
        const lowerPartial = partial.toLowerCase();
        
        for (const pattern of this.urlPatterns.values()) {
            if (pattern.name.toLowerCase().includes(lowerPartial)) {
                results.push(pattern);
                if (results.length >= limit) {
                    break;
                }
            }
        }
        
        return results;
    }
}