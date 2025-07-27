import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { mock, instance, when, anything } from 'ts-mockito';
import { DjangoDefinitionProvider } from '../../providers/djangoDefinitionProvider';
import { DjangoProjectAnalyzer } from '../../analyzers/djangoProjectAnalyzer';
import { UrlPatternAnalyzer, UrlPattern } from '../../analyzers/urlPatternAnalyzer';

suite('Django Definition Provider Test Suite', () => {
    let provider: DjangoDefinitionProvider;
    let mockProjectAnalyzer: DjangoProjectAnalyzer;
    let mockUrlAnalyzer: UrlPatternAnalyzer;

    setup(() => {
        mockProjectAnalyzer = mock(DjangoProjectAnalyzer);
        mockUrlAnalyzer = mock(UrlPatternAnalyzer);
        
        provider = new DjangoDefinitionProvider(
            instance(mockProjectAnalyzer),
            instance(mockUrlAnalyzer)
        );
    });

    test('Should find URL pattern definition from template URL tag', async () => {
        // Create a mock URL pattern
        const mockUrlPattern: UrlPattern = {
            name: 'post-detail',
            pattern: 'posts/<int:pk>/',
            params: ['pk'],
            filePath: '/test/project/blog/urls.py',
            view: 'views.PostDetailView.as_view()'
        };

        // Mock the URL analyzer to return our pattern
        when(mockUrlAnalyzer.getUrlPattern('post-detail', undefined)).thenReturn(mockUrlPattern);

        // Create a test document for Django template
        const templateContent = `{% extends "base.html" %}
{% block content %}
    <a href="{% url 'post-detail' pk=post.pk %}">View Post</a>
{% endblock %}`;

        const testDoc = await createTestDocument(templateContent, 'django-html');
        
        // Position cursor on 'post-detail'
        const position = new vscode.Position(2, 20); // Line 2, after {% url '
        
        // Get definition
        const definition = await provider.provideDefinition(testDoc, position, new vscode.CancellationTokenSource().token);
        
        // Assert
        assert.ok(definition instanceof vscode.Location);
        assert.strictEqual((definition as vscode.Location).uri.fsPath, mockUrlPattern.filePath);
    });

    test('Should find view definition from urls.py', async () => {
        // Create a test document for urls.py
        const urlsContent = `from django.urls import path
from . import views

urlpatterns = [
    path('', views.PostListView.as_view(), name='post-list'),
    path('<int:pk>/', views.PostDetailView.as_view(), name='post-detail'),
]`;

        const testDoc = await createTestDocument(urlsContent, 'python');
        
        // Position cursor on 'PostListView'
        const position = new vscode.Position(4, 20); // Line 4, on PostListView
        
        // Mock file system to simulate finding the view
        const originalReadFile = fs.promises.readFile;
        (fs.promises as any).readFile = async (filePath: string) => {
            if (filePath.endsWith('views.py')) {
                return `from django.views.generic import ListView, DetailView
from .models import Post

class PostListView(ListView):
    model = Post
    template_name = 'blog/post_list.html'

class PostDetailView(DetailView):
    model = Post
    template_name = 'blog/post_detail.html'`;
            }
            return originalReadFile(filePath, 'utf8');
        };

        // Get definition
        const definition = await provider.provideDefinition(testDoc, position, new vscode.CancellationTokenSource().token);
        
        // Restore original readFile
        (fs.promises as any).readFile = originalReadFile;
        
        // Assert
        assert.ok(definition instanceof vscode.Location);
    });

    test('Should find template file from view reference', async () => {
        // Create a test document for views.py
        const viewsContent = `from django.shortcuts import render

def post_list(request):
    return render(request, 'blog/post_list.html', {'posts': []})

class PostDetailView(DetailView):
    template_name = 'blog/post_detail.html'`;

        const testDoc = await createTestDocument(viewsContent, 'python');
        
        // Position cursor on template path in render function
        const position = new vscode.Position(3, 30); // Line 3, on 'blog/post_list.html'
        
        // Mock workspace.findFiles to simulate finding template
        const originalFindFiles = vscode.workspace.findFiles;
        (vscode.workspace as any).findFiles = async (pattern: string) => {
            if (pattern.includes('blog/post_list.html')) {
                return [vscode.Uri.file('/test/project/templates/blog/post_list.html')];
            }
            return [];
        };

        // Get definition
        const definition = await provider.provideDefinition(testDoc, position, new vscode.CancellationTokenSource().token);
        
        // Restore original findFiles
        (vscode.workspace as any).findFiles = originalFindFiles;
        
        // Assert
        assert.ok(definition instanceof vscode.Location);
    });
});

async function createTestDocument(content: string, languageId: string): Promise<vscode.TextDocument> {
    const uri = vscode.Uri.parse(`untitled:test.${languageId === 'django-html' ? 'html' : 'py'}`);
    const document = await vscode.workspace.openTextDocument(uri);
    const edit = new vscode.WorkspaceEdit();
    edit.insert(uri, new vscode.Position(0, 0), content);
    await vscode.workspace.applyEdit(edit);
    return document;
}