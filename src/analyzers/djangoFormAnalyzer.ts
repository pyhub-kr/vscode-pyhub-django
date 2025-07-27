import { injectable, inject } from 'inversify';
import * as vscode from 'vscode';
import * as path from 'path';
import { TYPES } from '../container/types';
import { DjangoProjectAnalyzer } from './djangoProjectAnalyzer';

export interface FormInfo {
    name: string;
    type: 'Form' | 'ModelForm';
    fields: FormFieldInfo[];
    modelName?: string; // For ModelForm
    filePath: string;
}

export interface FormFieldInfo {
    name: string;
    fieldType: string;
    required: boolean;
    widget?: string;
    helpText?: string;
}

/**
 * Analyzer for Django forms
 */
@injectable()
export class DjangoFormAnalyzer {
    private formCache: Map<string, FormInfo> = new Map();
    private fileWatcher: vscode.FileSystemWatcher | undefined;

    constructor(
        @inject(TYPES.DjangoProjectAnalyzer) private projectAnalyzer: DjangoProjectAnalyzer
    ) {
        this.initializeWatcher();
    }

    /**
     * Initialize file watcher for forms.py files
     */
    private initializeWatcher(): void {
        this.fileWatcher = vscode.workspace.createFileSystemWatcher('**/forms.py');
        
        this.fileWatcher.onDidChange(uri => {
            this.analyzeFormFile(uri.fsPath);
        });
        
        this.fileWatcher.onDidCreate(uri => {
            this.analyzeFormFile(uri.fsPath);
        });
        
        this.fileWatcher.onDidDelete(uri => {
            this.removeFormsFromFile(uri.fsPath);
        });
    }

    /**
     * Scan workspace for all forms
     */
    async scanWorkspace(): Promise<void> {
        const formFiles = await vscode.workspace.findFiles('**/forms.py', '**/node_modules/**');
        
        for (const file of formFiles) {
            await this.analyzeFormFile(file.fsPath);
        }
        
        console.log(`Found ${this.formCache.size} Django forms`);
    }

    /**
     * Analyze a forms.py file
     */
    async analyzeFormFile(filePath: string): Promise<void> {
        try {
            const document = await vscode.workspace.openTextDocument(filePath);
            const text = document.getText();
            
            // Remove existing forms from this file
            this.removeFormsFromFile(filePath);
            
            // Extract form classes
            const forms = this.extractForms(text, filePath);
            
            // Add to cache
            forms.forEach(form => {
                this.formCache.set(form.name, form);
            });
            
            // Log the analysis result
            const fileName = path.basename(filePath);
            if (forms.length > 0) {
                console.log(`✅ Successfully analyzed ${forms.length} forms in ${fileName}`);
                forms.forEach(form => {
                    console.log(`  - ${form.name} (${form.type}) with ${form.fields.length} fields`);
                });
            } else {
                // Check if the file contains form-like patterns but parsing failed
                if (this.containsFormPatterns(text)) {
                    console.warn(`⚠️ Found form patterns in ${fileName} but couldn't parse them. The forms might use unsupported syntax.`);
                    vscode.window.showWarningMessage(
                        `Django Power Tools: Found form patterns in ${fileName} but couldn't parse them. Please check if the forms use supported Django syntax.`
                    );
                }
            }
        } catch (error) {
            console.error(`❌ Error analyzing form file ${filePath}:`, error);
            vscode.window.showErrorMessage(
                `Django Power Tools: Failed to analyze ${path.basename(filePath)}. Error: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * Extract form information from file content
     */
    private extractForms(content: string, filePath: string): FormInfo[] {
        const forms: FormInfo[] = [];
        
        // Extract all possible form base classes from imports
        const formBaseClasses = this.extractFormBaseClasses(content);
        
        // Build regex pattern for form class definitions with various inheritance patterns
        const baseClassPattern = formBaseClasses.length > 0 ? formBaseClasses.map(cls => cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') : '';
        
        // Create a comprehensive regex pattern that handles various inheritance patterns
        const patterns = [
            `forms\\.(?:Model)?Form`,              // forms.Form or forms.ModelForm
            `(?:Model)?Form`,                      // Form or ModelForm (direct import)
            `\\w+\\.(?:Model)?Form`,               // alias.Form or alias.ModelForm
            `\\w+Form`,                            // Any class ending with Form
        ];
        
        if (baseClassPattern) {
            patterns.push(baseClassPattern);      // Custom imported forms
        }
        
        const formClassRegex = new RegExp(
            `class\\s+(\\w+)\\s*\\(\\s*(?:` +
            patterns.join('|') +
            `)(?:\\s*,\\s*[\\w\\.]+)*\\s*\\)\\s*:`,  // Support multiple inheritance
            'g'
        );
        let match;
        
        while ((match = formClassRegex.exec(content)) !== null) {
            const formName = match[1];
            const fullMatch = match[0];
            
            // Determine form type from the full match
            const formType = this.determineFormType(fullMatch, content);
            
            // Extract form body with improved regex that handles indentation
            const formBodyMatch = this.extractFormBody(content, formName, match.index!);
            
            if (formBodyMatch) {
                const fields = this.extractFormFields(formBodyMatch);
                const modelName = formType === 'ModelForm' ? this.extractModelName(formBodyMatch) : undefined;
                
                forms.push({
                    name: formName,
                    type: formType,
                    fields: fields,
                    modelName: modelName,
                    filePath: filePath
                });
            }
        }
        
        return forms;
    }

    /**
     * Extract form base classes from imports
     */
    private extractFormBaseClasses(content: string): string[] {
        const baseClasses: string[] = [];
        const importAliases: Map<string, string> = new Map();
        
        // Match various import patterns
        const importPatterns = [
            // from django.forms import Form, ModelForm
            /from\s+django\.forms\s+import\s+([^;\n]+)/g,
            // from django import forms
            /from\s+django\s+import\s+forms/g,
            // from myapp.forms import CustomForm
            /from\s+[\w\.]+\s+import\s+(\w*Form\w*)/g,
            // import django.forms as forms
            /import\s+django\.forms\s+as\s+(\w+)/g,
            // from django.forms import Form as BaseForm
            /from\s+django\.forms\s+import\s+(\w+)\s+as\s+(\w+)/g,
            // import django.forms
            /import\s+django\.forms/g
        ];
        
        // First pass: collect imports and aliases
        importPatterns.forEach((pattern, index) => {
            let match;
            const patternCopy = new RegExp(pattern.source, pattern.flags);
            
            while ((match = patternCopy.exec(content)) !== null) {
                if (index === 0 && match[1]) {
                    // from django.forms import X, Y, Z
                    const imports = match[1].split(',').map(s => s.trim());
                    imports.forEach(imp => {
                        // Handle 'as' aliases within the import
                        const asMatch = imp.match(/(\w+)\s+as\s+(\w+)/);
                        if (asMatch) {
                            if (asMatch[1].includes('Form')) {
                                baseClasses.push(asMatch[2]);
                                importAliases.set(asMatch[2], asMatch[1]);
                            }
                        } else if (imp.includes('Form')) {
                            baseClasses.push(imp);
                        }
                    });
                } else if (index === 2 && match[1]) {
                    // from custom.module import CustomForm
                    baseClasses.push(match[1]);
                } else if (index === 3 && match[1]) {
                    // import django.forms as X
                    importAliases.set(match[1], 'forms');
                } else if (index === 4 && match[1] && match[2]) {
                    // from django.forms import X as Y
                    if (match[1].includes('Form')) {
                        baseClasses.push(match[2]);
                        importAliases.set(match[2], match[1]);
                    }
                }
            }
        });
        
        // Second pass: look for aliased form usage
        importAliases.forEach((value, alias) => {
            if (value === 'forms') {
                // Look for alias.Form or alias.ModelForm usage
                const aliasPattern = new RegExp(`${alias}\\.(\\w*Form)`, 'g');
                let match;
                while ((match = aliasPattern.exec(content)) !== null) {
                    baseClasses.push(`${alias}.${match[1]}`);
                }
            }
        });
        
        return [...new Set(baseClasses)]; // Remove duplicates
    }

    /**
     * Determine form type based on class definition and imports
     */
    private determineFormType(classDefinition: string, content: string): 'Form' | 'ModelForm' {
        // Check if ModelForm is explicitly mentioned
        if (classDefinition.includes('ModelForm')) {
            return 'ModelForm';
        }
        
        // Check if the class has a Meta class with a model attribute
        const className = classDefinition.match(/class\s+(\w+)/)?.[1];
        if (className) {
            const metaRegex = new RegExp(
                `class\\s+${className}[^:]*:[\\s\\S]*?class\\s+Meta\\s*:[\\s\\S]*?model\\s*=`,
                'm'
            );
            if (metaRegex.test(content)) {
                return 'ModelForm';
            }
        }
        
        return 'Form';
    }

    /**
     * Extract form body with better handling of indentation
     */
    private extractFormBody(content: string, className: string, startIndex: number): string | null {
        const lines = content.split('\n');
        let currentIndex = 0;
        let lineIndex = 0;
        
        // Find the line containing the class definition
        for (let i = 0; i < lines.length; i++) {
            if (currentIndex + lines[i].length >= startIndex) {
                lineIndex = i;
                break;
            }
            currentIndex += lines[i].length + 1; // +1 for newline
        }
        
        // Get the indentation level of the class definition
        const classLine = lines[lineIndex];
        const classIndent = classLine.match(/^(\s*)/)?.[1]?.length || 0;
        
        // Collect lines that belong to the class body
        const bodyLines: string[] = [classLine];
        for (let i = lineIndex + 1; i < lines.length; i++) {
            const line = lines[i];
            const lineIndent = line.match(/^(\s*)/)?.[1]?.length || 0;
            
            // Skip empty lines
            if (line.trim() === '') {
                bodyLines.push(line);
                continue;
            }
            
            // If we find a line with same or less indentation (and it's not empty), we're done
            if (lineIndent <= classIndent) {
                break;
            }
            
            bodyLines.push(line);
        }
        
        return bodyLines.join('\n');
    }

    /**
     * Extract form fields from form body
     */
    private extractFormFields(formBody: string): FormFieldInfo[] {
        const fields: FormFieldInfo[] = [];
        
        // Split the form body into lines for better processing
        const lines = formBody.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check if this line starts a field definition
            // Support both 'forms.CharField' and aliased patterns like 'f.CharField'
            const fieldStartMatch = line.match(/^\s*(\w+)\s*=\s*(\w+)\.(\w+)\s*\(/);
            
            if (fieldStartMatch) {
                const fieldName = fieldStartMatch[1];
                const moduleOrAlias = fieldStartMatch[2];
                const fieldType = fieldStartMatch[3];
                
                // Check if this is actually a forms field
                if (!this.isFormsField(moduleOrAlias, fieldType, formBody)) {
                    continue;
                }
                
                // Skip if it's a method (starts with underscore or is 'Meta')
                if (fieldName.startsWith('_') || fieldName === 'Meta') {
                    continue;
                }
                
                // Extract the full field definition (might span multiple lines)
                const fieldDefinition = this.extractMultilineFieldDefinition(lines, i);
                
                // Extract parameters from the full definition
                const paramsMatch = fieldDefinition.match(/\w+\.\w+\s*\(([\s\S]*?)\)$/);
                const fieldParams = paramsMatch ? paramsMatch[1] : '';
                
                const fieldInfo: FormFieldInfo = {
                    name: fieldName,
                    fieldType: fieldType,
                    required: !fieldParams.includes('required=False'),
                    widget: this.extractWidget(fieldParams),
                    helpText: this.extractHelpText(fieldParams)
                };
                
                fields.push(fieldInfo);
                
                // Skip lines that were part of this field definition
                const definitionLines = fieldDefinition.split('\n').length - 1;
                i += definitionLines;
            }
        }
        
        return fields;
    }

    /**
     * Extract multi-line field definition starting from the given line
     */
    private extractMultilineFieldDefinition(lines: string[], startIndex: number): string {
        let definition = lines[startIndex];
        let openParens = (definition.match(/\(/g) || []).length;
        let closeParens = (definition.match(/\)/g) || []).length;
        let i = startIndex;
        
        // Continue reading lines until parentheses are balanced
        while (openParens > closeParens && i < lines.length - 1) {
            i++;
            const nextLine = lines[i];
            definition += '\n' + nextLine;
            openParens += (nextLine.match(/\(/g) || []).length;
            closeParens += (nextLine.match(/\)/g) || []).length;
        }
        
        return definition;
    }

    /**
     * Check if the given module/alias and field type represent a Django forms field
     */
    private isFormsField(moduleOrAlias: string, fieldType: string, content: string): boolean {
        // Common Django form field types
        const formFieldTypes = [
            'CharField', 'EmailField', 'IntegerField', 'DecimalField', 'FloatField',
            'BooleanField', 'DateField', 'DateTimeField', 'TimeField', 'URLField',
            'SlugField', 'ChoiceField', 'MultipleChoiceField', 'FileField', 'ImageField',
            'JSONField', 'GenericIPAddressField', 'RegexField', 'TypedChoiceField',
            'TypedMultipleChoiceField', 'ModelChoiceField', 'ModelMultipleChoiceField',
            'DurationField', 'SplitDateTimeField', 'FilePathField', 'UUIDField'
        ];
        
        // Check if it's a known form field type
        if (!formFieldTypes.includes(fieldType)) {
            return false;
        }
        
        // Check common patterns
        if (moduleOrAlias === 'forms') {
            return true;
        }
        
        // Check if there's an import alias for forms
        const aliasPatterns = [
            new RegExp(`import\\s+django\\.forms\\s+as\\s+${moduleOrAlias}\\b`),
            new RegExp(`from\\s+django\\s+import\\s+forms\\s+as\\s+${moduleOrAlias}\\b`),
            new RegExp(`import\\s+forms\\s+as\\s+${moduleOrAlias}\\b`)
        ];
        
        return aliasPatterns.some(pattern => pattern.test(content));
    }

    /**
     * Extract model name from ModelForm
     */
    private extractModelName(formBody: string): string | undefined {
        const metaMatch = formBody.match(/class\s+Meta\s*:[\s\S]*?model\s*=\s*(\w+)/);
        return metaMatch ? metaMatch[1] : undefined;
    }

    /**
     * Extract widget from field parameters
     */
    private extractWidget(params: string): string | undefined {
        // Match various widget patterns
        const widgetPatterns = [
            /widget\s*=\s*forms\.(\w+)/,          // widget=forms.TextInput
            /widget\s*=\s*widgets\.(\w+)/,        // widget=widgets.TextInput
            /widget\s*=\s*(\w+)\.(\w+)/,          // widget=f.TextInput (aliased)
            /widget\s*=\s*(\w+)\(/                // widget=TextInput( (direct import)
        ];
        
        for (const pattern of widgetPatterns) {
            const match = params.match(pattern);
            if (match) {
                if (match.length === 3) {
                    // For patterns with module.Widget format
                    return match[2];
                } else {
                    // For other patterns
                    return match[1];
                }
            }
        }
        
        return undefined;
    }

    /**
     * Extract help text from field parameters
     */
    private extractHelpText(params: string): string | undefined {
        const helpTextMatch = params.match(/help_text\s*=\s*['"](.*?)['"]/);
        return helpTextMatch ? helpTextMatch[1] : undefined;
    }

    /**
     * Remove forms from a specific file
     */
    private removeFormsFromFile(filePath: string): void {
        const formsToRemove: string[] = [];
        
        this.formCache.forEach((form, name) => {
            if (form.filePath === filePath) {
                formsToRemove.push(name);
            }
        });
        
        formsToRemove.forEach(name => this.formCache.delete(name));
    }

    /**
     * Get all forms
     */
    getAllForms(): FormInfo[] {
        return Array.from(this.formCache.values());
    }

    /**
     * Get form by name
     */
    getForm(name: string): FormInfo | undefined {
        return this.formCache.get(name);
    }

    /**
     * Get forms for a specific app
     */
    getFormsForApp(appName: string): FormInfo[] {
        const projectRoot = this.projectAnalyzer.getProjectRoot();
        if (!projectRoot) {
            console.warn('Project root not found, returning empty forms list');
            return [];
        }
        
        return Array.from(this.formCache.values()).filter(form => {
            try {
                const relativePath = path.relative(projectRoot, form.filePath);
                const parts = relativePath.split(path.sep);
                
                // Handle nested app structures (e.g., apps/myapp/forms.py)
                for (let i = 0; i < parts.length; i++) {
                    if (parts[i] === appName) {
                        // Check if this looks like an app directory (has forms.py somewhere inside)
                        const remainingPath = parts.slice(i).join(path.sep);
                        if (remainingPath.includes('forms.py')) {
                            return true;
                        }
                    }
                }
                
                // Standard structure: appName/forms.py
                return parts[0] === appName && parts.includes('forms.py');
            } catch (error) {
                console.error(`Error processing form path ${form.filePath}:`, error);
                return false;
            }
        });
    }

    /**
     * Get ModelForm fields including inherited model fields
     */
    async getModelFormFields(formName: string): Promise<FormFieldInfo[]> {
        const form = this.formCache.get(formName);
        if (!form || form.type !== 'ModelForm' || !form.modelName) {
            return form ? form.fields : [];
        }

        // Get model fields
        const modelInfo = await this.projectAnalyzer.getModelInfo();
        const model = modelInfo[form.modelName];
        
        if (!model) {
            return form.fields;
        }

        // Combine form fields with model fields
        const fieldNames = new Set(form.fields.map(f => f.name));
        const combinedFields = [...form.fields];

        // Add model fields that aren't explicitly defined in the form
        model.fields.forEach(modelField => {
            if (!fieldNames.has(modelField.name)) {
                combinedFields.push({
                    name: modelField.name,
                    fieldType: this.mapModelFieldToFormField(modelField.type),
                    required: modelField.required,
                    helpText: modelField.helpText
                });
            }
        });

        return combinedFields;
    }

    /**
     * Map Django model field types to form field types
     */
    private mapModelFieldToFormField(modelFieldType: string): string {
        const mapping: { [key: string]: string } = {
            'CharField': 'CharField',
            'TextField': 'CharField',
            'EmailField': 'EmailField',
            'URLField': 'URLField',
            'IntegerField': 'IntegerField',
            'FloatField': 'FloatField',
            'DecimalField': 'DecimalField',
            'BooleanField': 'BooleanField',
            'DateField': 'DateField',
            'DateTimeField': 'DateTimeField',
            'TimeField': 'TimeField',
            'FileField': 'FileField',
            'ImageField': 'ImageField',
            'ForeignKey': 'ModelChoiceField',
            'ManyToManyField': 'ModelMultipleChoiceField',
            'OneToOneField': 'ModelChoiceField',
        };
        
        return mapping[modelFieldType] || 'CharField';
    }

    /**
     * Check if the content contains form-like patterns
     */
    private containsFormPatterns(content: string): boolean {
        const formPatterns = [
            /class\s+\w+\s*\(\s*.*Form.*\s*\)/,           // class MyForm(Form)
            /from\s+django\.forms\s+import/,               // from django.forms import
            /from\s+django\s+import\s+forms/,              // from django import forms
            /import\s+django\.forms/,                      // import django.forms
            /=\s*forms\.\w+\s*\(/,                         // = forms.CharField(
            /class\s+Meta\s*:[\s\S]*?model\s*=/            // class Meta: model =
        ];
        
        return formPatterns.some(pattern => pattern.test(content));
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
        }
        this.formCache.clear();
    }
}