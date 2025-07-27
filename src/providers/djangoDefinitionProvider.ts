import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { injectable, inject } from 'inversify';
import { TYPES } from '../container/types';
import { DjangoProjectAnalyzer } from '../analyzers/djangoProjectAnalyzer';
import { UrlPatternAnalyzer } from '../analyzers/urlPatternAnalyzer';

/**
 * Django Definition Provider
 * Provides Go to Definition functionality for Django-specific patterns
 */
@injectable()
export class DjangoDefinitionProvider implements vscode.DefinitionProvider {
    constructor(
        @inject(TYPES.DjangoProjectAnalyzer) private projectAnalyzer: DjangoProjectAnalyzer,
        @inject(TYPES.UrlPatternAnalyzer) private urlAnalyzer: UrlPatternAnalyzer
    ) {}

    async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Definition | undefined> {
        const word = document.getText(document.getWordRangeAtPosition(position));
        const line = document.lineAt(position).text;
        
        // Check different contexts
        if (this.isTemplateUrlTag(document, line, position)) {
            return this.getUrlPatternDefinition(document, position);
        }
        
        if (this.isViewReference(document, line, position)) {
            return this.getViewDefinition(document, position);
        }
        
        if (this.isTemplatePathReference(document, line, position)) {
            return this.getTemplateFileDefinition(document, position);
        }
        
        return undefined;
    }

    /**
     * Check if cursor is in a template URL tag like {% url 'name' %}
     */
    private isTemplateUrlTag(document: vscode.TextDocument, line: string, position: vscode.Position): boolean {
        // Check if we're in an HTML/Django template file
        const languageId = document.languageId;
        if (languageId !== 'html' && languageId !== 'django-html') {
            return false;
        }
        
        // Check if cursor is inside {% url '...' %}
        const beforeCursor = line.substring(0, position.character);
        const afterCursor = line.substring(position.character);
        
        // Look for {% url pattern
        const urlTagBefore = beforeCursor.lastIndexOf('{%');
        const urlTagAfter = afterCursor.indexOf('%}');
        
        if (urlTagBefore === -1 || urlTagAfter === -1) {
            return false;
        }
        
        // Extract the tag content
        const tagContent = line.substring(urlTagBefore, position.character + urlTagAfter + 2);
        
        // Check if it's a url tag
        return /\{%\s*url\s+/.test(tagContent);
    }

    /**
     * Get URL pattern definition from template URL tag
     */
    private async getUrlPatternDefinition(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<vscode.Definition | undefined> {
        const line = document.lineAt(position).text;
        
        // Extract URL name from the tag
        const urlNameMatch = line.match(/\{%\s*url\s+['"]([^'"]+)['"]/);
        if (!urlNameMatch) {
            return undefined;
        }
        
        const urlName = urlNameMatch[1];
        
        // Handle namespaced URLs (e.g., 'blog:post-detail')
        let namespace: string | undefined;
        let name = urlName;
        
        if (urlName.includes(':')) {
            [namespace, name] = urlName.split(':', 2);
        }
        
        // Find the URL pattern
        const urlPattern = this.urlAnalyzer.getUrlPattern(name, namespace);
        if (!urlPattern) {
            return undefined;
        }
        
        // Return the location directly from the URL pattern
        const urlPosition = await this.findPositionInFile(urlPattern.filePath, urlPattern.name);
        if (urlPosition) {
            return new vscode.Location(vscode.Uri.file(urlPattern.filePath), urlPosition);
        }
        
        return undefined;
    }

    /**
     * Check if cursor is on a view reference in urls.py
     */
    private isViewReference(document: vscode.TextDocument, line: string, position: vscode.Position): boolean {
        // Check if we're in a Python file (likely urls.py)
        if (document.languageId !== 'python') {
            return false;
        }
        
        // Check if file is urls.py
        if (!document.fileName.endsWith('urls.py')) {
            return false;
        }
        
        // Check for view patterns
        // Examples: views.MyView, MyView.as_view(), views.my_view
        const viewPatterns = [
            /views\.\w+/,
            /\w+\.as_view\s*\(/,
            /\w+View/
        ];
        
        return viewPatterns.some(pattern => pattern.test(line));
    }

    /**
     * Get view definition from urls.py reference
     */
    private async getViewDefinition(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<vscode.Definition | undefined> {
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) {
            return undefined;
        }
        
        const word = document.getText(wordRange);
        const line = document.lineAt(position).text;
        
        // Extract view name
        let viewName = word;
        
        // Handle views.MyView pattern
        if (line.includes('views.')) {
            const match = line.match(/views\.(\w+)/);
            if (match && position.character >= line.indexOf(match[0])) {
                viewName = match[1];
            }
        }
        
        // Handle MyView.as_view() pattern
        if (line.includes('.as_view')) {
            const match = line.match(/(\w+)\.as_view/);
            if (match) {
                viewName = match[1];
            }
        }
        
        // Find the view definition
        return this.findViewLocation(document, viewName);
    }

    /**
     * Check if cursor is on a template path reference
     */
    private isTemplatePathReference(document: vscode.TextDocument, line: string, position: vscode.Position): boolean {
        // Check if we're in a Python file
        if (document.languageId !== 'python') {
            return false;
        }
        
        // Check for template patterns
        const templatePatterns = [
            /template_name\s*=\s*['"]/,
            /render\s*\([^,]+,\s*['"]/,
            /render_to_response\s*\(['"]/,
            /get_template\s*\(['"]/
        ];
        
        return templatePatterns.some(pattern => pattern.test(line));
    }

    /**
     * Get template file definition from template path
     */
    private async getTemplateFileDefinition(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<vscode.Definition | undefined> {
        const line = document.lineAt(position).text;
        
        // Extract template path
        const patterns = [
            /template_name\s*=\s*['"]([^'"]+)['"]/,
            /render\s*\([^,]+,\s*['"]([^'"]+)['"]/,
            /render_to_response\s*\(['"]([^'"]+)['"]/,
            /get_template\s*\(['"]([^'"]+)['"]/
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
        
        // Find the template file
        return this.findTemplateLocation(templatePath);
    }

    /**
     * Find URL pattern location in urls.py files
     */
    private async findUrlPatternLocation(
        name: string,
        namespace?: string
    ): Promise<vscode.Location | undefined> {
        // Search all urls.py files
        const urlFiles = await vscode.workspace.findFiles('**/urls.py', '**/node_modules/**');
        
        for (const file of urlFiles) {
            const content = await this.readFile(file.fsPath);
            
            // Look for the URL pattern with the given name
            const patterns = [
                // path('...', view, name='name')
                new RegExp(`name\\s*=\\s*['"]${name}['"]`, 'g'),
                // url(r'...', view, name='name')
                new RegExp(`name\\s*=\\s*['"]${name}['"]`, 'g')
            ];
            
            for (const pattern of patterns) {
                const matches = Array.from(content.matchAll(pattern));
                
                for (const match of matches) {
                    if (match.index !== undefined) {
                        // If namespace is specified, verify it matches
                        if (namespace) {
                            // Look for app_name = 'namespace' in the same file
                            const appNameMatch = content.match(new RegExp(`app_name\\s*=\\s*['"]${namespace}['"]`));
                            if (!appNameMatch) {
                                continue;
                            }
                        }
                        
                        const position = this.getPositionFromOffset(content, match.index);
                        return new vscode.Location(file, position);
                    }
                }
            }
        }
        
        return undefined;
    }

    /**
     * Find view location in Python files
     */
    private async findViewLocation(
        document: vscode.TextDocument,
        viewName: string
    ): Promise<vscode.Location | undefined> {
        // First, check imports in the current file
        const content = document.getText();
        const importPatterns = [
            /from\s+\.views\s+import\s+(.+)/g,
            /from\s+\.?\s+import\s+views/g,
            /from\s+(\w+)\.views\s+import\s+(.+)/g,
            /import\s+views/g
        ];
        
        let searchPath: string | undefined;
        
        // Determine where to look for the view
        for (const pattern of importPatterns) {
            const matches = Array.from(content.matchAll(pattern));
            if (matches.length > 0) {
                // Found import, determine search path
                const currentDir = path.dirname(document.fileName);
                searchPath = path.join(currentDir, 'views.py');
                break;
            }
        }
        
        if (!searchPath) {
            // Default to views.py in the same directory
            const currentDir = path.dirname(document.fileName);
            searchPath = path.join(currentDir, 'views.py');
        }
        
        // Search for the view definition
        if (fs.existsSync(searchPath)) {
            const viewContent = await this.readFile(searchPath);
            
            // Look for class-based view
            const classPattern = new RegExp(`^class\\s+${viewName}\\s*\\(`, 'm');
            const classMatch = viewContent.match(classPattern);
            
            if (classMatch && classMatch.index !== undefined) {
                const position = this.getPositionFromOffset(viewContent, classMatch.index);
                return new vscode.Location(vscode.Uri.file(searchPath), position);
            }
            
            // Look for function-based view
            const funcPattern = new RegExp(`^def\\s+${viewName}\\s*\\(`, 'm');
            const funcMatch = viewContent.match(funcPattern);
            
            if (funcMatch && funcMatch.index !== undefined) {
                const position = this.getPositionFromOffset(viewContent, funcMatch.index);
                return new vscode.Location(vscode.Uri.file(searchPath), position);
            }
        }
        
        // If not found in views.py, search more broadly
        const pythonFiles = await vscode.workspace.findFiles('**/*.py', '**/node_modules/**');
        
        for (const file of pythonFiles) {
            if (file.fsPath === searchPath) {
                continue; // Already checked
            }
            
            const content = await this.readFile(file.fsPath);
            
            // Look for the view definition
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
     * Find template file location
     */
    private async findTemplateLocation(templatePath: string): Promise<vscode.Location | undefined> {
        // Common template directories
        const templateDirs = [
            'templates',
            '*/templates',
            'apps/*/templates',
            'src/*/templates'
        ];
        
        // Search for the template file
        for (const dir of templateDirs) {
            const pattern = `${dir}/${templatePath}`;
            const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
            
            if (files.length > 0) {
                return new vscode.Location(files[0], new vscode.Position(0, 0));
            }
        }
        
        // Also try direct path
        const directFiles = await vscode.workspace.findFiles(templatePath, '**/node_modules/**');
        if (directFiles.length > 0) {
            return new vscode.Location(directFiles[0], new vscode.Position(0, 0));
        }
        
        return undefined;
    }

    /**
     * Read file content
     */
    private async readFile(filePath: string): Promise<string> {
        return fs.promises.readFile(filePath, 'utf8');
    }

    /**
     * Convert string offset to VS Code Position
     */
    private getPositionFromOffset(content: string, offset: number): vscode.Position {
        const lines = content.substring(0, offset).split('\n');
        const line = lines.length - 1;
        const character = lines[lines.length - 1].length;
        return new vscode.Position(line, character);
    }

    /**
     * Find position of a URL name definition in a file
     */
    private async findPositionInFile(filePath: string, urlName: string): Promise<vscode.Position | undefined> {
        const content = await this.readFile(filePath);
        
        // Look for name='urlName' pattern
        const namePattern = new RegExp(`name\\s*=\\s*['\"]${urlName}['\"']`, 'g');
        const match = namePattern.exec(content);
        
        if (match && match.index !== undefined) {
            return this.getPositionFromOffset(content, match.index);
        }
        
        return undefined;
    }
}