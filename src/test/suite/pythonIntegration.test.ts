import * as assert from 'assert';
import * as vscode from 'vscode';
import { PythonIntegration, PythonExecutor } from '../../pythonIntegration';
import * as sinon from 'sinon';

suite('Python Integration Test Suite', () => {
    let context: vscode.ExtensionContext;
    let pythonIntegration: PythonIntegration;
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
        // Mock extension context
        context = {
            subscriptions: [],
            extensionPath: '/test/path',
            extensionUri: vscode.Uri.file('/test/path'),
            globalState: {} as any,
            workspaceState: {} as any,
            asAbsolutePath: (path: string) => path,
        } as any;
    });

    teardown(() => {
        sandbox.restore();
        if (pythonIntegration) {
            pythonIntegration.dispose();
        }
    });

    test('PythonIntegration should initialize when Python extension is available', async () => {
        // Mock Python extension
        const mockPythonExtension = {
            isActive: true,
            exports: {
                ready: Promise.resolve(),
                environments: {
                    getActiveEnvironmentPath: () => '/usr/bin/python3',
                    onDidChangeActiveEnvironmentPath: new vscode.EventEmitter<string | undefined>().event
                }
            }
        };

        sandbox.stub(vscode.extensions, 'getExtension').returns(mockPythonExtension as any);

        pythonIntegration = new PythonIntegration(context);
        const result = await pythonIntegration.initialize();

        assert.strictEqual(result, true);
        assert.strictEqual(pythonIntegration.getCurrentPythonPath(), '/usr/bin/python3');
    });

    test('PythonIntegration should handle missing Python extension gracefully', async () => {
        sandbox.stub(vscode.extensions, 'getExtension').returns(undefined);
        
        const showWarningMessageStub = sandbox.stub(vscode.window, 'showWarningMessage');

        pythonIntegration = new PythonIntegration(context);
        const result = await pythonIntegration.initialize();

        assert.strictEqual(result, false);
        assert.strictEqual(showWarningMessageStub.calledOnce, true);
        assert.ok(showWarningMessageStub.firstCall.args[0].includes('Python extension not found'));
    });

    test('PythonIntegration should react to Python environment changes', async () => {
        const eventEmitter = new vscode.EventEmitter<string | undefined>();
        const mockPythonExtension = {
            isActive: true,
            exports: {
                ready: Promise.resolve(),
                environments: {
                    getActiveEnvironmentPath: () => '/usr/bin/python3',
                    onDidChangeActiveEnvironmentPath: eventEmitter.event
                }
            }
        };

        sandbox.stub(vscode.extensions, 'getExtension').returns(mockPythonExtension as any);
        const executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand');

        pythonIntegration = new PythonIntegration(context);
        await pythonIntegration.initialize();

        // Trigger environment change
        eventEmitter.fire('/usr/bin/python3.9');

        // Verify that rescan command was triggered
        assert.strictEqual(executeCommandStub.calledWith('django-power-tools.rescanProject'), true);
    });
});

suite('Python Executor Test Suite', () => {
    let pythonIntegration: PythonIntegration;
    let pythonExecutor: PythonExecutor;
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
        
        // Mock PythonIntegration
        pythonIntegration = {
            getCurrentPythonPath: () => '/usr/bin/python3'
        } as any;
        
        pythonExecutor = new PythonExecutor(pythonIntegration);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('PythonExecutor should throw error when no Python interpreter is selected', async () => {
        pythonIntegration.getCurrentPythonPath = () => undefined;

        try {
            await pythonExecutor.execute(['--version']);
            assert.fail('Should have thrown an error');
        } catch (error: any) {
            assert.strictEqual(error.message, 'No Python interpreter selected');
        }
    });

    test('PythonExecutor should find manage.py in workspace root', async () => {
        const fs = require('fs').promises;
        sandbox.stub(vscode.workspace, 'rootPath').value('/test/django/project');
        sandbox.stub(fs, 'access').resolves();

        const result = await (pythonExecutor as any).findManagePy('/test/django/project');
        assert.strictEqual(result, '/test/django/project/manage.py');
    });

    test('PythonExecutor should find manage.py in subdirectories', async () => {
        const fs = require('fs').promises;
        const path = require('path');
        
        sandbox.stub(vscode.workspace, 'rootPath').value('/test/django/project');
        
        // Mock file system - manage.py not in root
        const accessStub = sandbox.stub(fs, 'access');
        accessStub.withArgs('/test/django/project/manage.py').rejects();
        accessStub.withArgs('/test/django/project/src/manage.py').resolves();

        const result = await (pythonExecutor as any).findManagePy('/test/django/project');
        assert.strictEqual(result, '/test/django/project/src/manage.py');
    });

    test('PythonExecutor should return undefined when manage.py is not found', async () => {
        const fs = require('fs').promises;
        
        sandbox.stub(vscode.workspace, 'rootPath').value('/test/django/project');
        sandbox.stub(fs, 'access').rejects(); // All file checks fail
        sandbox.stub(fs, 'readdir').resolves([]);

        const result = await (pythonExecutor as any).findManagePy('/test/django/project');
        assert.strictEqual(result, undefined);
    });
});