import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { injectable } from 'inversify';

export interface ViewContext {
    templatePath: string;
    contextVariables: Map<string, ContextVariable>;
    viewFile: string;
    viewFunction?: string;
    viewClass?: string;
}

export interface ContextVariable {
    name: string;
    type?: string;
    value?: string;
    isLoop?: boolean;
    loopTarget?: string;
}

@injectable()
export class ViewContextAnalyzer {
    private contextCache = new Map<string, ViewContext[]>();

    public async analyzeViewFile(viewFilePath: string): Promise<ViewContext[]> {
        // Check cache first
        if (this.contextCache.has(viewFilePath)) {
            return this.contextCache.get(viewFilePath)!;
        }

        try {
            const content = await fs.readFile(viewFilePath, 'utf-8');
            const contexts = this.extractContexts(content, viewFilePath);
            
            // Cache the results
            this.contextCache.set(viewFilePath, contexts);
            
            return contexts;
        } catch (error) {
            console.error(`Error analyzing view file ${viewFilePath}:`, error);
            return [];
        }
    }

    private extractContexts(content: string, viewFilePath: string): ViewContext[] {
        const contexts: ViewContext[] = [];
        
        // Extract render() calls from function-based views
        const renderPattern = /render\s*\(\s*request\s*,\s*['"]([\w/\-\.]+)['"]\s*(?:,\s*({[^}]+}|context|\w+))?\s*\)/g;
        let match;
        
        while ((match = renderPattern.exec(content)) !== null) {
            const templatePath = match[1];
            const contextArg = match[2];
            
            const context: ViewContext = {
                templatePath,
                contextVariables: new Map(),
                viewFile: viewFilePath,
                viewFunction: this.findEnclosingFunction(content, match.index)
            };
            
            if (contextArg) {
                if (contextArg.startsWith('{')) {
                    // Inline context dictionary
                    this.parseInlineContext(contextArg, context.contextVariables);
                } else {
                    // Variable reference - try to find its definition
                    this.findContextVariable(content, contextArg, context.contextVariables);
                }
            }
            
            contexts.push(context);
        }
        
        // Extract context from class-based views
        const classContexts = this.extractClassBasedViewContexts(content, viewFilePath);
        contexts.push(...classContexts);
        
        return contexts;
    }

    private parseInlineContext(contextStr: string, variables: Map<string, ContextVariable>) {
        // Parse inline context like {'posts': posts, 'form': form}
        const keyValuePattern = /['"](\w+)['"]\s*:\s*(\w+)/g;
        let match;
        
        while ((match = keyValuePattern.exec(contextStr)) !== null) {
            const name = match[1];
            const value = match[2];
            
            variables.set(name, {
                name,
                value,
                type: this.inferTypeFromValue(value)
            });
        }
    }

    private findContextVariable(content: string, varName: string, variables: Map<string, ContextVariable>) {
        // Look for context variable definition like: context = {'key': value}
        const contextDefPattern = new RegExp(`${varName}\\s*=\\s*({[^}]+})`, 'g');
        const match = contextDefPattern.exec(content);
        
        if (match) {
            this.parseInlineContext(match[1], variables);
        }
    }

    private extractClassBasedViewContexts(content: string, viewFilePath: string): ViewContext[] {
        const contexts: ViewContext[] = [];
        
        // Find get_context_data methods in class-based views
        const getContextPattern = /class\s+(\w+)[\s\S]*?def\s+get_context_data\s*\([^)]*\)[\s\S]*?context\s*=\s*super\(\)\.get_context_data\([^)]*\)([\s\S]*?)(?=\n\s{0,4}\S|\n\s*def|\Z)/g;
        let match;
        
        while ((match = getContextPattern.exec(content)) !== null) {
            const className = match[1];
            const contextBody = match[2];
            
            // Extract template_name from class
            const templateMatch = content.match(new RegExp(`class\\s+${className}[\\s\\S]*?template_name\\s*=\\s*['"]([\\w/\\-\\.]+)['"]`));
            
            if (templateMatch) {
                const context: ViewContext = {
                    templatePath: templateMatch[1],
                    contextVariables: new Map(),
                    viewFile: viewFilePath,
                    viewClass: className
                };
                
                // Extract context['key'] = value patterns
                const contextUpdatePattern = /context\[['"](\w+)['"]\]\s*=\s*([^\n]+)/g;
                let updateMatch;
                
                while ((updateMatch = contextUpdatePattern.exec(contextBody)) !== null) {
                    const name = updateMatch[1];
                    const value = updateMatch[2].trim();
                    
                    context.contextVariables.set(name, {
                        name,
                        value,
                        type: this.inferTypeFromValue(value)
                    });
                }
                
                contexts.push(context);
            }
        }
        
        return contexts;
    }

    private findEnclosingFunction(content: string, position: number): string | undefined {
        // Find the function that contains this render call
        const beforePosition = content.substring(0, position);
        const functionMatch = beforePosition.match(/def\s+(\w+)\s*\([^)]*\):\s*$/m);
        
        return functionMatch ? functionMatch[1] : undefined;
    }

    private inferTypeFromValue(value: string): string | undefined {
        // Simple type inference based on common patterns
        if (value.includes('.objects.') || value.includes('.all()') || value.includes('.filter(')) {
            return 'QuerySet';
        }
        if (value.includes('Form(') || value.endsWith('Form')) {
            return 'Form';
        }
        if (value.includes('get_object_or_404')) {
            return 'Model';
        }
        
        return undefined;
    }

    public async findContextForTemplate(templatePath: string): Promise<ViewContext | undefined> {
        // Search all view files to find which one renders this template
        const viewFiles = await vscode.workspace.findFiles('**/views.py', '**/node_modules/**');
        
        for (const viewFile of viewFiles) {
            const contexts = await this.analyzeViewFile(viewFile.fsPath);
            
            for (const context of contexts) {
                // Normalize paths for comparison
                const normalizedTemplatePath = templatePath.replace(/\\/g, '/');
                const normalizedContextPath = context.templatePath.replace(/\\/g, '/');
                
                if (normalizedContextPath === normalizedTemplatePath ||
                    normalizedContextPath.endsWith(normalizedTemplatePath) ||
                    normalizedTemplatePath.endsWith(normalizedContextPath)) {
                    return context;
                }
            }
        }
        
        return undefined;
    }

    public clearCache() {
        this.contextCache.clear();
    }
}