import { injectable, inject } from 'inversify';
import * as vscode from 'vscode';
import { AdvancedModelAnalyzer } from '../analyzers/advancedModelAnalyzer';
import { DJANGO_QUERYSET_METHODS, DJANGO_MODEL_METHODS, DJANGO_MODEL_PROPERTIES } from '../data/djangoMethods';
import { TYPES } from '../container/types';

@injectable()
export class EnhancedCompletionProvider implements vscode.CompletionItemProvider {
    constructor(
        @inject(TYPES.AdvancedModelAnalyzer) private analyzer: AdvancedModelAnalyzer
    ) {}

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
        
        // Check different contexts - order matters!
        if (this.isFilterContext(linePrefix)) {
            const filterCompletions = await this.getFilterFieldCompletions(linePrefix);
            completions.push(...filterCompletions);
        } else if (this.isRelatedFieldContext(linePrefix)) {
            const relatedCompletions = await this.getRelatedFieldCompletions(linePrefix);
            completions.push(...relatedCompletions);
        } else if (this.isManagerContext(linePrefix)) {
            const managerCompletions = await this.getManagerCompletions(linePrefix);
            completions.push(...managerCompletions);
        } else if (this.isModelInstanceContext(linePrefix)) {
            const instanceCompletions = await this.getModelInstanceCompletions(linePrefix, document, position);
            completions.push(...instanceCompletions);
        }
        
        return completions;
    }

    private isManagerContext(linePrefix: string): boolean {
        // Patterns that indicate we're working with a manager or QuerySet
        const patterns = [
            /\w+\.objects\.$/,
            /\w+\.objects\.all\(\)\.$/,
            /\w+\.objects\.filter\([^)]*\)\.$/,
            /\w+\.objects\.exclude\([^)]*\)\.$/,
            /\w+\.objects\.get\([^)]*\)\.$/,
            /\w+\.(objects|published|active|archived)\.$/, // Common manager names
            /\w+\.\w+_set\.$/, // Default reverse relation pattern
            /\w+\.\w+s\.$/, // Common reverse relation names (plurals like 'books', 'reviews')
        ];
        
        // Also check if this might be a reverse relation from the analyzer
        const match = linePrefix.match(/(\w+)\.(\w+)\.$/);
        if (match) {
            const [_, variableName, attributeName] = match;
            const models = this.analyzer.getAllModels();
            
            // Check all models to see if any have this as a manager/reverse relation
            for (const model of Object.values(models)) {
                if (model.managers.some(m => m.name === attributeName)) {
                    return true;
                }
            }
        }
        
        // Also check if this might be a QuerySet variable
        const variableName = linePrefix.match(/^(\w+)\.$/)?.[1];
        if (variableName) {
            // Common QuerySet variable patterns
            const querySetPatterns = [
                /_list$/,
                /_set$/,
                /_qs$/,
                /^qs/,
                /^queryset/,
                /_tasks$/,
                /_items$/,
                /_objects$/
            ];
            
            if (querySetPatterns.some(pattern => pattern.test(variableName))) {
                return true;
            }
        }
        
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
        // Check if we're accessing a related field (not a manager)
        const match = linePrefix.match(/(\w+)\.(\w+)\.$/);
        
        if (!match) {
            return false;
        }
        
        const [_, variable, field] = match;
        
        // Check if this field is a manager/reverse relation
        const models = this.analyzer.getAllModels();
        for (const model of Object.values(models)) {
            if (model.managers.some(m => m.name === field)) {
                // This is a manager, not a related field
                return false;
            }
        }
        
        // Check if it's a common manager pattern
        const managerNames = ['objects', 'published', 'active', 'archived', 'all_objects'];
        if (managerNames.includes(field) || field.endsWith('_set') || field.endsWith('s')) {
            return false;
        }
        
        // If the line contains an assignment with the variable name before the current position,
        // it's likely accessing a model instance field
        const beforeCursor = linePrefix.substring(0, linePrefix.lastIndexOf(`${variable}.${field}.`));
        return beforeCursor.includes(`${variable} =`) || beforeCursor.includes(`${variable}=`);
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
        
        // Try to extract custom manager methods or reverse relations
        const managerMatch = linePrefix.match(/(\w+)\.(\w+)\.$/);
        if (managerMatch) {
            const variableName = managerMatch[1];
            const managerName = managerMatch[2];
            
            const models = this.analyzer.getAllModels();
            
            // First try exact match with variable name as model name
            let model = models[variableName];
            
            // If not found, try to find by variable pattern (e.g., 'author' -> 'Author')
            if (!model) {
                const capitalizedName = variableName.charAt(0).toUpperCase() + variableName.slice(1);
                model = models[capitalizedName];
            }
            
            if (model && model.managers) {
                const manager = model.managers.find(m => m.name === managerName);
                if (manager) {
                    // For RelatedManager, use standard QuerySet methods
                    if (manager.type === 'RelatedManager') {
                        // RelatedManager has all QuerySet methods plus create()
                        const createMethod = new vscode.CompletionItem('create', vscode.CompletionItemKind.Method);
                        createMethod.detail = 'create(**kwargs)';
                        createMethod.documentation = new vscode.MarkdownString('Create and save a new related object');
                        createMethod.insertText = new vscode.SnippetString('create($0)');
                        completions.push(createMethod);
                        // Don't forget to return standard methods too - they're already added above
                    } else if (manager.methods) {
                        // Custom manager methods
                        for (const methodName of manager.methods) {
                            const item = new vscode.CompletionItem(methodName, vscode.CompletionItemKind.Method);
                            item.detail = `Custom manager method`;
                            item.insertText = new vscode.SnippetString(`${methodName}($0)`);
                            completions.push(item);
                        }
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
                // Try to find the related model
                let relatedModel = null;
                
                // First, try using the relatedModel property if available
                if (field.relatedModel) {
                    relatedModel = models[field.relatedModel];
                    // If not found directly, try to find by name ignoring case
                    if (!relatedModel) {
                        relatedModel = Object.values(models).find(m => 
                            m.name.toLowerCase() === field.relatedModel!.toLowerCase()
                        );
                    }
                }
                
                // If still not found, try to infer from field name
                if (!relatedModel) {
                    // Try exact match with capitalized field name
                    const capitalizedFieldName = field.name.charAt(0).toUpperCase() + field.name.slice(1);
                    relatedModel = models[capitalizedFieldName];
                    
                    // Try to find by partial match (e.g., 'author' -> 'Author')
                    if (!relatedModel) {
                        relatedModel = Object.values(models).find(m => 
                            m.name.toLowerCase() === field.name.toLowerCase()
                        );
                    }
                    
                    // For common Django patterns (e.g., 'user' -> 'User', 'author' -> 'User')
                    if (!relatedModel && (field.name === 'author' || field.name === 'user' || field.name === 'owner')) {
                        relatedModel = models['User'] || Object.values(models).find(m => m.name === 'User');
                    }
                }
                
                if (relatedModel) {
                    // Add related model fields
                    for (const relatedField of relatedModel.fields) {
                        const relatedItem = new vscode.CompletionItem(
                            `${field.name}__${relatedField.name}`,
                            vscode.CompletionItemKind.Field
                        );
                        relatedItem.detail = `Related ${relatedModel.name}.${relatedField.name}`;
                        relatedItem.documentation = new vscode.MarkdownString(`Filter by ${field.name}.${relatedField.name}`);
                        relatedItem.insertText = new vscode.SnippetString(`${field.name}__${relatedField.name}=$0`);
                        completions.push(relatedItem);
                        
                        // Add lookups for the related field
                        const relatedLookups = this.analyzer.getFieldLookups(relatedField.type);
                        for (const lookup of relatedLookups) {
                            const relatedLookupItem = new vscode.CompletionItem(
                                `${field.name}__${relatedField.name}__${lookup}`,
                                vscode.CompletionItemKind.Field
                            );
                            relatedLookupItem.detail = `Related ${relatedModel.name}.${relatedField.name} ${lookup}`;
                            relatedLookupItem.insertText = new vscode.SnippetString(`${field.name}__${relatedField.name}__${lookup}=$0`);
                            completions.push(relatedLookupItem);
                        }
                    }
                } else {
                    // Fallback: just add the __ completion
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
        // e.g., "book.author." -> ["book", "author"]
        const propertyChain = linePrefix.match(/(\w+\.)+$/);
        if (!propertyChain) {
            return completions;
        }
        
        const parts = propertyChain[0].split('.').filter(p => p);
        if (parts.length < 2) {
            return completions;
        }
        
        // For the test case "book.author.", we need to:
        // 1. Infer that 'book' is a Book instance
        // 2. Find that 'author' is a ForeignKey to Author
        // 3. Return Author fields
        
        const models = this.analyzer.getAllModels();
        
        // Try to find model by variable name pattern (e.g., 'book' -> 'Book')
        const variableName = parts[0];
        const modelName = variableName.charAt(0).toUpperCase() + variableName.slice(1);
        let currentModel: any = models[modelName] || null;
        
        if (!currentModel) {
            // Try other patterns
            currentModel = Object.values(models).find(m => {
                return m.name.toLowerCase() === variableName.toLowerCase();
            }) || null;
        }
        
        if (!currentModel) {
            return completions;
        }
        
        // Find the field that was accessed
        const fieldName = parts[1];
        const field = currentModel.fields.find((f: any) => f.name === fieldName);
        
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
        // - variable = Model.method() where method returns objects
        
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
            const instancePattern = new RegExp(`${variableName}\\s*=\\s*(\\w+)\\s*\\(`);
            const instanceMatch = line.match(instancePattern);
            if (instanceMatch) {
                const modelName = instanceMatch[1];
                // Check if this is actually a model class (capitalized)
                if (modelName[0] === modelName[0].toUpperCase()) {
                    return modelName;
                }
            }
            
            // Pattern 3: for variable in Model.objects.all()
            const forPattern = new RegExp(`for\\s+${variableName}\\s+in\\s+(\\w+)\\.objects`);
            const forMatch = line.match(forPattern);
            if (forMatch) {
                return forMatch[1];
            }
            
            // Pattern 4: variable = Model.method() - check if method returns QuerySet
            const methodPattern = new RegExp(`${variableName}\\s*=\\s*(\\w+)\\.(\\w+)\\s*\\(`);
            const methodMatch = line.match(methodPattern);
            if (methodMatch) {
                const modelName = methodMatch[1];
                const methodName = methodMatch[2];
                
                // Common methods that return QuerySet
                const querySetMethods = ['get_pending', 'get_active', 'get_published', 'filter_by', 'active', 'published'];
                if (querySetMethods.some(m => methodName.includes(m))) {
                    // This is likely a QuerySet, not a model instance
                    return undefined;
                }
                
                // Check if this is a classmethod that might return instances
                if (modelName[0] === modelName[0].toUpperCase()) {
                    return modelName;
                }
            }
        }
        
        return undefined;
    }
}