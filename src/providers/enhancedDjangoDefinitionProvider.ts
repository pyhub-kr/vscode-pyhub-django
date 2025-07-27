import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { injectable, inject } from 'inversify';
import { TYPES } from '../container/types';
import { DjangoProjectAnalyzer } from '../analyzers/djangoProjectAnalyzer';
import { EnhancedUrlPatternAnalyzer } from '../analyzers/enhancedUrlPatternAnalyzer';
import { FileCache } from '../cache/lruCache';

interface FileReadCache {
    content: string;
    timestamp: number;
}

interface LocationCache {
    location: vscode.Location;
    timestamp: number;
}

/**
 * Enhanced Django Definition Provider with performance optimizations
 */
@injectable()
export class EnhancedDjangoDefinitionProvider implements vscode.DefinitionProvider {
    private fileReadCache: FileCache<string>;
    private locationCache: Map<string, LocationCache> = new Map();
    private readonly locationCacheDuration = 10000; // 10 seconds
    
    // Pre-compiled regex patterns
    private readonly regexPatterns = {
        urlTag: /\{%\s*url\s+['"]([^'"]+)['"]/,
        viewsImport: /views\.\w+/,
        viewAsView: /\w+\.as_view\s*\(/,
        viewClass: /\w+View/,
        templateName: /template_name\s*=\s*['"]([^'"]+)['"]/,
        render: /render\s*\([^,]+,\s*['"]([^'"]+)['"]/,
        renderToResponse: /render_to_response\s*\(['"]([^'"]+)['"]/,
        getTemplate: /get_template\s*\(['"]([^'"]+)['"]/
    };

    constructor(
        @inject(TYPES.DjangoProjectAnalyzer) private projectAnalyzer: DjangoProjectAnalyzer,
        @inject(TYPES.EnhancedUrlPatternAnalyzer) private urlAnalyzer: EnhancedUrlPatternAnalyzer
    ) {
        this.fileReadCache = new FileCache<string>(100, 50);
    }

    async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Definition | undefined> {
        // Quick return if cancelled
        if (token.isCancellationRequested) {
            return undefined;
        }

        const line = document.lineAt(position).text;
        const word = document.getText(document.getWordRangeAtPosition(position));
        
        // Create a cache key for this request
        const cacheKey = `${document.uri.toString()}:${position.line}:${position.character}:${word}`;
        
        // Check location cache
        const cached = this.locationCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.locationCacheDuration) {
            return cached.location;
        }
        
        // Determine context and get definition
        let result: vscode.Location | undefined;
        
        if (this.isTemplateUrlTag(document, line, position)) {
            result = await this.getUrlPatternDefinition(document, position);
        } else if (this.isViewReference(document, line)) {
            result = await this.getViewDefinition(document, position);
        } else if (this.isTemplatePathReference(line)) {
            result = await this.getTemplateFileDefinition(line);
        }
        
        // Cache the result
        if (result) {
            this.locationCache.set(cacheKey, {
                location: result,
                timestamp: Date.now()
            });
        }
        
        return result;
    }

    /**
     * Optimized template URL tag detection
     */
    private isTemplateUrlTag(document: vscode.TextDocument, line: string, position: vscode.Position): boolean {
        // Quick language check
        const languageId = document.languageId;
        if (languageId !== 'html' && languageId !== 'django-html') {
            return false;
        }
        
        // Quick string contains check before regex
        if (!line.includes('url')) {
            return false;
        }
        
        // Check if cursor is inside {% url '...' %}
        const beforeCursor = line.substring(0, position.character);
        const afterCursor = line.substring(position.character);
        
        const urlTagBefore = beforeCursor.lastIndexOf('{%');
        const urlTagAfter = afterCursor.indexOf('%}');
        
        if (urlTagBefore === -1 || urlTagAfter === -1) {
            return false;
        }
        
        const tagContent = beforeCursor.substring(urlTagBefore) + afterCursor.substring(0, urlTagAfter + 2);
        return tagContent.includes('url');
    }

    /**
     * Get URL pattern definition with enhanced performance
     */
    private async getUrlPatternDefinition(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<vscode.Location | undefined> {
        const line = document.lineAt(position).text;
        
        // Extract URL name using pre-compiled regex
        const urlNameMatch = line.match(this.regexPatterns.urlTag);
        if (!urlNameMatch) {
            return undefined;
        }
        
        const urlName = urlNameMatch[1];
        
        // Handle namespaced URLs
        let namespace: string | undefined;
        let name = urlName;
        
        const colonIndex = urlName.indexOf(':');
        if (colonIndex !== -1) {
            namespace = urlName.substring(0, colonIndex);
            name = urlName.substring(colonIndex + 1);
        }
        
        // Get URL pattern from analyzer
        const urlPattern = await this.urlAnalyzer.getUrlPattern(name, namespace);
        if (!urlPattern) {
            return undefined;
        }
        
        // If we have line/character info, use it directly
        if (urlPattern.line !== undefined && urlPattern.character !== undefined) {
            return new vscode.Location(
                vscode.Uri.file(urlPattern.filePath),
                new vscode.Position(urlPattern.line, urlPattern.character)
            );
        }
        
        // Otherwise, search for the pattern in the file
        const foundPosition = await this.findPositionInFile(urlPattern.filePath, `name=['"]${urlPattern.name}['"]`);
        if (foundPosition) {
            return new vscode.Location(vscode.Uri.file(urlPattern.filePath), foundPosition);
        }
        
        return undefined;
    }

    /**
     * Optimized view reference detection
     */
    private isViewReference(document: vscode.TextDocument, line: string): boolean {
        // Quick checks
        if (document.languageId !== 'python' || !document.fileName.endsWith('urls.py')) {
            return false;
        }
        
        // Quick string contains checks before regex
        return line.includes('views.') || 
               line.includes('.as_view') || 
               line.includes('View');
    }

    /**
     * Get view definition with caching
     */
    private async getViewDefinition(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<vscode.Location | undefined> {
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) {
            return undefined;
        }
        
        const word = document.getText(wordRange);
        const line = document.lineAt(position).text;
        
        // Extract view name
        let viewName = word;
        
        // Handle different patterns
        if (line.includes('views.')) {
            const match = line.match(/views\.(\w+)/);
            if (match && position.character >= line.indexOf(match[0])) {
                viewName = match[1];
            }
        } else if (line.includes('.as_view')) {
            const match = line.match(/(\w+)\.as_view/);
            if (match) {
                viewName = match[1];
            }
        }
        
        // Find view location
        return this.findViewLocation(document, viewName);
    }

    /**
     * Optimized template path reference detection
     */
    private isTemplatePathReference(line: string): boolean {
        // Quick string contains check
        return line.includes('template_name') || 
               line.includes('render') || 
               line.includes('get_template');
    }

    /**
     * Get template file definition
     */
    private async getTemplateFileDefinition(line: string): Promise<vscode.Location | undefined> {
        // Try each pattern
        const patterns = [
            this.regexPatterns.templateName,
            this.regexPatterns.render,
            this.regexPatterns.renderToResponse,
            this.regexPatterns.getTemplate
        ];
        
        let templatePath: string | undefined;
        
        for (const pattern of patterns) {
            const match = line.match(pattern);
            if (match) {
                templatePath = match[1];
                break;
            }
        }
        
        if (!templatePath) {
            return undefined;
        }
        
        return this.findTemplateLocation(templatePath);
    }

    /**
     * Find view location with optimized search
     */
    private async findViewLocation(
        document: vscode.TextDocument,
        viewName: string
    ): Promise<vscode.Location | undefined> {
        // First check views.py in the same directory
        const currentDir = path.dirname(document.fileName);
        const viewsPath = path.join(currentDir, 'views.py');
        
        if (fs.existsSync(viewsPath)) {
            const content = await this.readFileCached(viewsPath);
            
            // Look for class or function definition
            const patterns = [
                new RegExp(`^class\\s+${viewName}\\s*\\(`, 'm'),
                new RegExp(`^def\\s+${viewName}\\s*\\(`, 'm')
            ];
            
            for (const pattern of patterns) {
                const match = content.match(pattern);
                if (match && match.index !== undefined) {
                    const position = this.getPositionFromOffset(content, match.index);
                    return new vscode.Location(vscode.Uri.file(viewsPath), position);
                }
            }
        }
        
        // If not found, search more broadly (but limit scope)
        const searchPattern = `**/${viewName}.py`;
        const files = await vscode.workspace.findFiles(searchPattern, '**/node_modules/**', 5);
        
        for (const file of files) {
            const content = await this.readFileCached(file.fsPath);
            
            const patterns = [
                new RegExp(`^class\\s+${viewName}\\s*\\(`, 'm'),
                new RegExp(`^def\\s+${viewName}\\s*\\(`, 'm')
            ];
            
            for (const pattern of patterns) {
                const match = content.match(pattern);
                if (match && match.index !== undefined) {
                    const position = this.getPositionFromOffset(content, match.index);
                    return new vscode.Location(file, position);
                }
            }
        }
        
        return undefined;
    }

    /**
     * Find template location with caching
     */
    private async findTemplateLocation(templatePath: string): Promise<vscode.Location | undefined> {
        // Common template directories in priority order
        const templateDirs = [
            `**/templates/${templatePath}`,
            `templates/${templatePath}`,
            `**/templates/**/${templatePath}`,
            templatePath
        ];
        
        // Search with limited results
        for (const pattern of templateDirs) {
            const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 1);
            if (files.length > 0) {
                return new vscode.Location(files[0], new vscode.Position(0, 0));
            }
        }
        
        return undefined;
    }

    /**
     * Read file with caching
     */
    private async readFileCached(filePath: string): Promise<string> {
        // Try to get from cache
        const content = await fs.promises.readFile(filePath, 'utf8');
        const cached = this.fileReadCache.getIfValid(filePath, content);
        
        if (cached) {
            return cached;
        }
        
        // Cache and return
        this.fileReadCache.setWithHash(filePath, content, content);
        return content;
    }

    /**
     * Find position in file with caching
     */
    private async findPositionInFile(filePath: string, searchPattern: string): Promise<vscode.Position | undefined> {
        const content = await this.readFileCached(filePath);
        const regex = new RegExp(searchPattern);
        const match = regex.exec(content);
        
        if (match && match.index !== undefined) {
            return this.getPositionFromOffset(content, match.index);
        }
        
        return undefined;
    }

    /**
     * Convert string offset to VS Code Position
     */
    private getPositionFromOffset(content: string, offset: number): vscode.Position {
        const lines = content.substring(0, offset).split('\n');
        return new vscode.Position(lines.length - 1, lines[lines.length - 1].length);
    }

    /**
     * Clear caches
     */
    clearCache(): void {
        this.fileReadCache.clear();
        this.locationCache.clear();
    }
}