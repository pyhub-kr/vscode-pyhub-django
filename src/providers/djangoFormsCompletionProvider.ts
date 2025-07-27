import * as vscode from 'vscode';
import { injectable, inject } from 'inversify';
import { TYPES } from '../container/types';
import { DjangoProjectAnalyzer } from '../analyzers/djangoProjectAnalyzer';

/**
 * Django Forms 자동완성 제공자
 */
@injectable()
export class DjangoFormsCompletionProvider implements vscode.CompletionItemProvider {
    // Common Django form fields
    private readonly formFields = [
        { name: 'CharField', detail: 'Text input field', insertText: 'CharField(${1:})' },
        { name: 'EmailField', detail: 'Email validation field', insertText: 'EmailField(${1:})' },
        { name: 'IntegerField', detail: 'Integer number field', insertText: 'IntegerField(${1:})' },
        { name: 'FloatField', detail: 'Floating point number field', insertText: 'FloatField(${1:})' },
        { name: 'DecimalField', detail: 'Fixed-precision decimal field', insertText: 'DecimalField(${1:max_digits=${2:10}, decimal_places=${3:2}})' },
        { name: 'BooleanField', detail: 'True/False field', insertText: 'BooleanField(${1:})' },
        { name: 'DateField', detail: 'Date input field', insertText: 'DateField(${1:})' },
        { name: 'DateTimeField', detail: 'Date and time input field', insertText: 'DateTimeField(${1:})' },
        { name: 'TimeField', detail: 'Time input field', insertText: 'TimeField(${1:})' },
        { name: 'ChoiceField', detail: 'Select field with choices', insertText: 'ChoiceField(choices=${1:choices})' },
        { name: 'MultipleChoiceField', detail: 'Multiple select field', insertText: 'MultipleChoiceField(choices=${1:choices})' },
        { name: 'TypedChoiceField', detail: 'Choice field with type coercion', insertText: 'TypedChoiceField(choices=${1:choices}, coerce=${2:int})' },
        { name: 'TypedMultipleChoiceField', detail: 'Multiple choice field with type coercion', insertText: 'TypedMultipleChoiceField(choices=${1:choices}, coerce=${2:int})' },
        { name: 'FileField', detail: 'File upload field', insertText: 'FileField(${1:})' },
        { name: 'ImageField', detail: 'Image file upload field', insertText: 'ImageField(${1:})' },
        { name: 'URLField', detail: 'URL validation field', insertText: 'URLField(${1:})' },
        { name: 'SlugField', detail: 'Slug validation field', insertText: 'SlugField(${1:})' },
        { name: 'RegexField', detail: 'Regex validation field', insertText: 'RegexField(regex=${1:r\'pattern\'})' },
        { name: 'ModelChoiceField', detail: 'Select field from model queryset', insertText: 'ModelChoiceField(queryset=${1:Model.objects.all()})' },
        { name: 'ModelMultipleChoiceField', detail: 'Multiple select from model queryset', insertText: 'ModelMultipleChoiceField(queryset=${1:Model.objects.all()})' },
    ];

    // Common field parameters
    private readonly fieldParameters = [
        { name: 'required', detail: 'Whether the field is required', insertText: 'required=${1:True}' },
        { name: 'label', detail: 'Human-readable label for the field', insertText: 'label="${1:Field Label}"' },
        { name: 'help_text', detail: 'Help text displayed with the field', insertText: 'help_text="${1:Help text}"' },
        { name: 'initial', detail: 'Initial value for the field', insertText: 'initial=${1:value}' },
        { name: 'widget', detail: 'Widget to use for rendering', insertText: 'widget=forms.${1:TextInput}()' },
        { name: 'validators', detail: 'List of validation functions', insertText: 'validators=[${1:validator}]' },
        { name: 'error_messages', detail: 'Custom error messages', insertText: 'error_messages={\'${1:required}\': \'${2:This field is required}\'}' },
        { name: 'disabled', detail: 'Whether the field is disabled', insertText: 'disabled=${1:False}' },
        { name: 'localize', detail: 'Enable localization for the field', insertText: 'localize=${1:False}' },
    ];

    // Common Django widgets
    private readonly widgets = [
        { name: 'TextInput', detail: 'Single-line text input', insertText: 'TextInput(attrs={${1:}})' },
        { name: 'NumberInput', detail: 'Number input widget', insertText: 'NumberInput(attrs={${1:}})' },
        { name: 'EmailInput', detail: 'Email input widget', insertText: 'EmailInput(attrs={${1:}})' },
        { name: 'URLInput', detail: 'URL input widget', insertText: 'URLInput(attrs={${1:}})' },
        { name: 'PasswordInput', detail: 'Password input widget', insertText: 'PasswordInput(attrs={${1:}})' },
        { name: 'HiddenInput', detail: 'Hidden input widget', insertText: 'HiddenInput(attrs={${1:}})' },
        { name: 'DateInput', detail: 'Date input widget', insertText: 'DateInput(attrs={${1:}})' },
        { name: 'DateTimeInput', detail: 'DateTime input widget', insertText: 'DateTimeInput(attrs={${1:}})' },
        { name: 'TimeInput', detail: 'Time input widget', insertText: 'TimeInput(attrs={${1:}})' },
        { name: 'Textarea', detail: 'Multi-line text input', insertText: 'Textarea(attrs={${1:}})' },
        { name: 'Select', detail: 'Dropdown select widget', insertText: 'Select(attrs={${1:}})' },
        { name: 'SelectMultiple', detail: 'Multiple select widget', insertText: 'SelectMultiple(attrs={${1:}})' },
        { name: 'RadioSelect', detail: 'Radio button widget', insertText: 'RadioSelect(attrs={${1:}})' },
        { name: 'CheckboxInput', detail: 'Single checkbox widget', insertText: 'CheckboxInput(attrs={${1:}})' },
        { name: 'CheckboxSelectMultiple', detail: 'Multiple checkbox widget', insertText: 'CheckboxSelectMultiple(attrs={${1:}})' },
        { name: 'FileInput', detail: 'File upload widget', insertText: 'FileInput(attrs={${1:}})' },
        { name: 'ClearableFileInput', detail: 'File upload with clear option', insertText: 'ClearableFileInput(attrs={${1:}})' },
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

        // Check if we're in a forms.py file
        if (!document.fileName.endsWith('forms.py')) {
            // Also check if we're importing from django.forms
            const fullText = document.getText();
            if (!fullText.includes('from django import forms') && 
                !fullText.includes('from django.forms import')) {
                return [];
            }
        }

        // Detect context
        if (this.isFormFieldContext(beforeCursor)) {
            return this.getFormFieldCompletions();
        }

        if (this.isFieldParameterContext(document, position)) {
            return this.getFieldParameterCompletions();
        }

        if (this.isWidgetContext(beforeCursor)) {
            return this.getWidgetCompletions();
        }

        if (this.isCleanMethodContext(document, position)) {
            return this.getCleanMethodCompletions(document, position);
        }

        return [];
    }

    /**
     * Check if we're in a form field definition context
     */
    private isFormFieldContext(beforeCursor: string): boolean {
        // Match patterns like "field = forms." or "= forms."
        const formFieldPattern = /=\s*forms\.$/;
        return formFieldPattern.test(beforeCursor);
    }

    /**
     * Check if we're in a field parameter context
     */
    private isFieldParameterContext(document: vscode.TextDocument, position: vscode.Position): boolean {
        const lineText = document.lineAt(position).text;
        const beforeCursor = lineText.substring(0, position.character);
        
        // Check if we're inside field parentheses
        const fieldPattern = /forms\.\w+Field\s*\([^)]*$/;
        return fieldPattern.test(beforeCursor);
    }

    /**
     * Check if we're in a widget context
     */
    private isWidgetContext(beforeCursor: string): boolean {
        // Match patterns like "widget=forms."
        const widgetPattern = /widget\s*=\s*forms\.$/;
        return widgetPattern.test(beforeCursor);
    }

    /**
     * Check if we're defining a clean method
     */
    private isCleanMethodContext(document: vscode.TextDocument, position: vscode.Position): boolean {
        const lineText = document.lineAt(position).text;
        const beforeCursor = lineText.substring(0, position.character);
        
        // Match "def clean_"
        return /def\s+clean_$/.test(beforeCursor);
    }

    /**
     * Get form field completions
     */
    private getFormFieldCompletions(): vscode.CompletionItem[] {
        return this.formFields.map(field => {
            const item = new vscode.CompletionItem(field.name, vscode.CompletionItemKind.Class);
            item.detail = field.detail;
            item.insertText = new vscode.SnippetString(field.insertText);
            item.documentation = new vscode.MarkdownString(`Django form field: ${field.name}\n\n${field.detail}`);
            return item;
        });
    }

    /**
     * Get field parameter completions
     */
    private getFieldParameterCompletions(): vscode.CompletionItem[] {
        return this.fieldParameters.map(param => {
            const item = new vscode.CompletionItem(param.name, vscode.CompletionItemKind.Property);
            item.detail = param.detail;
            item.insertText = new vscode.SnippetString(param.insertText);
            item.documentation = new vscode.MarkdownString(`Field parameter: ${param.name}\n\n${param.detail}`);
            return item;
        });
    }

    /**
     * Get widget completions
     */
    private getWidgetCompletions(): vscode.CompletionItem[] {
        return this.widgets.map(widget => {
            const item = new vscode.CompletionItem(widget.name, vscode.CompletionItemKind.Class);
            item.detail = widget.detail;
            item.insertText = new vscode.SnippetString(widget.insertText);
            item.documentation = new vscode.MarkdownString(`Django widget: ${widget.name}\n\n${widget.detail}`);
            return item;
        });
    }

    /**
     * Get clean method completions
     */
    private getCleanMethodCompletions(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];

        // Add general clean method
        const cleanItem = new vscode.CompletionItem('clean', vscode.CompletionItemKind.Method);
        cleanItem.detail = 'General form validation method';
        cleanItem.insertText = new vscode.SnippetString(
            'clean(self):\n' +
            '\t"""Validate the form data."""\n' +
            '\tcleaned_data = super().clean()\n' +
            '${1:# Add your validation logic here}\n' +
            '\treturn cleaned_data'
        );
        items.push(cleanItem);

        // Try to find form fields in the current class
        const classMatch = this.findCurrentFormClass(document, position);
        if (classMatch) {
            const fields = this.extractFormFields(document, classMatch.start, classMatch.end);
            
            // Add clean_<field> methods for each field
            fields.forEach(field => {
                const item = new vscode.CompletionItem(`clean_${field}`, vscode.CompletionItemKind.Method);
                item.detail = `Validate the ${field} field`;
                item.insertText = new vscode.SnippetString(
                    `clean_${field}(self):\n` +
                    `\t"""Validate the ${field} field."""\n` +
                    `\t${field} = self.cleaned_data.get('${field}')\n` +
                    '\t${1:# Add your validation logic here}\n' +
                    `\treturn ${field}`
                );
                items.push(item);
            });
        }

        return items;
    }

    /**
     * Find the current form class boundaries
     */
    private findCurrentFormClass(document: vscode.TextDocument, position: vscode.Position): { start: number, end: number } | null {
        const text = document.getText();
        const lines = text.split('\n');
        
        let classStart = -1;
        let indentLevel = -1;
        
        // Find class definition before current position
        for (let i = position.line; i >= 0; i--) {
            const line = lines[i];
            const classMatch = line.match(/^class\s+(\w+).*\(.*Form.*\):/);
            
            if (classMatch) {
                classStart = i;
                indentLevel = line.search(/\S/);
                break;
            }
        }
        
        if (classStart === -1) {
            return null;
        }
        
        // Find class end
        let classEnd = lines.length;
        for (let i = classStart + 1; i < lines.length; i++) {
            const line = lines[i];
            const lineIndent = line.search(/\S/);
            
            // If we find a line with same or less indentation (and it's not empty), class ends
            if (lineIndent !== -1 && lineIndent <= indentLevel) {
                classEnd = i;
                break;
            }
        }
        
        return { start: classStart, end: classEnd };
    }

    /**
     * Extract form fields from a class
     */
    private extractFormFields(document: vscode.TextDocument, startLine: number, endLine: number): string[] {
        const fields: string[] = [];
        
        for (let i = startLine + 1; i < endLine; i++) {
            const line = document.lineAt(i).text;
            const fieldMatch = line.match(/^\s*(\w+)\s*=\s*forms\.\w+Field/);
            
            if (fieldMatch) {
                fields.push(fieldMatch[1]);
            }
        }
        
        return fields;
    }
}