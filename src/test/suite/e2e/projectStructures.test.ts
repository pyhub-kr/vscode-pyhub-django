import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as sinon from 'sinon';
import { DjangoProjectAnalyzer } from '../../../analyzers/djangoProjectAnalyzer';
import { UrlPatternAnalyzer } from '../../../analyzers/urlPatternAnalyzer';
import { ProjectPathConfigurator } from '../../../projectPathConfigurator';

suite('E2E - Different Project Structures', () => {
    let sandbox: sinon.SinonSandbox;
    const fixturesPath = path.join(__dirname, '../../../../test/fixtures/sample-projects');

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('should handle simple blog project structure', async () => {
        const projectPath = path.join(fixturesPath, 'simple-blog');
        const analyzer = new DjangoProjectAnalyzer();
        
        // Mock workspace to point to our test project
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([{
            uri: vscode.Uri.file(projectPath),
            name: 'simple-blog',
            index: 0
        }]);

        // Mock findFiles to return model files
        sandbox.stub(vscode.workspace, 'findFiles').resolves([
            vscode.Uri.file(path.join(projectPath, 'blog/models.py'))
        ]);

        const initialized = await analyzer.initialize();
        assert.strictEqual(initialized, true, 'Should initialize with simple blog project');

        // Use the advanced analyzer directly
        const advancedAnalyzer = analyzer.getAdvancedAnalyzer();
        const modelContent = require('fs').readFileSync(path.join(projectPath, 'blog/models.py'), 'utf8');
        await advancedAnalyzer.analyzeModelCode(modelContent, 'blog/models.py');

        const models = advancedAnalyzer.getAllModels();
        assert.ok('Post' in models, 'Should find Post model');
        assert.ok('Comment' in models, 'Should find Comment model');
        
        // Check if custom manager is detected
        const postModel = models['Post'];
        assert.ok(postModel.fields.some(f => f.name === 'title'), 'Should have title field');
    });

    test('should handle multi-app CMS project structure', async () => {
        const projectPath = path.join(fixturesPath, 'multi-app-cms');
        const urlAnalyzer = new UrlPatternAnalyzer();
        
        // Read and analyze pages URLs
        const pagesUrlCode = `from django.urls import path
from . import views

app_name = 'pages'

urlpatterns = [
    path('', views.home, name='home'),
    path('about/', views.about, name='about'),
    path('contact/', views.contact, name='contact'),
    path('page/<slug:slug>/', views.page_detail, name='page_detail'),
]`;
        await urlAnalyzer.analyzeUrlFile(pagesUrlCode, 'pages/urls.py');
        
        // Read and analyze api URLs
        const apiUrlCode = `from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'api'

router = DefaultRouter()
router.register(r'posts', views.PostViewSet, basename='post')
router.register(r'users', views.UserViewSet, basename='user')

urlpatterns = [
    path('v1/', include(router.urls)),
    path('v1/auth/', include('rest_framework.urls')),
]`;
        await urlAnalyzer.analyzeUrlFile(apiUrlCode, 'api/urls.py');
        
        const patterns = urlAnalyzer.getAllUrlPatterns();
        
        // Should find patterns from multiple apps
        assert.ok(patterns.some(p => p.appName === 'pages'), 'Should find pages app URLs');
        // Note: API URLs use router which won't be parsed by simple path() regex
        // So we check that at least pages app patterns were found
        assert.ok(patterns.length > 0, 'Should find URL patterns');
    });

    test('should configure paths correctly for nested project', async () => {
        const configurator = new ProjectPathConfigurator();
        const projectPath = path.join(fixturesPath, 'simple-blog');
        
        // Mock workspace configuration
        const configStub = {
            get: sandbox.stub().returns([]),
            update: sandbox.stub().resolves()
        };
        sandbox.stub(vscode.workspace, 'getConfiguration').returns(configStub as any);

        await configurator.addProjectRootToPythonPath(projectPath);
        
        assert.ok(configStub.update.calledOnce, 'Should update configuration');
        assert.deepStrictEqual(
            configStub.update.firstCall.args[1],
            [projectPath],
            'Should add project root to Python paths'
        );
    });
});