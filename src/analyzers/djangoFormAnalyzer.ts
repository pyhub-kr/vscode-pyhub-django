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
            
            console.log(`Analyzed ${forms.length} forms in ${path.basename(filePath)}`);
        } catch (error) {
            console.error(`Error analyzing form file ${filePath}:`, error);
        }
    }

    /**
     * Extract form information from file content
     */
    private extractForms(content: string, filePath: string): FormInfo[] {
        const forms: FormInfo[] = [];
        
        // Regular expression to match form class definitions
        const formClassRegex = /class\s+(\w+)\s*\(\s*(forms\.Form|forms\.ModelForm|ModelForm|Form)\s*\)\s*:/g;
        let match;
        
        while ((match = formClassRegex.exec(content)) !== null) {
            const formName = match[1];
            const formType = match[2].includes('ModelForm') ? 'ModelForm' : 'Form';
            
            // Extract form body
            const formBodyMatch = content.match(new RegExp(
                `class\\s+${formName}[^:]*:[\\s\\S]*?(?=\\nclass\\s|\\n\\S|$)`
            ));
            
            if (formBodyMatch) {
                const formBody = formBodyMatch[0];
                const fields = this.extractFormFields(formBody);
                const modelName = formType === 'ModelForm' ? this.extractModelName(formBody) : undefined;
                
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
     * Extract form fields from form body
     */
    private extractFormFields(formBody: string): FormFieldInfo[] {
        const fields: FormFieldInfo[] = [];
        
        // Match field definitions like: field_name = forms.CharField(...)
        const fieldRegex = /^\s*(\w+)\s*=\s*forms\.(\w+)\s*\((.*?)\)/gm;
        let match;
        
        while ((match = fieldRegex.exec(formBody)) !== null) {
            const fieldName = match[1];
            const fieldType = match[2];
            const fieldParams = match[3];
            
            // Skip if it's a method (starts with underscore or is 'Meta')
            if (fieldName.startsWith('_') || fieldName === 'Meta') {
                continue;
            }
            
            const fieldInfo: FormFieldInfo = {
                name: fieldName,
                fieldType: fieldType,
                required: !fieldParams.includes('required=False'),
                widget: this.extractWidget(fieldParams),
                helpText: this.extractHelpText(fieldParams)
            };
            
            fields.push(fieldInfo);
        }
        
        return fields;
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
        const widgetMatch = params.match(/widget\s*=\s*forms\.(\w+)/);
        return widgetMatch ? widgetMatch[1] : undefined;
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
        return Array.from(this.formCache.values()).filter(form => {
            const relativePath = path.relative(this.projectAnalyzer.getProjectRoot() || '', form.filePath);
            const parts = relativePath.split(path.sep);
            return parts[0] === appName;
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
     * Dispose resources
     */
    dispose(): void {
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
        }
        this.formCache.clear();
    }
}