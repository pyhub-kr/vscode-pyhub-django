import { injectable } from 'inversify';
import * as vscode from 'vscode';
import * as path from 'path';
import { PythonParser, ModelInfo, FieldInfo, ManagerInfo } from '../parsers/pythonParser';
import { getFieldLookups } from '../data/djangoFieldTypes';
import { DJANGO_MODEL_METHODS, DJANGO_MODEL_PROPERTIES } from '../data/djangoMethods';

interface ModelRelation {
    fromModel: string;
    toModel: string;
    fieldName: string;
    relationType: 'ForeignKey' | 'OneToOneField' | 'ManyToManyField';
    relatedName?: string;
}

interface ModelMethod {
    name: string;
    isProperty: boolean;
    isClassMethod: boolean;
    isStaticMethod: boolean;
    parameters: string[];
    returnType?: string;
}

interface EnhancedModelInfo {
    name: string;
    app: string;
    fields: FieldInfo[];
    methods: ModelMethod[];
    properties: string[];
    managers: ManagerInfo[];
    baseClasses: string[];
    isAbstract: boolean;
    relations: ModelRelation[];
}

@injectable()
export class AdvancedModelAnalyzer {
    private models: Map<string, EnhancedModelInfo> = new Map();
    private relations: ModelRelation[] = [];
    private fileCache: Map<string, { content: string; timestamp: number }> = new Map();
    private parser: PythonParser;
    private readonly cacheDuration = 5000; // 5 seconds

    constructor() {
        this.parser = new PythonParser();
    }

    async analyzeModelCode(code: string, filePath: string): Promise<void> {
        // Check cache
        const cached = this.fileCache.get(filePath);
        if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
            if (cached.content === code) {
                return; // Already analyzed
            }
        }

        // Update cache
        this.fileCache.set(filePath, { content: code, timestamp: Date.now() });

        try {
            const parseResult = await this.parser.parseModelFile(code, filePath);
            
            for (const model of parseResult.models) {
                const enhancedModel = await this.enhanceModelInfo(model, code);
                this.models.set(model.name, enhancedModel);
                
                // Extract relations with source code for related_name extraction
                this.extractRelations(enhancedModel, code);
            }
            
            // After all models are analyzed, add reverse relations
            this.addReverseRelations();
        } catch (error) {
            console.error(`Error analyzing model file ${filePath}:`, error);
        }
    }

    private async enhanceModelInfo(model: ModelInfo, code: string): Promise<EnhancedModelInfo> {
        const enhanced: EnhancedModelInfo = {
            name: model.name,
            app: model.app,
            fields: model.fields,
            methods: [],
            properties: [],
            managers: model.managers.map(m => ({ name: m, type: 'Manager' })),
            baseClasses: [],
            isAbstract: false,
            relations: []
        };

        // Parse additional details using AST or regex
        // This is a simplified implementation
        enhanced.methods = this.extractMethods(code, model.name);
        enhanced.properties = this.extractProperties(code, model.name);
        enhanced.managers = this.extractManagers(code, model.name);
        enhanced.baseClasses = this.extractBaseClasses(code, model.name);
        enhanced.isAbstract = this.checkIfAbstract(code, model.name);

        // Add default Django model methods
        this.addDefaultDjangoMethods(enhanced);
        
        // Add inherited members from base classes
        await this.addInheritedMembers(enhanced, code);

        return enhanced;
    }

    private extractMethods(code: string, modelName: string): ModelMethod[] {
        const methods: ModelMethod[] = [];
        
        // Regex to find methods in the model class
        const classRegex = new RegExp(`class\\s+${modelName}\\s*\\([^)]*\\)\\s*:([\\s\\S]*?)(?=\\nclass\\s+\\w+|\\n\\n|$)`, 's');
        const classMatch = code.match(classRegex);
        
        if (!classMatch) {
            return methods;
        }
        
        const classBody = classMatch[1];
        
        // Find methods - need to handle indented methods in Python
        const methodRegex = /\s*(?:@(\w+)\s+)?def\s+(\w+)\s*\(([^)]*)\)/g;
        let match;
        
        while ((match = methodRegex.exec(classBody)) !== null) {
            const [_, decorator, methodName, params] = match;
            
            if (methodName === '__init__' || methodName === '__str__') {
                continue;
            }
            
            const parameters = params
                .split(',')
                .map(p => p.trim())
                .filter(p => p && p !== 'self' && p !== 'cls');
            
            methods.push({
                name: methodName,
                isProperty: decorator === 'property',
                isClassMethod: decorator === 'classmethod',
                isStaticMethod: decorator === 'staticmethod',
                parameters
            });
        }
        
        return methods;
    }

    private extractProperties(code: string, modelName: string): string[] {
        const properties: string[] = [];
        
        const classRegex = new RegExp(`class\\s+${modelName}\\s*\\([^)]*\\)\\s*:([\\s\\S]*?)(?=\\nclass\\s+\\w+|\\n\\n|$)`, 's');
        const classMatch = code.match(classRegex);
        
        if (!classMatch) {
            return properties;
        }
        
        const classBody = classMatch[1];
        
        // Find @property decorated methods - handle indentation
        const propertyRegex = /^\s*@property\s+def\s+(\w+)\s*\(/gm;
        let match;
        
        while ((match = propertyRegex.exec(classBody)) !== null) {
            properties.push(match[1]);
        }
        
        return properties;
    }

    private extractManagers(code: string, modelName: string): ManagerInfo[] {
        const managers: ManagerInfo[] = [
            { name: 'objects', type: 'Manager', methods: [] } // Default manager
        ];
        
        const classRegex = new RegExp(`class\\s+${modelName}\\s*\\([^)]*\\)\\s*:([\\s\\S]*?)(?=\\nclass\\s+\\w+|\\n\\n|$)`, 's');
        const classMatch = code.match(classRegex);
        
        if (!classMatch) {
            return managers;
        }
        
        const classBody = classMatch[1];
        
        // Find manager assignments
        const managerRegex = /(\w+)\s*=\s*(\w+)\s*\(\)/g;
        let match;
        
        while ((match = managerRegex.exec(classBody)) !== null) {
            const [_, managerName, managerType] = match;
            if (managerType.includes('Manager') && managerName !== 'objects') {
                // Extract methods from the manager class
                const managerMethods = this.extractManagerMethods(code, managerType);
                managers.push({ name: managerName, type: managerType, methods: managerMethods });
            }
        }
        
        return managers;
    }
    
    private extractManagerMethods(code: string, managerClassName: string): string[] {
        const methods: string[] = [];
        
        // Find the manager class definition
        const classRegex = new RegExp(`class\\s+${managerClassName}\\s*\\([^)]*\\)\\s*:([\\s\\S]*?)(?=class\\s+\\w+|$)`);
        const classMatch = code.match(classRegex);
        
        if (!classMatch) {
            return methods;
        }
        
        const classBody = classMatch[1];
        
        // Find method definitions
        const methodRegex = /def\s+(\w+)\s*\([^)]*\)/g;
        let match;
        
        while ((match = methodRegex.exec(classBody)) !== null) {
            const methodName = match[1];
            // Skip special methods and get_queryset
            if (!methodName.startsWith('__') && methodName !== 'get_queryset') {
                methods.push(methodName);
            }
        }
        
        return methods;
    }

    private extractBaseClasses(code: string, modelName: string): string[] {
        const classRegex = new RegExp(`class\\s+${modelName}\\s*\\(([^)]*)\\)`);
        const match = code.match(classRegex);
        
        if (!match) {
            return [];
        }
        
        return match[1]
            .split(',')
            .map(base => base.trim())
            .filter(base => base && base !== 'models.Model');
    }

    private checkIfAbstract(code: string, modelName: string): boolean {
        const classRegex = new RegExp(`class\\s+${modelName}\\s*\\([^)]*\\)\\s*:([\\s\\S]*?)(?=\\nclass\\s+\\w+|\\n\\n|$)`, 's');
        const classMatch = code.match(classRegex);
        
        if (!classMatch) {
            return false;
        }
        
        const classBody = classMatch[1];
        return /class\s+Meta\s*:[\s\S]*?abstract\s*=\s*True/.test(classBody);
    }

    private extractRelations(model: EnhancedModelInfo, code: string): void {
        for (const field of model.fields) {
            if (['ForeignKey', 'OneToOneField', 'ManyToManyField'].includes(field.type)) {
                // If the field already has relatedModel from parsing, use it
                if (!field.relatedModel) {
                    const relatedModel = this.extractRelatedModel(field);
                    field.relatedModel = relatedModel;
                }
                
                const relation: ModelRelation = {
                    fromModel: model.name,
                    toModel: field.relatedModel || 'UnknownModel',
                    fieldName: field.name,
                    relationType: field.type as any,
                    relatedName: this.extractRelatedNameFromCode(code, model.name, field.name)
                };
                
                this.relations.push(relation);
                model.relations.push(relation);
            }
        }
    }

    private extractRelatedModel(field: FieldInfo): string {
        // Extract model name from field definition
        // Common patterns:
        // ForeignKey('User', ...)
        // ForeignKey(User, ...)
        // ForeignKey('auth.User', ...)
        
        if (!field.helpText) {
            return 'UnknownModel';
        }
        
        // Try to extract from field definition in helpText
        const patterns = [
            /ForeignKey\s*\(\s*['"]([^'"]+)['"]/,  // ForeignKey('ModelName')
            /ForeignKey\s*\(\s*([A-Z]\w+)/,        // ForeignKey(ModelName)
            /OneToOneField\s*\(\s*['"]([^'"]+)['"]/,
            /OneToOneField\s*\(\s*([A-Z]\w+)/,
            /ManyToManyField\s*\(\s*['"]([^'"]+)['"]/,
            /ManyToManyField\s*\(\s*([A-Z]\w+)/,
        ];
        
        for (const pattern of patterns) {
            const match = field.helpText.match(pattern);
            if (match) {
                // Handle app.Model format
                const modelName = match[1];
                return modelName.includes('.') ? modelName.split('.').pop()! : modelName;
            }
        }
        
        return 'RelatedModel';
    }

    private extractRelatedNameFromCode(code: string, modelName: string, fieldName: string): string | undefined {
        // Extract the model class body
        const classRegex = new RegExp(`class\\s+${modelName}\\s*\\([^)]*\\)\\s*:([\\s\\S]*?)(?=\\nclass\\s+\\w+|\\n\\n|$)`, 's');
        const classMatch = code.match(classRegex);
        
        if (!classMatch) {
            return undefined;
        }
        
        const classBody = classMatch[1];
        
        // Find the field definition line
        const fieldRegex = new RegExp(`${fieldName}\\s*=\\s*models\\.\\w+\\s*\\([^)]*\\)`, 'g');
        const fieldMatch = fieldRegex.exec(classBody);
        
        if (!fieldMatch) {
            return undefined;
        }
        
        const fieldDef = fieldMatch[0];
        
        // Look for related_name parameter
        const relatedNameMatch = fieldDef.match(/related_name\s*=\s*['"]([^'"]+)['"]/);
        if (relatedNameMatch) {
            return relatedNameMatch[1];
        }
        
        return undefined;
    }

    private addDefaultDjangoMethods(model: EnhancedModelInfo): void {
        const defaultMethods: ModelMethod[] = DJANGO_MODEL_METHODS.map(method => ({
            name: method.name,
            isProperty: false,
            isClassMethod: false,
            isStaticMethod: false,
            parameters: this.parseMethodParameters(method.signature),
            returnType: undefined
        }));
        
        model.methods.push(...defaultMethods);
        
        // Add default properties
        model.properties.push(...DJANGO_MODEL_PROPERTIES);
    }

    private parseMethodParameters(signature: string): string[] {
        const paramsMatch = signature.match(/\((.*?)\)/);
        if (!paramsMatch || !paramsMatch[1]) {
            return [];
        }
        return paramsMatch[1].split(',').map(p => p.trim()).filter(p => p);
    }

    private async addInheritedMembers(model: EnhancedModelInfo, code: string): Promise<void> {
        // Look for base classes in the same file
        for (const baseClass of model.baseClasses) {
            // Skip Django's built-in model classes
            if (baseClass === 'models.Model' || baseClass === 'Model') {
                continue;
            }
            
            // Try to find the base class in the same file
            const baseClassRegex = new RegExp(`class\\s+${baseClass}\\s*\\([^)]*\\)\\s*:([\\s\\S]*?)(?=\\nclass\\s+\\w+|\\n\\n|$)`, 's');
            const baseClassMatch = code.match(baseClassRegex);
            
            if (baseClassMatch) {
                // Parse fields from base class
                const parseResult = await this.parser.parseModelFile(code, 'temp.py');
                const baseModel = parseResult.models.find((m: ModelInfo) => m.name === baseClass);
                
                if (baseModel) {
                    // Add fields from base class if not already present
                    for (const baseField of baseModel.fields) {
                        if (!model.fields.some(f => f.name === baseField.name)) {
                            model.fields.push(baseField);
                        }
                    }
                }
                
                // Extract and add methods from base class
                const baseMethods = this.extractMethods(code, baseClass);
                for (const baseMethod of baseMethods) {
                    if (!model.methods.some(m => m.name === baseMethod.name)) {
                        model.methods.push(baseMethod);
                    }
                }
                
                // Extract and add properties from base class
                const baseProperties = this.extractProperties(code, baseClass);
                for (const baseProp of baseProperties) {
                    if (!model.properties.includes(baseProp)) {
                        model.properties.push(baseProp);
                    }
                }
            }
        }
    }

    getAllModels(): { [key: string]: EnhancedModelInfo } {
        const result: { [key: string]: EnhancedModelInfo } = {};
        for (const [name, info] of this.models) {
            result[name] = info;
        }
        return result;
    }

    getModels(): Map<string, EnhancedModelInfo> {
        return this.models;
    }

    getModel(name: string): EnhancedModelInfo | undefined {
        return this.models.get(name);
    }

    getRelationsForModel(modelName: string): ModelRelation[] {
        return this.relations.filter(
            rel => rel.fromModel === modelName || rel.toModel === modelName
        );
    }

    clearCache(): void {
        this.fileCache.clear();
    }

    getFieldLookups(fieldType: string): string[] {
        return getFieldLookups(fieldType);
    }
    
    private addReverseRelations(): void {
        // For each relation, add a reverse relation field to the target model
        for (const relation of this.relations) {
            const targetModel = this.models.get(relation.toModel);
            if (!targetModel) {
                continue;
            }
            
            // Determine the field name for the reverse relation
            let reverseFieldName: string;
            if (relation.relatedName) {
                reverseFieldName = relation.relatedName;
            } else {
                // Django default: lowercase model name + '_set'
                reverseFieldName = relation.fromModel.toLowerCase() + '_set';
            }
            
            // Check if the reverse field already exists (to avoid duplicates)
            if (targetModel.fields.some(f => f.name === reverseFieldName)) {
                continue;
            }
            
            // Add a virtual field representing the reverse relation
            const reverseField: FieldInfo = {
                name: reverseFieldName,
                type: 'RelatedManager',
                required: false,
                helpText: `Reverse relation from ${relation.fromModel}.${relation.fieldName}`,
                relatedModel: relation.fromModel
            };
            
            targetModel.fields.push(reverseField);
            
            // Also add it as a manager so it gets manager methods
            const reverseManager: ManagerInfo = {
                name: reverseFieldName,
                type: 'RelatedManager',
                methods: [] // Will use default QuerySet methods
            };
            
            targetModel.managers.push(reverseManager);
        }
    }
}