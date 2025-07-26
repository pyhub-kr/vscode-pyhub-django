import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { UrlPatternAnalyzer } from '../../analyzers/urlPatternAnalyzer';
import { UrlTagCompletionProvider } from '../../providers/urlTagCompletionProvider';

suite('URL Tag Completion Test Suite', () => {
    let analyzer: UrlPatternAnalyzer;
    let completionProvider: UrlTagCompletionProvider;
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
        analyzer = new UrlPatternAnalyzer();
        completionProvider = new UrlTagCompletionProvider(analyzer);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('should parse basic URL patterns with names', async () => {
        const urlsCode = `
from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='home'),
    path('about/', views.about, name='about'),
    path('contact/', views.contact, name='contact'),
    path('blog/<int:id>/', views.blog_detail, name='blog_detail'),
]
`;

        await analyzer.analyzeUrlFile(urlsCode, 'myapp/urls.py');
        
        const patterns = analyzer.getAllUrlPatterns();
        assert.strictEqual(patterns.length, 4);
        assert.ok(patterns.some(p => p.name === 'home'));
        assert.ok(patterns.some(p => p.name === 'about'));
        assert.ok(patterns.some(p => p.name === 'contact'));
        assert.ok(patterns.some(p => p.name === 'blog_detail'));
    });

    test('should handle included URL patterns', async () => {
        const mainUrlsCode = `
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('blog/', include('blog.urls')),
]
`;

        const blogUrlsCode = `
from django.urls import path
from . import views

app_name = 'blog'

urlpatterns = [
    path('', views.post_list, name='post_list'),
    path('<int:pk>/', views.post_detail, name='post_detail'),
    path('create/', views.post_create, name='post_create'),
]
`;

        await analyzer.analyzeUrlFile(mainUrlsCode, 'myproject/urls.py');
        await analyzer.analyzeUrlFile(blogUrlsCode, 'blog/urls.py');
        
        const patterns = analyzer.getAllUrlPatterns();
        const blogPatterns = patterns.filter(p => p.appName === 'blog');
        
        assert.strictEqual(blogPatterns.length, 3);
        assert.ok(blogPatterns.some(p => p.name === 'post_list'));
        assert.ok(blogPatterns.some(p => p.name === 'post_detail'));
        assert.ok(blogPatterns.some(p => p.name === 'post_create'));
    });

    test('should provide completions in Django template {% url %} tag', async () => {
        const urlsCode = `
from django.urls import path
from . import views

urlpatterns = [
    path('home/', views.home, name='home'),
    path('profile/', views.profile, name='user_profile'),
    path('settings/', views.settings, name='user_settings'),
]
`;

        await analyzer.analyzeUrlFile(urlsCode, 'app/urls.py');

        // Test completion in {% url '' %}
        const document = {
            languageId: 'django-html',
            lineAt: () => ({
                text: "<a href=\"{% url '"
            })
        } as any;
        
        const position = new vscode.Position(0, 16);
        const completions = await completionProvider.provideCompletionItems(
            document, position, {} as any, {} as any
        );

        const urlNames = completions.map(item => item.label);
        assert.ok(urlNames.includes('home'));
        assert.ok(urlNames.includes('user_profile'));
        assert.ok(urlNames.includes('user_settings'));
    });

    test('should provide completions with app_name prefix', async () => {
        const urlsCode = `
from django.urls import path
from . import views

app_name = 'blog'

urlpatterns = [
    path('', views.index, name='index'),
    path('post/<int:pk>/', views.detail, name='detail'),
]
`;

        await analyzer.analyzeUrlFile(urlsCode, 'blog/urls.py');

        const document = {
            languageId: 'django-html',
            lineAt: () => ({
                text: "{% url '"
            })
        } as any;
        
        const position = new vscode.Position(0, 8);
        const completions = await completionProvider.provideCompletionItems(
            document, position, {} as any, {} as any
        );

        const urlNames = completions.map(item => item.label);
        assert.ok(urlNames.includes('blog:index'));
        assert.ok(urlNames.includes('blog:detail'));
    });

    test('should handle re_path and regex patterns', async () => {
        const urlsCode = `
from django.urls import path, re_path
from . import views

urlpatterns = [
    re_path(r'^article/(?P<year>[0-9]{4})/$', views.year_archive, name='year_archive'),
    re_path(r'^article/(?P<year>[0-9]{4})/(?P<month>[0-9]{2})/$', views.month_archive, name='month_archive'),
]
`;

        await analyzer.analyzeUrlFile(urlsCode, 'app/urls.py');
        
        const patterns = analyzer.getAllUrlPatterns();
        assert.strictEqual(patterns.length, 2);
        assert.ok(patterns.some(p => p.name === 'year_archive' && p.params.includes('year')));
        assert.ok(patterns.some(p => p.name === 'month_archive' && p.params.includes('year') && p.params.includes('month')));
    });

    test('should provide parameter hints for URL patterns', async () => {
        const urlsCode = `
from django.urls import path
from . import views

urlpatterns = [
    path('user/<int:user_id>/', views.user_detail, name='user_detail'),
    path('post/<slug:slug>/', views.post_detail, name='post_detail'),
]
`;

        await analyzer.analyzeUrlFile(urlsCode, 'app/urls.py');

        const document = {
            languageId: 'django-html',
            lineAt: () => ({
                text: "{% url 'user_detail'"
            })
        } as any;
        
        const position = new vscode.Position(0, 20);
        const completions = await completionProvider.provideCompletionItems(
            document, position, {} as any, {} as any
        );

        const userDetailCompletion = completions.find(item => item.label === 'user_detail');
        assert.ok(userDetailCompletion);
        assert.ok(userDetailCompletion.documentation);
        assert.ok(userDetailCompletion.documentation.toString().includes('user_id'));
    });

    test('should watch for URL file changes and update patterns', async () => {
        const initialCode = `
from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='home'),
]
`;

        await analyzer.analyzeUrlFile(initialCode, 'app/urls.py');
        let patterns = analyzer.getAllUrlPatterns();
        assert.strictEqual(patterns.length, 1);

        // Simulate file change with new URL
        const updatedCode = `
from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='home'),
    path('new/', views.new_view, name='new_page'),
]
`;

        await analyzer.analyzeUrlFile(updatedCode, 'app/urls.py');
        patterns = analyzer.getAllUrlPatterns();
        assert.strictEqual(patterns.length, 2);
        assert.ok(patterns.some(p => p.name === 'new_page'));
    });

    test('should handle class-based views', async () => {
        const urlsCode = `
from django.urls import path
from .views import HomeView, AboutView

urlpatterns = [
    path('', HomeView.as_view(), name='home'),
    path('about/', AboutView.as_view(), name='about'),
]
`;

        await analyzer.analyzeUrlFile(urlsCode, 'app/urls.py');
        
        const patterns = analyzer.getAllUrlPatterns();
        assert.strictEqual(patterns.length, 2);
        assert.ok(patterns.some(p => p.name === 'home'));
        assert.ok(patterns.some(p => p.name === 'about'));
    });

    test('should provide completions in different template syntaxes', async () => {
        const urlsCode = `
from django.urls import path
from . import views

urlpatterns = [
    path('test/', views.test, name='test_view'),
]
`;

        await analyzer.analyzeUrlFile(urlsCode, 'app/urls.py');

        // Test with double quotes
        let document = {
            languageId: 'django-html',
            lineAt: () => ({
                text: '{% url "'
            })
        } as any;
        
        let position = new vscode.Position(0, 8);
        let completions = await completionProvider.provideCompletionItems(
            document, position, {} as any, {} as any
        );

        assert.ok(completions.some(item => item.label === 'test_view'));

        // Test with reverse function
        document = {
            languageId: 'python',
            lineAt: () => ({
                text: "reverse('"
            })
        } as any;
        
        position = new vscode.Position(0, 9);
        completions = await completionProvider.provideCompletionItems(
            document, position, {} as any, {} as any
        );

        assert.ok(completions.some(item => item.label === 'test_view'));
    });

    test('should cache analysis results for performance', async () => {
        const urlsCode = `
from django.urls import path
from . import views

urlpatterns = [
    ${Array.from({length: 50}, (_, i) => `path('path${i}/', views.view${i}, name='view_${i}'),`).join('\n    ')}
]
`;

        const startTime = Date.now();
        await analyzer.analyzeUrlFile(urlsCode, 'app/urls.py');
        const firstAnalysisTime = Date.now() - startTime;

        // Second analysis should be much faster due to caching
        const secondStartTime = Date.now();
        await analyzer.analyzeUrlFile(urlsCode, 'app/urls.py');
        const secondAnalysisTime = Date.now() - secondStartTime;

        assert.ok(secondAnalysisTime < firstAnalysisTime / 2, 
            `Cache should make second analysis faster. First: ${firstAnalysisTime}ms, Second: ${secondAnalysisTime}ms`);
    });
});