import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as sinon from 'sinon';
import { DjangoProjectAnalyzer } from '../../../analyzers/djangoProjectAnalyzer';
import { AdvancedModelAnalyzer } from '../../../analyzers/advancedModelAnalyzer';
import { createTestDjangoProjectAnalyzer } from '../../container/testContainer';
import { InMemoryFileSystem } from '../../utils/mockHelpers';

/**
 * Performance Benchmark Tests
 * 
 * These tests measure the performance of various operations
 * to identify bottlenecks and track optimization progress.
 */
suite('Performance Benchmark Tests', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    /**
     * Generate mock Django project structure
     */
    function generateMockProject(numApps: number, modelsPerApp: number, fieldsPerModel: number): { [path: string]: string } {
        const project: { [path: string]: string } = {
            '/test/project/manage.py': '#!/usr/bin/env python\n# Django manage.py'
        };

        for (let app = 0; app < numApps; app++) {
            const appName = `app${app}`;
            
            // Generate models.py
            let modelsContent = 'from django.db import models\n\n';
            for (let model = 0; model < modelsPerApp; model++) {
                modelsContent += `class Model${model}(models.Model):\n`;
                for (let field = 0; field < fieldsPerModel; field++) {
                    modelsContent += `    field${field} = models.CharField(max_length=100)\n`;
                }
                modelsContent += '\n';
            }
            project[`/test/project/${appName}/models.py`] = modelsContent;

            // Generate urls.py
            let urlsContent = 'from django.urls import path\nfrom . import views\n\nurlpatterns = [\n';
            for (let i = 0; i < 10; i++) {
                urlsContent += `    path('${appName}/view${i}/', views.view${i}, name='${appName}_view${i}'),\n`;
            }
            urlsContent += ']\n';
            project[`/test/project/${appName}/urls.py`] = urlsContent;

            // Generate views.py
            let viewsContent = 'from django.shortcuts import render\n\n';
            for (let i = 0; i < 10; i++) {
                viewsContent += `def view${i}(request):\n    return render(request, '${appName}/template${i}.html')\n\n`;
            }
            project[`/test/project/${appName}/views.py`] = viewsContent;
        }

        return project;
    }

    test('Small project initialization performance (<100 files)', async function() {
        this.timeout(10000); // 10 second timeout

        const projectFiles = generateMockProject(5, 5, 5); // ~25 models, ~50 views
        const fs = new InMemoryFileSystem(projectFiles);
        const analyzer = createTestDjangoProjectAnalyzer(fs);

        // Mock workspace
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([{
            uri: vscode.Uri.file('/test/project'),
            name: 'test-project',
            index: 0
        }]);

        // Mock findFiles to return all model files
        const modelFiles = Object.keys(projectFiles)
            .filter(p => p.endsWith('models.py'))
            .map(p => vscode.Uri.file(p));
        sandbox.stub(vscode.workspace, 'findFiles').resolves(modelFiles);

        const startTime = Date.now();
        const initialized = await analyzer.initialize();
        const initTime = Date.now() - startTime;

        assert.strictEqual(initialized, true);
        console.log(`Small project initialization time: ${initTime}ms`);
        assert.ok(initTime < 1000, `Should initialize in less than 1 second (actual: ${initTime}ms)`);
    });

    test('Medium project initialization performance (100-500 files)', async function() {
        this.timeout(20000); // 20 second timeout

        const projectFiles = generateMockProject(20, 10, 10); // ~200 models, ~200 views
        const fs = new InMemoryFileSystem(projectFiles);
        const analyzer = createTestDjangoProjectAnalyzer(fs);

        // Mock workspace
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([{
            uri: vscode.Uri.file('/test/project'),
            name: 'test-project',
            index: 0
        }]);

        // Mock findFiles
        const modelFiles = Object.keys(projectFiles)
            .filter(p => p.endsWith('models.py'))
            .map(p => vscode.Uri.file(p));
        sandbox.stub(vscode.workspace, 'findFiles').resolves(modelFiles);

        const startTime = Date.now();
        const initialized = await analyzer.initialize();
        const initTime = Date.now() - startTime;

        assert.strictEqual(initialized, true);
        console.log(`Medium project initialization time: ${initTime}ms`);
        assert.ok(initTime < 2000, `Should initialize in less than 2 seconds (actual: ${initTime}ms)`);
    });

    test('Large project initialization performance (500-1000 files)', async function() {
        this.timeout(30000); // 30 second timeout

        const projectFiles = generateMockProject(50, 10, 10); // ~500 models, ~500 views
        const fs = new InMemoryFileSystem(projectFiles);
        const analyzer = createTestDjangoProjectAnalyzer(fs);

        // Mock workspace
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([{
            uri: vscode.Uri.file('/test/project'),
            name: 'test-project',
            index: 0
        }]);

        // Mock findFiles
        const modelFiles = Object.keys(projectFiles)
            .filter(p => p.endsWith('models.py'))
            .map(p => vscode.Uri.file(p));
        sandbox.stub(vscode.workspace, 'findFiles').resolves(modelFiles);

        const startTime = Date.now();
        const initialized = await analyzer.initialize();
        const initTime = Date.now() - startTime;

        assert.strictEqual(initialized, true);
        console.log(`Large project initialization time: ${initTime}ms`);
        assert.ok(initTime < 3000, `Should initialize in less than 3 seconds (actual: ${initTime}ms)`);
    });

    test('Model analysis performance', async () => {
        const analyzer = new AdvancedModelAnalyzer();
        
        // Generate a large model file
        let modelCode = 'from django.db import models\n\n';
        for (let i = 0; i < 100; i++) {
            modelCode += `class Model${i}(models.Model):\n`;
            for (let j = 0; j < 20; j++) {
                modelCode += `    field${j} = models.CharField(max_length=100)\n`;
            }
            modelCode += '\n';
        }

        const startTime = Date.now();
        await analyzer.analyzeModelCode(modelCode, 'test/models.py');
        const analysisTime = Date.now() - startTime;

        const models = analyzer.getAllModels();
        assert.strictEqual(Object.keys(models).length, 100);
        console.log(`Model analysis time for 100 models: ${analysisTime}ms`);
        assert.ok(analysisTime < 500, `Should analyze 100 models in less than 500ms (actual: ${analysisTime}ms)`);
    });

    test('Memory usage for caching', async () => {
        const analyzer = new AdvancedModelAnalyzer();
        
        // Get initial memory usage
        const initialMemory = process.memoryUsage().heapUsed;
        
        // Analyze many models
        for (let i = 0; i < 50; i++) {
            const modelCode = `
from django.db import models

class Model${i}(models.Model):
    field1 = models.CharField(max_length=100)
    field2 = models.TextField()
    field3 = models.IntegerField()
    field4 = models.BooleanField()
    field5 = models.DateTimeField()
`;
            await analyzer.analyzeModelCode(modelCode, `app${i}/models.py`);
        }
        
        // Get memory usage after caching
        const finalMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // Convert to MB
        
        console.log(`Memory increase after caching 50 models: ${memoryIncrease.toFixed(2)} MB`);
        assert.ok(memoryIncrease < 50, `Memory increase should be less than 50MB (actual: ${memoryIncrease.toFixed(2)} MB)`);
    });

    test('File change handling performance', async function() {
        this.timeout(10000);

        const projectFiles = generateMockProject(10, 5, 5);
        const fs = new InMemoryFileSystem(projectFiles);
        const analyzer = createTestDjangoProjectAnalyzer(fs);

        // Mock workspace
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([{
            uri: vscode.Uri.file('/test/project'),
            name: 'test-project',
            index: 0
        }]);

        // Initialize first
        await analyzer.initialize();

        // Simulate file change
        const changedModelPath = '/test/project/app0/models.py';
        const updatedContent = `
from django.db import models

class UpdatedModel(models.Model):
    new_field = models.CharField(max_length=200)
`;
        fs.writeFileSync(changedModelPath, updatedContent);

        // Measure update time
        const startTime = Date.now();
        await analyzer['analyzeModels'](changedModelPath); // Call private method directly
        const updateTime = Date.now() - startTime;

        console.log(`File change handling time: ${updateTime}ms`);
        assert.ok(updateTime < 100, `Should handle file changes in less than 100ms (actual: ${updateTime}ms)`);
    });
});