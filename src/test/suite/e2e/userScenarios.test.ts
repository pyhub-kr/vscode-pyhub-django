import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as sinon from 'sinon';
import { DjangoProjectAnalyzer } from '../../../analyzers/djangoProjectAnalyzer';
import { AdvancedModelAnalyzer } from '../../../analyzers/advancedModelAnalyzer';
import { EnhancedCompletionProvider } from '../../../providers/enhancedCompletionProvider';
import { UrlPatternAnalyzer } from '../../../analyzers/urlPatternAnalyzer';
import { UrlTagCompletionProvider } from '../../../providers/urlTagCompletionProvider';
import { ManagePyCommandHandler } from '../../../commands/managePyCommandHandler';
import { PythonExecutor, PythonIntegration } from '../../../pythonIntegration';

/**
 * User Scenario-based End-to-End Tests
 * 
 * These tests simulate real user workflows to ensure the extension
 * works correctly in practical scenarios.
 */
suite('E2E - User Scenarios', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    /**
     * Scenario 1: New Developer Setup
     * A developer opens a Django project for the first time
     */
    test('Scenario: New developer opens Django project', async () => {
        // Step 1: Open Django project
        const projectPath = path.join(__dirname, '../../../../test/fixtures/sample-projects/simple-blog');
        const analyzer = new DjangoProjectAnalyzer();
        
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([{
            uri: vscode.Uri.file(projectPath),
            name: 'simple-blog',
            index: 0
        }]);

        // Step 2: Extension auto-detects Django project
        const initialized = await analyzer.initialize();
        assert.strictEqual(initialized, true, 'Should auto-detect Django project');

        // Step 3: Developer starts typing model query
        const modelAnalyzer = new AdvancedModelAnalyzer();
        const completionProvider = new EnhancedCompletionProvider(modelAnalyzer);
        
        // Simulate analyzing the blog models
        const blogModelsPath = path.join(projectPath, 'blog/models.py');
        const mockModelCode = `
from django.db import models

class Post(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
`;
        
        await modelAnalyzer.analyzeModelCode(mockModelCode, blogModelsPath);
        
        // Step 4: Get auto-completion for Post.objects
        const document = {
            languageId: 'python',
            lineAt: () => ({ text: 'posts = Post.objects.' })
        } as any;
        
        const completions = await completionProvider.provideCompletionItems(
            document, 
            new vscode.Position(0, 21), 
            {} as any, 
            {} as any
        );
        
        // Verify Django ORM methods are suggested
        const methodNames = completions.map(c => c.label);
        assert.ok(methodNames.includes('all'), 'Should suggest all() method');
        assert.ok(methodNames.includes('filter'), 'Should suggest filter() method');
        assert.ok(methodNames.includes('get'), 'Should suggest get() method');
    });

    /**
     * Scenario 2: Template Developer Workflow
     * A developer working on Django templates needs URL completions
     */
    test('Scenario: Template developer uses URL tags', async () => {
        const urlAnalyzer = new UrlPatternAnalyzer();
        const urlProvider = new UrlTagCompletionProvider(urlAnalyzer);
        
        // Step 1: URL patterns are analyzed from the project
        const urlsCode = `
from django.urls import path
from . import views

app_name = 'blog'

urlpatterns = [
    path('', views.post_list, name='post_list'),
    path('<slug:post>/', views.post_detail, name='post_detail'),
    path('archive/<int:year>/', views.archive_year, name='archive_year'),
]
`;
        
        await urlAnalyzer.analyzeUrlFile(urlsCode, 'blog/urls.py');
        
        // Step 2: Developer types {% url tag in template
        const templateDoc = {
            languageId: 'django-html',
            lineAt: () => ({ text: '<a href="{% url \'' })
        } as any;
        
        const completions = await urlProvider.provideCompletionItems(
            templateDoc,
            new vscode.Position(0, 17),
            {} as any,
            {} as any
        );
        
        // Step 3: Verify URL names are suggested with app namespace
        const urlNames = completions.map(c => c.label);
        assert.ok(urlNames.includes('blog:post_list'), 'Should suggest namespaced URL');
        assert.ok(urlNames.includes('blog:post_detail'), 'Should suggest URL with parameters');
        
        // Step 4: Check parameter hints are provided
        const postDetailCompletion = completions.find(c => c.label === 'blog:post_detail');
        assert.ok(postDetailCompletion?.documentation?.toString().includes('slug:post'), 
            'Should show parameter information');
    });

    /**
     * Scenario 3: Backend Developer Running Commands
     * A developer frequently uses manage.py commands
     */
    test('Scenario: Backend developer runs manage.py commands', async () => {
        const pythonIntegration = new PythonIntegration({} as any);
        const pythonExecutor = new PythonExecutor(pythonIntegration);
        const commandHandler = new ManagePyCommandHandler(pythonExecutor);
        
        // Mock Python integration
        sandbox.stub(pythonIntegration, 'getCurrentPythonPath').returns('/usr/bin/python3');
        sandbox.stub(pythonExecutor, 'runDjangoManageCommand').resolves(`
Available subcommands:

[django]
    check
    makemigrations
    migrate
    runserver
    shell
    test
`);
        
        // Step 1: Developer opens command palette
        const availableCommands = await commandHandler.getAvailableCommands();
        
        // Step 2: Common commands should be available
        assert.ok(availableCommands.includes('runserver'), 'Should have runserver');
        assert.ok(availableCommands.includes('makemigrations'), 'Should have makemigrations');
        assert.ok(availableCommands.includes('migrate'), 'Should have migrate');
        
        // Step 3: Get quick pick items with descriptions
        const quickPickItems = await commandHandler.getCommandQuickPickItems();
        
        const runserverItem = quickPickItems.find(item => item.label === 'runserver');
        assert.ok(runserverItem, 'Should have runserver in quick pick');
        assert.strictEqual(
            runserverItem?.description, 
            'Start the development server',
            'Should have helpful description'
        );
        
        // Step 4: Check command history feature
        commandHandler['addToHistory']('migrate', ['--fake']);
        const history = commandHandler.getCommandHistory();
        
        assert.strictEqual(history.length, 1, 'Should track command history');
        assert.strictEqual(history[0].command, 'migrate', 'Should remember command');
        assert.deepStrictEqual(history[0].args, ['--fake'], 'Should remember arguments');
    });

    /**
     * Scenario 4: Full-Stack Developer Workflow
     * A developer working across models, views, templates, and URLs
     */
    test('Scenario: Full-stack developer workflow', async () => {
        // Initialize all analyzers
        const projectAnalyzer = new DjangoProjectAnalyzer();
        const modelAnalyzer = new AdvancedModelAnalyzer();
        const urlAnalyzer = new UrlPatternAnalyzer();
        
        // Step 1: Working with models
        const modelCode = `
from django.db import models
from django.contrib.auth.models import User

class Article(models.Model):
    title = models.CharField(max_length=200)
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    published = models.BooleanField(default=False)
    
    def get_absolute_url(self):
        return reverse('article:detail', kwargs={'pk': self.pk})
`;
        
        await modelAnalyzer.analyzeModelCode(modelCode, 'articles/models.py');
        
        // Step 2: Creating URLs
        const urlCode = `
from django.urls import path
from . import views

app_name = 'article'

urlpatterns = [
    path('', views.ArticleListView.as_view(), name='list'),
    path('<int:pk>/', views.ArticleDetailView.as_view(), name='detail'),
    path('create/', views.ArticleCreateView.as_view(), name='create'),
]
`;
        
        await urlAnalyzer.analyzeUrlFile(urlCode, 'articles/urls.py');
        
        // Step 3: Verify cross-feature integration
        const models = modelAnalyzer.getAllModels();
        assert.ok('Article' in models, 'Should track Article model');
        
        const urls = urlAnalyzer.getAllUrlPatterns();
        assert.strictEqual(urls.length, 3, 'Should track all URL patterns');
        assert.ok(urls.some(u => u.name === 'detail' && u.appName === 'article'), 
            'Should have article:detail URL');
        
        // Step 4: Check that model methods can reference URLs
        const articleModel = models['Article'];
        assert.ok(articleModel.methods.some(m => m.name === 'get_absolute_url'),
            'Should detect get_absolute_url method');
    });
});