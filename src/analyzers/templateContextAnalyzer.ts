import { injectable, inject } from 'inversify';
import * as vscode from 'vscode';
import * as path from 'path';
import { TYPES } from '../container/types';
import { DjangoProjectAnalyzer } from './djangoProjectAnalyzer';

export interface TemplateContext {
    templatePath: string;
    viewFile: string;
    viewFunction: string;
    contextVariables: Map<string, ContextVariable>;
}

export interface ContextVariable {
    name: string;
    type?: string;
    value?: string;
    isQuerySet?: boolean;
    modelName?: string;
}

@injectable()
export class TemplateContextAnalyzer {
    private templateContextMap: Map<string, TemplateContext[]> = new Map();

    constructor(
        @inject(TYPES.DjangoProjectAnalyzer) private projectAnalyzer: DjangoProjectAnalyzer
    ) {
        this.initialize();
    }

    private async initialize() {
        await this.scanViewFiles();
    }

    /**
     * Scan all Python files for render() calls and extract context
     */
    private async scanViewFiles(): Promise<void> {
        const pythonFiles = await vscode.workspace.findFiles('**/*.py', '**/node_modules/**');
        
        for (const file of pythonFiles) {
            const document = await vscode.workspace.openTextDocument(file);
            this.analyzeDocument(document);
        }
    }

    /**
     * Analyze a Python document for render() calls
     */
    private analyzeDocument(document: vscode.TextDocument): void {
        const text = document.getText();
        const lines = text.split('\n');
        
        // Find all render() calls
        const renderPattern = /render\s*\(\s*(\w+)\s*,\s*["']([^"']+)["']\s*,\s*(\{[^}]*\}|\w+)/g;
        let match;
        
        while ((match = renderPattern.exec(text)) !== null) {
            const [fullMatch, request, templatePath, contextDict] = match;
            const lineNumber = text.substring(0, match.index).split('\n').length - 1;
            
            // Find the enclosing function
            const functionName = this.findEnclosingFunction(lines, lineNumber);
            if (!functionName) continue;
            
            // Parse context variables
            const contextVars = this.parseContextDict(contextDict, lines, lineNumber, document);
            
            const context: TemplateContext = {
                templatePath,
                viewFile: document.fileName,
                viewFunction: functionName,
                contextVariables: contextVars
            };
            
            // Store the context
            if (!this.templateContextMap.has(templatePath)) {
                this.templateContextMap.set(templatePath, []);
            }
            this.templateContextMap.get(templatePath)!.push(context);
        }
    }

    /**
     * Find the function name that contains the given line
     */
    private findEnclosingFunction(lines: string[], lineNumber: number): string | undefined {
        // Look backwards for function definition
        for (let i = lineNumber; i >= 0; i--) {
            const line = lines[i];
            const funcMatch = line.match(/^\s*def\s+(\w+)\s*\(/);
            if (funcMatch) {
                return funcMatch[1];
            }
            
            // If we hit a class definition or another function, stop
            if (line.match(/^\s*class\s+/) || (line.match(/^\s*def\s+/) && i < lineNumber)) {
                break;
            }
        }
        
        return undefined;
    }

    /**
     * Parse the context dictionary to extract variables
     */
    private parseContextDict(
        contextStr: string, 
        lines: string[], 
        lineNumber: number,
        document: vscode.TextDocument
    ): Map<string, ContextVariable> {
        const variables = new Map<string, ContextVariable>();
        
        // Remove outer braces if it's a dictionary literal
        if (contextStr.startsWith('{') && contextStr.endsWith('}')) {
            contextStr = contextStr.slice(1, -1);
        }
        
        // Handle dictionary literal
        if (contextStr.includes(':')) {
            // Simple regex for key-value pairs (handles basic cases)
            const pairPattern = /["'](\w+)["']\s*:\s*([^,]+)/g;
            let pairMatch;
            
            while ((pairMatch = pairPattern.exec(contextStr)) !== null) {
                const [, key, value] = pairMatch;
                const variable: ContextVariable = {
                    name: key,
                    value: value.trim()
                };
                
                // Try to infer type from value
                this.inferVariableType(variable, value.trim(), lines, lineNumber);
                
                variables.set(key, variable);
            }
        } else {
            // Handle variable reference (e.g., render(request, 'template.html', context))
            // This is more complex and would require more sophisticated analysis
            // For now, we'll just note that there's a context variable
            variables.set('_context', {
                name: '_context',
                value: contextStr
            });
        }
        
        return variables;
    }

    /**
     * Try to infer the type of a context variable
     */
    private inferVariableType(variable: ContextVariable, value: string, lines: string[], lineNumber: number): void {
        // Check if it's a QuerySet
        if (value.includes('.objects.') || value.includes('_set.') || value.includes('.filter(') || value.includes('.all()')) {
            variable.isQuerySet = true;
            
            // Try to extract model name
            const modelMatch = value.match(/(\w+)\.objects/);
            if (modelMatch) {
                variable.modelName = modelMatch[1];
                variable.type = `QuerySet[${modelMatch[1]}]`;
            }
        }
        
        // Check if it's a model instance
        else if (value.includes('.objects.get(') || value.includes('.objects.first(') || value.includes('.objects.last(')) {
            const modelMatch = value.match(/(\w+)\.objects/);
            if (modelMatch) {
                variable.modelName = modelMatch[1];
                variable.type = modelMatch[1];
            }
        }
        
        // Check if it's a simple type
        else if (value.startsWith('"') || value.startsWith("'")) {
            variable.type = 'str';
        } else if (/^\d+$/.test(value)) {
            variable.type = 'int';
        } else if (value === 'True' || value === 'False') {
            variable.type = 'bool';
        } else if (value === 'None') {
            variable.type = 'None';
        }
        
        // For other cases, try to find the variable definition
        else {
            this.findVariableDefinition(variable, value, lines, lineNumber);
        }
    }

    /**
     * Try to find where a variable is defined to infer its type
     */
    private findVariableDefinition(variable: ContextVariable, varName: string, lines: string[], lineNumber: number): void {
        // Look backwards for variable assignment
        for (let i = lineNumber - 1; i >= 0; i--) {
            const line = lines[i];
            
            // Pattern: varName = Model.objects...
            const assignPattern = new RegExp(`${varName}\\s*=\\s*(.+)`);
            const match = line.match(assignPattern);
            
            if (match) {
                const assignment = match[1];
                this.inferVariableType(variable, assignment, lines, i);
                break;
            }
            
            // Don't look too far back
            if (lineNumber - i > 50) break;
        }
    }

    /**
     * Get context variables for a specific template
     */
    public getContextForTemplate(templatePath: string): TemplateContext[] {
        // Normalize the template path
        templatePath = templatePath.replace(/\\/g, '/');
        
        // Try exact match first
        if (this.templateContextMap.has(templatePath)) {
            return this.templateContextMap.get(templatePath)!;
        }
        
        // Try to find by partial match (e.g., "blog/post_list.html" matches "templates/blog/post_list.html")
        for (const [key, contexts] of this.templateContextMap.entries()) {
            if (key.endsWith(templatePath) || templatePath.endsWith(key)) {
                return contexts;
            }
        }
        
        return [];
    }

    /**
     * Get all context variables available in a template
     */
    public getAllVariablesForTemplate(templatePath: string): Map<string, ContextVariable> {
        const contexts = this.getContextForTemplate(templatePath);
        const allVariables = new Map<string, ContextVariable>();
        
        // Merge all contexts (in case the template is used in multiple views)
        for (const context of contexts) {
            for (const [name, variable] of context.contextVariables) {
                allVariables.set(name, variable);
            }
        }
        
        return allVariables;
    }

    /**
     * Refresh the context analysis
     */
    public async refresh(): Promise<void> {
        this.templateContextMap.clear();
        await this.scanViewFiles();
    }

    /**
     * Handle document changes
     */
    public onDocumentChange(document: vscode.TextDocument): void {
        if (document.languageId === 'python') {
            // Remove old contexts from this file
            for (const [templatePath, contexts] of this.templateContextMap.entries()) {
                const filtered = contexts.filter(ctx => ctx.viewFile !== document.fileName);
                if (filtered.length === 0) {
                    this.templateContextMap.delete(templatePath);
                } else {
                    this.templateContextMap.set(templatePath, filtered);
                }
            }
            
            // Re-analyze the document
            this.analyzeDocument(document);
        }
    }
}