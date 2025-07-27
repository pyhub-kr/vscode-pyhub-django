import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { Container } from 'inversify';
import { TYPES } from '../../container/types';
import { StaticFileAnalyzer } from '../../analyzers/staticFileAnalyzer';
import { DjangoProjectAnalyzer } from '../../analyzers/djangoProjectAnalyzer';

suite('StaticFileAnalyzer Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let analyzer: StaticFileAnalyzer;
    let mockProjectAnalyzer: sinon.SinonStubbedInstance<DjangoProjectAnalyzer>;

    setup(() => {
        sandbox = sinon.createSandbox();
        
        // Create mock project analyzer
        mockProjectAnalyzer = sandbox.createStubInstance(DjangoProjectAnalyzer);
        
        // Create analyzer instance
        analyzer = new StaticFileAnalyzer(mockProjectAnalyzer as any);
    });

    teardown(() => {
        sandbox.restore();
        analyzer.dispose();
    });

    test('should initialize and scan static directories', async () => {
        // Mock project roots
        mockProjectAnalyzer.getProjectRoot.returns('/project');
        
        // Mock file system operations
        const existsSyncStub = sandbox.stub(fs, 'existsSync');
        existsSyncStub.withArgs('/project/static').returns(true);
        existsSyncStub.withArgs('/project/settings.py').returns(true);
        
        const readFileSyncStub = sandbox.stub(fs, 'readFileSync');
        readFileSyncStub.withArgs('/project/settings.py').returns(`
STATICFILES_DIRS = [
    '/project/assets',
    'custom_static'
]
        `);
        
        const readdirSyncStub = sandbox.stub(fs, 'readdirSync');
        readdirSyncStub.withArgs('/project/static').returns([
            { name: 'css', isDirectory: () => true },
            { name: 'style.css', isDirectory: () => false }
        ] as any);
        readdirSyncStub.withArgs('/project/static/css').returns([
            { name: 'main.css', isDirectory: () => false }
        ] as any);
        readdirSyncStub.withArgs('/project/assets').returns([]);
        readdirSyncStub.withArgs('/project/custom_static').returns([]);
        
        const statSyncStub = sandbox.stub(fs, 'statSync');
        statSyncStub.returns({ size: 1024 } as any);
        
        // Mock vscode.workspace.findFiles
        const findFilesStub = sandbox.stub(vscode.workspace, 'findFiles');
        findFilesStub.resolves([]);
        
        await analyzer.initialize();
        
        const files = analyzer.getStaticFiles();
        assert.strictEqual(files.length > 0, true);
        
        // Check if files were properly categorized
        const cssFiles = files.filter(f => f.type === 'css');
        assert.strictEqual(cssFiles.length >= 1, true);
    });

    test('should correctly categorize file types', async () => {
        // Test the getFileType method indirectly through file analysis
        mockProjectAnalyzer.getProjectRoot.returns('/project');
        
        const existsSyncStub = sandbox.stub(fs, 'existsSync');
        existsSyncStub.returns(true);
        
        const readFileSyncStub = sandbox.stub(fs, 'readFileSync');
        readFileSyncStub.returns('STATICFILES_DIRS = []');
        
        const testFiles = [
            { name: 'style.css', type: 'css' },
            { name: 'script.js', type: 'js' },
            { name: 'logo.png', type: 'image' },
            { name: 'font.woff2', type: 'font' },
            { name: 'data.json', type: 'other' }
        ];
        
        const readdirSyncStub = sandbox.stub(fs, 'readdirSync');
        readdirSyncStub.withArgs('/project/static').returns(
            testFiles.map(f => ({ name: f.name, isDirectory: () => false })) as any
        );
        
        const statSyncStub = sandbox.stub(fs, 'statSync');
        statSyncStub.returns({ size: 1024 } as any);
        
        const findFilesStub = sandbox.stub(vscode.workspace, 'findFiles');
        findFilesStub.resolves([]);
        
        await analyzer.initialize();
        
        const files = analyzer.getStaticFiles();
        
        // Verify each file type
        testFiles.forEach(testFile => {
            const file = files.find(f => f.relativePath === testFile.name);
            assert.ok(file, `File ${testFile.name} should exist`);
            assert.strictEqual(file?.type, testFile.type, `File ${testFile.name} should be type ${testFile.type}`);
        });
    });

    test('should search static files', async () => {
        mockProjectAnalyzer.getProjectRoot.returns('/project');
        
        const existsSyncStub = sandbox.stub(fs, 'existsSync');
        existsSyncStub.returns(true);
        
        const readFileSyncStub = sandbox.stub(fs, 'readFileSync');
        readFileSyncStub.returns('STATICFILES_DIRS = []');
        
        const readdirSyncStub = sandbox.stub(fs, 'readdirSync');
        readdirSyncStub.withArgs('/project/static').returns([
            { name: 'css', isDirectory: () => true },
            { name: 'js', isDirectory: () => true }
        ] as any);
        readdirSyncStub.withArgs('/project/static/css').returns([
            { name: 'main.css', isDirectory: () => false },
            { name: 'admin.css', isDirectory: () => false }
        ] as any);
        readdirSyncStub.withArgs('/project/static/js').returns([
            { name: 'app.js', isDirectory: () => false }
        ] as any);
        
        const statSyncStub = sandbox.stub(fs, 'statSync');
        statSyncStub.returns({ size: 1024 } as any);
        
        const findFilesStub = sandbox.stub(vscode.workspace, 'findFiles');
        findFilesStub.resolves([]);
        
        await analyzer.initialize();
        
        // Test search functionality
        const cssResults = analyzer.searchStaticFiles('css');
        assert.strictEqual(cssResults.length >= 2, true);
        assert.ok(cssResults.some(f => f.relativePath.includes('main.css')));
        
        const jsResults = analyzer.searchStaticFiles('.js');
        assert.strictEqual(jsResults.length >= 1, true);
        assert.ok(jsResults.some(f => f.relativePath.includes('app.js')));
    });

    test('should get files in specific directory', async () => {
        mockProjectAnalyzer.getProjectRoot.returns('/project');
        
        const existsSyncStub = sandbox.stub(fs, 'existsSync');
        existsSyncStub.returns(true);
        
        const readFileSyncStub = sandbox.stub(fs, 'readFileSync');
        readFileSyncStub.returns('STATICFILES_DIRS = []');
        
        const readdirSyncStub = sandbox.stub(fs, 'readdirSync');
        readdirSyncStub.withArgs('/project/static').returns([
            { name: 'css', isDirectory: () => true },
            { name: 'js', isDirectory: () => true }
        ] as any);
        readdirSyncStub.withArgs('/project/static/css').returns([
            { name: 'main.css', isDirectory: () => false },
            { name: 'admin.css', isDirectory: () => false }
        ] as any);
        readdirSyncStub.withArgs('/project/static/js').returns([
            { name: 'app.js', isDirectory: () => false }
        ] as any);
        
        const statSyncStub = sandbox.stub(fs, 'statSync');
        statSyncStub.returns({ size: 1024 } as any);
        
        const findFilesStub = sandbox.stub(vscode.workspace, 'findFiles');
        findFilesStub.resolves([]);
        
        await analyzer.initialize();
        
        // Test getting files in directory
        const cssFiles = analyzer.getStaticFilesInDirectory('css/');
        assert.strictEqual(cssFiles.length, 2);
        assert.ok(cssFiles.every(f => f.relativePath.startsWith('css/')));
        
        const jsFiles = analyzer.getStaticFilesInDirectory('js/');
        assert.strictEqual(jsFiles.length, 1);
        assert.ok(jsFiles.every(f => f.relativePath.startsWith('js/')));
    });

    test('should handle file system changes', async () => {
        mockProjectAnalyzer.getProjectRoot.returns('/project');
        
        const existsSyncStub = sandbox.stub(fs, 'existsSync');
        existsSyncStub.returns(true);
        
        const readFileSyncStub = sandbox.stub(fs, 'readFileSync');
        readFileSyncStub.returns('STATICFILES_DIRS = []');
        
        const readdirSyncStub = sandbox.stub(fs, 'readdirSync');
        readdirSyncStub.returns([]);
        
        const statSyncStub = sandbox.stub(fs, 'statSync');
        statSyncStub.returns({ size: 1024 } as any);
        
        const findFilesStub = sandbox.stub(vscode.workspace, 'findFiles');
        findFilesStub.resolves([]);
        
        // Mock file watcher
        let createHandler: any;
        const createFileSystemWatcherStub = sandbox.stub(vscode.workspace, 'createFileSystemWatcher');
        createFileSystemWatcherStub.returns({
            onDidCreate: (handler: any) => { createHandler = handler; return { dispose: () => {} }; },
            onDidDelete: () => ({ dispose: () => {} }),
            onDidChange: () => ({ dispose: () => {} }),
            dispose: () => {}
        } as any);
        
        await analyzer.initialize();
        
        // Simulate file creation
        if (createHandler) {
            const newFileUri = vscode.Uri.file('/project/static/new.css');
            await createHandler(newFileUri);
            
            // The file should be added to the analyzer
            const files = analyzer.getStaticFiles();
            assert.ok(files.some(f => f.absolutePath === '/project/static/new.css'));
        }
    });
});