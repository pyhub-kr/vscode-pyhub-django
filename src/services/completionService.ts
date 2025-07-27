import { injectable, inject } from 'inversify';
import * as vscode from 'vscode';
import { TYPES } from '../container/types';
import { DjangoProjectAnalyzer } from '../analyzers/djangoProjectAnalyzer';
import { UrlPatternAnalyzer } from '../analyzers/urlPatternAnalyzer';
import { DjangoModelCompletionProvider, DjangoFieldCompletionProvider } from '../providers/djangoModelCompletionProvider';
import { EnhancedCompletionProvider } from '../providers/enhancedCompletionProvider';
import { UrlTagCompletionProvider } from '../providers/urlTagCompletionProvider';
import { DjangoFormsCompletionProvider } from '../providers/djangoFormsCompletionProvider';
import { DjangoModelFormCompletionProvider } from '../providers/djangoModelFormCompletionProvider';
import { TemplateContextCompletionProvider } from '../providers/templateContextCompletionProvider';
import { StaticPathCompletionProvider } from '../providers/staticPathCompletionProvider';
import { DjangoAdminCompletionProvider } from '../completions/djangoAdminCompletionProvider';
import { DjangoFormAnalyzer } from '../analyzers/djangoFormAnalyzer';
import { StaticFileAnalyzer } from '../analyzers/staticFileAnalyzer';
import { DjangoAdminAnalyzer } from '../analyzers/djangoAdminAnalyzer';

@injectable()
export class CompletionService {
    private disposables: vscode.Disposable[] = [];

    constructor(
        @inject(TYPES.ExtensionContext) private context: vscode.ExtensionContext,
        @inject(TYPES.DjangoProjectAnalyzer) private projectAnalyzer: DjangoProjectAnalyzer,
        @inject(TYPES.UrlPatternAnalyzer) private urlPatternAnalyzer: UrlPatternAnalyzer,
        @inject(TYPES.DjangoFormAnalyzer) private formAnalyzer: DjangoFormAnalyzer,
        @inject(TYPES.StaticFileAnalyzer) private staticFileAnalyzer: StaticFileAnalyzer,
        @inject(TYPES.DjangoAdminAnalyzer) private adminAnalyzer: DjangoAdminAnalyzer,
        @inject(TYPES.DjangoModelCompletionProvider) private modelCompletionProvider: DjangoModelCompletionProvider,
        @inject(TYPES.DjangoFieldCompletionProvider) private fieldCompletionProvider: DjangoFieldCompletionProvider,
        @inject(TYPES.EnhancedCompletionProvider) private enhancedCompletionProvider: EnhancedCompletionProvider,
        @inject(TYPES.UrlTagCompletionProvider) private urlTagCompletionProvider: UrlTagCompletionProvider,
        @inject(TYPES.DjangoFormsCompletionProvider) private formsCompletionProvider: DjangoFormsCompletionProvider,
        @inject(TYPES.DjangoModelFormCompletionProvider) private modelFormCompletionProvider: DjangoModelFormCompletionProvider,
        @inject(TYPES.TemplateContextCompletionProvider) private templateContextCompletionProvider: TemplateContextCompletionProvider,
        @inject(TYPES.StaticPathCompletionProvider) private staticPathCompletionProvider: StaticPathCompletionProvider,
        @inject(TYPES.DjangoAdminCompletionProvider) private adminCompletionProvider: DjangoAdminCompletionProvider
    ) {}

    async register(): Promise<void> {
        // First, scan for forms
        await this.formAnalyzer.scanWorkspace();
        
        // Initialize static file analyzer
        await this.staticFileAnalyzer.initialize();
        
        // Scan for admin files
        await this.adminAnalyzer.scanWorkspace();
        
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

        // Register Django Forms completion providers
        this.disposables.push(
            vscode.languages.registerCompletionItemProvider(
                { scheme: 'file', language: 'python' },
                this.formsCompletionProvider,
                '.', '(', '='  // Trigger on dot, parenthesis, and equals for forms
            )
        );

        this.disposables.push(
            vscode.languages.registerCompletionItemProvider(
                { scheme: 'file', language: 'python' },
                this.modelFormCompletionProvider,
                ' ', '='  // Trigger on space and equals for Meta options
            )
        );

        // Register template context completion provider
        this.disposables.push(
            vscode.languages.registerCompletionItemProvider(
                [
                    { scheme: 'file', language: 'html' },
                    { scheme: 'file', language: 'django-html' }
                ],
                this.templateContextCompletionProvider,
                '.', ' '  // Trigger on dot for properties and space for new variables
            )
        );

        // Register static file path completion provider
        this.disposables.push(
            vscode.languages.registerCompletionItemProvider(
                [
                    { scheme: 'file', language: 'html' },
                    { scheme: 'file', language: 'django-html' }
                ],
                this.staticPathCompletionProvider,
                "'", '"', '/'  // Trigger on quotes and slash
            )
        );

        // Register Django Admin completion provider
        this.disposables.push(
            vscode.languages.registerCompletionItemProvider(
                { scheme: 'file', language: 'python' },
                this.adminCompletionProvider,
                '.', '=', ' ', '@', '('  // Trigger on various admin-related characters
            )
        );

        // Add disposables to extension context
        this.context.subscriptions.push(...this.disposables);
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        this.staticFileAnalyzer.dispose();
    }
}