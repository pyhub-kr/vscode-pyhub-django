import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { DjangoModelFormCompletionProvider } from '../../../providers/djangoModelFormCompletionProvider';
import { DjangoProjectAnalyzer } from '../../../analyzers/djangoProjectAnalyzer';

interface ModelInfo {
    name: string;
    fields: Array<{
        name: string;
        type: string;
    }>;
    methods: string[];
    filePath: string;
}

suite('DjangoModelFormCompletionProvider Test Suite', () => {
    let provider: DjangoModelFormCompletionProvider;
    let mockAnalyzer: any;

    setup(() => {
        // Mock some models for testing
        const mockModels: ModelInfo[] = [
            {
                name: 'User',
                fields: [
                    { name: 'username', type: 'CharField' },
                    { name: 'email', type: 'EmailField' },
                    { name: 'first_name', type: 'CharField' },
                    { name: 'last_name', type: 'CharField' },
                    { name: 'is_active', type: 'BooleanField' }
                ],
                methods: [],
                filePath: '/test/models.py'
            },
            {
                name: 'Post',
                fields: [
                    { name: 'title', type: 'CharField' },
                    { name: 'content', type: 'TextField' },
                    { name: 'author', type: 'ForeignKey' },
                    { name: 'created_at', type: 'DateTimeField' }
                ],
                methods: [],
                filePath: '/test/models.py'
            }
        ];
        
        // Create mock analyzer
        mockAnalyzer = {
            getModelInfo: async () => {
                const result: { [key: string]: ModelInfo } = {};
                mockModels.forEach(model => {
                    result[model.name] = model;
                });
                return result;
            }
        };
        provider = new DjangoModelFormCompletionProvider(mockAnalyzer as DjangoProjectAnalyzer);
    });

    teardown(() => {
        sinon.restore();
    });

    test('should provide Meta class options in ModelForm', async () => {
        const document = await createDocument('forms.py',
            'from django import forms\n' +
            'from .models import User\n' +
            '\n' +
            'class UserForm(forms.ModelForm):\n' +
            '    class Meta:\n' +
            '        '
        );
        const position = new vscode.Position(5, 8);

        const completions = await provider.provideCompletionItems(
            document,
            position,
            new vscode.CancellationTokenSource().token,
            { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined }
        );

        assert.ok(completions);
        assert.ok(completions.length > 0);

        // Check for Meta options
        const optionNames = completions.map(item => item.label);
        assert.ok(optionNames.includes('model'));
        assert.ok(optionNames.includes('fields'));
        assert.ok(optionNames.includes('exclude'));
        assert.ok(optionNames.includes('widgets'));
        assert.ok(optionNames.includes('labels'));
        assert.ok(optionNames.includes('help_texts'));
        assert.ok(optionNames.includes('error_messages'));
        assert.ok(optionNames.includes('field_classes'));

        // Check option details
        const modelOption = completions.find(item => item.label === 'model');
        assert.ok(modelOption);
        assert.strictEqual(modelOption.kind, vscode.CompletionItemKind.Property);
        assert.ok(modelOption.detail?.includes('The model class to use'));
    });

    test('should provide model suggestions for model = in Meta class', async () => {
        const document = await createDocument('forms.py',
            'from django import forms\n' +
            'from .models import User, Post\n' +
            '\n' +
            'class MyForm(forms.ModelForm):\n' +
            '    class Meta:\n' +
            '        model = '
        );
        const position = new vscode.Position(5, 16);

        const completions = await provider.provideCompletionItems(
            document,
            position,
            new vscode.CancellationTokenSource().token,
            { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined }
        );

        assert.ok(completions);
        assert.ok(completions.length > 0);

        // Should suggest available models
        const modelNames = completions.map(item => item.label);
        assert.ok(modelNames.includes('User'));
        assert.ok(modelNames.includes('Post'));

        // Check model details
        const userModel = completions.find(item => item.label === 'User');
        assert.ok(userModel);
        assert.strictEqual(userModel.kind, vscode.CompletionItemKind.Class);
        assert.ok(userModel.detail?.includes('Django model'));
    });

    test('should provide field suggestions inside fields list', async () => {
        const document = await createDocument('forms.py',
            'from django import forms\n' +
            'from .models import User\n' +
            '\n' +
            'class UserForm(forms.ModelForm):\n' +
            '    class Meta:\n' +
            '        model = User\n' +
            '        fields = [\''
        );
        const position = new vscode.Position(6, 19);

        const completions = await provider.provideCompletionItems(
            document,
            position,
            new vscode.CancellationTokenSource().token,
            { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: '\'' }
        );

        assert.ok(completions);
        assert.ok(completions.length > 0);

        // Should suggest User model fields
        const fieldNames = completions.map(item => item.label);
        assert.ok(fieldNames.includes('username'));
        assert.ok(fieldNames.includes('email'));
        assert.ok(fieldNames.includes('first_name'));
        assert.ok(fieldNames.includes('last_name'));
        assert.ok(fieldNames.includes('is_active'));

        // Should also include '__all__' option
        assert.ok(fieldNames.includes('__all__'));
    });

    test('should provide field suggestions inside exclude list', async () => {
        const document = await createDocument('forms.py',
            'from django import forms\n' +
            'from .models import Post\n' +
            '\n' +
            'class PostForm(forms.ModelForm):\n' +
            '    class Meta:\n' +
            '        model = Post\n' +
            '        exclude = [\''
        );
        const position = new vscode.Position(6, 20);

        const completions = await provider.provideCompletionItems(
            document,
            position,
            new vscode.CancellationTokenSource().token,
            { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: '\'' }
        );

        assert.ok(completions);
        assert.ok(completions.length > 0);

        // Should suggest Post model fields
        const fieldNames = completions.map(item => item.label);
        assert.ok(fieldNames.includes('title'));
        assert.ok(fieldNames.includes('content'));
        assert.ok(fieldNames.includes('author'));
        assert.ok(fieldNames.includes('created_at'));

        // Should NOT include '__all__' for exclude
        assert.ok(!fieldNames.includes('__all__'));
    });

    test('should provide widget suggestions for widgets dictionary', async () => {
        const document = await createDocument('forms.py',
            'from django import forms\n' +
            'from .models import User\n' +
            '\n' +
            'class UserForm(forms.ModelForm):\n' +
            '    class Meta:\n' +
            '        model = User\n' +
            '        fields = [\'username\', \'email\']\n' +
            '        widgets = {\n' +
            '            \''
        );
        const position = new vscode.Position(8, 13);

        const completions = await provider.provideCompletionItems(
            document,
            position,
            new vscode.CancellationTokenSource().token,
            { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: '\'' }
        );

        assert.ok(completions);
        assert.ok(completions.length > 0);

        // Should suggest fields that are in the fields list
        const fieldNames = completions.map(item => item.label);
        assert.ok(fieldNames.includes('username'));
        assert.ok(fieldNames.includes('email'));
    });

    test('should not provide completions in non-ModelForm classes', async () => {
        const document = await createDocument('forms.py',
            'from django import forms\n' +
            '\n' +
            'class MyForm(forms.Form):\n' +
            '    class Meta:\n' +
            '        '
        );
        const position = new vscode.Position(4, 8);

        const completions = await provider.provideCompletionItems(
            document,
            position,
            new vscode.CancellationTokenSource().token,
            { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined }
        );

        assert.strictEqual(completions.length, 0);
    });

    test('should handle fields = "__all__" correctly', async () => {
        const document = await createDocument('forms.py',
            'from django import forms\n' +
            'from .models import User\n' +
            '\n' +
            'class UserForm(forms.ModelForm):\n' +
            '    class Meta:\n' +
            '        model = User\n' +
            '        fields = "'
        );
        const position = new vscode.Position(6, 18);

        const completions = await provider.provideCompletionItems(
            document,
            position,
            new vscode.CancellationTokenSource().token,
            { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: '"' }
        );

        assert.ok(completions);
        const allOption = completions.find(item => item.label === '__all__');
        assert.ok(allOption);
        assert.ok(allOption.detail?.includes('Include all fields'));
    });

    test('should provide field-specific labels in labels dictionary', async () => {
        const document = await createDocument('forms.py',
            'from django import forms\n' +
            'from .models import User\n' +
            '\n' +
            'class UserForm(forms.ModelForm):\n' +
            '    class Meta:\n' +
            '        model = User\n' +
            '        fields = [\'username\', \'email\']\n' +
            '        labels = {\n' +
            '            \''
        );
        const position = new vscode.Position(8, 13);

        const completions = await provider.provideCompletionItems(
            document,
            position,
            new vscode.CancellationTokenSource().token,
            { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: '\'' }
        );

        assert.ok(completions);
        const fieldNames = completions.map(item => item.label);
        assert.ok(fieldNames.includes('username'));
        assert.ok(fieldNames.includes('email'));
    });

    test('should extract correct model from complex Meta class', async () => {
        const document = await createDocument('forms.py',
            'from django import forms\n' +
            'from .models import User, Post\n' +
            '\n' +
            'class ComplexForm(forms.ModelForm):\n' +
            '    extra_field = forms.CharField()\n' +
            '    \n' +
            '    class Meta:\n' +
            '        model = Post  # Using Post model\n' +
            '        fields = [\''
        );
        const position = new vscode.Position(8, 19);

        const completions = await provider.provideCompletionItems(
            document,
            position,
            new vscode.CancellationTokenSource().token,
            { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: '\'' }
        );

        assert.ok(completions);
        // Should suggest Post fields, not User fields
        const fieldNames = completions.map(item => item.label);
        assert.ok(fieldNames.includes('title'));
        assert.ok(fieldNames.includes('content'));
        assert.ok(!fieldNames.includes('username')); // User field should not be included
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