import * as vscode from 'vscode';
import { injectable, inject } from 'inversify';
import { TYPES } from '../container/types';
import { DjangoProjectAnalyzer } from '../analyzers/djangoProjectAnalyzer';
import { OptimizedDjangoProjectAnalyzer } from '../analyzers/optimizedDjangoProjectAnalyzer';

@injectable()
export class PerformanceCommands {
    constructor(
        @inject(TYPES.ExtensionContext) private context: vscode.ExtensionContext,
        @inject(TYPES.DjangoProjectAnalyzer) private projectAnalyzer: DjangoProjectAnalyzer
    ) {}

    /**
     * Register performance-related commands
     */
    register(): void {
        this.context.subscriptions.push(
            vscode.commands.registerCommand('django-power-tools.showPerformanceReport', () => {
                this.showPerformanceReport();
            }),
            vscode.commands.registerCommand('django-power-tools.clearCache', () => {
                this.clearCache();
            })
        );
    }

    /**
     * Show performance report
     */
    private async showPerformanceReport(): Promise<void> {
        if (!(this.projectAnalyzer instanceof OptimizedDjangoProjectAnalyzer)) {
            vscode.window.showInformationMessage(
                'Performance mode is not enabled. Enable progressive analysis in settings to see performance reports.'
            );
            return;
        }

        const report = this.projectAnalyzer.getPerformanceReport();
        
        // Create performance report content
        let content = '# Django Power Tools - Performance Report\n\n';
        
        // Profiler Summary
        content += '## Analysis Performance\n\n';
        content += '| Operation | Count | Avg Duration (ms) | Total Duration (ms) |\n';
        content += '|-----------|-------|-------------------|--------------------|\n';
        
        for (const [operation, stats] of Object.entries(report.profilerSummary)) {
            const s = stats as any;
            content += `| ${operation} | ${s.count} | ${s.avgDuration.toFixed(2)} | ${s.totalDuration.toFixed(2)} |\n`;
        }
        
        // Progressive Analysis Summary
        content += '\n## Progressive Analysis Performance\n\n';
        if (report.progressiveSummary) {
            for (const [operation, stats] of Object.entries(report.progressiveSummary)) {
                const s = stats as any;
                content += `- **${operation}**: ${s.count} operations, avg ${s.avgDuration.toFixed(2)}ms\n`;
            }
        }
        
        // Cache Statistics
        content += '\n## Cache Statistics\n\n';
        const cacheStats = report.cacheStats;
        content += `- **Cache Size**: ${cacheStats.size} / ${cacheStats.maxSize} items\n`;
        content += `- **Memory Usage**: ${cacheStats.memoryUsageMB.toFixed(2)} / ${cacheStats.maxMemoryMB} MB\n`;
        
        // Worker Status
        content += '\n## Background Worker Status\n\n';
        const workerStatus = report.workerStatus;
        content += `- **Queue Length**: ${workerStatus.queueLength}\n`;
        content += `- **Active Tasks**: ${workerStatus.activeTasks}\n`;
        content += `- **Status**: ${workerStatus.isRunning ? 'Running' : 'Stopped'}\n`;
        
        // Create and show document
        const doc = await vscode.workspace.openTextDocument({
            content,
            language: 'markdown'
        });
        
        await vscode.window.showTextDocument(doc, { preview: false });
    }

    /**
     * Clear analysis cache
     */
    private async clearCache(): Promise<void> {
        if (!(this.projectAnalyzer instanceof OptimizedDjangoProjectAnalyzer)) {
            vscode.window.showInformationMessage('No cache to clear in non-performance mode.');
            return;
        }

        const answer = await vscode.window.showWarningMessage(
            'Clear all cached analysis results? This will require re-analyzing all files.',
            'Yes, Clear Cache',
            'Cancel'
        );

        if (answer === 'Yes, Clear Cache') {
            // Get current cache stats before clearing
            const report = this.projectAnalyzer.getPerformanceReport();
            const cacheStats = report.cacheStats;
            
            // Clear the cache using a public method
            if ('clearCache' in this.projectAnalyzer) {
                (this.projectAnalyzer as any).clearCache();
            } else {
                // Fallback for compatibility
                (this.projectAnalyzer as any).fileCache?.clear();
            }
            
            vscode.window.showInformationMessage(
                `Cleared ${cacheStats.size} cached items (${cacheStats.memoryUsageMB.toFixed(2)} MB)`
            );
        }
    }
}