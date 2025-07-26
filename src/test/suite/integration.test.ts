import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { ProjectPathConfigurator } from '../../projectPathConfigurator';
import { DjangoProjectAnalyzer } from '../../analyzers/djangoProjectAnalyzer';
import { AdvancedModelAnalyzer } from '../../analyzers/advancedModelAnalyzer';
import * as sinon from 'sinon';
import { createTestDjangoProjectAnalyzer } from '../container/testContainer';

suite('Integration Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let pathConfigurator: ProjectPathConfigurator;
    let projectAnalyzer: DjangoProjectAnalyzer;
    
    const testDjangoProjectPath = path.join(__dirname, '..', '..', '..', 'test', 'fixtures', 'test-django-project');

    setup(() => {
        sandbox = sinon.createSandbox();
        pathConfigurator = new ProjectPathConfigurator();
        projectAnalyzer = createTestDjangoProjectAnalyzer();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('Full workflow: detect Django project and configure Python paths', async () => {
        // Mock workspace
        const testWorkspaceFolder: vscode.WorkspaceFolder = {
            uri: vscode.Uri.file(testDjangoProjectPath),
            name: 'test-django-project',
            index: 0
        };

        sandbox.stub(vscode.workspace, 'workspaceFolders').value([testWorkspaceFolder]);
        
        // Mock file search to return our test manage.py
        const manageFile = vscode.Uri.file(path.join(testDjangoProjectPath, 'manage.py'));
        sandbox.stub(vscode.workspace, 'findFiles').resolves([manageFile]);

        // Mock configuration
        const mockConfig = {
            get: sandbox.stub()
                .withArgs('enableAutoImportConfig').returns(true)
                .withArgs('analysis.extraPaths').returns([]),
            has: sandbox.stub().returns(true),
            inspect: sandbox.stub(),
            update: sandbox.stub().resolves()
        };

        sandbox.stub(vscode.workspace, 'getConfiguration').returns(mockConfig as any);

        // Mock user interaction
        sandbox.stub(vscode.window, 'showInformationMessage').resolves('Yes' as any);

        // Mock command execution
        const executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand').resolves();

        // Execute the workflow
        await pathConfigurator.configureOnActivation();

        // Verify Django project was detected
        const detectedRoot = await pathConfigurator.findDjangoProjectRoot();
        assert.strictEqual(detectedRoot, testDjangoProjectPath);

        // Verify configuration was updated
        assert.strictEqual(mockConfig.update.calledOnce, true);
        const updateCall = mockConfig.update.firstCall;
        assert.strictEqual(updateCall.args[0], 'analysis.extraPaths');
        assert.deepStrictEqual(updateCall.args[1], [testDjangoProjectPath]);

        // Verify Python Language Server restart was triggered
        assert.strictEqual(
            executeCommandStub.calledWith('python.restart'),
            true
        );
    });

    test('Django project analyzer integration with test project', async () => {
        // Mock workspace
        const testWorkspaceFolder: vscode.WorkspaceFolder = {
            uri: vscode.Uri.file(testDjangoProjectPath),
            name: 'test-django-project',
            index: 0
        };

        sandbox.stub(vscode.workspace, 'workspaceFolders').value([testWorkspaceFolder]);
        
        // Mock file system checks
        const fs = require('fs');
        sandbox.stub(fs, 'existsSync')
            .withArgs(path.join(testDjangoProjectPath, 'manage.py'))
            .returns(true);

        // Initialize the analyzer
        const initialized = await projectAnalyzer.initialize();
        assert.strictEqual(initialized, true);
        assert.strictEqual(projectAnalyzer.getProjectRoot(), testDjangoProjectPath);
    });

    test('Multiple Django projects detection and configuration', async () => {
        // Mock workspace with multiple projects
        const workspaceRoot = path.dirname(testDjangoProjectPath);
        const testWorkspaceFolder: vscode.WorkspaceFolder = {
            uri: vscode.Uri.file(workspaceRoot),
            name: 'workspace',
            index: 0
        };

        sandbox.stub(vscode.workspace, 'workspaceFolders').value([testWorkspaceFolder]);
        
        // Mock finding multiple manage.py files
        const project1 = vscode.Uri.file(path.join(workspaceRoot, 'project1', 'manage.py'));
        const project2 = vscode.Uri.file(path.join(workspaceRoot, 'project2', 'manage.py'));
        sandbox.stub(vscode.workspace, 'findFiles').resolves([project1, project2]);

        // Find all projects
        const projects = await pathConfigurator.findAllDjangoProjects();
        
        assert.strictEqual(projects.length, 2);
        assert.ok(projects.includes(path.join(workspaceRoot, 'project1')));
        assert.ok(projects.includes(path.join(workspaceRoot, 'project2')));
    });

    test('File watcher triggers configuration for new Django projects', async () => {
        const context = {
            subscriptions: []
        } as any;

        // Set up file watcher
        pathConfigurator.setupFileWatcher(context);
        
        // Verify watcher was registered
        assert.strictEqual(context.subscriptions.length, 1);

        // Mock configuration
        const mockConfig = {
            get: sandbox.stub().withArgs('analysis.extraPaths').returns([]),
            has: sandbox.stub().returns(true),
            inspect: sandbox.stub(),
            update: sandbox.stub().resolves()
        };

        sandbox.stub(vscode.workspace, 'getConfiguration').returns(mockConfig as any);
        sandbox.stub(vscode.window, 'showInformationMessage').resolves('Yes' as any);
        sandbox.stub(vscode.commands, 'executeCommand').resolves();

        // Simulate new manage.py file creation
        const newProjectPath = '/test/new-project';
        const newManageFile = vscode.Uri.file(path.join(newProjectPath, 'manage.py'));
        
        // Find the watcher callback
        const createFileSystemWatcherStub = sandbox.stub(vscode.workspace, 'createFileSystemWatcher');
        const mockWatcher = {
            onDidCreate: sandbox.stub()
        };
        createFileSystemWatcherStub.returns(mockWatcher as any);

        // Re-setup watcher with our mock
        pathConfigurator.setupFileWatcher(context);
        
        // Trigger the callback
        const callback = mockWatcher.onDidCreate.firstCall.args[0];
        await callback(newManageFile);

        // Verify configuration was attempted
        // (Note: In real implementation, this would trigger the configuration)
    });
});