import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ProjectPathConfigurator } from '../../projectPathConfigurator';
import * as sinon from 'sinon';

suite('Project Path Configuration Test Suite', () => {
    let configurator: ProjectPathConfigurator;
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
        configurator = new ProjectPathConfigurator();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('should detect Django project root from manage.py location', async () => {
        const testWorkspaceFolder: vscode.WorkspaceFolder = {
            uri: vscode.Uri.file('/test/django/project'),
            name: 'test-project',
            index: 0
        };

        sandbox.stub(vscode.workspace, 'workspaceFolders').value([testWorkspaceFolder]);
        
        // Mock file system - manage.py in root
        const files = [
            vscode.Uri.file('/test/django/project/manage.py'),
            vscode.Uri.file('/test/django/project/myapp/models.py'),
            vscode.Uri.file('/test/django/project/myproject/settings.py')
        ];
        sandbox.stub(vscode.workspace, 'findFiles').resolves(files);

        const projectRoot = await configurator.findDjangoProjectRoot();
        
        assert.strictEqual(projectRoot, '/test/django/project');
    });

    test('should detect Django project root when manage.py is in subdirectory', async () => {
        const testWorkspaceFolder: vscode.WorkspaceFolder = {
            uri: vscode.Uri.file('/test/workspace'),
            name: 'test-workspace',
            index: 0
        };

        sandbox.stub(vscode.workspace, 'workspaceFolders').value([testWorkspaceFolder]);
        
        // Mock file system - manage.py in subdirectory
        const files = [
            vscode.Uri.file('/test/workspace/backend/manage.py'),
            vscode.Uri.file('/test/workspace/frontend/package.json')
        ];
        sandbox.stub(vscode.workspace, 'findFiles').resolves(files);

        const projectRoot = await configurator.findDjangoProjectRoot();
        
        assert.strictEqual(projectRoot, '/test/workspace/backend');
    });

    test('should return null when no manage.py is found', async () => {
        const testWorkspaceFolder: vscode.WorkspaceFolder = {
            uri: vscode.Uri.file('/test/non-django'),
            name: 'test-project',
            index: 0
        };

        sandbox.stub(vscode.workspace, 'workspaceFolders').value([testWorkspaceFolder]);
        sandbox.stub(vscode.workspace, 'findFiles').resolves([]);

        const projectRoot = await configurator.findDjangoProjectRoot();
        
        assert.strictEqual(projectRoot, null);
    });

    test('should get current Python analysis extra paths', async () => {
        const mockConfig = {
            get: sandbox.stub().returns(['path1', 'path2']),
            has: sandbox.stub().returns(true),
            inspect: sandbox.stub(),
            update: sandbox.stub()
        };

        sandbox.stub(vscode.workspace, 'getConfiguration').returns(mockConfig as any);

        const paths = await configurator.getCurrentExtraPaths();
        
        assert.deepStrictEqual(paths, ['path1', 'path2']);
        assert.strictEqual(mockConfig.get.calledWith('analysis.extraPaths'), true);
    });

    test('should add Django project root to Python paths if not present', async () => {
        const projectRoot = '/test/django/project';
        const existingPaths = ['/some/other/path'];
        
        const mockConfig = {
            get: sandbox.stub().returns(existingPaths),
            has: sandbox.stub().returns(true),
            inspect: sandbox.stub(),
            update: sandbox.stub().resolves()
        };

        sandbox.stub(vscode.workspace, 'getConfiguration').returns(mockConfig as any);

        await configurator.addProjectRootToPythonPath(projectRoot);
        
        assert.strictEqual(mockConfig.update.calledOnce, true);
        const updateCall = mockConfig.update.firstCall;
        assert.strictEqual(updateCall.args[0], 'analysis.extraPaths');
        assert.deepStrictEqual(updateCall.args[1], ['/some/other/path', projectRoot]);
        assert.strictEqual(updateCall.args[2], vscode.ConfigurationTarget.Workspace);
    });

    test('should not add Django project root if already in paths', async () => {
        const projectRoot = '/test/django/project';
        const existingPaths = ['/some/other/path', projectRoot];
        
        const mockConfig = {
            get: sandbox.stub().returns(existingPaths),
            has: sandbox.stub().returns(true),
            inspect: sandbox.stub(),
            update: sandbox.stub().resolves()
        };

        sandbox.stub(vscode.workspace, 'getConfiguration').returns(mockConfig as any);

        await configurator.addProjectRootToPythonPath(projectRoot);
        
        assert.strictEqual(mockConfig.update.called, false);
    });

    test('should prompt user before modifying settings', async () => {
        const showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage')
            .resolves('Yes' as any);

        const result = await configurator.promptUserForPathConfiguration('/test/django/project');
        
        assert.strictEqual(result, true);
        assert.strictEqual(showInformationMessageStub.calledOnce, true);
        assert.ok(showInformationMessageStub.firstCall.args[0].includes('Django project detected'));
    });

    test('should respect user choice when declining path configuration', async () => {
        const showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage')
            .resolves('No' as any);

        const result = await configurator.promptUserForPathConfiguration('/test/django/project');
        
        assert.strictEqual(result, false);
    });

    test('should handle multiple Django projects in workspace', async () => {
        const testWorkspaceFolder: vscode.WorkspaceFolder = {
            uri: vscode.Uri.file('/test/workspace'),
            name: 'test-workspace',
            index: 0
        };

        sandbox.stub(vscode.workspace, 'workspaceFolders').value([testWorkspaceFolder]);
        
        // Mock multiple Django projects
        const files = [
            vscode.Uri.file('/test/workspace/project1/manage.py'),
            vscode.Uri.file('/test/workspace/project2/manage.py')
        ];
        sandbox.stub(vscode.workspace, 'findFiles').resolves(files);

        const projectRoots = await configurator.findAllDjangoProjects();
        
        assert.strictEqual(projectRoots.length, 2);
        assert.ok(projectRoots.includes('/test/workspace/project1'));
        assert.ok(projectRoots.includes('/test/workspace/project2'));
    });

    test('should trigger Python Language Server restart after configuration', async () => {
        const executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand').resolves();

        await configurator.restartPythonLanguageServer();
        
        assert.strictEqual(executeCommandStub.calledWith('python.restart'), true);
    });

    test('should configure project on activation if enabled', async () => {
        // Mock settings
        const mockConfig = {
            get: sandbox.stub()
                .withArgs('enableAutoImportConfig').returns(true)
                .withArgs('analysis.extraPaths').returns([]),
            has: sandbox.stub().returns(true),
            inspect: sandbox.stub(),
            update: sandbox.stub().resolves()
        };

        sandbox.stub(vscode.workspace, 'getConfiguration').returns(mockConfig as any);
        
        // Mock Django project detection
        const testWorkspaceFolder: vscode.WorkspaceFolder = {
            uri: vscode.Uri.file('/test/django/project'),
            name: 'test-project',
            index: 0
        };

        sandbox.stub(vscode.workspace, 'workspaceFolders').value([testWorkspaceFolder]);
        
        const files = [vscode.Uri.file('/test/django/project/manage.py')];
        sandbox.stub(vscode.workspace, 'findFiles').resolves(files);

        // Mock user prompt
        sandbox.stub(vscode.window, 'showInformationMessage').resolves('Yes' as any);

        // Mock command execution
        const executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand').resolves();

        await configurator.configureOnActivation();
        
        // Verify configuration was updated
        assert.strictEqual(mockConfig.update.calledWith('analysis.extraPaths'), true);
        
        // Verify language server was restarted
        assert.strictEqual(executeCommandStub.calledWith('python.restart'), true);
    });

    test('should not configure if auto-config is disabled', async () => {
        const mockConfig = {
            get: sandbox.stub().withArgs('enableAutoImportConfig').returns(false),
            has: sandbox.stub().returns(true),
            inspect: sandbox.stub(),
            update: sandbox.stub()
        };

        sandbox.stub(vscode.workspace, 'getConfiguration').returns(mockConfig as any);
        
        await configurator.configureOnActivation();
        
        assert.strictEqual(mockConfig.update.called, false);
    });

    test('should handle workspace settings.json creation', async () => {
        const workspaceFolder = vscode.Uri.file('/test/django/project');
        const settingsPath = path.join(workspaceFolder.fsPath, '.vscode', 'settings.json');
        
        // Mock file system
        const mkdirStub = sandbox.stub(fs.promises, 'mkdir').resolves();
        const writeFileStub = sandbox.stub(fs.promises, 'writeFile').resolves();
        sandbox.stub(fs.promises, 'access').rejects(); // File doesn't exist

        await configurator.ensureWorkspaceSettingsFile(workspaceFolder);
        
        assert.strictEqual(mkdirStub.calledOnce, true);
        assert.strictEqual(writeFileStub.calledOnce, true);
        
        const writtenContent = writeFileStub.firstCall.args[1];
        const settings = JSON.parse(writtenContent as string);
        assert.deepStrictEqual(settings, {});
    });
});