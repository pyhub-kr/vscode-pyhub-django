import * as vscode from 'vscode';
import * as path from 'path';

export interface UrlPattern {
    name: string;
    pattern: string;
    params: string[];
    appName?: string;
    filePath: string;
    view?: string;
}

interface FileCache {
    content: string;
    timestamp: number;
    patterns: UrlPattern[];
}

export class UrlPatternAnalyzer {
    private urlPatterns: Map<string, UrlPattern> = new Map();
    private fileCache: Map<string, FileCache> = new Map();
    private readonly cacheDuration = 5000; // 5 seconds
    
    async analyzeUrlFile(content: string, filePath: string): Promise<void> {
        // Check cache
        const cached = this.fileCache.get(filePath);
        if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
            if (cached.content === content) {
                return; // Already analyzed
            }
        }

        const patterns = this.parseUrlPatterns(content, filePath);
        
        // Cache the results
        this.fileCache.set(filePath, {
            content,
            timestamp: Date.now(),
            patterns
        });

        // Update global patterns map
        // Remove old patterns from this file
        for (const [key, pattern] of this.urlPatterns.entries()) {
            if (pattern.filePath === filePath) {
                this.urlPatterns.delete(key);
            }
        }

        // Add new patterns
        for (const pattern of patterns) {
            const key = pattern.appName ? `${pattern.appName}:${pattern.name}` : pattern.name;
            this.urlPatterns.set(key, pattern);
        }
    }

    private parseUrlPatterns(content: string, filePath: string): UrlPattern[] {
        const patterns: UrlPattern[] = [];
        const lines = content.split('\n');
        
        // Extract app_name if present
        let appName: string | undefined;
        const appNameMatch = content.match(/app_name\s*=\s*['"]([^'"]+)['"]/);
        if (appNameMatch) {
            appName = appNameMatch[1];
        }

        // Parse path() and re_path() patterns
        // This regex handles multi-line patterns and various formats
        // Updated to handle class-based views with .as_view()
        // Using a more specific approach to handle nested parentheses
        const pathRegex = /(?:path|re_path)\s*\(\s*r?['"]([^'"]*)['\"]\s*,\s*([^,]+(?:\([^)]*\))?[^,]*)(?:\s*,\s*name\s*=\s*['"]([^'"]+)['"])?\s*\)/g;
        
        let match;
        while ((match = pathRegex.exec(content)) !== null) {
            const [_, pattern, view, name] = match;
            
            if (name) {
                const params = this.extractUrlParams(pattern);
                patterns.push({
                    name,
                    pattern,
                    params,
                    appName: appName,
                    filePath: filePath,
                    view: view.trim()
                });
            }
        }

        // Parse include() patterns
        const includeRegex = /path\s*\(\s*['"]([^'"]+)['"]\s*,\s*include\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
        while ((match = includeRegex.exec(content)) !== null) {
            const [_, prefix, module] = match;
            // Store include information for later resolution
            // In a real implementation, we would recursively analyze the included module
        }

        return patterns;
    }

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

    getAllUrlPatterns(): UrlPattern[] {
        return Array.from(this.urlPatterns.values());
    }

    getUrlPattern(name: string, appName?: string): UrlPattern | undefined {
        const key = appName ? `${appName}:${name}` : name;
        return this.urlPatterns.get(key);
    }

    async scanWorkspace(): Promise<void> {
        const urlFiles = await vscode.workspace.findFiles('**/urls.py', '**/node_modules/**');
        
        for (const file of urlFiles) {
            try {
                const document = await vscode.workspace.openTextDocument(file);
                await this.analyzeUrlFile(document.getText(), file.fsPath);
            } catch (error) {
                console.error(`Error analyzing URL file ${file.fsPath}:`, error);
            }
        }
    }

    clearCache(): void {
        this.fileCache.clear();
    }
}