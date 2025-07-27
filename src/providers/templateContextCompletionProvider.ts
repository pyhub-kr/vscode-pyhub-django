import * as vscode from 'vscode';
import { injectable, inject } from 'inversify';
import { TYPES } from '../container/types';
import { ViewContextAnalyzer } from '../analyzers/viewContextAnalyzer';
import { DjangoProjectAnalyzer } from '../analyzers/djangoProjectAnalyzer';
import { AdvancedModelAnalyzer } from '../analyzers/advancedModelAnalyzer';
import { DjangoFormAnalyzer } from '../analyzers/djangoFormAnalyzer';
import * as path from 'path';

@injectable()
export class TemplateContextCompletionProvider implements vscode.CompletionItemProvider {
    constructor(
        @inject(TYPES.ViewContextAnalyzer) private viewContextAnalyzer: ViewContextAnalyzer,
        @inject(TYPES.DjangoProjectAnalyzer) private projectAnalyzer: DjangoProjectAnalyzer,
        @inject(TYPES.AdvancedModelAnalyzer) private modelAnalyzer: AdvancedModelAnalyzer,
        @inject(TYPES.DjangoFormAnalyzer) private formAnalyzer: DjangoFormAnalyzer
    ) {}

    public async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        completionContext: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[] | undefined> {
        // Check if we're in a Django template
        if (!this.isDjangoTemplate(document)) {
            return undefined;
        }

        const line = document.lineAt(position).text;
        const beforeCursor = line.substring(0, position.character);
        
        // Check if we're inside a template variable {{ ... }}
        const variableMatch = beforeCursor.match(/\{\{\s*(\w+)?\.?(\w*)$/);
        if (!variableMatch) {
            return undefined;
        }

        const variableBase = variableMatch[1];
        const propertyStart = variableMatch[2];

        // Get template path relative to project
        const templatePath = this.getRelativeTemplatePath(document.uri.fsPath);
        if (!templatePath) {
            return undefined;
        }

        // Find the view context for this template
        const viewContext = await this.viewContextAnalyzer.findContextForTemplate(templatePath);
        if (!viewContext) {
            return undefined;
        }

        const completionItems: vscode.CompletionItem[] = [];

        if (!variableBase) {
            // Provide context variable names
            for (const [name, variable] of viewContext.contextVariables) {
                const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Variable);
                item.detail = variable.type || 'Context variable';
                item.documentation = variable.value ? `Value: ${variable.value}` : undefined;
                completionItems.push(item);
            }
            
            // Add common Django template variables
            this.addCommonTemplateVariables(completionItems);
        } else {
            // Provide properties/methods for the variable
            const variable = viewContext.contextVariables.get(variableBase);
            if (variable) {
                await this.addVariableCompletions(variable, completionItems, propertyStart);
            }
        }

        // Check for loop variables
        this.addLoopVariables(document, position, completionItems);

        return completionItems;
    }

    private isDjangoTemplate(document: vscode.TextDocument): boolean {
        const fileName = path.basename(document.fileName);
        return fileName.endsWith('.html') || fileName.endsWith('.jinja') || fileName.endsWith('.jinja2');
    }

    private getRelativeTemplatePath(filePath: string): string | undefined {
        // Extract template path relative to templates directory
        const templatesIndex = filePath.indexOf('templates');
        if (templatesIndex === -1) {
            return undefined;
        }
        
        // Get path after 'templates/'
        const afterTemplates = filePath.substring(templatesIndex + 'templates'.length + 1);
        return afterTemplates.replace(/\\/g, '/');
    }

    private async addVariableCompletions(
        variable: any,
        completionItems: vscode.CompletionItem[],
        propertyStart: string
    ) {
        // If it's a QuerySet, add QuerySet methods
        if (variable.type === 'QuerySet') {
            this.addQuerySetMethods(completionItems);
            
            // Try to infer model and add model fields
            if (variable.value) {
                const modelMatch = variable.value.match(/(\w+)\.objects/);
                if (modelMatch) {
                    const modelName = modelMatch[1];
                    await this.addModelFields(modelName, completionItems);
                }
            }
        }
        
        // If it's a Form, add form methods
        else if (variable.type === 'Form') {
            this.addFormMethods(completionItems);
            
            // Try to find the form class and add its fields
            if (variable.value) {
                const formMatch = variable.value.match(/(\w+Form)\(/);
                if (formMatch) {
                    const formName = formMatch[1];
                    await this.addFormFields(formName, completionItems);
                }
            }
        }
        
        // If it's a Model instance, add model fields
        else if (variable.type === 'Model' && variable.value) {
            const modelMatch = variable.value.match(/get_object_or_404\((\w+)/);
            if (modelMatch) {
                const modelName = modelMatch[1];
                await this.addModelFields(modelName, completionItems);
            }
        }
    }

    private addQuerySetMethods(completionItems: vscode.CompletionItem[]) {
        const methods = ['all', 'count', 'first', 'last', 'exists'];
        
        for (const method of methods) {
            const item = new vscode.CompletionItem(method, vscode.CompletionItemKind.Method);
            item.detail = 'QuerySet method';
            completionItems.push(item);
        }
    }

    private addFormMethods(completionItems: vscode.CompletionItem[]) {
        const methods = [
            { name: 'as_p', detail: 'Render form as paragraph tags' },
            { name: 'as_table', detail: 'Render form as table rows' },
            { name: 'as_ul', detail: 'Render form as unordered list' },
            { name: 'errors', detail: 'Form validation errors' },
            { name: 'is_valid', detail: 'Check if form is valid' },
            { name: 'cleaned_data', detail: 'Cleaned form data' }
        ];
        
        for (const method of methods) {
            const item = new vscode.CompletionItem(method.name, vscode.CompletionItemKind.Method);
            item.detail = method.detail;
            completionItems.push(item);
        }
    }

    private async addModelFields(modelName: string, completionItems: vscode.CompletionItem[]) {
        // For now, we'll add common model methods
        // TODO: Integrate with model analyzer when public API is available
        
        // Add common model methods
        const methods = ['save', 'delete', 'get_absolute_url', '__str__', 'pk', 'id'];
        for (const method of methods) {
            const item = new vscode.CompletionItem(method, vscode.CompletionItemKind.Method);
            item.detail = 'Model method/property';
            completionItems.push(item);
        }
        
        // Add common field names as a fallback
        const commonFields = ['id', 'created_at', 'updated_at', 'name', 'title', 'description'];
        for (const field of commonFields) {
            const item = new vscode.CompletionItem(field, vscode.CompletionItemKind.Field);
            item.detail = 'Model field';
            completionItems.push(item);
        }
    }

    private async addFormFields(formName: string, completionItems: vscode.CompletionItem[]) {
        // For now, we'll add common form methods and fields
        // TODO: Integrate with form analyzer when public API is available
        
        // Add common form methods
        const methods = [
            { name: 'is_valid', detail: 'Check if form is valid' },
            { name: 'save', detail: 'Save the form (ModelForm)' },
            { name: 'clean', detail: 'Form validation method' }
        ];
        
        for (const method of methods) {
            const item = new vscode.CompletionItem(method.name, vscode.CompletionItemKind.Method);
            item.detail = method.detail;
            completionItems.push(item);
        }
        
        // Add common form field properties
        const fieldProps = ['errors', 'value', 'label', 'help_text'];
        for (const prop of fieldProps) {
            const item = new vscode.CompletionItem(prop, vscode.CompletionItemKind.Property);
            item.detail = 'Form field property';
            completionItems.push(item);
        }
    }

    private addCommonTemplateVariables(completionItems: vscode.CompletionItem[]) {
        const commonVars = [
            { name: 'request', detail: 'HTTP request object' },
            { name: 'user', detail: 'Current user' },
            { name: 'perms', detail: 'User permissions' },
            { name: 'messages', detail: 'Django messages' },
            { name: 'csrf_token', detail: 'CSRF token' }
        ];
        
        for (const variable of commonVars) {
            const item = new vscode.CompletionItem(variable.name, vscode.CompletionItemKind.Variable);
            item.detail = variable.detail;
            completionItems.push(item);
        }
    }

    private addLoopVariables(
        document: vscode.TextDocument,
        position: vscode.Position,
        completionItems: vscode.CompletionItem[]
    ) {
        // Look for {% for %} loops above current position
        const textUntilPosition = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
        
        // Find the nearest unclosed for loop
        const forLoopPattern = /\{%\s*for\s+(\w+)\s+in\s+(\w+).*?%\}/g;
        const endforPattern = /\{%\s*endfor\s*%\}/g;
        
        const forMatches = Array.from(textUntilPosition.matchAll(forLoopPattern));
        const endforMatches = Array.from(textUntilPosition.matchAll(endforPattern));
        
        // If there are more for loops than endfor tags, we're inside a loop
        if (forMatches.length > endforMatches.length && forMatches.length > 0) {
            const lastForMatch = forMatches[forMatches.length - 1];
            const loopVar = lastForMatch[1];
            const loopTarget = lastForMatch[2];
            
            // Add the loop variable
            const item = new vscode.CompletionItem(loopVar, vscode.CompletionItemKind.Variable);
            item.detail = `Loop variable from 'for ${loopVar} in ${loopTarget}'`;
            completionItems.push(item);
            
            // Add forloop special variable
            const forloopItem = new vscode.CompletionItem('forloop', vscode.CompletionItemKind.Variable);
            forloopItem.detail = 'Django forloop object';
            completionItems.push(forloopItem);
        }
    }
}