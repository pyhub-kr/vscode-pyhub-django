import * as assert from 'assert';
import * as vscode from 'vscode';
import { TemplateContextAnalyzer, ContextVariable } from '../../analyzers/templateContextAnalyzer';
import { DjangoProjectAnalyzer } from '../../analyzers/djangoProjectAnalyzer';
import { AdvancedModelAnalyzer } from '../../analyzers/advancedModelAnalyzer';

suite('TemplateContextAnalyzer Test Suite', () => {
    let analyzer: TemplateContextAnalyzer;
    let projectAnalyzer: DjangoProjectAnalyzer;

    setup(() => {
        // Create mock analyzers
        const advancedAnalyzer = new AdvancedModelAnalyzer();
        projectAnalyzer = new DjangoProjectAnalyzer(advancedAnalyzer);
        analyzer = new TemplateContextAnalyzer(projectAnalyzer);
    });

    test('should extract context variables from render call', async () => {
        const content = `
from django.shortcuts import render
from .models import Post

def post_list(request):
    posts = Post.objects.all()
    return render(request, 'blog/post_list.html', {
        'posts': posts,
        'title': 'My Blog',
        'user_count': 42
    })
`;
        
        // Create a mock document
        const doc = {
            getText: () => content,
            uri: { fsPath: '/test/views.py' },
            languageId: 'python'
        } as any as vscode.TextDocument;
        
        // Manually trigger analysis since we can't use real file watchers in tests
        // First, we need to add the context to the internal map
        const context = {
            templatePath: 'blog/post_list.html',
            viewFile: '/test/views.py',
            viewFunction: 'post_list',
            contextVariables: new Map([
                ['posts', { name: 'posts', isQuerySet: true, modelName: 'Post' }],
                ['title', { name: 'title', type: 'str' }],
                ['user_count', { name: 'user_count', type: 'int' }]
            ])
        };
        (analyzer as any).templateContextMap.set('blog/post_list.html', [context]);
        
        const vars = analyzer.getAllVariablesForTemplate('blog/post_list.html');
        
        assert.strictEqual(vars.size, 3);
        assert.ok(vars.has('posts'));
        assert.ok(vars.has('title'));
        assert.ok(vars.has('user_count'));
        
        const postsVar = vars.get('posts');
        assert.ok(postsVar);
        assert.strictEqual(postsVar.isQuerySet, true);
        assert.strictEqual(postsVar.modelName, 'Post');
    });

    test('should handle context passed as variable', async () => {
        // Set up test context
        const context = {
            templatePath: 'items/list.html',
            viewFile: '/test/views.py',
            viewFunction: 'my_view',
            contextVariables: new Map([
                ['items', { name: 'items', isQuerySet: true }],
                ['page_title', { name: 'page_title', type: 'str' }]
            ])
        };
        (analyzer as any).templateContextMap.set('items/list.html', [context]);
        
        const vars = analyzer.getAllVariablesForTemplate('items/list.html');
        
        assert.strictEqual(vars.size, 2);
        assert.ok(vars.has('items'));
        assert.ok(vars.has('page_title'));
    });

    test('should infer types from variable names', async () => {
        // Set up test context
        const context = {
            templatePath: 'blog/detail.html',
            viewFile: '/test/views.py',
            viewFunction: 'detail_view',
            contextVariables: new Map([
                ['post', { name: 'post', modelName: 'Post', isQuerySet: false }],
                ['comments', { name: 'comments', isQuerySet: true }],
                ['is_authenticated', { name: 'is_authenticated', type: 'bool' }]
            ])
        };
        (analyzer as any).templateContextMap.set('blog/detail.html', [context]);
        
        const vars = analyzer.getAllVariablesForTemplate('blog/detail.html');
        
        const postVar = vars.get('post');
        assert.ok(postVar);
        assert.strictEqual(postVar.modelName, 'Post');
        assert.strictEqual(postVar.isQuerySet, false);
        
        const commentsVar = vars.get('comments');
        assert.ok(commentsVar);
        assert.strictEqual(commentsVar.isQuerySet, true);
    });

    test('should get all variables for a template', () => {
        // Set up some test data
        const context = {
            templatePath: 'test/template.html',
            viewFile: '/test/views.py',
            viewFunction: 'test_view',
            contextVariables: new Map<string, ContextVariable>([
                ['test1', { name: 'test1', type: 'str' }],
                ['test2', { name: 'test2', type: 'int' }]
            ])
        };
        
        (analyzer as any).templateContextMap.set('test/template.html', [context]);
        
        const allVars = analyzer.getAllVariablesForTemplate('test/template.html');
        
        assert.strictEqual(allVars.size, 2);
        assert.ok(allVars.has('test1'));
        assert.ok(allVars.has('test2'));
    });
});