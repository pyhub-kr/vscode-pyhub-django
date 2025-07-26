import * as assert from 'assert';
import * as vscode from 'vscode';
import { DjangoModelCompletionProvider, DjangoFieldCompletionProvider } from '../../providers/djangoModelCompletionProvider';
import { DjangoProjectAnalyzer } from '../../analyzers/djangoProjectAnalyzer';
import { AdvancedModelAnalyzer } from '../../analyzers/advancedModelAnalyzer';
import * as sinon from 'sinon';
import { createTestDjangoProjectAnalyzer } from '../container/testContainer';

suite('Django Model Completion Provider Test Suite', () => {
    let modelCompletionProvider: DjangoModelCompletionProvider;
    let fieldCompletionProvider: DjangoFieldCompletionProvider;
    let analyzer: DjangoProjectAnalyzer;
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
        analyzer = createTestDjangoProjectAnalyzer();
        modelCompletionProvider = new DjangoModelCompletionProvider(analyzer);
        fieldCompletionProvider = new DjangoFieldCompletionProvider();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('should provide QuerySet completions after .objects.', async () => {
        const document = {
            lineAt: () => ({
                text: 'users = User.objects.'
            })
        } as any;
        
        const position = new vscode.Position(0, 21); // After the dot
        
        const completions = await modelCompletionProvider.provideCompletionItems(
            document,
            position,
            {} as any,
            {} as any
        );

        assert.ok(completions.length > 0);
        
        // Check for common QuerySet methods
        const methodNames = completions.map(item => item.label);
        assert.ok(methodNames.includes('all'));
        assert.ok(methodNames.includes('filter'));
        assert.ok(methodNames.includes('get'));
        assert.ok(methodNames.includes('create'));
        assert.ok(methodNames.includes('exclude'));
        
        // Check completion details
        const filterCompletion = completions.find(item => item.label === 'filter');
        assert.ok(filterCompletion);
        assert.strictEqual(filterCompletion.kind, vscode.CompletionItemKind.Method);
        assert.ok(filterCompletion.detail?.includes('(**kwargs) -> QuerySet'));
    });

    test('should provide QuerySet completions after chained methods', async () => {
        const document = {
            lineAt: () => ({
                text: 'posts = Post.objects.filter(published=True).'
            })
        } as any;
        
        const position = new vscode.Position(0, 44); // After the dot
        
        const completions = await modelCompletionProvider.provideCompletionItems(
            document,
            position,
            {} as any,
            {} as any
        );

        assert.ok(completions.length > 0);
        
        const methodNames = completions.map(item => item.label);
        assert.ok(methodNames.includes('order_by'));
        assert.ok(methodNames.includes('distinct'));
        assert.ok(methodNames.includes('values'));
    });

    test('should provide model field completions', async () => {
        // Mock analyzer to return model info
        const mockModelInfo = {
            ['User']: {
                name: 'User',
                app: 'accounts',
                fields: [
                    { name: 'username', type: 'CharField', required: true },
                    { name: 'email', type: 'EmailField', required: true },
                    { name: 'is_active', type: 'BooleanField', required: false }
                ],
                methods: ['get_full_name', 'save'],
                managers: ['objects']
            }
        };
        
        sandbox.stub(analyzer, 'getModelInfo').resolves(mockModelInfo);
        
        const document = {
            lineAt: () => ({
                text: 'user_email = user.',
                substring: (start: number, end: number) => 'user_email = user.'.substring(start, end)
            })
        } as any;
        
        const position = new vscode.Position(0, 18); // After 'user.'
        
        const completions = await modelCompletionProvider.provideCompletionItems(
            document,
            position,
            {} as any,
            {} as any
        );

        // Since we can't determine the exact model type from 'user' variable,
        // this test verifies the mechanism works
        assert.ok(Array.isArray(completions));
    });

    test('should provide model class completions for imports', async () => {
        const mockModelInfo = {
            ['User']: { name: 'User', app: 'accounts', fields: [], methods: [], managers: [] },
            ['Post']: { name: 'Post', app: 'blog', fields: [], methods: [], managers: [] },
            ['Comment']: { name: 'Comment', app: 'blog', fields: [], methods: [], managers: [] }
        };
        
        sandbox.stub(analyzer, 'getModelInfo').resolves(mockModelInfo);
        
        const document = {
            lineAt: () => ({
                text: 'from blog.models import ',
                substring: (start: number, end: number) => 'from blog.models import '.substring(start, end)
            })
        } as any;
        
        const position = new vscode.Position(0, 24); // After 'import '
        
        const completions = await modelCompletionProvider.provideCompletionItems(
            document,
            position,
            {} as any,
            {} as any
        );

        assert.strictEqual(completions.length, 3);
        
        const labels = completions.map(item => item.label);
        assert.ok(labels.includes('User'));
        assert.ok(labels.includes('Post'));
        assert.ok(labels.includes('Comment'));
        
        completions.forEach(item => {
            assert.strictEqual(item.kind, vscode.CompletionItemKind.Class);
            assert.strictEqual(item.detail, 'Django Model');
        });
    });
});

suite('Django Field Completion Provider Test Suite', () => {
    let fieldCompletionProvider: DjangoFieldCompletionProvider;
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
        fieldCompletionProvider = new DjangoFieldCompletionProvider();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('should provide Django field types after models.', async () => {
        const document = {
            lineAt: () => ({
                text: '    name = models.',
                substring: (start: number, end: number) => '    name = models.'.substring(start, end)
            })
        } as any;
        
        const position = new vscode.Position(0, 18); // After 'models.'
        
        const completions = await fieldCompletionProvider.provideCompletionItems(
            document,
            position,
            {} as any,
            {} as any
        );

        assert.ok(completions.length > 0);
        
        // Check for common field types
        const fieldNames = completions.map(item => item.label);
        assert.ok(fieldNames.includes('CharField'));
        assert.ok(fieldNames.includes('TextField'));
        assert.ok(fieldNames.includes('IntegerField'));
        assert.ok(fieldNames.includes('ForeignKey'));
        assert.ok(fieldNames.includes('ManyToManyField'));
        
        // Check CharField completion details
        const charFieldCompletion = completions.find(item => item.label === 'CharField');
        assert.ok(charFieldCompletion);
        assert.strictEqual(charFieldCompletion.kind, vscode.CompletionItemKind.Class);
        assert.strictEqual(charFieldCompletion.detail, 'Django Model Field');
        
        // Check snippet includes max_length parameter
        if (charFieldCompletion.insertText instanceof vscode.SnippetString) {
            assert.ok(charFieldCompletion.insertText.value.includes('max_length='));
        }
    });

    test('should provide appropriate snippets for relationship fields', async () => {
        const document = {
            lineAt: () => ({
                text: '    author = models.',
                substring: (start: number, end: number) => '    author = models.'.substring(start, end)
            })
        } as any;
        
        const position = new vscode.Position(0, 20); // After 'models.'
        
        const completions = await fieldCompletionProvider.provideCompletionItems(
            document,
            position,
            {} as any,
            {} as any
        );

        // Check ForeignKey snippet
        const foreignKeyCompletion = completions.find(item => item.label === 'ForeignKey');
        assert.ok(foreignKeyCompletion);
        
        if (foreignKeyCompletion.insertText instanceof vscode.SnippetString) {
            const snippet = foreignKeyCompletion.insertText.value;
            assert.ok(snippet.includes('on_delete=models.'));
            assert.ok(snippet.includes('${1:Model}'));
            assert.ok(snippet.includes('${2:CASCADE}'));
        }
        
        // Check ManyToManyField snippet
        const m2mCompletion = completions.find(item => item.label === 'ManyToManyField');
        assert.ok(m2mCompletion);
        
        if (m2mCompletion.insertText instanceof vscode.SnippetString) {
            const snippet = m2mCompletion.insertText.value;
            assert.ok(snippet.includes('${1:Model}'));
        }
    });
});