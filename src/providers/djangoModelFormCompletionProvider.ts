import * as vscode from 'vscode';
import { injectable, inject } from 'inversify';
import { TYPES } from '../container/types';
import { DjangoProjectAnalyzer } from '../analyzers/djangoProjectAnalyzer';

/**
 * Django ModelForm 자동완성 제공자
 */
@injectable()
export class DjangoModelFormCompletionProvider implements vscode.CompletionItemProvider {
    // Meta class options
    private readonly metaOptions = [
        { name: 'model', detail: 'The model class to use', insertText: 'model = ${1:ModelName}' },
        { name: 'fields', detail: 'Fields to include in the form', insertText: 'fields = [${1:\'field1\', \'field2\'}]' },
        { name: 'exclude', detail: 'Fields to exclude from the form', insertText: 'exclude = [${1:\'field1\', \'field2\'}]' },
        { name: 'widgets', detail: 'Custom widgets for fields', insertText: 'widgets = {\n\t\'${1:field}\': forms.${2:TextInput}(attrs={${3:}}),\n}' },
        { name: 'labels', detail: 'Custom labels for fields', insertText: 'labels = {\n\t\'${1:field}\': \'${2:Label}\',\n}' },
        { name: 'help_texts', detail: 'Custom help texts for fields', insertText: 'help_texts = {\n\t\'${1:field}\': \'${2:Help text}\',\n}' },
        { name: 'error_messages', detail: 'Custom error messages', insertText: 'error_messages = {\n\t\'${1:field}\': {\n\t\t\'${2:required}\': \'${3:This field is required}\',\n\t},\n}' },
        { name: 'field_classes', detail: 'Custom field classes', insertText: 'field_classes = {\n\t\'${1:field}\': forms.${2:CharField},\n}' },
        { name: 'localized_fields', detail: 'Fields to localize', insertText: 'localized_fields = [${1:\'field1\', \'field2\'}]' },
    ];

    // Common form methods to override
    private readonly formMethods = [
        {
            name: '__init__',
            detail: 'Initialize the form',
            insertText: '__init__(self, *args, **kwargs):\n\tsuper().__init__(*args, **kwargs)\n\t${1:# Customize form initialization}'
        },
        {
            name: 'save',
            detail: 'Save the form data',
            insertText: 'save(self, commit=True):\n\tinstance = super().save(commit=False)\n\t${1:# Modify instance before saving}\n\tif commit:\n\t\tinstance.save()\n\treturn instance'
        },
        {
            name: 'clean',
            detail: 'General form validation',
            insertText: 'clean(self):\n\tcleaned_data = super().clean()\n\t${1:# Add cross-field validation}\n\treturn cleaned_data'
        },
    ];

    constructor(
        @inject(TYPES.DjangoProjectAnalyzer) private projectAnalyzer: DjangoProjectAnalyzer
    ) {}

    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[]> {
        const lineText = document.lineAt(position).text;
        const beforeCursor = lineText.substring(0, position.character);

        // Check if we're in a ModelForm context
        if (!this.isModelFormFile(document)) {
            return [];
        }

        // Check if we're in Meta class
        if (this.isMetaClassContext(document, position)) {
            return this.getMetaClassCompletions(document, position);
        }

        // Check if we're defining a method
        if (this.isMethodDefinitionContext(beforeCursor)) {
            return this.getMethodCompletions();
        }

        // Check if we're accessing model fields
        if (this.isModelFieldContext(beforeCursor)) {
            return this.getModelFieldCompletions(document, position);
        }

        return [];
    }

    /**
     * Check if this is a ModelForm file
     */
    private isModelFormFile(document: vscode.TextDocument): boolean {
        const text = document.getText();
        return text.includes('ModelForm') || text.includes('from django.forms import ModelForm');
    }

    /**
     * Check if we're inside a Meta class
     */
    private isMetaClassContext(document: vscode.TextDocument, position: vscode.Position): boolean {
        const text = document.getText();
        const lines = text.split('\n');
        
        // Look backwards for "class Meta:"
        for (let i = position.line; i >= 0; i--) {
            const line = lines[i];
            
            if (line.match(/^\s*class\s+Meta\s*:/)) {
                // Check if we're still inside this class
                const metaIndent = line.search(/\S/);
                const currentIndent = lines[position.line].search(/\S/);
                
                // If current line has greater indentation, we're inside Meta
                return currentIndent > metaIndent;
            }
            
            // If we hit a class definition that's not Meta, we're not in Meta
            if (line.match(/^class\s+\w+/)) {
                return false;
            }
        }
        
        return false;
    }

    /**
     * Check if we're defining a method
     */
    private isMethodDefinitionContext(beforeCursor: string): boolean {
        return /^\s*def\s+$/.test(beforeCursor);
    }

    /**
     * Check if we're accessing model fields
     */
    private isModelFieldContext(beforeCursor: string): boolean {
        // Patterns like "self.fields['" or "self.fields.get('"
        return /self\.fields\[['"]$/.test(beforeCursor) || 
               /self\.fields\.get\(['"]$/.test(beforeCursor);
    }

    /**
     * Get Meta class option completions
     */
    private getMetaClassCompletions(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];

        // Add Meta options
        this.metaOptions.forEach(option => {
            const item = new vscode.CompletionItem(option.name, vscode.CompletionItemKind.Property);
            item.detail = option.detail;
            item.insertText = new vscode.SnippetString(option.insertText);
            item.documentation = new vscode.MarkdownString(`Meta option: ${option.name}\n\n${option.detail}`);
            items.push(item);
        });

        // Special handling for fields - try to get model fields
        const modelName = this.findModelInMeta(document, position);
        if (modelName) {
            const fieldsItem = new vscode.CompletionItem('fields = "__all__"', vscode.CompletionItemKind.Property);
            fieldsItem.detail = 'Include all model fields';
            fieldsItem.insertText = 'fields = "__all__"';
            items.push(fieldsItem);

            // Try to get actual model fields
            const modelFields = this.getModelFields(modelName);
            if (modelFields.length > 0) {
                const specificFieldsItem = new vscode.CompletionItem('fields = [...]', vscode.CompletionItemKind.Property);
                specificFieldsItem.detail = 'Specify fields to include';
                specificFieldsItem.insertText = new vscode.SnippetString(
                    `fields = [${modelFields.map((f, i) => `\${${i + 1}:'${f}'}`).join(', ')}]`
                );
                items.push(specificFieldsItem);
            }
        }

        return items;
    }

    /**
     * Get method completions for ModelForm
     */
    private getMethodCompletions(): vscode.CompletionItem[] {
        return this.formMethods.map(method => {
            const item = new vscode.CompletionItem(method.name, vscode.CompletionItemKind.Method);
            item.detail = method.detail;
            item.insertText = new vscode.SnippetString(method.insertText);
            item.documentation = new vscode.MarkdownString(`ModelForm method: ${method.name}\n\n${method.detail}`);
            return item;
        });
    }

    /**
     * Get model field completions
     */
    private async getModelFieldCompletions(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.CompletionItem[]> {
        const items: vscode.CompletionItem[] = [];
        
        // Find the model for this form
        const modelName = this.findModelForForm(document, position);
        if (!modelName) {
            return items;
        }

        // Get fields from the model
        const modelFields = await this.getModelFieldsFromAnalyzer(modelName);
        
        modelFields.forEach(field => {
            const item = new vscode.CompletionItem(field.name, vscode.CompletionItemKind.Field);
            item.detail = `${field.type} field`;
            item.insertText = field.name;
            item.documentation = new vscode.MarkdownString(
                `Model field: ${field.name}\n\nType: ${field.type}`
            );
            items.push(item);
        });

        return items;
    }

    /**
     * Find model name in Meta class
     */
    private findModelInMeta(document: vscode.TextDocument, position: vscode.Position): string | null {
        const text = document.getText();
        const beforePosition = text.substring(0, document.offsetAt(position));
        
        // Look for "model = ModelName" in Meta class
        const metaMatch = beforePosition.match(/class\s+Meta\s*:[\s\S]*?model\s*=\s*(\w+)/);
        return metaMatch ? metaMatch[1] : null;
    }

    /**
     * Find the model for the current form
     */
    private findModelForForm(document: vscode.TextDocument, position: vscode.Position): string | null {
        const text = document.getText();
        const lines = text.split('\n');
        
        // Look backwards for the form class definition
        let formClassName = '';
        for (let i = position.line; i >= 0; i--) {
            const classMatch = lines[i].match(/^class\s+(\w+).*\(.*ModelForm.*\):/);
            if (classMatch) {
                formClassName = classMatch[1];
                break;
            }
        }
        
        if (!formClassName) {
            return null;
        }
        
        // Now find the Meta class and model within this form
        const formClassMatch = text.match(new RegExp(
            `class\\s+${formClassName}[^:]*:\\s*([\\s\\S]*?)(?=\\nclass\\s|$)`
        ));
        
        if (formClassMatch) {
            const formBody = formClassMatch[1];
            const modelMatch = formBody.match(/class\s+Meta\s*:[\s\S]*?model\s*=\s*(\w+)/);
            return modelMatch ? modelMatch[1] : null;
        }
        
        return null;
    }

    /**
     * Get model fields (simplified for now)
     */
    private getModelFields(modelName: string): string[] {
        // This would ideally come from the DjangoProjectAnalyzer
        // For now, return common field names
        return ['id', 'name', 'email', 'created_at', 'updated_at'];
    }

    /**
     * Get model fields from analyzer
     */
    private async getModelFieldsFromAnalyzer(modelName: string): Promise<Array<{ name: string, type: string }>> {
        const modelInfo = await this.projectAnalyzer.getModelInfo();
        const model = modelInfo[modelName];
        
        if (model && model.fields) {
            return model.fields.map(field => ({
                name: field.name,
                type: field.type
            }));
        }
        
        // Fallback to common fields
        return [
            { name: 'id', type: 'AutoField' },
            { name: 'created_at', type: 'DateTimeField' },
            { name: 'updated_at', type: 'DateTimeField' }
        ];
    }
}