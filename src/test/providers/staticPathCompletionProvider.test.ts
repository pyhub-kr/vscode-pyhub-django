import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { StaticPathCompletionProvider } from '../../providers/staticPathCompletionProvider';
import { StaticFileAnalyzer } from '../../analyzers/staticFileAnalyzer';

suite('StaticPathCompletionProvider Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let provider: StaticPathCompletionProvider;
    let mockAnalyzer: sinon.SinonStubbedInstance<StaticFileAnalyzer>;

    setup(() => {
        sandbox = sinon.createSandbox();
        
        // Create mock analyzer
        mockAnalyzer = sandbox.createStubInstance(StaticFileAnalyzer);
        
        // Create provider instance
        provider = new StaticPathCompletionProvider(mockAnalyzer as any);
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
            getText: () => content
        } as any;
    }

    test('should provide static file completions in static tag', async () => {
        const document = createMockDocument(`{% load static %}
<link rel="stylesheet" href="{% static '`);
        const position = new vscode.Position(1, 40);
        
        // Mock static files
        mockAnalyzer.getStaticFiles.returns([
            { relativePath: 'css/style.css', absolutePath: '/static/css/style.css', type: 'css', size: 1024 },
            { relativePath: 'js/app.js', absolutePath: '/static/js/app.js', type: 'js', size: 2048 },
            { relativePath: 'images/logo.png', absolutePath: '/static/images/logo.png', type: 'image', size: 5120 }
        ]);
        
        const completions = await provider.provideCompletionItems(
            document,
            position,
            {} as vscode.CancellationToken,
            {} as vscode.CompletionContext
        );
        
        assert.ok(completions);
        assert.strictEqual(completions.length, 6); // 3 directories + 3 files
        
        // Check for directories
        const cssDir = completions.find(item => item.label.toString().includes('css/'));
        assert.ok(cssDir);
        assert.strictEqual(cssDir.kind, vscode.CompletionItemKind.Folder);
        
        // Check for files
        const styleFile = completions.find(item => item.label.toString().includes('style.css'));
        assert.ok(styleFile);
        assert.strictEqual(styleFile.kind, vscode.CompletionItemKind.File);
    });

    test('should filter completions based on current path', async () => {
        const document = createMockDocument(`{% load static %}
<link rel="stylesheet" href="{% static 'css/`);
        const position = new vscode.Position(1, 44);
        
        // Mock static files
        mockAnalyzer.getStaticFiles.returns([
            { relativePath: 'css/style.css', absolutePath: '/static/css/style.css', type: 'css', size: 1024 },
            { relativePath: 'css/admin.css', absolutePath: '/static/css/admin.css', type: 'css', size: 2048 },
            { relativePath: 'js/app.js', absolutePath: '/static/js/app.js', type: 'js', size: 2048 }
        ]);
        
        const completions = await provider.provideCompletionItems(
            document,
            position,
            {} as vscode.CancellationToken,
            {} as vscode.CompletionContext
        );
        
        assert.ok(completions);
        // Should only show files in css/ directory
        assert.strictEqual(completions.length, 2);
        assert.ok(completions.every(item => item.label.toString().includes('.css')));
    });

    test('should show file icons based on type', async () => {
        const document = createMockDocument(`{% load static %}
<img src="{% static '`);
        const position = new vscode.Position(1, 21);
        
        // Mock static files
        mockAnalyzer.getStaticFiles.returns([
            { relativePath: 'style.css', absolutePath: '/static/style.css', type: 'css', size: 1024 },
            { relativePath: 'app.js', absolutePath: '/static/app.js', type: 'js', size: 2048 },
            { relativePath: 'logo.png', absolutePath: '/static/logo.png', type: 'image', size: 5120 },
            { relativePath: 'font.woff', absolutePath: '/static/font.woff', type: 'font', size: 8192 }
        ]);
        
        const completions = await provider.provideCompletionItems(
            document,
            position,
            {} as vscode.CancellationToken,
            {} as vscode.CompletionContext
        );
        
        assert.ok(completions);
        
        // Check file icons
        const cssFile = completions.find(item => item.label.toString().includes('style.css'));
        assert.ok(cssFile?.label.toString().includes('$(file-code)'));
        
        const imageFile = completions.find(item => item.label.toString().includes('logo.png'));
        assert.ok(imageFile?.label.toString().includes('$(file-media)'));
        
        const fontFile = completions.find(item => item.label.toString().includes('font.woff'));
        assert.ok(fontFile?.label.toString().includes('$(file-binary)'));
    });

    test('should not provide completions without {% load static %}', async () => {
        const document = createMockDocument(`<link rel="stylesheet" href="{% static '`);
        const position = new vscode.Position(0, 40);
        
        const completions = await provider.provideCompletionItems(
            document,
            position,
            {} as vscode.CancellationToken,
            {} as vscode.CompletionContext
        );
        
        assert.strictEqual(completions, undefined);
    });

    test('should not provide completions outside static tag', async () => {
        const document = createMockDocument(`{% load static %}
<div>Hello world</div>`);
        const position = new vscode.Position(1, 10);
        
        const completions = await provider.provideCompletionItems(
            document,
            position,
            {} as vscode.CancellationToken,
            {} as vscode.CompletionContext
        );
        
        assert.strictEqual(completions, undefined);
    });

    test('should show nested directory structure', async () => {
        const document = createMockDocument(`{% load static %}
<link rel="stylesheet" href="{% static 'css/components/`);
        const position = new vscode.Position(1, 55);
        
        // Mock static files
        mockAnalyzer.getStaticFiles.returns([
            { relativePath: 'css/components/header.css', absolutePath: '/static/css/components/header.css', type: 'css', size: 1024 },
            { relativePath: 'css/components/footer.css', absolutePath: '/static/css/components/footer.css', type: 'css', size: 1024 },
            { relativePath: 'css/components/nav/main.css', absolutePath: '/static/css/components/nav/main.css', type: 'css', size: 1024 }
        ]);
        
        const completions = await provider.provideCompletionItems(
            document,
            position,
            {} as vscode.CancellationToken,
            {} as vscode.CompletionContext
        );
        
        assert.ok(completions);
        assert.strictEqual(completions.length, 3); // 2 files + 1 directory
        
        // Check for nested directory
        const navDir = completions.find(item => item.label.toString().includes('nav/'));
        assert.ok(navDir);
        assert.strictEqual(navDir.kind, vscode.CompletionItemKind.Folder);
    });

    test('should include file size in documentation', async () => {
        const document = createMockDocument(`{% load static %}
<link rel="stylesheet" href="{% static '`);
        const position = new vscode.Position(1, 40);
        
        // Mock static files
        mockAnalyzer.getStaticFiles.returns([
            { relativePath: 'style.css', absolutePath: '/static/style.css', type: 'css', size: 512 },
            { relativePath: 'large.css', absolutePath: '/static/large.css', type: 'css', size: 1048576 }
        ]);
        
        const completions = await provider.provideCompletionItems(
            document,
            position,
            {} as vscode.CancellationToken,
            {} as vscode.CompletionContext
        );
        
        assert.ok(completions);
        
        const smallFile = completions.find(item => item.label.toString().includes('style.css'));
        assert.ok(smallFile);
        assert.strictEqual(smallFile.documentation, 'Size: 512 B');
        
        const largeFile = completions.find(item => item.label.toString().includes('large.css'));
        assert.ok(largeFile);
        assert.strictEqual(largeFile.documentation, 'Size: 1.0 MB');
    });

    test('should trigger re-completion for directories', async () => {
        const document = createMockDocument(`{% load static %}
<link rel="stylesheet" href="{% static '`);
        const position = new vscode.Position(1, 40);
        
        // Mock static files
        mockAnalyzer.getStaticFiles.returns([
            { relativePath: 'css/style.css', absolutePath: '/static/css/style.css', type: 'css', size: 1024 }
        ]);
        
        const completions = await provider.provideCompletionItems(
            document,
            position,
            {} as vscode.CancellationToken,
            {} as vscode.CompletionContext
        );
        
        assert.ok(completions);
        
        const cssDir = completions.find(item => item.label.toString().includes('css/'));
        assert.ok(cssDir);
        assert.ok(cssDir.command);
        assert.strictEqual(cssDir.command.command, 'editor.action.triggerSuggest');
    });
});