import { injectable, inject } from 'inversify';
import * as vscode from 'vscode';
import { TYPES } from '../container/types';
import { UrlPatternAnalyzer } from '../analyzers/urlPatternAnalyzer';

@injectable()
export class FileWatcherService {
    private disposables: vscode.Disposable[] = [];

    constructor(
        @inject(TYPES.ExtensionContext) private context: vscode.ExtensionContext,
        @inject(TYPES.UrlPatternAnalyzer) private urlPatternAnalyzer: UrlPatternAnalyzer
    ) {}

    async register(): Promise<void> {
        // Watch for URL file changes
        const urlFileWatcher = vscode.workspace.createFileSystemWatcher('**/urls.py');
        
        urlFileWatcher.onDidChange(async (uri) => {
            const document = await vscode.workspace.openTextDocument(uri);
            await this.urlPatternAnalyzer.analyzeUrlFile(document.getText(), uri.fsPath);
        });
        
        urlFileWatcher.onDidCreate(async (uri) => {
            const document = await vscode.workspace.openTextDocument(uri);
            await this.urlPatternAnalyzer.analyzeUrlFile(document.getText(), uri.fsPath);
        });
        
        urlFileWatcher.onDidDelete((uri) => {
            // Clear patterns from deleted file
            this.urlPatternAnalyzer.analyzeUrlFile('', uri.fsPath);
        });
        
        this.disposables.push(urlFileWatcher);
        
        // Add disposables to extension context
        this.context.subscriptions.push(...this.disposables);
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}