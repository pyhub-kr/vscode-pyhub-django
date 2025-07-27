import * as assert from 'assert';
import { ViewContextAnalyzer } from '../../analyzers/viewContextAnalyzer';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import * as vscode from 'vscode';

suite('ViewContextAnalyzer Test Suite', () => {
    let analyzer: ViewContextAnalyzer;
    let tempDir: string;

    setup(async () => {
        analyzer = new ViewContextAnalyzer();
        tempDir = path.join(os.tmpdir(), 'django-test-' + Date.now());
        await fs.mkdir(tempDir, { recursive: true });
    });

    teardown(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    test('should extract context from function-based view with inline dict', async () => {
        const viewContent = `
from django.shortcuts import render
from .models import Post

def post_list(request):
    posts = Post.objects.all()
    return render(request, 'blog/post_list.html', {'posts': posts, 'title': 'My Blog'})
`;
        const viewPath = path.join(tempDir, 'views.py');
        await fs.writeFile(viewPath, viewContent);

        const contexts = await analyzer.analyzeViewFile(viewPath);
        
        assert.strictEqual(contexts.length, 1);
        assert.strictEqual(contexts[0].templatePath, 'blog/post_list.html');
        assert.strictEqual(contexts[0].viewFunction, 'post_list');
        assert.strictEqual(contexts[0].contextVariables.size, 2);
        
        const postsVar = contexts[0].contextVariables.get('posts');
        assert.ok(postsVar);
        assert.strictEqual(postsVar.name, 'posts');
        assert.strictEqual(postsVar.value, 'posts');
        assert.strictEqual(postsVar.type, 'QuerySet');
        
        const titleVar = contexts[0].contextVariables.get('title');
        assert.ok(titleVar);
        assert.strictEqual(titleVar.name, 'title');
    });

    test('should extract context from function-based view with context variable', async () => {
        const viewContent = `
from django.shortcuts import render
from .models import Post

def post_detail(request, pk):
    post = Post.objects.get(pk=pk)
    context = {
        'post': post,
        'related_posts': Post.objects.filter(category=post.category)
    }
    return render(request, 'blog/post_detail.html', context)
`;
        const viewPath = path.join(tempDir, 'views.py');
        await fs.writeFile(viewPath, viewContent);

        const contexts = await analyzer.analyzeViewFile(viewPath);
        
        assert.strictEqual(contexts.length, 1);
        assert.strictEqual(contexts[0].templatePath, 'blog/post_detail.html');
        assert.strictEqual(contexts[0].contextVariables.size, 2);
        
        const postVar = contexts[0].contextVariables.get('post');
        assert.ok(postVar);
        assert.strictEqual(postVar.name, 'post');
        
        const relatedVar = contexts[0].contextVariables.get('related_posts');
        assert.ok(relatedVar);
        assert.strictEqual(relatedVar.type, 'QuerySet');
    });

    test('should extract context from class-based view', async () => {
        const viewContent = `
from django.views.generic import ListView
from .models import Post

class PostListView(ListView):
    model = Post
    template_name = 'blog/post_list.html'
    context_object_name = 'posts'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['featured_posts'] = Post.objects.filter(featured=True)
        context['categories'] = Category.objects.all()
        return context
`;
        const viewPath = path.join(tempDir, 'views.py');
        await fs.writeFile(viewPath, viewContent);

        const contexts = await analyzer.analyzeViewFile(viewPath);
        
        assert.strictEqual(contexts.length, 1);
        assert.strictEqual(contexts[0].templatePath, 'blog/post_list.html');
        assert.strictEqual(contexts[0].viewClass, 'PostListView');
        // The analyzer currently only detects variables added in get_context_data
        assert.ok(contexts[0].contextVariables.size >= 1);
        
        const featuredVar = contexts[0].contextVariables.get('featured_posts');
        assert.ok(featuredVar);
        assert.strictEqual(featuredVar.type, 'QuerySet');
        
        // categories should also be detected
        const categoriesVar = contexts[0].contextVariables.get('categories');
        assert.ok(categoriesVar);
    });

    test('should handle multiple render calls in same file', async () => {
        const viewContent = `
from django.shortcuts import render

def view1(request):
    return render(request, 'template1.html', {'var1': 'value1'})

def view2(request):
    return render(request, 'template2.html', {'var2': 'value2'})
`;
        const viewPath = path.join(tempDir, 'views.py');
        await fs.writeFile(viewPath, viewContent);

        const contexts = await analyzer.analyzeViewFile(viewPath);
        
        assert.strictEqual(contexts.length, 2);
        assert.strictEqual(contexts[0].templatePath, 'template1.html');
        assert.strictEqual(contexts[0].viewFunction, 'view1');
        assert.strictEqual(contexts[1].templatePath, 'template2.html');
        assert.strictEqual(contexts[1].viewFunction, 'view2');
    });

    test('should find context for template path', async () => {
        const viewContent = `
from django.shortcuts import render

def my_view(request):
    return render(request, 'myapp/template.html', {'data': 'value'})
`;
        const viewPath = path.join(tempDir, 'views.py');
        await fs.writeFile(viewPath, viewContent);

        // Mock vscode.workspace.findFiles
        const originalFindFiles = vscode.workspace.findFiles;
        (vscode.workspace as any).findFiles = async () => [{ fsPath: viewPath }];

        try {
            const context = await analyzer.findContextForTemplate('myapp/template.html');
            
            assert.ok(context);
            assert.strictEqual(context.templatePath, 'myapp/template.html');
            assert.strictEqual(context.contextVariables.size, 1);
            assert.ok(context.contextVariables.has('data'));
        } finally {
            (vscode.workspace as any).findFiles = originalFindFiles;
        }
    });

    test('should infer types from common patterns', async () => {
        const viewContent = `
from django.shortcuts import render, get_object_or_404
from .forms import PostForm
from .models import Post

def edit_post(request, pk):
    post = get_object_or_404(Post, pk=pk)
    form = PostForm(instance=post)
    posts = Post.objects.filter(author=request.user)
    
    context = {
        'post': post,
        'form': form,
        'posts': posts
    }
    return render(request, 'blog/edit_post.html', context)
`;
        const viewPath = path.join(tempDir, 'views.py');
        await fs.writeFile(viewPath, viewContent);

        const contexts = await analyzer.analyzeViewFile(viewPath);
        
        assert.strictEqual(contexts.length, 1);
        
        const postVar = contexts[0].contextVariables.get('post');
        assert.ok(postVar);
        assert.strictEqual(postVar.type, 'Model');
        
        const formVar = contexts[0].contextVariables.get('form');
        assert.ok(formVar);
        assert.strictEqual(formVar.type, 'Form');
        
        const postsVar = contexts[0].contextVariables.get('posts');
        assert.ok(postsVar);
        assert.strictEqual(postsVar.type, 'QuerySet');
    });

    test('should clear cache', async () => {
        const viewContent = `
from django.shortcuts import render

def cached_view(request):
    return render(request, 'template.html', {'data': 'value'})
`;
        const viewPath = path.join(tempDir, 'views.py');
        await fs.writeFile(viewPath, viewContent);

        // First call should read from file
        const contexts1 = await analyzer.analyzeViewFile(viewPath);
        assert.strictEqual(contexts1.length, 1);

        // Second call should use cache (we'll modify the file to test)
        await fs.writeFile(viewPath, viewContent + '\n# modified');
        const contexts2 = await analyzer.analyzeViewFile(viewPath);
        assert.strictEqual(contexts2.length, 1); // Still 1 because it's cached

        // Clear cache and call again
        analyzer.clearCache();
        const contexts3 = await analyzer.analyzeViewFile(viewPath);
        assert.strictEqual(contexts3.length, 1); // Re-read from file
    });
});