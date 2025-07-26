import { PythonExecutor } from '../pythonIntegration';

export interface FieldInfo {
    name: string;
    type: string;
    required: boolean;
    helpText?: string;
    maxLength?: number;
    choices?: string[];
    default?: any;
}

export interface ManagerInfo {
    name: string;
    type: string;
    methods?: string[];
}

export interface ModelInfo {
    name: string;
    app: string;
    fields: FieldInfo[];
    managers: string[];
}

export interface ParseResult {
    models: ModelInfo[];
    imports: string[];
}

export class PythonParser {
    private pythonExecutor?: PythonExecutor;

    setPythonExecutor(executor: PythonExecutor): void {
        this.pythonExecutor = executor;
    }

    async parseModelFile(content: string, filePath: string): Promise<ParseResult> {
        // For now, use regex-based parsing. 
        // In a production version, we would use the Python AST through pythonExecutor
        
        const models: ModelInfo[] = [];
        const imports: string[] = [];
        
        // Extract imports
        const importRegex = /(?:from\s+([\w.]+)\s+)?import\s+([\w,\s]+)/g;
        let match;
        
        while ((match = importRegex.exec(content)) !== null) {
            imports.push(match[0]);
        }
        
        // Extract model classes
        const modelRegex = /class\s+(\w+)\s*\(([^)]*)\)\s*:/g;
        
        while ((match = modelRegex.exec(content)) !== null) {
            const [_, modelName, baseClasses] = match;
            
            // Check if it's a Django model
            if (baseClasses.includes('Model') || baseClasses.includes('models.Model')) {
                const model: ModelInfo = {
                    name: modelName,
                    app: this.extractAppFromPath(filePath),
                    fields: this.extractFields(content, modelName),
                    managers: this.extractManagerNames(content, modelName)
                };
                
                models.push(model);
            }
        }
        
        return { models, imports };
    }

    private extractAppFromPath(filePath: string): string {
        const parts = filePath.split(/[/\\]/);
        
        // Find the app name (usually the directory containing models.py)
        const modelsIndex = parts.findIndex(p => p === 'models.py');
        if (modelsIndex > 0) {
            return parts[modelsIndex - 1];
        }
        
        return 'unknown';
    }

    private extractFields(content: string, modelName: string): FieldInfo[] {
        const fields: FieldInfo[] = [];
        
        // Extract the model class body
        const classRegex = new RegExp(`class\\s+${modelName}\\s*\\([^)]*\\)\\s*:([\\s\\S]*?)(?=class\\s+\\w+|$)`);
        const classMatch = content.match(classRegex);
        
        if (!classMatch) {
            return fields;
        }
        
        const classBody = classMatch[1];
        
        // Match field definitions
        const fieldRegex = /(\w+)\s*=\s*models\.(\w+)\s*\(([^)]*)\)/g;
        let match;
        
        while ((match = fieldRegex.exec(classBody)) !== null) {
            const [_, fieldName, fieldType, fieldArgs] = match;
            
            // Skip if it's inside a method
            if (this.isInsideMethod(classBody, match.index)) {
                continue;
            }
            
            const field: FieldInfo = {
                name: fieldName,
                type: fieldType,
                required: this.isFieldRequired(fieldArgs),
                helpText: this.extractHelpText(fieldArgs),
                maxLength: this.extractMaxLength(fieldArgs, fieldType),
                choices: this.extractChoices(fieldArgs),
                default: this.extractDefault(fieldArgs)
            };
            
            fields.push(field);
        }
        
        return fields;
    }

    private isInsideMethod(classBody: string, position: number): boolean {
        // Simple check: count 'def' keywords before this position
        const beforePosition = classBody.substring(0, position);
        const defMatches = beforePosition.match(/\bdef\s+\w+/g) || [];
        
        // Check if we're inside a method by looking for indentation
        const lines = beforePosition.split('\n');
        const currentLine = lines[lines.length - 1];
        
        // If there's a def before us and we're indented more, we're inside a method
        return defMatches.length > 0 && /^\s{8,}/.test(currentLine);
    }

    private isFieldRequired(fieldArgs: string): boolean {
        // Field is required unless null=True or blank=True is specified
        const hasNull = /null\s*=\s*True/i.test(fieldArgs);
        const hasBlank = /blank\s*=\s*True/i.test(fieldArgs);
        
        return !hasNull && !hasBlank;
    }

    private extractHelpText(fieldArgs: string): string | undefined {
        const match = fieldArgs.match(/help_text\s*=\s*['"](.*?)['"]/);
        return match ? match[1] : undefined;
    }

    private extractMaxLength(fieldArgs: string, fieldType: string): number | undefined {
        if (fieldType === 'CharField' || fieldType === 'TextField') {
            const match = fieldArgs.match(/max_length\s*=\s*(\d+)/);
            return match ? parseInt(match[1], 10) : undefined;
        }
        return undefined;
    }

    private extractChoices(fieldArgs: string): string[] | undefined {
        // This is simplified - real implementation would parse the choices tuple/list
        const match = fieldArgs.match(/choices\s*=\s*\[([^\]]+)\]/);
        if (match) {
            // Very basic parsing of choices
            return match[1].split(',').map(c => c.trim());
        }
        return undefined;
    }

    private extractDefault(fieldArgs: string): any {
        const match = fieldArgs.match(/default\s*=\s*([^,)]+)/);
        if (match) {
            const value = match[1].trim();
            
            // Try to parse the value
            if (value === 'True' || value === 'False') {
                return value === 'True';
            } else if (/^\d+$/.test(value)) {
                return parseInt(value, 10);
            } else if (/^\d*\.\d+$/.test(value)) {
                return parseFloat(value);
            } else if (value.startsWith('"') || value.startsWith("'")) {
                return value.slice(1, -1);
            }
            
            return value;
        }
        return undefined;
    }

    private extractManagerNames(content: string, modelName: string): string[] {
        const managers = ['objects']; // Default manager
        
        const classRegex = new RegExp(`class\\s+${modelName}\\s*\\([^)]*\\)\\s*:([\\s\\S]*?)(?=class\\s+\\w+|$)`);
        const classMatch = content.match(classRegex);
        
        if (!classMatch) {
            return managers;
        }
        
        const classBody = classMatch[1];
        
        // Look for manager assignments
        const managerRegex = /(\w+)\s*=\s*(\w+Manager\(\)|\w+\.as_manager\(\))/g;
        let match;
        
        while ((match = managerRegex.exec(classBody)) !== null) {
            const managerName = match[1];
            if (managerName !== 'objects' && !managers.includes(managerName)) {
                managers.push(managerName);
            }
        }
        
        return managers;
    }

    async parseWithAst(content: string, filePath: string): Promise<ParseResult> {
        if (!this.pythonExecutor) {
            // Fallback to regex parsing
            return this.parseModelFile(content, filePath);
        }

        // Use Python AST for more accurate parsing
        const pythonScript = `
import ast
import json

def parse_django_models(content):
    tree = ast.parse(content)
    models = []
    
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            # Check if it's a Django model
            is_model = any(
                (isinstance(base, ast.Name) and base.id == 'Model') or
                (isinstance(base, ast.Attribute) and base.attr == 'Model')
                for base in node.bases
            )
            
            if is_model:
                model_info = {
                    'name': node.name,
                    'fields': [],
                    'methods': []
                }
                
                for item in node.body:
                    if isinstance(item, ast.Assign):
                        # Field definition
                        for target in item.targets:
                            if isinstance(target, ast.Name):
                                field_info = analyze_field(item.value)
                                if field_info:
                                    field_info['name'] = target.id
                                    model_info['fields'].append(field_info)
                    
                    elif isinstance(item, ast.FunctionDef):
                        # Method definition
                        model_info['methods'].append({
                            'name': item.name,
                            'args': [arg.arg for arg in item.args.args if arg.arg != 'self']
                        })
                
                models.append(model_info)
    
    return json.dumps(models)

def analyze_field(node):
    if isinstance(node, ast.Call):
        if hasattr(node.func, 'attr'):
            field_type = node.func.attr
            field_info = {'type': field_type}
            
            # Extract field arguments
            for keyword in node.keywords:
                if keyword.arg == 'max_length' and isinstance(keyword.value, ast.Constant):
                    field_info['max_length'] = keyword.value.value
                elif keyword.arg == 'null' and isinstance(keyword.value, ast.Constant):
                    field_info['null'] = keyword.value.value
                elif keyword.arg == 'blank' and isinstance(keyword.value, ast.Constant):
                    field_info['blank'] = keyword.value.value
            
            return field_info
    return None

# Execute parsing
content = '''${content.replace(/'/g, "\\'")}'''
print(parse_django_models(content))
`;

        try {
            const result = await this.pythonExecutor.execute(['-c', pythonScript]);
            const models = JSON.parse(result.stdout);
            
            // Convert to our format
            return {
                models: models.map((m: any) => ({
                    name: m.name,
                    app: this.extractAppFromPath(filePath),
                    fields: m.fields,
                    managers: ['objects']
                })),
                imports: []
            };
        } catch (error) {
            console.error('AST parsing failed, falling back to regex:', error);
            return this.parseModelFile(content, filePath);
        }
    }
}