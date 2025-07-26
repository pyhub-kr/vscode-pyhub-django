import * as vscode from 'vscode';
import { AdvancedModelAnalyzer } from '../analyzers/advancedModelAnalyzer';
import { DJANGO_QUERYSET_METHODS, DJANGO_MODEL_METHODS, DJANGO_MODEL_PROPERTIES } from '../data/djangoMethods';

export class EnhancedCompletionProvider implements vscode.CompletionItemProvider {
    constructor(private analyzer: AdvancedModelAnalyzer) {}

    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[]> {
        const linePrefix = document.lineAt(position).text.substring(0, position.character);
        const fullLine = document.lineAt(position).text;
        
        // Analyze context to provide appropriate completions
        const completions: vscode.CompletionItem[] = [];
        
        // Check different contexts
        if (this.isManagerContext(linePrefix)) {
            const managerCompletions = await this.getManagerCompletions(linePrefix);
            completions.push(...managerCompletions);
        } else if (this.isFilterContext(linePrefix)) {
            const filterCompletions = await this.getFilterFieldCompletions(linePrefix);
            completions.push(...filterCompletions);
        } else if (this.isModelInstanceContext(linePrefix)) {
            const instanceCompletions = await this.getModelInstanceCompletions(linePrefix, document, position);
            completions.push(...instanceCompletions);
        } else if (this.isRelatedFieldContext(linePrefix)) {
            const relatedCompletions = await this.getRelatedFieldCompletions(linePrefix);
            completions.push(...relatedCompletions);
        }
        
        return completions;
    }

    private isManagerContext(linePrefix: string): boolean {
        // Patterns that indicate we're working with a manager
        const patterns = [
            /\w+\.objects\.$/,
            /\w+\.objects\.all\(\)\.$/,
            /\w+\.objects\.filter\([^)]*\)\.$/,
            /\w+\.objects\.exclude\([^)]*\)\.$/,
            /\w+\.objects\.get\([^)]*\)\.$/,
            /\w+\.\w+\.$/, // Custom manager
        ];
        
        return patterns.some(pattern => pattern.test(linePrefix));
    }

    private isFilterContext(linePrefix: string): boolean {
        // Check if we're inside filter(), exclude(), get(), etc.
        return /\.(filter|exclude|get|annotate|aggregate)\s*\(\s*$/.test(linePrefix);
    }

    private isModelInstanceContext(linePrefix: string): boolean {
        // Simple heuristic: variable followed by dot
        return /\w+\.$/.test(linePrefix) && !this.isManagerContext(linePrefix);
    }

    private isRelatedFieldContext(linePrefix: string): boolean {
        // Check if we're accessing a related field
        return /\w+\.\w+\.$/.test(linePrefix);
    }

    private async getManagerCompletions(linePrefix: string): Promise<vscode.CompletionItem[]> {
        const completions: vscode.CompletionItem[] = [];
        
        // Add standard QuerySet methods
        const standardMethods = DJANGO_QUERYSET_METHODS.map(method => {
            const item = new vscode.CompletionItem(method.name, vscode.CompletionItemKind.Method);
            item.detail = method.signature;
            item.documentation = new vscode.MarkdownString(method.doc);
            
            // Add appropriate snippet
            if (method.name === 'filter' || method.name === 'exclude' || method.name === 'get') {
                item.insertText = new vscode.SnippetString(`${method.name}($0)`);
            } else if (method.name === 'order_by' || method.name === 'values' || method.name === 'values_list') {
                item.insertText = new vscode.SnippetString(`${method.name}('$0')`);
            } else if (method.name === 'annotate' || method.name === 'aggregate') {
                item.insertText = new vscode.SnippetString(`${method.name}($0)`);
            } else {
                item.insertText = new vscode.SnippetString(`${method.name}()`);
            }
            
            return item;
        });
        completions.push(...standardMethods);
        
        // Try to extract custom manager methods
        const managerMatch = linePrefix.match(/(\w+)\.(\w+)\.$/);
        if (managerMatch) {
            const modelName = managerMatch[1];
            const managerName = managerMatch[2];
            
            const models = this.analyzer.getAllModels();
            const model = models[modelName];
            
            if (model && model.managers) {
                const manager = model.managers.find(m => m.name === managerName);
                if (manager && manager.methods) {
                    for (const methodName of manager.methods) {
                        const item = new vscode.CompletionItem(methodName, vscode.CompletionItemKind.Method);
                        item.detail = `Custom manager method`;
                        item.insertText = new vscode.SnippetString(`${methodName}($0)`);
                        completions.push(item);
                    }
                }
            }
        }
        
        return completions;
    }

    private async getFilterFieldCompletions(linePrefix: string): Promise<vscode.CompletionItem[]> {
        const completions: vscode.CompletionItem[] = [];
        
        // Extract model name from the line
        const modelMatch = linePrefix.match(/(\w+)\.objects\./);
        if (!modelMatch) {
            return completions;
        }
        
        const modelName = modelMatch[1];
        const models = this.analyzer.getAllModels();
        
        // Find the model
        let model = models[modelName];
        if (!model) {
            // Try to find by matching the end of the model name (e.g., 'Post' matches 'BlogPost')
            const modelEntry = Object.entries(models).find(([name, _]) => name.endsWith(modelName));
            if (modelEntry) {
                model = modelEntry[1];
            }
        }
        
        if (!model) {
            return completions;
        }
        
        // Add field lookups
        for (const field of model.fields) {
            // Basic field
            const fieldItem = new vscode.CompletionItem(field.name, vscode.CompletionItemKind.Field);
            fieldItem.detail = `${field.type} field`;
            fieldItem.insertText = new vscode.SnippetString(`${field.name}=$0`);
            completions.push(fieldItem);
            
            // Field lookups
            const lookups = this.analyzer.getFieldLookups(field.type);
            for (const lookup of lookups) {
                const lookupItem = new vscode.CompletionItem(
                    `${field.name}__${lookup}`,
                    vscode.CompletionItemKind.Field
                );
                lookupItem.detail = `${field.type} lookup`;
                lookupItem.documentation = new vscode.MarkdownString(`Filter by ${field.name} using ${lookup} lookup`);
                lookupItem.insertText = new vscode.SnippetString(`${field.name}__${lookup}=$0`);
                completions.push(lookupItem);
            }
            
            // Related field lookups
            if (['ForeignKey', 'OneToOneField', 'ManyToManyField'].includes(field.type)) {
                const relatedItem = new vscode.CompletionItem(
                    `${field.name}__`,
                    vscode.CompletionItemKind.Field
                );
                relatedItem.detail = 'Related field lookup';
                relatedItem.documentation = new vscode.MarkdownString(`Access fields on the related ${field.name} model`);
                relatedItem.insertText = new vscode.SnippetString(`${field.name}__$0`);
                relatedItem.command = {
                    command: 'editor.action.triggerSuggest',
                    title: 'Trigger Suggest'
                };
                completions.push(relatedItem);
            }
        }
        
        return completions;
    }

    private async getModelInstanceCompletions(
        linePrefix: string,
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<vscode.CompletionItem[]> {
        const completions: vscode.CompletionItem[] = [];
        
        // Try to infer the model type from the variable
        const variableName = linePrefix.match(/(\w+)\.$/)?.[1];
        if (!variableName) {
            return completions;
        }
        
        // Look backwards to find where this variable was defined
        const modelType = await this.inferModelType(document, position, variableName);
        if (!modelType) {
            return completions;
        }
        
        const model = this.analyzer.getModel(modelType);
        if (!model) {
            return completions;
        }
        
        // Add fields
        for (const field of model.fields) {
            const item = new vscode.CompletionItem(field.name, vscode.CompletionItemKind.Field);
            item.detail = `${field.type} field`;
            if (field.helpText) {
                item.documentation = new vscode.MarkdownString(field.helpText);
            }
            completions.push(item);
        }
        
        // Add methods
        for (const method of model.methods) {
            const item = new vscode.CompletionItem(method.name, vscode.CompletionItemKind.Method);
            
            if (method.isProperty) {
                item.kind = vscode.CompletionItemKind.Property;
                item.detail = 'property';
            } else {
                item.detail = `(${method.parameters.join(', ')})`;
                if (method.parameters.length > 0) {
                    item.insertText = new vscode.SnippetString(`${method.name}($0)`);
                } else {
                    item.insertText = new vscode.SnippetString(`${method.name}()`);
                }
            }
            
            completions.push(item);
        }
        
        // Add properties
        for (const prop of model.properties) {
            const item = new vscode.CompletionItem(prop, vscode.CompletionItemKind.Property);
            item.detail = 'property';
            completions.push(item);
        }
        
        return completions;
    }

    private async getRelatedFieldCompletions(linePrefix: string): Promise<vscode.CompletionItem[]> {
        const completions: vscode.CompletionItem[] = [];
        
        // Extract the chain of properties
        // e.g., "user.profile." -> ["user", "profile"]
        const propertyChain = linePrefix.match(/(\w+\.)+$/);
        if (!propertyChain) {
            return completions;
        }
        
        const parts = propertyChain[0].split('.').filter(p => p);
        if (parts.length < 2) {
            return completions;
        }
        
        // Get the base model from the first part
        const models = this.analyzer.getAllModels();
        
        // Try to follow the chain to find the related model
        let currentModelName: string | undefined;
        let currentModel = Object.values(models).find(m => {
            // Simple heuristic: check if any part matches a model name
            return parts.some(part => m.name.toLowerCase() === part.toLowerCase());
        });
        
        if (!currentModel) {
            return completions;
        }
        
        // Find the field that was accessed
        const fieldName = parts[parts.length - 1];
        const field = currentModel.fields.find(f => f.name === fieldName);
        
        if (field && ['ForeignKey', 'OneToOneField', 'ManyToManyField'].includes(field.type)) {
            // Try to find the related model
            const relations = this.analyzer.getRelationsForModel(currentModel.name);
            const relation = relations.find(r => r.fieldName === fieldName);
            
            if (relation) {
                const relatedModel = models[relation.toModel];
                if (relatedModel) {
                    // Add fields from the related model
                    for (const relatedField of relatedModel.fields) {
                        const item = new vscode.CompletionItem(
                            relatedField.name,
                            vscode.CompletionItemKind.Field
                        );
                        item.detail = `${relatedField.type} field on ${relatedModel.name}`;
                        completions.push(item);
                    }
                    
                    // Add methods from the related model
                    for (const method of relatedModel.methods) {
                        const item = new vscode.CompletionItem(
                            method.name,
                            method.isProperty ? vscode.CompletionItemKind.Property : vscode.CompletionItemKind.Method
                        );
                        if (!method.isProperty) {
                            item.insertText = new vscode.SnippetString(`${method.name}($0)`);
                        }
                        completions.push(item);
                    }
                }
            }
        }
        
        return completions;
    }

    private async inferModelType(
        document: vscode.TextDocument,
        position: vscode.Position,
        variableName: string
    ): Promise<string | undefined> {
        // Simple inference - look for patterns like:
        // - variable = Model.objects.get(...)
        // - variable = Model.objects.first()
        // - variable = Model()
        
        const text = document.getText();
        const lines = text.split('\n');
        
        // Look backwards from current position
        for (let i = position.line; i >= 0; i--) {
            const line = lines[i];
            
            // Pattern 1: variable = Model.objects.method()
            const objectsPattern = new RegExp(`${variableName}\\s*=\\s*(\\w+)\\.objects\\.(get|first|last|create)`);
            const objectsMatch = line.match(objectsPattern);
            if (objectsMatch) {
                return objectsMatch[1];
            }
            
            // Pattern 2: variable = Model()
            const instancePattern = new RegExp(`${variableName}\\s*=\\s*(\\w+)\\(`);
            const instanceMatch = line.match(instancePattern);
            if (instanceMatch) {
                return instanceMatch[1];
            }
            
            // Pattern 3: for variable in Model.objects.all()
            const forPattern = new RegExp(`for\\s+${variableName}\\s+in\\s+(\\w+)\\.objects`);
            const forMatch = line.match(forPattern);
            if (forMatch) {
                return forMatch[1];
            }
        }
        
        return undefined;
    }
}