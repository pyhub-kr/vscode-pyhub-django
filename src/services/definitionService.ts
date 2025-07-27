import { injectable, inject } from 'inversify';
import * as vscode from 'vscode';
import { TYPES } from '../container/types';
import { DjangoDefinitionProvider } from '../providers/djangoDefinitionProvider';

/**
 * Service to register and manage definition providers
 */
@injectable()
export class DefinitionService {
    private disposables: vscode.Disposable[] = [];

    constructor(
        @inject(TYPES.ExtensionContext) private context: vscode.ExtensionContext,
        @inject(TYPES.DjangoDefinitionProvider) private djangoDefinitionProvider: DjangoDefinitionProvider
    ) {}

    async register(): Promise<void> {
        // Register Django definition provider for Python files
        this.disposables.push(
            vscode.languages.registerDefinitionProvider(
                { scheme: 'file', language: 'python' },
                this.djangoDefinitionProvider
            )
        );

        // Register Django definition provider for HTML/Django template files
        this.disposables.push(
            vscode.languages.registerDefinitionProvider(
                [
                    { scheme: 'file', language: 'html' },
                    { scheme: 'file', language: 'django-html' }
                ],
                this.djangoDefinitionProvider
            )
        );

        // Add disposables to extension context
        this.context.subscriptions.push(...this.disposables);
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}