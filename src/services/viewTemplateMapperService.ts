import { injectable, inject } from 'inversify';
import * as vscode from 'vscode';
import { TYPES } from '../container/types';
import { TemplateContextAnalyzer } from '../analyzers/templateContextAnalyzer';
import { TemplatePathResolver } from '../analyzers/templatePathResolver';

@injectable()
export class ViewTemplateMapperService implements vscode.Disposable {
    private disposables: vscode.Disposable[] = [];
    private fileWatcher: vscode.FileSystemWatcher | undefined;

    constructor(
        @inject(TYPES.TemplateContextAnalyzer) private contextAnalyzer: TemplateContextAnalyzer,
        @inject(TYPES.TemplatePathResolver) private pathResolver: TemplatePathResolver
    ) {
        this.initialize();
    }

    private initialize(): void {
        // Watch for Python file changes
        this.fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.py');
        
        this.fileWatcher.onDidChange((uri) => {
            this.handleFileChange(uri);
        });
        
        this.fileWatcher.onDidCreate((uri) => {
            this.handleFileChange(uri);
        });
        
        this.fileWatcher.onDidDelete((uri) => {
            // For now, we'll just refresh everything
            // In the future, we could be more selective
            this.refresh();
        });
        
        this.disposables.push(this.fileWatcher);
        
        // Also listen to document save events for immediate updates
        this.disposables.push(
            vscode.workspace.onDidSaveTextDocument((document) => {
                if (document.languageId === 'python') {
                    this.contextAnalyzer.onDocumentChange(document);
                }
            })
        );
    }

    private async handleFileChange(uri: vscode.Uri): Promise<void> {
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            if (document.languageId === 'python') {
                this.contextAnalyzer.onDocumentChange(document);
            }
        } catch (error) {
            console.error('Error handling file change:', error);
        }
    }

    /**
     * Refresh all mappings
     */
    public async refresh(): Promise<void> {
        await Promise.all([
            this.contextAnalyzer.refresh(),
            this.pathResolver.refresh()
        ]);
    }

    /**
     * Get template path for a given view function
     */
    public getTemplateForView(viewFile: string, viewFunction: string): string | undefined {
        // This would require reverse lookup from the context analyzer
        // For now, this is a placeholder for future enhancement
        return undefined;
    }

    /**
     * Get all views that use a specific template
     */
    public getViewsForTemplate(templatePath: string): Array<{ file: string; function: string }> {
        const contexts = this.contextAnalyzer.getContextForTemplate(templatePath);
        return contexts.map(ctx => ({
            file: ctx.viewFile,
            function: ctx.viewFunction
        }));
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
    }
}