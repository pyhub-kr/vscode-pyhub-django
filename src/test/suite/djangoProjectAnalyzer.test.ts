import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DjangoProjectAnalyzer } from '../../analyzers/djangoProjectAnalyzer';
import { AdvancedModelAnalyzer } from '../../analyzers/advancedModelAnalyzer';
import * as sinon from 'sinon';
import { InMemoryFileSystem, createMockWorkspaceFolder } from '../utils/mockHelpers';
import { createTestDjangoProjectAnalyzer } from '../container/testContainer';

suite('Django Project Analyzer Test Suite', () => {
    let analyzer: DjangoProjectAnalyzer;
    let sandbox: sinon.SinonSandbox;
    let mockFileSystem: InMemoryFileSystem;

    setup(() => {
        sandbox = sinon.createSandbox();
        mockFileSystem = new InMemoryFileSystem();
        analyzer = createTestDjangoProjectAnalyzer(mockFileSystem);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('should detect Django project with manage.py in root', async () => {
        const testWorkspaceFolder = createMockWorkspaceFolder('/test/django/project', 'test-project');

        // Setup mock file system
        mockFileSystem.writeFileSync('/test/django/project/manage.py', '#!/usr/bin/env python');
        
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([testWorkspaceFolder]);

        const result = await analyzer.initialize();

        assert.strictEqual(result, true);
        assert.strictEqual(analyzer.getProjectRoot(), '/test/django/project');
    });

    test('should return false when no Django project is found', async () => {
        const testWorkspaceFolder = createMockWorkspaceFolder('/test/non-django/project', 'test-project');

        // No manage.py file in the mock file system
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([testWorkspaceFolder]);

        const result = await analyzer.initialize();

        assert.strictEqual(result, false);
        assert.strictEqual(analyzer.getProjectRoot(), undefined);
    });

    test('should extract models from model file content', async () => {
        const modelContent = `
from django.db import models

class User(models.Model):
    username = models.CharField(max_length=100)
    email = models.EmailField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def get_full_name(self):
        return self.username

class Post(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.ForeignKey(User, on_delete=models.CASCADE)
`;

        // Setup mock file system with Django project structure
        mockFileSystem.writeFileSync('/test/django/project/manage.py', '#!/usr/bin/env python');
        mockFileSystem.writeFileSync('/test/django/project/myapp/models.py', modelContent);
        
        // Mock workspace setup
        const testWorkspaceFolder = createMockWorkspaceFolder('/test/django/project', 'test-project');
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([testWorkspaceFolder]);
        
        await analyzer.initialize();
        await (analyzer as any).analyzeModels('/test/django/project/myapp/models.py');

        const models = await analyzer.getModelInfo();
        
        assert.strictEqual(Object.keys(models).length, 2);
        assert.ok('User' in models);
        assert.ok('Post' in models);
        
        const userModel = models['User'];
        assert.strictEqual(userModel.name, 'User');
        assert.strictEqual(userModel.app, 'myapp');
        assert.strictEqual(userModel.fields.length, 3);
        assert.strictEqual(userModel.fields[0].name, 'username');
        assert.strictEqual(userModel.fields[0].type, 'CharField');
    });

    test('should extract URL patterns from urls file', async () => {
        const urlsContent = `
from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('about/', views.about, name='about'),
    path('post/<int:pk>/', views.post_detail, name='post_detail'),
]
`;

        // Setup mock file system
        mockFileSystem.writeFileSync('/test/django/project/manage.py', '#!/usr/bin/env python');
        mockFileSystem.writeFileSync('/test/django/project/myapp/urls.py', urlsContent);
        
        // Mock workspace setup
        const testWorkspaceFolder = createMockWorkspaceFolder('/test/django/project', 'test-project');
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([testWorkspaceFolder]);
        
        await analyzer.initialize();
        await (analyzer as any).analyzeUrls('/test/django/project/myapp/urls.py');

        const patterns = await analyzer.getUrlPatterns();
        
        console.log('Found URL patterns:', patterns);
        assert.strictEqual(patterns.length, 3);
        
        const indexPattern = patterns.find(p => p.name === 'index');
        assert.ok(indexPattern);
        assert.strictEqual(indexPattern.pattern, '');
        assert.strictEqual(indexPattern.view, 'views.index');
    });

    test('should extract installed apps from settings file', async () => {
        const settingsContent = `
# Django settings
DEBUG = True

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Local apps
    'myapp',
    'accounts',
    'blog',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
]
`;

        // Setup mock file system
        mockFileSystem.writeFileSync('/test/django/project/manage.py', '#!/usr/bin/env python');
        mockFileSystem.writeFileSync('/test/django/project/myproject/settings.py', settingsContent);
        
        // Mock workspace setup
        const testWorkspaceFolder = createMockWorkspaceFolder('/test/django/project', 'test-project');
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([testWorkspaceFolder]);
        
        await analyzer.initialize();
        await (analyzer as any).analyzeSettings('/test/django/project/myproject/settings.py');

        const installedApps = analyzer.getInstalledApps();
        
        assert.strictEqual(installedApps.length, 9);
        assert.ok(installedApps.includes('django.contrib.admin'));
        assert.ok(installedApps.includes('myapp'));
        assert.ok(installedApps.includes('accounts'));
        assert.ok(installedApps.includes('blog'));
    });

    test('should handle file changes and update cache', async () => {
        const initialModelContent = `
from django.db import models

class User(models.Model):
    username = models.CharField(max_length=100)
`;

        const updatedModelContent = `
from django.db import models

class User(models.Model):
    username = models.CharField(max_length=100)
    email = models.EmailField()
`;

        // Setup mock file system with initial content
        mockFileSystem.writeFileSync('/test/django/project/manage.py', '#!/usr/bin/env python');
        mockFileSystem.writeFileSync('/test/django/project/myapp/models.py', initialModelContent);
        
        // Mock workspace setup
        const testWorkspaceFolder = createMockWorkspaceFolder('/test/django/project', 'test-project');
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([testWorkspaceFolder]);
        
        await analyzer.initialize();
        
        // Initial analysis
        await (analyzer as any).analyzeModels('/test/django/project/myapp/models.py');
        let models = await analyzer.getModelInfo();
        assert.strictEqual(models['User'].fields.length, 1);
        
        // Simulate file change by updating the mock file system
        mockFileSystem.writeFileSync('/test/django/project/myapp/models.py', updatedModelContent);
        await (analyzer as any).onPythonFileChanged(vscode.Uri.file('/test/django/project/myapp/models.py'));
        
        // Check updated model
        models = await analyzer.getModelInfo();
        assert.strictEqual(models['User'].fields.length, 2);
        assert.strictEqual(models['User'].fields[1].name, 'email');
    });
});