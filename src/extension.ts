import * as vscode from 'vscode';
import * as path from 'path';
import { PythonIntegration, PythonExecutor } from './pythonIntegration';
import { DjangoProjectAnalyzer } from './analyzers/djangoProjectAnalyzer';
import { DjangoModelCompletionProvider, DjangoFieldCompletionProvider } from './providers/djangoModelCompletionProvider';
import { EnhancedCompletionProvider } from './providers/enhancedCompletionProvider';
import { ProjectPathConfigurator } from './projectPathConfigurator';
import { ManagePyCommandHandler } from './commands/managePyCommandHandler';
import { UrlPatternAnalyzer } from './analyzers/urlPatternAnalyzer';
import { UrlTagCompletionProvider } from './providers/urlTagCompletionProvider';

let pythonIntegration: PythonIntegration;
let projectAnalyzer: DjangoProjectAnalyzer;
let pythonExecutor: PythonExecutor;
let pathConfigurator: ProjectPathConfigurator;
let managePyCommandHandler: ManagePyCommandHandler;
let urlPatternAnalyzer: UrlPatternAnalyzer;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Django Power Tools is now active!');

    // Initialize Python Extension integration
    pythonIntegration = new PythonIntegration(context);
    const pythonInitialized = await pythonIntegration.initialize();
    
    if (!pythonInitialized) {
        console.warn('Python extension integration failed. Some features may be limited.');
    }

    // Initialize Python executor
    pythonExecutor = new PythonExecutor(pythonIntegration);
    
    // Initialize manage.py command handler
    managePyCommandHandler = new ManagePyCommandHandler(pythonExecutor);

    // Initialize path configurator
    pathConfigurator = new ProjectPathConfigurator();
    
    // Configure Python paths for Django project
    await pathConfigurator.configureOnActivation();
    
    // Set up file watcher for new Django projects
    pathConfigurator.setupFileWatcher(context);

    // Initialize Django project analyzer
    projectAnalyzer = new DjangoProjectAnalyzer();
    const projectFound = await projectAnalyzer.initialize();
    
    // Initialize URL pattern analyzer
    urlPatternAnalyzer = new UrlPatternAnalyzer();
    
    // Scan workspace for URL patterns
    if (projectFound) {
        await urlPatternAnalyzer.scanWorkspace();
    }
    
    if (!projectFound) {
        vscode.window.showInformationMessage(
            'No Django project detected. Django Power Tools features will be limited.'
        );
    } else {
        vscode.window.showInformationMessage(
            'Django project detected! Django Power Tools is ready.'
        );
    }

    // Register completion providers
    const modelCompletionProvider = new DjangoModelCompletionProvider(projectAnalyzer);
    const fieldCompletionProvider = new DjangoFieldCompletionProvider();
    const enhancedCompletionProvider = new EnhancedCompletionProvider(projectAnalyzer.getAdvancedAnalyzer());
    
    // Register enhanced completion provider with higher priority
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { scheme: 'file', language: 'python' },
            enhancedCompletionProvider,
            '.', '(', '='  // Trigger on dot, parenthesis, and equals
        )
    );
    
    // Register URL tag completion provider
    const urlTagCompletionProvider = new UrlTagCompletionProvider(urlPatternAnalyzer);
    
    // Register for Django HTML templates
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            [
                { scheme: 'file', language: 'html' },
                { scheme: 'file', language: 'django-html' }
            ],
            urlTagCompletionProvider,
            "'", '"'  // Trigger on quotes
        )
    );
    
    // Register for Python files (reverse function)
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { scheme: 'file', language: 'python' },
            urlTagCompletionProvider,
            "'", '"'  // Trigger on quotes
        )
    );
    
    // Keep existing providers for backward compatibility
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { scheme: 'file', language: 'python' },
            modelCompletionProvider,
            '.'
        )
    );
    
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { scheme: 'file', language: 'python' },
            fieldCompletionProvider,
            '.'
        )
    );

    // Register commands
    registerCommands(context);

    // Register project rescan command
    context.subscriptions.push(
        vscode.commands.registerCommand('django-power-tools.rescanProject', async () => {
            await projectAnalyzer.analyzeProject();
            await urlPatternAnalyzer.scanWorkspace();
            vscode.window.showInformationMessage('Django project rescanned successfully!');
        })
    );
    
    // Watch for URL file changes
    const urlFileWatcher = vscode.workspace.createFileSystemWatcher('**/urls.py');
    
    urlFileWatcher.onDidChange(async (uri) => {
        const document = await vscode.workspace.openTextDocument(uri);
        await urlPatternAnalyzer.analyzeUrlFile(document.getText(), uri.fsPath);
    });
    
    urlFileWatcher.onDidCreate(async (uri) => {
        const document = await vscode.workspace.openTextDocument(uri);
        await urlPatternAnalyzer.analyzeUrlFile(document.getText(), uri.fsPath);
    });
    
    urlFileWatcher.onDidDelete((uri) => {
        // Clear patterns from deleted file
        urlPatternAnalyzer.analyzeUrlFile('', uri.fsPath);
    });
    
    context.subscriptions.push(urlFileWatcher);
}

function registerCommands(context: vscode.ExtensionContext) {
    // Hello World command (for testing)
    context.subscriptions.push(
        vscode.commands.registerCommand('django-power-tools.helloWorld', () => {
            vscode.window.showInformationMessage('Hello from Django Power Tools!');
        })
    );

    // Configure Python paths command
    context.subscriptions.push(
        vscode.commands.registerCommand('django-power-tools.configurePythonPaths', async () => {
            await pathConfigurator.configureMultipleProjects();
        })
    );

    // Remove project from Python paths
    context.subscriptions.push(
        vscode.commands.registerCommand('django-power-tools.removeProjectFromPaths', async () => {
            const currentPaths = await pathConfigurator.getCurrentExtraPaths();
            
            if (currentPaths.length === 0) {
                vscode.window.showInformationMessage('No Python paths configured');
                return;
            }

            const items = currentPaths.map(p => ({
                label: path.basename(p),
                description: p
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select path to remove'
            });

            if (selected) {
                await pathConfigurator.removeProjectFromPythonPath(selected.description!);
                await pathConfigurator.restartPythonLanguageServer();
                vscode.window.showInformationMessage('Path removed and Python Language Server restarted');
            }
        })
    );

    // Run manage.py command with enhanced command palette
    context.subscriptions.push(
        vscode.commands.registerCommand('django-power-tools.runManageCommand', async () => {
            // Get available commands and show quick pick
            const items = await managePyCommandHandler.getCommandQuickPickItems();
            
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a Django manage.py command',
                matchOnDescription: true,
                matchOnDetail: true
            });

            if (!selected) {
                return;
            }

            // Handle recent command selection
            let command: string;
            let args: string[] = [];
            
            if ((selected as any).command) {
                // Recent command with stored args
                command = (selected as any).command;
                args = (selected as any).args || [];
                await managePyCommandHandler.executeInTerminal(command, args);
            } else {
                // Regular command
                command = selected.label.replace(/^\$\(history\) /, '');
                await managePyCommandHandler.runCommand(command);
            }
        })
    );

    // Quick access to common manage.py commands
    context.subscriptions.push(
        vscode.commands.registerCommand('django-power-tools.runserver', async () => {
            await managePyCommandHandler.runCommand('runserver');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('django-power-tools.makeMigrations', async () => {
            await managePyCommandHandler.runCommand('makemigrations');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('django-power-tools.migrate', async () => {
            await managePyCommandHandler.runCommand('migrate');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('django-power-tools.shell', async () => {
            await managePyCommandHandler.runCommand('shell');
        })
    );

    // Show Django project info
    context.subscriptions.push(
        vscode.commands.registerCommand('django-power-tools.showProjectInfo', async () => {
            const projectRoot = projectAnalyzer.getProjectRoot();
            const installedApps = projectAnalyzer.getInstalledApps();
            const models = await projectAnalyzer.getModelInfo();
            
            const info = `
Django Project Information:
- Project Root: ${projectRoot || 'Not detected'}
- Installed Apps: ${installedApps.length}
- Models Found: ${Object.keys(models).length}

Installed Apps:
${installedApps.map(app => `  - ${app}`).join('\n')}

Models:
${Object.entries(models).map(([name, info]) => `  - ${info.app}.${name} (${info.fields.length} fields)`).join('\n')}
            `;

            const outputChannel = vscode.window.createOutputChannel('Django Project Info');
            outputChannel.clear();
            outputChannel.appendLine(info);
            outputChannel.show();
        })
    );
}

export function deactivate() {
    console.log('Django Power Tools is deactivated');
    
    if (pythonIntegration) {
        pythonIntegration.dispose();
    }
    
    if (managePyCommandHandler) {
        managePyCommandHandler.dispose();
    }
}