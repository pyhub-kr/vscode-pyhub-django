import { injectable, inject } from 'inversify';
import * as vscode from 'vscode';
import * as path from 'path';
import { TYPES } from '../container/types';
import { DjangoAdminAnalyzer } from '../analyzers/djangoAdminAnalyzer';
import { DjangoProjectAnalyzer } from '../analyzers/djangoProjectAnalyzer';
import { CacheService } from '../services/cacheService';

@injectable()
export class DjangoAdminCompletionProvider implements vscode.CompletionItemProvider {
    constructor(
        @inject(TYPES.DjangoAdminAnalyzer) private adminAnalyzer: DjangoAdminAnalyzer,
        @inject(TYPES.DjangoProjectAnalyzer) private projectAnalyzer: DjangoProjectAnalyzer,
        @inject(TYPES.CacheService) private cacheService: CacheService
    ) {}

    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[]> {
        const linePrefix = document.lineAt(position).text.substr(0, position.character);
        const fileName = path.basename(document.fileName);
        
        // Only provide completions in admin.py files
        if (!fileName.endsWith('admin.py')) {
            return [];
        }

        const cacheKey = `admin_completion_${document.fileName}_${position.line}_${position.character}`;
        const cached = this.cacheService.get<vscode.CompletionItem[]>(cacheKey);
        if (cached) {
            return cached;
        }

        const completions: vscode.CompletionItem[] = [];

        // Check if we're inside a ModelAdmin class
        const adminContext = this.getAdminContext(document, position);
        
        if (adminContext) {
            if (adminContext.type === 'ModelAdmin') {
                // Provide ModelAdmin attribute completions
                completions.push(...this.getModelAdminAttributeCompletions(linePrefix));
                
                // Provide ModelAdmin method completions
                if (linePrefix.trim().startsWith('def ')) {
                    completions.push(...this.getModelAdminMethodCompletions());
                }

                // Provide field name completions for list_display, fields, etc.
                if (this.isFieldListContext(linePrefix)) {
                    completions.push(...await this.getFieldNameCompletions(adminContext.modelName));
                }
            } else if (adminContext.type === 'Inline') {
                // Provide Inline attribute completions
                completions.push(...this.getInlineAttributeCompletions(linePrefix));
            }
        }

        // Provide admin decorators
        if (linePrefix.trim() === '@' || linePrefix.trim().startsWith('@admin')) {
            completions.push(...this.getAdminDecoratorCompletions());
        }

        // Provide model names for admin.register
        if (linePrefix.includes('@admin.register(') || linePrefix.includes('admin.site.register(')) {
            completions.push(...await this.getModelNameCompletions());
        }

        this.cacheService.set(cacheKey, completions, 5000); // Cache for 5 seconds
        return completions;
    }

    private getAdminContext(document: vscode.TextDocument, position: vscode.Position): { type: string, modelName?: string } | null {
        const text = document.getText();
        const lines = text.split('\n');
        let currentLine = position.line;
        
        // Search backwards for class definition
        while (currentLine >= 0) {
            const line = lines[currentLine];
            
            // Check for ModelAdmin class
            const adminMatch = line.match(/class\s+(\w+)\s*\(\s*(admin\.)?ModelAdmin\s*\)/);
            if (adminMatch) {
                // Try to find the model name
                let modelName: string | undefined;
                const adminClass = this.adminAnalyzer.getAdminClass(adminMatch[1]);
                if (adminClass) {
                    modelName = adminClass.modelName;
                }
                
                return { type: 'ModelAdmin', modelName };
            }
            
            // Check for Inline class
            const inlineMatch = line.match(/class\s+(\w+)\s*\(\s*(admin\.)?(TabularInline|StackedInline)\s*\)/);
            if (inlineMatch) {
                return { type: 'Inline' };
            }
            
            // Stop if we hit another class or function definition at the same indent level
            if (currentLine !== position.line && line.match(/^(class|def)\s+/)) {
                break;
            }
            
            currentLine--;
        }
        
        return null;
    }

    private getModelAdminAttributeCompletions(linePrefix: string): vscode.CompletionItem[] {
        const attributes = this.adminAnalyzer.getAdminAttributes();
        const completions: vscode.CompletionItem[] = [];
        
        for (const attr of attributes) {
            const item = new vscode.CompletionItem(attr, vscode.CompletionItemKind.Property);
            item.detail = 'ModelAdmin attribute';
            
            // Add documentation for common attributes
            switch (attr) {
                case 'list_display':
                    item.documentation = 'Controls which fields are displayed on the change list page';
                    item.insertText = new vscode.SnippetString(`${attr} = [\$1]`);
                    break;
                case 'list_filter':
                    item.documentation = 'Activates filters in the right sidebar of the change list page';
                    item.insertText = new vscode.SnippetString(`${attr} = [\$1]`);
                    break;
                case 'search_fields':
                    item.documentation = 'Enables a search box on the admin change list page';
                    item.insertText = new vscode.SnippetString(`${attr} = [\$1]`);
                    break;
                case 'ordering':
                    item.documentation = 'The default ordering for the object list';
                    item.insertText = new vscode.SnippetString(`${attr} = [\$1]`);
                    break;
                case 'fields':
                    item.documentation = 'Explicitly set the fields to display in the form';
                    item.insertText = new vscode.SnippetString(`${attr} = [\$1]`);
                    break;
                case 'fieldsets':
                    item.documentation = 'Control the layout of admin "add" and "change" pages';
                    item.insertText = new vscode.SnippetString(
                        `${attr} = [\n    (None, {\n        'fields': [\$1]\n    }),\n]`
                    );
                    break;
                case 'readonly_fields':
                    item.documentation = 'Fields that cannot be edited';
                    item.insertText = new vscode.SnippetString(`${attr} = [\$1]`);
                    break;
                case 'inlines':
                    item.documentation = 'Models to edit inline on the same page';
                    item.insertText = new vscode.SnippetString(`${attr} = [\$1]`);
                    break;
                case 'actions':
                    item.documentation = 'Functions to execute on selected items';
                    item.insertText = new vscode.SnippetString(`${attr} = [\$1]`);
                    break;
                default:
                    item.insertText = new vscode.SnippetString(`${attr} = \$1`);
            }
            
            completions.push(item);
        }
        
        return completions;
    }

    private getModelAdminMethodCompletions(): vscode.CompletionItem[] {
        const methods = this.adminAnalyzer.getAdminMethods();
        const completions: vscode.CompletionItem[] = [];
        
        for (const method of methods) {
            const item = new vscode.CompletionItem(method, vscode.CompletionItemKind.Method);
            item.detail = 'ModelAdmin method';
            
            // Add method signatures for common methods
            switch (method) {
                case 'get_queryset':
                    item.documentation = 'Returns a QuerySet of all model instances';
                    item.insertText = new vscode.SnippetString(
                        `${method}(self, request):\n    queryset = super().${method}(request)\n    \$0\n    return queryset`
                    );
                    break;
                case 'save_model':
                    item.documentation = 'Saves the model instance';
                    item.insertText = new vscode.SnippetString(
                        `${method}(self, request, obj, form, change):\n    \$0\n    super().${method}(request, obj, form, change)`
                    );
                    break;
                case 'has_add_permission':
                    item.documentation = 'Returns True if adding objects is permitted';
                    item.insertText = new vscode.SnippetString(
                        `${method}(self, request):\n    \$0\n    return super().${method}(request)`
                    );
                    break;
                case 'get_list_display':
                    item.documentation = 'Returns a sequence containing the fields to be displayed';
                    item.insertText = new vscode.SnippetString(
                        `${method}(self, request):\n    \$0\n    return self.list_display`
                    );
                    break;
                case 'formfield_for_foreignkey':
                    item.documentation = 'Returns a form Field for a ForeignKey';
                    item.insertText = new vscode.SnippetString(
                        `${method}(self, db_field, request, **kwargs):\n    \$0\n    return super().${method}(db_field, request, **kwargs)`
                    );
                    break;
                default:
                    item.insertText = new vscode.SnippetString(
                        `${method}(self\$1):\n    \$0\n    pass`
                    );
            }
            
            completions.push(item);
        }
        
        return completions;
    }

    private getInlineAttributeCompletions(linePrefix: string): vscode.CompletionItem[] {
        const attributes = this.adminAnalyzer.getInlineAttributes();
        const completions: vscode.CompletionItem[] = [];
        
        for (const attr of attributes) {
            const item = new vscode.CompletionItem(attr, vscode.CompletionItemKind.Property);
            item.detail = 'InlineModelAdmin attribute';
            
            switch (attr) {
                case 'model':
                    item.documentation = 'The model which the inline is using';
                    item.insertText = new vscode.SnippetString(`${attr} = \$1`);
                    break;
                case 'extra':
                    item.documentation = 'Number of extra forms to display';
                    item.insertText = new vscode.SnippetString(`${attr} = \$1`);
                    break;
                case 'fields':
                    item.documentation = 'Fields to display in the inline';
                    item.insertText = new vscode.SnippetString(`${attr} = [\$1]`);
                    break;
                default:
                    item.insertText = new vscode.SnippetString(`${attr} = \$1`);
            }
            
            completions.push(item);
        }
        
        return completions;
    }

    private getAdminDecoratorCompletions(): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        
        const registerItem = new vscode.CompletionItem('@admin.register', vscode.CompletionItemKind.Snippet);
        registerItem.detail = 'Register a model with the admin site';
        registerItem.documentation = 'Decorator to register ModelAdmin classes';
        registerItem.insertText = new vscode.SnippetString('@admin.register(${1:Model})');
        completions.push(registerItem);
        
        return completions;
    }

    private async getModelNameCompletions(): Promise<vscode.CompletionItem[]> {
        const advancedAnalyzer = this.projectAnalyzer.getAdvancedAnalyzer();
        if (!advancedAnalyzer) {
            return [];
        }
        
        const models = advancedAnalyzer.getModels();
        const completions: vscode.CompletionItem[] = [];
        
        for (const [modelName, model] of models) {
            const item = new vscode.CompletionItem(model.name, vscode.CompletionItemKind.Class);
            item.detail = `Django Model (${model.app})`;
            item.documentation = `Model from ${model.app} app`;
            completions.push(item);
        }
        
        return completions;
    }

    private async getFieldNameCompletions(modelName?: string): Promise<vscode.CompletionItem[]> {
        if (!modelName) {
            return [];
        }
        
        const advancedAnalyzer = this.projectAnalyzer.getAdvancedAnalyzer();
        if (!advancedAnalyzer) {
            return [];
        }
        
        const model = advancedAnalyzer.getModel(modelName);
        if (!model) {
            return [];
        }
        
        const completions: vscode.CompletionItem[] = [];
        
        // Add field completions
        for (const field of model.fields) {
            const item = new vscode.CompletionItem(`'${field.name}'`, vscode.CompletionItemKind.Field);
            item.detail = `${field.type} field`;
            item.documentation = `Field from ${model.name} model`;
            item.sortText = `0${field.name}`; // Sort fields first
            completions.push(item);
        }
        
        // Add method completions for list_display
        for (const method of model.methods) {
            const item = new vscode.CompletionItem(`'${method.name}'`, vscode.CompletionItemKind.Method);
            item.detail = 'Model method';
            item.documentation = `Method from ${model.name} model`;
            item.sortText = `1${method.name}`; // Sort methods after fields
            completions.push(item);
        }
        
        return completions;
    }

    private isFieldListContext(linePrefix: string): boolean {
        const fieldListAttributes = [
            'list_display', 'list_display_links', 'list_editable',
            'search_fields', 'ordering', 'list_select_related',
            'fields', 'exclude', 'readonly_fields', 'autocomplete_fields',
            'raw_id_fields', 'filter_horizontal', 'filter_vertical'
        ];
        
        return fieldListAttributes.some(attr => 
            linePrefix.includes(`${attr} =`) || linePrefix.includes(`${attr}=`)
        );
    }
}