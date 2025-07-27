import { injectable, inject } from 'inversify';
import * as vscode from 'vscode';
import { TYPES } from '../container/types';
import { DjangoProjectAnalyzer } from '../analyzers/djangoProjectAnalyzer';
import { UrlPatternAnalyzer } from '../analyzers/urlPatternAnalyzer';
import { DjangoModelCompletionProvider, DjangoFieldCompletionProvider } from '../providers/djangoModelCompletionProvider';
import { EnhancedCompletionProvider } from '../providers/enhancedCompletionProvider';
import { UrlTagCompletionProvider } from '../providers/urlTagCompletionProvider';
import { TemplatePathDefinitionProvider } from '../providers/templatePathDefinitionProvider';
import { TemplateVariableCompletionProvider } from '../providers/templateVariableCompletionProvider';

@injectable()
export class CompletionService {
    private disposables: vscode.Disposable[] = [];

    constructor(
        @inject(TYPES.ExtensionContext) private context: vscode.ExtensionContext,
        @inject(TYPES.DjangoProjectAnalyzer) private projectAnalyzer: DjangoProjectAnalyzer,
        @inject(TYPES.UrlPatternAnalyzer) private urlPatternAnalyzer: UrlPatternAnalyzer,
        @inject(TYPES.DjangoModelCompletionProvider) private modelCompletionProvider: DjangoModelCompletionProvider,
        @inject(TYPES.DjangoFieldCompletionProvider) private fieldCompletionProvider: DjangoFieldCompletionProvider,
        @inject(TYPES.EnhancedCompletionProvider) private enhancedCompletionProvider: EnhancedCompletionProvider,
        @inject(TYPES.UrlTagCompletionProvider) private urlTagCompletionProvider: UrlTagCompletionProvider,
        @inject(TYPES.TemplatePathDefinitionProvider) private templatePathDefinitionProvider: TemplatePathDefinitionProvider,
        @inject(TYPES.TemplateVariableCompletionProvider) private templateVariableCompletionProvider: TemplateVariableCompletionProvider
    ) {}

    async register(): Promise<void> {
        // Register enhanced completion provider with higher priority
        this.disposables.push(
            vscode.languages.registerCompletionItemProvider(
                { scheme: 'file', language: 'python' },
                this.enhancedCompletionProvider,
                '.', '(', '='  // Trigger on dot, parenthesis, and equals
            )
        );
        
        // Register URL tag completion provider for Django HTML templates
        this.disposables.push(
            vscode.languages.registerCompletionItemProvider(
                [
                    { scheme: 'file', language: 'html' },
                    { scheme: 'file', language: 'django-html' }
                ],
                this.urlTagCompletionProvider,
                "'", '"'  // Trigger on quotes
            )
        );
        
        // Register URL tag completion for Python files (reverse function)
        this.disposables.push(
            vscode.languages.registerCompletionItemProvider(
                { scheme: 'file', language: 'python' },
                this.urlTagCompletionProvider,
                "'", '"'  // Trigger on quotes
            )
        );
        
        // Keep existing providers for backward compatibility
        this.disposables.push(
            vscode.languages.registerCompletionItemProvider(
                { scheme: 'file', language: 'python' },
                this.modelCompletionProvider,
                '.'
            )
        );
        
        this.disposables.push(
            vscode.languages.registerCompletionItemProvider(
                { scheme: 'file', language: 'python' },
                this.fieldCompletionProvider,
                '.'
            )
        );
        
        // Register template path definition provider for Python files
        this.disposables.push(
            vscode.languages.registerDefinitionProvider(
                { scheme: 'file', language: 'python' },
                this.templatePathDefinitionProvider
            )
        );
        
        // Register template variable completion provider
        this.disposables.push(
            vscode.languages.registerCompletionItemProvider(
                [
                    { scheme: 'file', language: 'html' },
                    { scheme: 'file', language: 'django-html' }
                ],
                this.templateVariableCompletionProvider,
                '.', '{', ' '  // Trigger on dot, brace, and space
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