import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { DjangoFormsCompletionProvider } from '../../../providers/djangoFormsCompletionProvider';
import { DjangoProjectAnalyzer } from '../../../analyzers/djangoProjectAnalyzer';

suite('DjangoFormsCompletionProvider Test Suite', () => {
    let provider: DjangoFormsCompletionProvider;
    let mockAnalyzer: any;

    setup(() => {
        // Create a simple mock object
        mockAnalyzer = {};
        provider = new DjangoFormsCompletionProvider(mockAnalyzer as DjangoProjectAnalyzer);
    });

    teardown(() => {
        sinon.restore();
    });

    test('should provide form field completions after forms.', async () => {
        const document = await createDocument('forms.py', 
            'from django import forms\n' +
            'class MyForm(forms.Form):\n' +
            '    name = forms.'
        );
        const position = new vscode.Position(2, 17);

        const completions = await provider.provideCompletionItems(
            document,
            position,
            new vscode.CancellationTokenSource().token,
            { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: '.' }
        );

        assert.ok(completions);
        assert.ok(completions.length > 0);
        
        // Check for common field types
        const fieldNames = completions.map(item => item.label);
        assert.ok(fieldNames.includes('CharField'));
        assert.ok(fieldNames.includes('EmailField'));
        assert.ok(fieldNames.includes('IntegerField'));
        assert.ok(fieldNames.includes('BooleanField'));
        assert.ok(fieldNames.includes('DateField'));
        assert.ok(fieldNames.includes('ChoiceField'));
        assert.ok(fieldNames.includes('FileField'));
        assert.ok(fieldNames.includes('ModelChoiceField'));

        // Check completion details
        const charField = completions.find(item => item.label === 'CharField');
        assert.ok(charField);
        assert.strictEqual(charField.kind, vscode.CompletionItemKind.Class);
        assert.ok(charField.detail?.includes('Text input field'));
    });

    test('should provide field parameter completions inside field parentheses', async () => {
        const document = await createDocument('forms.py',
            'from django import forms\n' +
            'class MyForm(forms.Form):\n' +
            '    name = forms.CharField('
        );
        const position = new vscode.Position(2, 27);

        const completions = await provider.provideCompletionItems(
            document,
            position,
            new vscode.CancellationTokenSource().token,
            { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: '(' }
        );

        assert.ok(completions);
        assert.ok(completions.length > 0);

        // Check for common parameters
        const paramNames = completions.map(item => item.label);
        assert.ok(paramNames.includes('required'));
        assert.ok(paramNames.includes('label'));
        assert.ok(paramNames.includes('help_text'));
        assert.ok(paramNames.includes('initial'));
        assert.ok(paramNames.includes('widget'));
        assert.ok(paramNames.includes('validators'));
        assert.ok(paramNames.includes('error_messages'));

        // Check parameter details
        const requiredParam = completions.find(item => item.label === 'required');
        assert.ok(requiredParam);
        assert.strictEqual(requiredParam.kind, vscode.CompletionItemKind.Property);
        assert.ok(requiredParam.detail?.includes('Whether the field is required'));
    });

    test('should provide widget completions after widget=forms.', async () => {
        const document = await createDocument('forms.py',
            'from django import forms\n' +
            'class MyForm(forms.Form):\n' +
            '    name = forms.CharField(widget=forms.'
        );
        const position = new vscode.Position(2, 40);

        const completions = await provider.provideCompletionItems(
            document,
            position,
            new vscode.CancellationTokenSource().token,
            { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: '.' }
        );

        assert.ok(completions, 'Completions should be returned');
        assert.ok(completions.length > 0, `Expected completions but got ${completions.length}`);

        // Check for common widgets
        const widgetNames = completions.map(item => item.label);
        assert.ok(widgetNames.includes('TextInput'), `Widget names: ${widgetNames.join(', ')}`);
        assert.ok(widgetNames.includes('Textarea'));
        assert.ok(widgetNames.includes('Select'));
        assert.ok(widgetNames.includes('CheckboxInput'));
        assert.ok(widgetNames.includes('RadioSelect'));
        assert.ok(widgetNames.includes('FileInput'));
        assert.ok(widgetNames.includes('HiddenInput'));
        assert.ok(widgetNames.includes('PasswordInput'));

        // Check widget details
        const textInput = completions.find(item => item.label === 'TextInput');
        assert.ok(textInput);
        assert.strictEqual(textInput.kind, vscode.CompletionItemKind.Class);
        assert.ok(textInput.detail?.includes('Single-line text input'));
    });

    test('should provide clean method completions after def clean_', async () => {
        const document = await createDocument('forms.py',
            'from django import forms\n' +
            'class MyForm(forms.Form):\n' +
            '    email = forms.EmailField()\n' +
            '    name = forms.CharField()\n' +
            '    \n' +
            '    def clean_'
        );
        const position = new vscode.Position(5, 14);

        const completions = await provider.provideCompletionItems(
            document,
            position,
            new vscode.CancellationTokenSource().token,
            { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined }
        );

        assert.ok(completions);
        assert.ok(completions.length > 0);

        // Should include general clean method
        const cleanMethod = completions.find(item => item.label === 'clean');
        assert.ok(cleanMethod);
        assert.strictEqual(cleanMethod.kind, vscode.CompletionItemKind.Method);
        assert.ok(cleanMethod.detail?.includes('General form validation method'));

        // Should include field-specific clean methods
        const cleanEmail = completions.find(item => item.label === 'clean_email');
        assert.ok(cleanEmail);
        assert.ok(cleanEmail.detail?.includes('Validate the email field'));

        const cleanName = completions.find(item => item.label === 'clean_name');
        assert.ok(cleanName);
        assert.ok(cleanName.detail?.includes('Validate the name field'));
    });

    test('should not provide completions in non-forms.py files without forms import', async () => {
        const document = await createDocument('views.py',
            'class MyView:\n' +
            '    def get(self):\n' +
            '        form = forms.'
        );
        const position = new vscode.Position(2, 21);

        const completions = await provider.provideCompletionItems(
            document,
            position,
            new vscode.CancellationTokenSource().token,
            { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined }
        );

        assert.strictEqual(completions.length, 0);
    });

    test('should provide completions in non-forms.py files with forms import', async () => {
        const document = await createDocument('views.py',
            'from django import forms\n' +
            'class MyView:\n' +
            '    def get(self):\n' +
            '        field = forms.'
        );
        const position = new vscode.Position(3, 22);

        const completions = await provider.provideCompletionItems(
            document,
            position,
            new vscode.CancellationTokenSource().token,
            { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined }
        );

        assert.ok(completions);
        assert.ok(completions.length > 0);
        
        // Should include form fields
        const fieldNames = completions.map(item => item.label);
        assert.ok(fieldNames.includes('CharField'));
    });

    test('should provide DecimalField with proper parameters', async () => {
        const document = await createDocument('forms.py',
            'from django import forms\n' +
            'class MyForm(forms.Form):\n' +
            '    price = forms.'
        );
        const position = new vscode.Position(2, 18);

        const completions = await provider.provideCompletionItems(
            document,
            position,
            new vscode.CancellationTokenSource().token,
            { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined }
        );

        const decimalField = completions.find(item => item.label === 'DecimalField');
        assert.ok(decimalField);
        assert.ok(decimalField.insertText);
        
        // Check that DecimalField includes required parameters
        if (decimalField.insertText instanceof vscode.SnippetString) {
            assert.ok(decimalField.insertText.value.includes('max_digits'));
            assert.ok(decimalField.insertText.value.includes('decimal_places'));
        }
    });

    test('should provide ChoiceField with choices parameter', async () => {
        const document = await createDocument('forms.py',
            'from django import forms\n' +
            'class MyForm(forms.Form):\n' +
            '    status = forms.'
        );
        const position = new vscode.Position(2, 19);

        const completions = await provider.provideCompletionItems(
            document,
            position,
            new vscode.CancellationTokenSource().token,
            { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined }
        );

        const choiceField = completions.find(item => item.label === 'ChoiceField');
        assert.ok(choiceField);
        assert.ok(choiceField.insertText);
        
        if (choiceField.insertText instanceof vscode.SnippetString) {
            assert.ok(choiceField.insertText.value.includes('choices='));
        }
    });

    test('should provide ModelChoiceField with queryset parameter', async () => {
        const document = await createDocument('forms.py',
            'from django import forms\n' +
            'class MyForm(forms.Form):\n' +
            '    author = forms.'
        );
        const position = new vscode.Position(2, 19);

        const completions = await provider.provideCompletionItems(
            document,
            position,
            new vscode.CancellationTokenSource().token,
            { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined }
        );

        const modelChoiceField = completions.find(item => item.label === 'ModelChoiceField');
        assert.ok(modelChoiceField);
        assert.ok(modelChoiceField.insertText);
        
        if (modelChoiceField.insertText instanceof vscode.SnippetString) {
            assert.ok(modelChoiceField.insertText.value.includes('queryset='));
            assert.ok(modelChoiceField.insertText.value.includes('Model.objects.all()'));
        }
    });

    async function createDocument(filename: string, content: string): Promise<vscode.TextDocument> {
        const uri = vscode.Uri.parse(`file:///test/${filename}`);
        const document = await vscode.workspace.openTextDocument({
            language: 'python',
            content: content
        });
        return document;
    }
});