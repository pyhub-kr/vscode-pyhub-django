import { injectable, inject } from 'inversify';
import * as vscode from 'vscode';
import * as path from 'path';
import { TYPES } from '../container/types';
import { TemplateContextAnalyzer, ContextVariable } from '../analyzers/templateContextAnalyzer';
import { DjangoProjectAnalyzer } from '../analyzers/djangoProjectAnalyzer';

@injectable()
export class TemplateVariableCompletionProvider implements vscode.CompletionItemProvider {
    constructor(
        @inject(TYPES.TemplateContextAnalyzer) private contextAnalyzer: TemplateContextAnalyzer,
        @inject(TYPES.DjangoProjectAnalyzer) private projectAnalyzer: DjangoProjectAnalyzer
    ) {}

    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[]> {
        const line = document.lineAt(position).text;
        const linePrefix = line.substring(0, position.character);
        
        // Check if we're inside a Django template variable or tag
        if (!this.isInTemplateContext(linePrefix)) {
            return [];
        }
        
        const completions: vscode.CompletionItem[] = [];
        
        // Get the relative template path
        const templatePath = this.getRelativeTemplatePath(document.fileName);
        if (!templatePath) {
            return completions;
        }
        
        // Get context variables for this template
        const contextVars = this.contextAnalyzer.getAllVariablesForTemplate(templatePath);
        
        // Check if we're accessing a property (e.g., "post.")
        const propertyAccess = this.getPropertyAccess(linePrefix);
        
        if (propertyAccess) {
            // Provide completions for object properties
            return await this.getPropertyCompletions(propertyAccess, contextVars);
        } else {
            // Provide completions for context variables
            return this.getVariableCompletions(contextVars);
        }
    }

    /**
     * Check if the cursor is inside a Django template variable or tag
     */
    private isInTemplateContext(linePrefix: string): boolean {
        // Count opening and closing braces to determine context
        const openVariable = (linePrefix.match(/\{\{/g) || []).length;
        const closeVariable = (linePrefix.match(/\}\}/g) || []).length;
        const openTag = (linePrefix.match(/\{%/g) || []).length;
        const closeTag = (linePrefix.match(/%\}/g) || []).length;
        
        // We're inside a variable if there are more opening than closing braces
        return (openVariable > closeVariable) || (openTag > closeTag);
    }

    /**
     * Get the relative template path from the absolute file path
     */
    private getRelativeTemplatePath(filePath: string): string | undefined {
        // Find 'templates' in the path and get everything after it
        const parts = filePath.split(path.sep);
        const templatesIndex = parts.lastIndexOf('templates');
        
        if (templatesIndex !== -1 && templatesIndex < parts.length - 1) {
            return parts.slice(templatesIndex + 1).join('/');
        }
        
        // Fallback: just use the filename
        return path.basename(filePath);
    }

    /**
     * Check if we're accessing a property and return the object name
     */
    private getPropertyAccess(linePrefix: string): string | undefined {
        // Match patterns like "{{ post." or "{% if user."
        const match = linePrefix.match(/(?:\{\{|\{%.*?)\s*(\w+)\.$/);
        return match ? match[1] : undefined;
    }

    /**
     * Get completions for context variables
     */
    private getVariableCompletions(contextVars: Map<string, ContextVariable>): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        
        for (const [name, variable] of contextVars) {
            const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Variable);
            
            if (variable.type) {
                item.detail = variable.type;
            }
            
            if (variable.isQuerySet) {
                item.documentation = new vscode.MarkdownString(`QuerySet of ${variable.modelName || 'objects'}`);
                item.kind = vscode.CompletionItemKind.Class;
            } else if (variable.modelName) {
                item.documentation = new vscode.MarkdownString(`Instance of ${variable.modelName}`);
            }
            
            completions.push(item);
        }
        
        // Add common Django template variables
        this.addBuiltinVariables(completions);
        
        return completions;
    }

    /**
     * Get completions for object properties
     */
    private async getPropertyCompletions(objectName: string, contextVars: Map<string, ContextVariable>): Promise<vscode.CompletionItem[]> {
        const completions: vscode.CompletionItem[] = [];
        const variable = contextVars.get(objectName);
        
        if (!variable) {
            return completions;
        }
        
        // If it's a model instance or QuerySet, get model fields
        if (variable.modelName) {
            const allModels = await this.projectAnalyzer.getModelInfo();
            const model = Object.values(allModels).find(m => m.name === variable.modelName);
            
            if (model) {
                // Add fields
                for (const field of model.fields) {
                    const item = new vscode.CompletionItem(field.name, vscode.CompletionItemKind.Field);
                    item.detail = field.type;
                    if (field.helpText) {
                        item.documentation = new vscode.MarkdownString(field.helpText);
                    }
                    completions.push(item);
                }
                
                // Add methods if available
                if (model.methods) {
                    for (const method of model.methods) {
                        const item = new vscode.CompletionItem(
                            method,
                            vscode.CompletionItemKind.Method
                        );
                        // Don't add parentheses in templates
                        item.insertText = method;
                        completions.push(item);
                    }
                }
            }
        }
        
        // If it's a QuerySet, add QuerySet methods that are useful in templates
        if (variable.isQuerySet) {
            const querySetMethods = [
                { name: 'all', detail: 'Return all objects' },
                { name: 'count', detail: 'Return the number of objects' },
                { name: 'first', detail: 'Return the first object' },
                { name: 'last', detail: 'Return the last object' },
                { name: 'exists', detail: 'Check if any objects exist' }
            ];
            
            for (const method of querySetMethods) {
                const item = new vscode.CompletionItem(method.name, vscode.CompletionItemKind.Method);
                item.detail = method.detail;
                completions.push(item);
            }
        }
        
        return completions;
    }

    /**
     * Add common Django template variables
     */
    private addBuiltinVariables(completions: vscode.CompletionItem[]): void {
        const builtins = [
            { name: 'request', detail: 'The current request object', kind: vscode.CompletionItemKind.Variable },
            { name: 'user', detail: 'The current user', kind: vscode.CompletionItemKind.Variable },
            { name: 'perms', detail: 'User permissions', kind: vscode.CompletionItemKind.Variable },
            { name: 'messages', detail: 'Framework messages', kind: vscode.CompletionItemKind.Variable },
            { name: 'csrf_token', detail: 'CSRF token', kind: vscode.CompletionItemKind.Variable },
            { name: 'STATIC_URL', detail: 'Static files URL', kind: vscode.CompletionItemKind.Constant },
            { name: 'MEDIA_URL', detail: 'Media files URL', kind: vscode.CompletionItemKind.Constant },
            { name: 'LANGUAGE_CODE', detail: 'Current language code', kind: vscode.CompletionItemKind.Constant },
            { name: 'forloop', detail: 'Loop counter (inside {% for %} tags)', kind: vscode.CompletionItemKind.Variable },
            { name: 'block', detail: 'Current block object', kind: vscode.CompletionItemKind.Variable }
        ];
        
        for (const builtin of builtins) {
            const item = new vscode.CompletionItem(builtin.name, builtin.kind);
            item.detail = builtin.detail;
            completions.push(item);
        }
    }
}