import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { ManagePyCommandHandler } from '../../commands/managePyCommandHandler';
import { PythonExecutor } from '../../pythonIntegration';

suite('Manage.py Commands Test Suite', () => {
    let commandHandler: ManagePyCommandHandler;
    let pythonExecutor: PythonExecutor;
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
        pythonExecutor = {
            getCurrentPythonPath: () => '/usr/bin/python3',
            runDjangoManageCommand: sandbox.stub()
        } as any;
        
        commandHandler = new ManagePyCommandHandler(pythonExecutor);
        
        // Mock workspace
        sandbox.stub(vscode.workspace, 'rootPath').value('/test/django/project');
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([
            {
                uri: vscode.Uri.file('/test/django/project'),
                name: 'test-project',
                index: 0
            }
        ]);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('should get available Django commands', async () => {
        const helpOutput = `
Type 'manage.py help <subcommand>' for help on a specific subcommand.

Available subcommands:

[auth]
    changepassword
    createsuperuser

[contenttypes]
    remove_stale_contenttypes

[django]
    check
    compilemessages
    createcachetable
    dbshell
    diffsettings
    dumpdata
    flush
    inspectdb
    loaddata
    makemessages
    makemigrations
    migrate
    sendtestemail
    shell
    showmigrations
    sqlflush
    sqlmigrate
    sqlsequencereset
    squashmigrations
    startapp
    startproject
    test
    testserver

[sessions]
    clearsessions

[staticfiles]
    collectstatic
    findstatic
    runserver
`;

        (pythonExecutor.runDjangoManageCommand as sinon.SinonStub)
            .withArgs('help')
            .resolves(helpOutput);

        const commands = await commandHandler.getAvailableCommands();
        
        assert.ok(commands.length > 0);
        assert.ok(commands.includes('runserver'));
        assert.ok(commands.includes('makemigrations'));
        assert.ok(commands.includes('migrate'));
        assert.ok(commands.includes('createsuperuser'));
        assert.ok(commands.includes('shell'));
        assert.ok(commands.includes('test'));
    });

    test('should create quick pick items with descriptions', async () => {
        // Stub the help command output
        const helpOutput = `
Available subcommands:
[django]
    runserver
    migrate
    makemigrations
    shell
`;
        (pythonExecutor.runDjangoManageCommand as sinon.SinonStub)
            .withArgs('help')
            .resolves(helpOutput);
            
        const quickPickItems = await commandHandler.getCommandQuickPickItems();
        
        const runserverItem = quickPickItems.find(item => item.label === 'runserver');
        assert.ok(runserverItem);
        assert.strictEqual(runserverItem.description, 'Start the development server');
        assert.strictEqual(runserverItem.detail, 'Runs the Django development server on the default port (8000)');
        
        const migrateItem = quickPickItems.find(item => item.label === 'migrate');
        assert.ok(migrateItem);
        assert.strictEqual(migrateItem.description, 'Apply database migrations');
    });

    test('should handle runserver command with custom port', async () => {
        const showInputBoxStub = sandbox.stub(vscode.window, 'showInputBox')
            .resolves('8080');

        await commandHandler.runCommand('runserver');
        
        assert.strictEqual(showInputBoxStub.calledOnce, true);
        assert.strictEqual(showInputBoxStub.firstCall.args[0]!.prompt, 'Enter port number (default: 8000)');
    });

    test('should handle makemigrations with app name', async () => {
        const showInputBoxStub = sandbox.stub(vscode.window, 'showInputBox')
            .resolves('myapp');

        await commandHandler.runCommand('makemigrations');
        
        assert.strictEqual(showInputBoxStub.calledOnce, true);
        assert.strictEqual(showInputBoxStub.firstCall.args[0]!.prompt, 'Enter app name (optional, leave empty for all apps)');
    });

    test('should create dedicated terminal for runserver', async () => {
        const createTerminalStub = sandbox.stub(vscode.window, 'createTerminal');
        const mockTerminal = {
            name: 'Django runserver',
            sendText: sandbox.stub(),
            show: sandbox.stub(),
            dispose: sandbox.stub()
        };
        createTerminalStub.returns(mockTerminal as any);
        
        // Mock vscode.workspace.findFiles to find manage.py
        sandbox.stub(vscode.workspace, 'findFiles').resolves([
            vscode.Uri.file('/test/django/project/manage.py')
        ]);

        await commandHandler.executeInTerminal('runserver', ['8000']);
        
        assert.strictEqual(createTerminalStub.calledOnce, true);
        assert.strictEqual(createTerminalStub.firstCall.args[0].name, 'Django runserver');
        assert.strictEqual(mockTerminal.sendText.calledOnce, true);
        assert.strictEqual(mockTerminal.show.calledOnce, true);
    });

    test('should reuse existing runserver terminal', async () => {
        const mockTerminal = {
            name: 'Django runserver',
            sendText: sandbox.stub(),
            show: sandbox.stub(),
            dispose: sandbox.stub(),
            processId: Promise.resolve(1234)
        };
        
        // First call to create terminal
        const createTerminalStub = sandbox.stub(vscode.window, 'createTerminal').returns(mockTerminal as any);
        sandbox.stub(vscode.window, 'terminals').value([mockTerminal]);
        
        // Mock vscode.workspace.findFiles to find manage.py
        sandbox.stub(vscode.workspace, 'findFiles').resolves([
            vscode.Uri.file('/test/django/project/manage.py')
        ]);
        
        // Create the terminal first
        await commandHandler.executeInTerminal('runserver', ['8000']);
        
        // Reset call counts
        createTerminalStub.resetHistory();
        mockTerminal.sendText.resetHistory();
        
        // Second call should reuse terminal
        await commandHandler.executeInTerminal('runserver', ['8000']);
        
        // Should not create new terminal
        assert.strictEqual(createTerminalStub.called, false);
        // Should send Ctrl+C first to stop existing server
        assert.strictEqual(mockTerminal.sendText.calledTwice, true);
        assert.strictEqual(mockTerminal.sendText.firstCall.args[0], '\u0003'); // Ctrl+C
    });

    test('should use regular terminal for non-runserver commands', async () => {
        const createTerminalStub = sandbox.stub(vscode.window, 'createTerminal');
        const mockTerminal = {
            name: 'Django Commands',
            sendText: sandbox.stub(),
            show: sandbox.stub(),
            dispose: sandbox.stub()
        };
        createTerminalStub.returns(mockTerminal as any);
        
        // Mock vscode.workspace.findFiles to find manage.py
        sandbox.stub(vscode.workspace, 'findFiles').resolves([
            vscode.Uri.file('/test/django/project/manage.py')
        ]);

        await commandHandler.executeInTerminal('migrate', []);
        
        assert.strictEqual(createTerminalStub.calledOnce, true);
        assert.strictEqual(createTerminalStub.firstCall.args[0].name, 'Django Commands');
    });

    test('should handle command with options', async () => {
        const quickInputStub = sandbox.stub(vscode.window, 'showQuickPick');
        
        // The selectCommandOptions method is called for commands with options
        quickInputStub.resolves([
            { label: '--fake', picked: true }
        ] as any);

        // Call runCommand which will use selectCommandOptions for migrate
        const createTerminalStub = sandbox.stub(vscode.window, 'createTerminal');
        const mockTerminal = {
            sendText: sandbox.stub(),
            show: sandbox.stub()
        };
        createTerminalStub.returns(mockTerminal as any);
        
        // Mock vscode.workspace.findFiles to find manage.py
        sandbox.stub(vscode.workspace, 'findFiles').resolves([
            vscode.Uri.file('/test/django/project/manage.py')
        ]);

        await commandHandler.runCommand('migrate');
        
        // Check that the option was selected
        assert.strictEqual(quickInputStub.calledOnce, true);
        assert.strictEqual(quickInputStub.firstCall.args[1]?.canPickMany, true);
        assert.strictEqual(quickInputStub.firstCall.args[1]?.placeHolder, 'Select options (optional)');
    });

    test('should show command history', async () => {
        // Mock vscode.workspace.findFiles to find manage.py
        sandbox.stub(vscode.workspace, 'findFiles').resolves([
            vscode.Uri.file('/test/django/project/manage.py')
        ]);
        
        // Mock terminals
        const mockTerminal = {
            name: 'Django Commands',
            sendText: sandbox.stub(),
            show: sandbox.stub(),
            dispose: sandbox.stub()
        };
        sandbox.stub(vscode.window, 'createTerminal').returns(mockTerminal as any);
        
        // Mock showQuickPick for migrate command options (it has options)
        sandbox.stub(vscode.window, 'showQuickPick').resolves(undefined); // No options selected
        
        // Execute commands using runCommand which adds to history
        await commandHandler.runCommand('migrate');
        
        // For runserver, mock the input box
        sandbox.stub(vscode.window, 'showInputBox').resolves('8080');
        await commandHandler.runCommand('runserver');
        
        const history = commandHandler.getCommandHistory();
        
        assert.strictEqual(history.length, 2);
        // History is stored newest first
        assert.strictEqual(history[0].command, 'runserver');
        assert.strictEqual(history[1].command, 'migrate');
        assert.deepStrictEqual(history[0].args, ['8080']);
    });

    test('should handle custom management commands', async () => {
        const helpOutput = `
[myapp]
    custom_command
    another_command
`;

        (pythonExecutor.runDjangoManageCommand as sinon.SinonStub)
            .withArgs('help')
            .resolves(helpOutput);

        const commands = await commandHandler.getAvailableCommands();
        
        assert.ok(commands.includes('custom_command'));
        assert.ok(commands.includes('another_command'));
    });

    test('should validate Python interpreter before running', async () => {
        pythonExecutor.getCurrentPythonPath = () => undefined;
        
        const showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage');
        
        await commandHandler.executeInTerminal('runserver', []);
        
        assert.strictEqual(showErrorMessageStub.calledOnce, true);
        assert.ok(showErrorMessageStub.firstCall.args[0].includes('No Python interpreter'));
    });

    test('should handle terminal creation with virtual environment', async () => {
        const mockWorkspaceFolder = {
            uri: vscode.Uri.file('/test/project'),
            name: 'test-project',
            index: 0
        };
        
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([mockWorkspaceFolder]);
        
        const createTerminalStub = sandbox.stub(vscode.window, 'createTerminal');
        const mockTerminal = {
            sendText: sandbox.stub(),
            show: sandbox.stub()
        };
        createTerminalStub.returns(mockTerminal as any);

        pythonExecutor.getCurrentPythonPath = () => '/test/project/.venv/bin/python';

        await commandHandler.executeInTerminal('migrate', []);
        
        assert.strictEqual(createTerminalStub.calledOnce, true);
        const terminalOptions = createTerminalStub.firstCall.args[0] as any;
        assert.strictEqual(terminalOptions.env.VIRTUAL_ENV, '/test/project/.venv');
    });
});