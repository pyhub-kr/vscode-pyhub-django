import * as assert from 'assert';
import * as vscode from 'vscode';
import { AdvancedModelAnalyzer } from '../../../analyzers/advancedModelAnalyzer';
import { EnhancedCompletionProvider } from '../../../providers/enhancedCompletionProvider';
import { UrlPatternAnalyzer } from '../../../analyzers/urlPatternAnalyzer';
import { UrlTagCompletionProvider } from '../../../providers/urlTagCompletionProvider';

suite('E2E - Performance Benchmarks', () => {
    const PERFORMANCE_THRESHOLD = 100; // 100ms threshold for auto-completion

    test('should provide model completions within performance threshold', async () => {
        const analyzer = new AdvancedModelAnalyzer();
        const provider = new EnhancedCompletionProvider(analyzer);
        
        // Pre-populate with test data
        const modelCode = `
from django.db import models

class LargeModel(models.Model):
    ${Array.from({length: 50}, (_, i) => `field_${i} = models.CharField(max_length=100)`).join('\n    ')}
    
    def method_1(self): pass
    def method_2(self): pass
    def method_3(self): pass
`;
        
        await analyzer.analyzeModelCode(modelCode, 'test/models.py');
        
        // Measure completion time
        const document = {
            languageId: 'python',
            lineAt: () => ({ text: 'model = LargeModel(); model.' })
        } as any;
        
        const position = new vscode.Position(0, 28);
        
        const startTime = Date.now();
        const completions = await provider.provideCompletionItems(
            document, position, {} as any, {} as any
        );
        const endTime = Date.now();
        
        const executionTime = endTime - startTime;
        
        assert.ok(completions.length > 50, 'Should provide many completions');
        assert.ok(
            executionTime < PERFORMANCE_THRESHOLD,
            `Completion should be faster than ${PERFORMANCE_THRESHOLD}ms, but took ${executionTime}ms`
        );
    });

    test('should provide URL completions within performance threshold', async () => {
        const analyzer = new UrlPatternAnalyzer();
        const provider = new UrlTagCompletionProvider(analyzer);
        
        // Pre-populate with many URL patterns
        const urlsCode = `
from django.urls import path
from . import views

urlpatterns = [
    ${Array.from({length: 100}, (_, i) => `path('path${i}/', views.view_${i}, name='view_${i}'),`).join('\n    ')}
]
`;
        
        await analyzer.analyzeUrlFile(urlsCode, 'test/urls.py');
        
        // Measure completion time
        const document = {
            languageId: 'django-html',
            lineAt: () => ({ text: "{% url '" })
        } as any;
        
        const position = new vscode.Position(0, 8);
        
        const startTime = Date.now();
        const completions = await provider.provideCompletionItems(
            document, position, {} as any, {} as any
        );
        const endTime = Date.now();
        
        const executionTime = endTime - startTime;
        
        assert.ok(completions.length === 100, 'Should provide all URL completions');
        assert.ok(
            executionTime < PERFORMANCE_THRESHOLD,
            `URL completion should be faster than ${PERFORMANCE_THRESHOLD}ms, but took ${executionTime}ms`
        );
    });

    test('should handle large project analysis efficiently', async () => {
        const analyzer = new AdvancedModelAnalyzer();
        
        // Simulate a large project with many models
        const startTime = Date.now();
        
        for (let i = 0; i < 20; i++) {
            const modelCode = `
from django.db import models

class Model${i}(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def get_display_name(self):
        return f"{self.name} (Model ${i})"
`;
            await analyzer.analyzeModelCode(modelCode, `app${i}/models.py`);
        }
        
        const endTime = Date.now();
        const analysisTime = endTime - startTime;
        
        // Should analyze 20 model files in reasonable time
        assert.ok(
            analysisTime < 1000,
            `Large project analysis should be faster than 1000ms, but took ${analysisTime}ms`
        );
        
        // Check memory efficiency - all models should be stored
        const models = analyzer.getAllModels();
        assert.strictEqual(Object.keys(models).length, 20, 'Should store all 20 models');
    });

    test('should measure memory usage for caching', () => {
        const analyzer = new AdvancedModelAnalyzer();
        
        // Get initial memory usage
        const initialMemory = process.memoryUsage().heapUsed;
        
        // Add many models to cache
        for (let i = 0; i < 100; i++) {
            const model = {
                name: `Model${i}`,
                fields: Array.from({length: 20}, (_, j) => ({
                    name: `field_${j}`,
                    type: 'CharField',
                    helpText: `Help text for field ${j}`
                })),
                methods: [],
                properties: [],
                managers: ['objects'],
                filePath: `app/models${i}.py`,
                baseClasses: ['models.Model']
            };
            
            (analyzer as any).models.set(model.name, model);
        }
        
        // Get memory after caching
        const finalMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // Convert to MB
        
        // Memory increase should be reasonable (less than 10MB for 100 models)
        assert.ok(
            memoryIncrease < 10,
            `Memory usage should be less than 10MB, but increased by ${memoryIncrease.toFixed(2)}MB`
        );
    });
});