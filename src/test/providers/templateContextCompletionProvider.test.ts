import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { Container } from 'inversify';
import { TYPES } from '../../container/types';
import { TemplateContextCompletionProvider } from '../../providers/templateContextCompletionProvider';
import { ViewContextAnalyzer, ViewContext } from '../../analyzers/viewContextAnalyzer';
import { DjangoProjectAnalyzer } from '../../analyzers/djangoProjectAnalyzer';
import { AdvancedModelAnalyzer } from '../../analyzers/advancedModelAnalyzer';
import { DjangoFormAnalyzer } from '../../analyzers/djangoFormAnalyzer';

suite('TemplateContextCompletionProvider Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let provider: TemplateContextCompletionProvider;
    let mockViewAnalyzer: sinon.SinonStubbedInstance<ViewContextAnalyzer>;
    let mockProjectAnalyzer: sinon.SinonStubbedInstance<DjangoProjectAnalyzer>;
    let mockModelAnalyzer: sinon.SinonStubbedInstance<AdvancedModelAnalyzer>;
    let mockFormAnalyzer: sinon.SinonStubbedInstance<DjangoFormAnalyzer>;

    setup(() => {
        sandbox = sinon.createSandbox();
        
        // Create mocks
        mockViewAnalyzer = sandbox.createStubInstance(ViewContextAnalyzer);
        mockProjectAnalyzer = sandbox.createStubInstance(DjangoProjectAnalyzer);
        mockModelAnalyzer = sandbox.createStubInstance(AdvancedModelAnalyzer);
        mockFormAnalyzer = sandbox.createStubInstance(DjangoFormAnalyzer);
        
        // Create provider with mocks
        provider = new TemplateContextCompletionProvider(
            mockViewAnalyzer as any,
            mockProjectAnalyzer as any,
            mockModelAnalyzer as any,
            mockFormAnalyzer as any
        );
    });

    teardown(() => {
        sandbox.restore();
    });

    function createMockDocument(content: string, fileName: string = 'template.html'): vscode.TextDocument {
        const lines = content.split('\n');
        return {
            fileName: `/project/templates/${fileName}`,
            uri: vscode.Uri.file(`/project/templates/${fileName}`),
            lineAt: (line: number) => ({
                text: lines[line] || ''
            }),
            getText: (range?: vscode.Range) => {
                if (!range) return content;
                return lines.slice(range.start.line, range.end.line + 1).join('\n');
            }
        } as any;
    }

    test('should provide context variables in template', async () => {
        const document = createMockDocument('{{ ', 'blog/post_list.html');
        const position = new vscode.Position(0, 3);
        
        const mockContext: ViewContext = {
            templatePath: 'blog/post_list.html',
            viewFile: '/project/views.py',
            contextVariables: new Map([
                ['posts', { name: 'posts', type: 'QuerySet', value: 'Post.objects.all()' }],
                ['title', { name: 'title', value: "'My Blog'" }]
            ])
        };
        
        mockViewAnalyzer.findContextForTemplate.resolves(mockContext);
        
        const completions = await provider.provideCompletionItems(
            document,
            position,
            {} as vscode.CancellationToken,
            {} as vscode.CompletionContext
        );
        
        assert.ok(completions);
        assert.strictEqual(completions.length >= 2, true);
        
        const postItem = completions.find(item => item.label === 'posts');
        assert.ok(postItem);
        assert.strictEqual(postItem.kind, vscode.CompletionItemKind.Variable);
        assert.strictEqual(postItem.detail, 'QuerySet');
        
        const titleItem = completions.find(item => item.label === 'title');
        assert.ok(titleItem);
    });

    test('should provide properties for QuerySet variables', async () => {
        const document = createMockDocument('{{ posts.', 'blog/post_list.html');
        const position = new vscode.Position(0, 9);
        
        const mockContext: ViewContext = {
            templatePath: 'blog/post_list.html',
            viewFile: '/project/views.py',
            contextVariables: new Map([
                ['posts', { name: 'posts', type: 'QuerySet', value: 'Post.objects.all()' }]
            ])
        };
        
        mockViewAnalyzer.findContextForTemplate.resolves(mockContext);
        
        const completions = await provider.provideCompletionItems(
            document,
            position,
            {} as vscode.CancellationToken,
            {} as vscode.CompletionContext
        );
        
        assert.ok(completions);
        
        // Should have QuerySet methods
        const allMethod = completions.find(item => item.label === 'all');
        assert.ok(allMethod);
        assert.strictEqual(allMethod.kind, vscode.CompletionItemKind.Method);
        
        // Should have common model fields/methods
        const saveMethod = completions.find(item => item.label === 'save');
        assert.ok(saveMethod);
        assert.strictEqual(saveMethod.kind, vscode.CompletionItemKind.Method);
    });

    test('should provide form methods and fields', async () => {
        const document = createMockDocument('{{ form.', 'blog/post_form.html');
        const position = new vscode.Position(0, 8);
        
        const mockContext: ViewContext = {
            templatePath: 'blog/post_form.html',
            viewFile: '/project/views.py',
            contextVariables: new Map([
                ['form', { name: 'form', type: 'Form', value: 'PostForm()' }]
            ])
        };
        
        mockViewAnalyzer.findContextForTemplate.resolves(mockContext);
        
        const completions = await provider.provideCompletionItems(
            document,
            position,
            {} as vscode.CancellationToken,
            {} as vscode.CompletionContext
        );
        
        assert.ok(completions);
        
        // Should have form methods
        const asP = completions.find(item => item.label === 'as_p');
        assert.ok(asP);
        assert.strictEqual(asP.detail, 'Render form as paragraph tags');
        
        // Should have form methods
        const isValidMethod = completions.find(item => item.label === 'is_valid');
        assert.ok(isValidMethod);
        assert.strictEqual(isValidMethod.detail, 'Check if form is valid');
    });

    test('should provide common template variables', async () => {
        const document = createMockDocument('{{ ', 'base.html');
        const position = new vscode.Position(0, 3);
        
        // No context found for this template
        mockViewAnalyzer.findContextForTemplate.resolves(undefined);
        
        const completions = await provider.provideCompletionItems(
            document,
            position,
            {} as vscode.CancellationToken,
            {} as vscode.CompletionContext
        );
        
        // Should still return undefined when no context is found
        assert.strictEqual(completions, undefined);
    });

    test('should detect loop variables', async () => {
        const document = createMockDocument(`
{% for post in posts %}
    {{ 
{% endfor %}`, 'blog/post_list.html');
        const position = new vscode.Position(2, 7);
        
        const mockContext: ViewContext = {
            templatePath: 'blog/post_list.html',
            viewFile: '/project/views.py',
            contextVariables: new Map([
                ['posts', { name: 'posts', type: 'QuerySet' }]
            ])
        };
        
        mockViewAnalyzer.findContextForTemplate.resolves(mockContext);
        
        const completions = await provider.provideCompletionItems(
            document,
            position,
            {} as vscode.CancellationToken,
            {} as vscode.CompletionContext
        );
        
        assert.ok(completions);
        
        // Should have loop variable
        const postVar = completions.find(item => item.label === 'post');
        assert.ok(postVar);
        assert.strictEqual(postVar.detail, "Loop variable from 'for post in posts'");
        
        // Should have forloop variable
        const forloopVar = completions.find(item => item.label === 'forloop');
        assert.ok(forloopVar);
        assert.strictEqual(forloopVar.detail, 'Django forloop object');
    });

    test('should handle nested loops correctly', async () => {
        const document = createMockDocument(`
{% for category in categories %}
    {% for post in category.posts %}
        {{ 
    {% endfor %}
{% endfor %}`, 'blog/nested.html');
        const position = new vscode.Position(3, 11);
        
        const mockContext: ViewContext = {
            templatePath: 'blog/nested.html',
            viewFile: '/project/views.py',
            contextVariables: new Map([
                ['categories', { name: 'categories', type: 'QuerySet' }]
            ])
        };
        
        mockViewAnalyzer.findContextForTemplate.resolves(mockContext);
        
        const completions = await provider.provideCompletionItems(
            document,
            position,
            {} as vscode.CancellationToken,
            {} as vscode.CompletionContext
        );
        
        assert.ok(completions);
        
        // Should have the innermost loop variable
        const postVar = completions.find(item => item.label === 'post');
        assert.ok(postVar);
        assert.ok(postVar.detail?.includes('for post in category.posts'));
    });

    test('should not provide completions outside template variables', async () => {
        const document = createMockDocument('Hello world', 'template.html');
        const position = new vscode.Position(0, 5);
        
        const completions = await provider.provideCompletionItems(
            document,
            position,
            {} as vscode.CancellationToken,
            {} as vscode.CompletionContext
        );
        
        assert.strictEqual(completions, undefined);
    });

    test('should not provide completions for non-Django templates', async () => {
        const document = createMockDocument('{{ var }}', 'script.js');
        const position = new vscode.Position(0, 3);
        
        const completions = await provider.provideCompletionItems(
            document,
            position,
            {} as vscode.CancellationToken,
            {} as vscode.CompletionContext
        );
        
        assert.strictEqual(completions, undefined);
    });

    test('should handle Model instance variables', async () => {
        const document = createMockDocument('{{ post.', 'blog/post_detail.html');
        const position = new vscode.Position(0, 8);
        
        const mockContext: ViewContext = {
            templatePath: 'blog/post_detail.html',
            viewFile: '/project/views.py',
            contextVariables: new Map([
                ['post', { name: 'post', type: 'Model', value: 'get_object_or_404(Post, pk=pk)' }]
            ])
        };
        
        mockViewAnalyzer.findContextForTemplate.resolves(mockContext);
        
        const completions = await provider.provideCompletionItems(
            document,
            position,
            {} as vscode.CancellationToken,
            {} as vscode.CompletionContext
        );
        
        assert.ok(completions);
        
        // Should have common model fields
        const titleField = completions.find(item => item.label === 'title');
        assert.ok(titleField);
        assert.strictEqual(titleField.detail, 'Model field');
        
        // Should have model methods
        const saveMethod = completions.find(item => item.label === 'save');
        assert.ok(saveMethod);
        assert.strictEqual(saveMethod.kind, vscode.CompletionItemKind.Method);
    });
});