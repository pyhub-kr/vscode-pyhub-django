import { injectable, inject } from 'inversify';
import * as vscode from 'vscode';
import { TYPES } from '../container/types';

type FileChangeCallback = (uri: vscode.Uri, changeType: vscode.FileChangeType) => void | Promise<void>;

interface WatcherInfo {
    watcher: vscode.FileSystemWatcher;
    callbacks: FileChangeCallback[];
}

/**
 * Enhanced File Watcher Service with pattern-based watching
 */
@injectable()
export class EnhancedFileWatcherService {
    private watchers: Map<string, WatcherInfo> = new Map();
    private disposables: vscode.Disposable[] = [];

    constructor(
        @inject(TYPES.ExtensionContext) private context: vscode.ExtensionContext
    ) {}

    /**
     * Watch files matching a glob pattern
     */
    watchPattern(pattern: string, callback: FileChangeCallback): vscode.Disposable {
        let watcherInfo = this.watchers.get(pattern);
        
        if (!watcherInfo) {
            // Create new watcher
            const watcher = vscode.workspace.createFileSystemWatcher(pattern);
            watcherInfo = {
                watcher,
                callbacks: []
            };
            
            // Setup event handlers
            watcher.onDidChange(uri => this.handleFileChange(pattern, uri, vscode.FileChangeType.Changed));
            watcher.onDidCreate(uri => this.handleFileChange(pattern, uri, vscode.FileChangeType.Created));
            watcher.onDidDelete(uri => this.handleFileChange(pattern, uri, vscode.FileChangeType.Deleted));
            
            this.watchers.set(pattern, watcherInfo);
            this.disposables.push(watcher);
        }
        
        // Add callback
        watcherInfo.callbacks.push(callback);
        
        // Return disposable to remove this specific callback
        return new vscode.Disposable(() => {
            const info = this.watchers.get(pattern);
            if (info) {
                const index = info.callbacks.indexOf(callback);
                if (index !== -1) {
                    info.callbacks.splice(index, 1);
                }
                
                // If no more callbacks, dispose the watcher
                if (info.callbacks.length === 0) {
                    info.watcher.dispose();
                    this.watchers.delete(pattern);
                }
            }
        });
    }

    /**
     * Handle file change events
     */
    private async handleFileChange(pattern: string, uri: vscode.Uri, changeType: vscode.FileChangeType): Promise<void> {
        const watcherInfo = this.watchers.get(pattern);
        if (!watcherInfo) {
            return;
        }
        
        // Call all registered callbacks
        const promises = watcherInfo.callbacks.map(callback => {
            try {
                return Promise.resolve(callback(uri, changeType));
            } catch (error) {
                console.error(`Error in file watcher callback for ${pattern}:`, error);
                return Promise.resolve();
            }
        });
        
        await Promise.all(promises);
    }

    /**
     * Watch multiple patterns
     */
    watchPatterns(patterns: string[], callback: FileChangeCallback): vscode.Disposable {
        const disposables = patterns.map(pattern => this.watchPattern(pattern, callback));
        
        return new vscode.Disposable(() => {
            disposables.forEach(d => d.dispose());
        });
    }

    /**
     * Get all active watchers
     */
    getActiveWatchers(): string[] {
        return Array.from(this.watchers.keys());
    }

    /**
     * Register all watchers with extension context
     */
    register(): void {
        this.context.subscriptions.push(...this.disposables);
    }

    /**
     * Dispose all watchers
     */
    dispose(): void {
        this.watchers.forEach(info => info.watcher.dispose());
        this.watchers.clear();
        this.disposables = [];
    }
}