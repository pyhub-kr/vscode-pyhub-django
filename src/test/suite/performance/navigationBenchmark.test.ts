import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { EnhancedUrlPatternAnalyzer } from '../../../analyzers/enhancedUrlPatternAnalyzer';
import { EnhancedDjangoDefinitionProvider } from '../../../providers/enhancedDjangoDefinitionProvider';
import { EnhancedFileWatcherService } from '../../../services/enhancedFileWatcherService';
import { DjangoProjectAnalyzer } from '../../../analyzers/djangoProjectAnalyzer';
import sinon from 'sinon';

suite('Cross-file Navigation Performance Benchmarks', () => {
    let sandbox: sinon.SinonSandbox;
    let fileWatcherService: EnhancedFileWatcherService;
    let urlAnalyzer: EnhancedUrlPatternAnalyzer;
    let definitionProvider: EnhancedDjangoDefinitionProvider;
    let projectAnalyzer: DjangoProjectAnalyzer;
    
    const PERFORMANCE_THRESHOLDS = {
        goToDefinition: 100,      // 100ms for Go to Definition
        initialScan: 5000,        // 5s for initial scan of 1000 URLs
        incrementalUpdate: 50,    // 50ms for incremental update
        cacheHit: 10             // 10ms for cached results
    };

    setup(() => {
        sandbox = sinon.createSandbox();
        
        // Mock extension context
        const mockContext = {
            subscriptions: []
        } as any;
        
        // Create services
        fileWatcherService = new EnhancedFileWatcherService(mockContext);
        urlAnalyzer = new EnhancedUrlPatternAnalyzer(fileWatcherService);
        projectAnalyzer = new DjangoProjectAnalyzer(mockContext);
        definitionProvider = new EnhancedDjangoDefinitionProvider(projectAnalyzer, urlAnalyzer);
    });

    teardown(() => {
        sandbox.restore();
        fileWatcherService.dispose();
    });

    test('Go to Definition performance with 1000+ URL patterns', async () => {
        // Generate large URL file
        const urlPatterns = generateLargeUrlFile(1000);
        await urlAnalyzer.analyzeUrlFile(urlPatterns, '/test/urls.py');
        
        // Create mock document
        const mockDocument = {
            languageId: 'django-html',
            lineAt: () => ({ text: "{% url 'pattern_500' %}" }),
            getText: () => "{% url 'pattern_500' %}",
            getWordRangeAtPosition: () => new vscode.Range(0, 8, 0, 19),
            uri: vscode.Uri.file('/test/template.html')
        } as any;
        
        const position = new vscode.Position(0, 15);
        const token = { isCancellationRequested: false } as any;
        
        // Measure performance
        const startTime = Date.now();
        const definition = await definitionProvider.provideDefinition(mockDocument, position, token);
        const endTime = Date.now();
        
        const executionTime = endTime - startTime;
        
        assert.ok(definition, 'Should find definition');
        assert.ok(
            executionTime < PERFORMANCE_THRESHOLDS.goToDefinition,
            `Go to Definition should be faster than ${PERFORMANCE_THRESHOLDS.goToDefinition}ms, but took ${executionTime}ms`
        );
    });

    test('Initial workspace scan performance', async () => {
        // Mock findFiles to return many URL files
        const mockFiles: vscode.Uri[] = [];
        for (let i = 0; i < 50; i++) {
            mockFiles.push(vscode.Uri.file(`/test/app${i}/urls.py`));
        }
        
        sandbox.stub(vscode.workspace, 'findFiles').resolves(mockFiles);
        
        // Mock openTextDocument
        sandbox.stub(vscode.workspace, 'openTextDocument').callsFake((options: any) => {
            const uri = options as vscode.Uri;
            const appIndex = parseInt(uri.path.match(/app(\d+)/)?.[1] || '0');
            return Promise.resolve({
                getText: () => generateUrlFileForApp(appIndex, 20)
            } as any);
        });
        
        // Measure scan time
        const startTime = Date.now();
        await (urlAnalyzer as any).scanWorkspaceIncremental();
        const endTime = Date.now();
        
        const scanTime = endTime - startTime;
        const patterns = await urlAnalyzer.getAllUrlPatterns();
        
        assert.equal(patterns.length, 1000, 'Should find all patterns');
        assert.ok(
            scanTime < PERFORMANCE_THRESHOLDS.initialScan,
            `Initial scan should be faster than ${PERFORMANCE_THRESHOLDS.initialScan}ms, but took ${scanTime}ms`
        );
    });

    test('Incremental update performance', async () => {
        // Pre-populate analyzer
        const initialContent = generateLargeUrlFile(100);
        await urlAnalyzer.analyzeUrlFile(initialContent, '/test/urls.py');
        
        // Update with new pattern
        const updatedContent = initialContent + "\n    path('new-pattern/', views.new_view, name='new_pattern'),";
        
        // Measure update time
        const startTime = Date.now();
        await urlAnalyzer.analyzeUrlFile(updatedContent, '/test/urls.py');
        const endTime = Date.now();
        
        const updateTime = endTime - startTime;
        
        assert.ok(
            updateTime < PERFORMANCE_THRESHOLDS.incrementalUpdate,
            `Incremental update should be faster than ${PERFORMANCE_THRESHOLDS.incrementalUpdate}ms, but took ${updateTime}ms`
        );
    });

    test('Cache hit performance', async () => {
        // Pre-populate and warm cache
        const content = generateLargeUrlFile(100);
        await urlAnalyzer.analyzeUrlFile(content, '/test/urls.py');
        
        // Access same file again (should hit cache)
        const startTime = Date.now();
        await urlAnalyzer.analyzeUrlFile(content, '/test/urls.py');
        const endTime = Date.now();
        
        const cacheHitTime = endTime - startTime;
        
        assert.ok(
            cacheHitTime < PERFORMANCE_THRESHOLDS.cacheHit,
            `Cache hit should be faster than ${PERFORMANCE_THRESHOLDS.cacheHit}ms, but took ${cacheHitTime}ms`
        );
    });

    test('Memory usage optimization', async () => {
        // Generate very large dataset
        const urlFiles = 100;
        const patternsPerFile = 50;
        
        // Analyze many files
        for (let i = 0; i < urlFiles; i++) {
            const content = generateUrlFileForApp(i, patternsPerFile);
            await urlAnalyzer.analyzeUrlFile(content, `/test/app${i}/urls.py`);
        }
        
        // Check cache statistics
        const metrics = urlAnalyzer.getPerformanceMetrics();
        
        assert.ok(metrics.cacheHits > 0, 'Should have cache hits');
        assert.ok(metrics.parseTime < 10000, 'Total parse time should be reasonable');
    });

    test('Pattern search performance', async () => {
        // Generate patterns with predictable names
        const patterns = generateSearchableUrlFile(1000);
        await urlAnalyzer.analyzeUrlFile(patterns, '/test/urls.py');
        
        // Test search performance
        const searchTerms = ['user', 'post', 'comment', 'api'];
        
        for (const term of searchTerms) {
            const startTime = Date.now();
            const results = await urlAnalyzer.searchPatterns(term, 50);
            const endTime = Date.now();
            
            const searchTime = endTime - startTime;
            
            assert.ok(results.length > 0, `Should find patterns matching '${term}'`);
            assert.ok(
                searchTime < 20,
                `Pattern search should be faster than 20ms, but took ${searchTime}ms`
            );
        }
    });

    test('Go to Definition with cached results', async () => {
        // Pre-populate analyzer
        const urlContent = generateLargeUrlFile(500);
        await urlAnalyzer.analyzeUrlFile(urlContent, '/test/urls.py');
        
        // Create mock document
        const mockDocument = {
            languageId: 'django-html',
            lineAt: () => ({ text: "{% url 'pattern_250' %}" }),
            getText: () => "{% url 'pattern_250' %}",
            getWordRangeAtPosition: () => new vscode.Range(0, 8, 0, 19),
            uri: vscode.Uri.file('/test/template.html')
        } as any;
        
        const position = new vscode.Position(0, 15);
        const token = { isCancellationRequested: false } as any;
        
        // First call (cache miss)
        await definitionProvider.provideDefinition(mockDocument, position, token);
        
        // Second call (cache hit)
        const startTime = Date.now();
        const definition = await definitionProvider.provideDefinition(mockDocument, position, token);
        const endTime = Date.now();
        
        const cacheHitTime = endTime - startTime;
        
        assert.ok(definition, 'Should find definition from cache');
        assert.ok(
            cacheHitTime < PERFORMANCE_THRESHOLDS.cacheHit,
            `Cached Go to Definition should be faster than ${PERFORMANCE_THRESHOLDS.cacheHit}ms, but took ${cacheHitTime}ms`
        );
    });
});

// Helper functions
function generateLargeUrlFile(patternCount: number): string {
    const patterns: string[] = [
        "from django.urls import path",
        "from . import views",
        "",
        "app_name = 'testapp'",
        "",
        "urlpatterns = ["
    ];
    
    for (let i = 0; i < patternCount; i++) {
        patterns.push(`    path('pattern-${i}/', views.view_${i}, name='pattern_${i}'),`);
    }
    
    patterns.push("]");
    return patterns.join('\n');
}

function generateUrlFileForApp(appIndex: number, patternCount: number): string {
    const patterns: string[] = [
        "from django.urls import path",
        "from . import views",
        "",
        `app_name = 'app${appIndex}'`,
        "",
        "urlpatterns = ["
    ];
    
    for (let i = 0; i < patternCount; i++) {
        patterns.push(`    path('route-${i}/', views.view_${i}, name='view_${i}'),`);
    }
    
    patterns.push("]");
    return patterns.join('\n');
}

function generateSearchableUrlFile(patternCount: number): string {
    const categories = ['user', 'post', 'comment', 'api', 'admin'];
    const patterns: string[] = [
        "from django.urls import path",
        "from . import views",
        "",
        "urlpatterns = ["
    ];
    
    for (let i = 0; i < patternCount; i++) {
        const category = categories[i % categories.length];
        const action = ['list', 'detail', 'create', 'update', 'delete'][i % 5];
        patterns.push(`    path('${category}/${action}/', views.${category}_${action}, name='${category}_${action}'),`);
    }
    
    patterns.push("]");
    return patterns.join('\n');
}