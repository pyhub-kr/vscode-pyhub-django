import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
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
        
        // Create a custom fs module mock
        const fsMock = {
            existsSync: sandbox.stub(),
            readFileSync: sandbox.stub(),
            readdirSync: sandbox.stub(),
            statSync: sandbox.stub()
        };
        
        // Setup existsSync behavior
        fsMock.existsSync.withArgs('/project/static').returns(true);
        fsMock.existsSync.withArgs('/project/settings.py').returns(true);
        fsMock.existsSync.returns(false); // default
        
        // Setup readFileSync behavior
        fsMock.readFileSync.withArgs('/project/settings.py').returns(`
STATICFILES_DIRS = [
    '/project/assets',
    'custom_static'
]
        `);
        
        // Setup readdirSync behavior
        fsMock.readdirSync.withArgs('/project/static').returns([
            { name: 'css', isDirectory: () => true },
            { name: 'style.css', isDirectory: () => false }
        ] as any);
        fsMock.readdirSync.withArgs('/project/static/css').returns([
            { name: 'main.css', isDirectory: () => false }
        ] as any);
        fsMock.readdirSync.withArgs('/project/assets').returns([]);
        fsMock.readdirSync.withArgs('/project/custom_static').returns([]);
        fsMock.readdirSync.returns([]); // default
        
        // Setup statSync behavior
        fsMock.statSync.returns({ size: 1024 } as any);
        
        // Replace fs methods temporarily
        const originalExistsSync = fs.existsSync;
        const originalReadFileSync = fs.readFileSync;
        const originalReaddirSync = fs.readdirSync;
        const originalStatSync = fs.statSync;
        
        (fs as any).existsSync = fsMock.existsSync;
        (fs as any).readFileSync = fsMock.readFileSync;
        (fs as any).readdirSync = fsMock.readdirSync;
        (fs as any).statSync = fsMock.statSync;
        
        // Mock vscode.workspace.findFiles
        const findFilesStub = sandbox.stub(vscode.workspace, 'findFiles');
        findFilesStub.resolves([]);
        
        try {
            await analyzer.initialize();
            
            const files = analyzer.getStaticFiles();
            assert.strictEqual(files.length > 0, true);
            
            // Check if files were properly categorized
            const cssFiles = files.filter(f => f.type === 'css');
            assert.strictEqual(cssFiles.length >= 1, true);
        } finally {
            // Restore original fs methods
            (fs as any).existsSync = originalExistsSync;
            (fs as any).readFileSync = originalReadFileSync;
            (fs as any).readdirSync = originalReaddirSync;
            (fs as any).statSync = originalStatSync;
        }
    });

    test('should correctly categorize file types', async () => {
        // Test the getFileType method indirectly through file analysis
        mockProjectAnalyzer.getProjectRoot.returns('/project');
        
        // Create fs mock
        const fsMock = {
            existsSync: sandbox.stub().returns(true),
            readFileSync: sandbox.stub().returns('STATICFILES_DIRS = []'),
            readdirSync: sandbox.stub(),
            statSync: sandbox.stub().returns({ size: 1024 } as any)
        };
        
        const testFiles = [
            { name: 'style.css', type: 'css' },
            { name: 'script.js', type: 'js' },
            { name: 'logo.png', type: 'image' },
            { name: 'font.woff2', type: 'font' },
            { name: 'data.json', type: 'other' }
        ];
        
        fsMock.readdirSync.withArgs('/project/static').returns(
            testFiles.map(f => ({ name: f.name, isDirectory: () => false })) as any
        );
        fsMock.readdirSync.returns([]); // default
        
        // Replace fs methods
        const originalExistsSync = fs.existsSync;
        const originalReadFileSync = fs.readFileSync;
        const originalReaddirSync = fs.readdirSync;
        const originalStatSync = fs.statSync;
        
        (fs as any).existsSync = fsMock.existsSync;
        (fs as any).readFileSync = fsMock.readFileSync;
        (fs as any).readdirSync = fsMock.readdirSync;
        (fs as any).statSync = fsMock.statSync;
        
        const findFilesStub = sandbox.stub(vscode.workspace, 'findFiles');
        findFilesStub.resolves([]);
        
        try {
            await analyzer.initialize();
            
            const files = analyzer.getStaticFiles();
            
            // Verify each file type
            testFiles.forEach(testFile => {
                const file = files.find(f => f.relativePath === testFile.name);
                assert.ok(file, `File ${testFile.name} should exist`);
                assert.strictEqual(file?.type, testFile.type, `File ${testFile.name} should be type ${testFile.type}`);
            });
        } finally {
            // Restore original fs methods
            (fs as any).existsSync = originalExistsSync;
            (fs as any).readFileSync = originalReadFileSync;
            (fs as any).readdirSync = originalReaddirSync;
            (fs as any).statSync = originalStatSync;
        }
    });

    test('should search static files', async () => {
        mockProjectAnalyzer.getProjectRoot.returns('/project');
        
        // Create fs mock
        const fsMock = {
            existsSync: sandbox.stub().returns(true),
            readFileSync: sandbox.stub().returns('STATICFILES_DIRS = []'),
            readdirSync: sandbox.stub(),
            statSync: sandbox.stub().returns({ size: 1024 } as any)
        };
        
        fsMock.readdirSync.withArgs('/project/static').returns([
            { name: 'css', isDirectory: () => true },
            { name: 'js', isDirectory: () => true }
        ] as any);
        fsMock.readdirSync.withArgs('/project/static/css').returns([
            { name: 'main.css', isDirectory: () => false },
            { name: 'admin.css', isDirectory: () => false }
        ] as any);
        fsMock.readdirSync.withArgs('/project/static/js').returns([
            { name: 'app.js', isDirectory: () => false }
        ] as any);
        fsMock.readdirSync.returns([]); // default
        
        // Replace fs methods
        const originalExistsSync = fs.existsSync;
        const originalReadFileSync = fs.readFileSync;
        const originalReaddirSync = fs.readdirSync;
        const originalStatSync = fs.statSync;
        
        (fs as any).existsSync = fsMock.existsSync;
        (fs as any).readFileSync = fsMock.readFileSync;
        (fs as any).readdirSync = fsMock.readdirSync;
        (fs as any).statSync = fsMock.statSync;
        
        const findFilesStub = sandbox.stub(vscode.workspace, 'findFiles');
        findFilesStub.resolves([]);
        
        try {
            await analyzer.initialize();
            
            // Test search functionality
            const cssResults = analyzer.searchStaticFiles('css');
            assert.strictEqual(cssResults.length >= 2, true);
            assert.ok(cssResults.some(f => f.relativePath.includes('main.css')));
            
            const jsResults = analyzer.searchStaticFiles('.js');
            assert.strictEqual(jsResults.length >= 1, true);
            assert.ok(jsResults.some(f => f.relativePath.includes('app.js')));
        } finally {
            // Restore original fs methods
            (fs as any).existsSync = originalExistsSync;
            (fs as any).readFileSync = originalReadFileSync;
            (fs as any).readdirSync = originalReaddirSync;
            (fs as any).statSync = originalStatSync;
        }
    });

    test('should get files in specific directory', async () => {
        mockProjectAnalyzer.getProjectRoot.returns('/project');
        
        // Create fs mock
        const fsMock = {
            existsSync: sandbox.stub().returns(true),
            readFileSync: sandbox.stub().returns('STATICFILES_DIRS = []'),
            readdirSync: sandbox.stub(),
            statSync: sandbox.stub().returns({ size: 1024 } as any)
        };
        
        fsMock.readdirSync.withArgs('/project/static').returns([
            { name: 'css', isDirectory: () => true },
            { name: 'js', isDirectory: () => true }
        ] as any);
        fsMock.readdirSync.withArgs('/project/static/css').returns([
            { name: 'main.css', isDirectory: () => false },
            { name: 'admin.css', isDirectory: () => false }
        ] as any);
        fsMock.readdirSync.withArgs('/project/static/js').returns([
            { name: 'app.js', isDirectory: () => false }
        ] as any);
        fsMock.readdirSync.returns([]); // default
        
        // Replace fs methods
        const originalExistsSync = fs.existsSync;
        const originalReadFileSync = fs.readFileSync;
        const originalReaddirSync = fs.readdirSync;
        const originalStatSync = fs.statSync;
        
        (fs as any).existsSync = fsMock.existsSync;
        (fs as any).readFileSync = fsMock.readFileSync;
        (fs as any).readdirSync = fsMock.readdirSync;
        (fs as any).statSync = fsMock.statSync;
        
        const findFilesStub = sandbox.stub(vscode.workspace, 'findFiles');
        findFilesStub.resolves([]);
        
        try {
            await analyzer.initialize();
            
            // Test getting files in directory
            const cssFiles = analyzer.getStaticFilesInDirectory('css/');
            assert.strictEqual(cssFiles.length, 2);
            assert.ok(cssFiles.every(f => f.relativePath.startsWith('css/')));
            
            const jsFiles = analyzer.getStaticFilesInDirectory('js/');
            assert.strictEqual(jsFiles.length, 1);
            assert.ok(jsFiles.every(f => f.relativePath.startsWith('js/')));
        } finally {
            // Restore original fs methods
            (fs as any).existsSync = originalExistsSync;
            (fs as any).readFileSync = originalReadFileSync;
            (fs as any).readdirSync = originalReaddirSync;
            (fs as any).statSync = originalStatSync;
        }
    });

    test('should handle file system changes', async () => {
        mockProjectAnalyzer.getProjectRoot.returns('/project');
        
        // Create fs mock
        const fsMock = {
            existsSync: sandbox.stub().returns(true),
            readFileSync: sandbox.stub().returns('STATICFILES_DIRS = []'),
            readdirSync: sandbox.stub().returns([]),
            statSync: sandbox.stub().returns({ size: 1024 } as any)
        };
        
        // Replace fs methods
        const originalExistsSync = fs.existsSync;
        const originalReadFileSync = fs.readFileSync;
        const originalReaddirSync = fs.readdirSync;
        const originalStatSync = fs.statSync;
        
        (fs as any).existsSync = fsMock.existsSync;
        (fs as any).readFileSync = fsMock.readFileSync;
        (fs as any).readdirSync = fsMock.readdirSync;
        (fs as any).statSync = fsMock.statSync;
        
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
        
        try {
            await analyzer.initialize();
            
            // Simulate file creation
            if (createHandler) {
                const newFileUri = vscode.Uri.file('/project/static/new.css');
                await createHandler(newFileUri);
                
                // The file should be added to the analyzer
                const files = analyzer.getStaticFiles();
                assert.ok(files.some(f => f.absolutePath === '/project/static/new.css'));
            }
        } finally {
            // Restore original fs methods
            (fs as any).existsSync = originalExistsSync;
            (fs as any).readFileSync = originalReadFileSync;
            (fs as any).readdirSync = originalReaddirSync;
            (fs as any).statSync = originalStatSync;
        }
    });
});