import * as vscode from 'vscode';
import * as path from 'path';
import { injectable, inject } from 'inversify';
import { TYPES } from '../container/types';
import { StaticFileAnalyzer } from '../analyzers/staticFileAnalyzer';

@injectable()
export class StaticPathCompletionProvider implements vscode.CompletionItemProvider {
    constructor(
        @inject(TYPES.StaticFileAnalyzer) private staticFileAnalyzer: StaticFileAnalyzer
    ) {}

    public async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[] | undefined> {
        // Check if we're in a Django template
        if (!this.isDjangoTemplate(document)) {
            return undefined;
        }

        // Check if {% load static %} is present in the template
        if (!this.hasStaticLoad(document)) {
            return undefined;
        }

        const line = document.lineAt(position).text;
        const beforeCursor = line.substring(0, position.character);
        
        // Check if we're inside a {% static %} tag
        const staticMatch = beforeCursor.match(/\{%\s*static\s+['"]([^'"]*)?$/);
        if (!staticMatch) {
            return undefined;
        }

        const currentPath = staticMatch[1] || '';
        const completionItems: vscode.CompletionItem[] = [];

        // Get all static files
        const staticFiles = this.staticFileAnalyzer.getStaticFiles();
        
        // Build directory structure
        const directories = new Set<string>();
        const files = new Map<string, vscode.CompletionItem>();

        for (const file of staticFiles) {
            const relativePath = file.relativePath;
            
            // Check if this file/directory matches the current path
            if (!relativePath.startsWith(currentPath)) {
                continue;
            }

            // Get the part after the current path
            const remainingPath = relativePath.substring(currentPath.length);
            
            // If it's a direct child
            if (remainingPath.includes('/')) {
                const nextDir = remainingPath.split('/')[0];
                const fullDirPath = currentPath + nextDir;
                directories.add(fullDirPath);
            } else if (remainingPath) {
                // It's a file in the current directory
                const item = new vscode.CompletionItem(
                    remainingPath,
                    vscode.CompletionItemKind.File
                );
                
                item.insertText = remainingPath;
                item.detail = this.getFileTypeDetail(file.type);
                item.documentation = `Size: ${this.formatFileSize(file.size)}`;
                
                // Add file icon based on type
                switch (file.type) {
                    case 'css':
                        item.label = `$(file-code) ${remainingPath}`;
                        break;
                    case 'js':
                        item.label = `$(file-code) ${remainingPath}`;
                        break;
                    case 'image':
                        item.label = `$(file-media) ${remainingPath}`;
                        break;
                    case 'font':
                        item.label = `$(file-binary) ${remainingPath}`;
                        break;
                    default:
                        item.label = `$(file) ${remainingPath}`;
                }
                
                files.set(relativePath, item);
            }
        }

        // Add directories first
        for (const dir of directories) {
            const dirName = dir.substring(currentPath.length);
            const item = new vscode.CompletionItem(
                dirName,
                vscode.CompletionItemKind.Folder
            );
            
            item.label = `$(folder) ${dirName}/`;
            item.insertText = dirName + '/';
            item.command = {
                command: 'editor.action.triggerSuggest',
                title: 'Re-trigger completions'
            };
            
            completionItems.push(item);
        }

        // Add files
        completionItems.push(...files.values());

        // Sort: directories first, then files alphabetically
        completionItems.sort((a, b) => {
            if (a.kind === vscode.CompletionItemKind.Folder && b.kind !== vscode.CompletionItemKind.Folder) {
                return -1;
            }
            if (a.kind !== vscode.CompletionItemKind.Folder && b.kind === vscode.CompletionItemKind.Folder) {
                return 1;
            }
            return a.label.toString().localeCompare(b.label.toString());
        });

        return completionItems;
    }

    private isDjangoTemplate(document: vscode.TextDocument): boolean {
        const fileName = path.basename(document.fileName);
        return fileName.endsWith('.html') || fileName.endsWith('.jinja') || fileName.endsWith('.jinja2');
    }

    private hasStaticLoad(document: vscode.TextDocument): boolean {
        const text = document.getText();
        return /\{%\s*load\s+static\s*%\}/.test(text);
    }

    private getFileTypeDetail(type: string): string {
        switch (type) {
            case 'css':
                return 'CSS Stylesheet';
            case 'js':
                return 'JavaScript File';
            case 'image':
                return 'Image File';
            case 'font':
                return 'Font File';
            default:
                return 'Static File';
        }
    }

    private formatFileSize(bytes: number): string {
        if (bytes < 1024) {
            return `${bytes} B`;
        } else if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        } else {
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        }
    }
}