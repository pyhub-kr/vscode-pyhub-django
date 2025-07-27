import { injectable, inject } from 'inversify';
import * as vscode from 'vscode';
import { TYPES } from '../container/types';
import { DjangoDefinitionProvider } from '../providers/djangoDefinitionProvider';
import { EnhancedDjangoDefinitionProvider } from '../providers/enhancedDjangoDefinitionProvider';

/**
 * Service to register and manage definition providers
 */
@injectable()
export class DefinitionService {
    private disposables: vscode.Disposable[] = [];
    private useEnhancedProvider: boolean;

    constructor(
        @inject(TYPES.ExtensionContext) private context: vscode.ExtensionContext,
        @inject(TYPES.DjangoDefinitionProvider) private djangoDefinitionProvider: DjangoDefinitionProvider,
        @inject(TYPES.EnhancedDjangoDefinitionProvider) private enhancedDjangoDefinitionProvider: EnhancedDjangoDefinitionProvider
    ) {
        // Use enhanced provider when performance mode is enabled
        this.useEnhancedProvider = vscode.workspace.getConfiguration('djangoPowerTools.performance')
            .get('enableProgressiveAnalysis', true);
    }

    async register(): Promise<void> {
        // Select the appropriate provider based on configuration
        const provider = this.useEnhancedProvider 
            ? this.enhancedDjangoDefinitionProvider 
            : this.djangoDefinitionProvider;

        // Register Django definition provider for Python files
        this.disposables.push(
            vscode.languages.registerDefinitionProvider(
                { scheme: 'file', language: 'python' },
                provider
            )
        );

        // Register Django definition provider for HTML/Django template files
        this.disposables.push(
            vscode.languages.registerDefinitionProvider(
                [
                    { scheme: 'file', language: 'html' },
                    { scheme: 'file', language: 'django-html' }
                ],
                provider
            )
        );

        // Add disposables to extension context
        this.context.subscriptions.push(...this.disposables);
        
        console.log(`Django Definition Service registered with ${this.useEnhancedProvider ? 'Enhanced' : 'Standard'} provider`);
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}