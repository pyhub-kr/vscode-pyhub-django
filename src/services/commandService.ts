import { injectable, inject } from 'inversify';
import * as vscode from 'vscode';
import * as path from 'path';
import { TYPES } from '../container/types';
import { DjangoProjectAnalyzer } from '../analyzers/djangoProjectAnalyzer';
import { UrlPatternAnalyzer } from '../analyzers/urlPatternAnalyzer';
import { ProjectPathConfigurator } from '../projectPathConfigurator';
import { ManagePyCommandHandler } from '../commands/managePyCommandHandler';

@injectable()
export class CommandService {
    private disposables: vscode.Disposable[] = [];

    constructor(
        @inject(TYPES.ExtensionContext) private context: vscode.ExtensionContext,
        @inject(TYPES.DjangoProjectAnalyzer) private projectAnalyzer: DjangoProjectAnalyzer,
        @inject(TYPES.UrlPatternAnalyzer) private urlPatternAnalyzer: UrlPatternAnalyzer,
        @inject(TYPES.ProjectPathConfigurator) private pathConfigurator: ProjectPathConfigurator,
        @inject(TYPES.ManagePyCommandHandler) private managePyCommandHandler: ManagePyCommandHandler
    ) {}

    async register(): Promise<void> {
        // Register all commands
        this.registerHelloWorldCommand();
        this.registerPythonPathCommands();
        this.registerManagePyCommands();
        this.registerProjectCommands();
    }

    private registerHelloWorldCommand(): void {
        this.disposables.push(
            vscode.commands.registerCommand('django-power-tools.helloWorld', () => {
                vscode.window.showInformationMessage('Hello from Django Power Tools!');
            })
        );
    }

    private registerPythonPathCommands(): void {
        // Configure Python paths command
        this.disposables.push(
            vscode.commands.registerCommand('django-power-tools.configurePythonPaths', async () => {
                await this.pathConfigurator.configureMultipleProjects();
            })
        );

        // Remove project from Python paths
        this.disposables.push(
            vscode.commands.registerCommand('django-power-tools.removeProjectFromPaths', async () => {
                const currentPaths = await this.pathConfigurator.getCurrentExtraPaths();
                
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
                    await this.pathConfigurator.removeProjectFromPythonPath(selected.description!);
                    await this.pathConfigurator.restartPythonLanguageServer();
                    vscode.window.showInformationMessage('Path removed and Python Language Server restarted');
                }
            })
        );
    }

    private registerManagePyCommands(): void {
        // Run manage.py command with enhanced command palette
        this.disposables.push(
            vscode.commands.registerCommand('django-power-tools.runManageCommand', async () => {
                const items = await this.managePyCommandHandler.getCommandQuickPickItems();
                
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
                    await this.managePyCommandHandler.executeInTerminal(command, args);
                } else {
                    // Regular command
                    command = selected.label.replace(/^\$\(history\) /, '');
                    await this.managePyCommandHandler.runCommand(command);
                }
            })
        );

        // Quick access to common manage.py commands
        this.disposables.push(
            vscode.commands.registerCommand('django-power-tools.runserver', async () => {
                await this.managePyCommandHandler.runCommand('runserver');
            })
        );

        this.disposables.push(
            vscode.commands.registerCommand('django-power-tools.makeMigrations', async () => {
                await this.managePyCommandHandler.runCommand('makemigrations');
            })
        );

        this.disposables.push(
            vscode.commands.registerCommand('django-power-tools.migrate', async () => {
                await this.managePyCommandHandler.runCommand('migrate');
            })
        );

        this.disposables.push(
            vscode.commands.registerCommand('django-power-tools.shell', async () => {
                await this.managePyCommandHandler.runCommand('shell');
            })
        );
    }

    private registerProjectCommands(): void {
        // Register project rescan command
        this.disposables.push(
            vscode.commands.registerCommand('django-power-tools.rescanProject', async () => {
                await this.projectAnalyzer.analyzeProject();
                await this.urlPatternAnalyzer.scanWorkspace();
                vscode.window.showInformationMessage('Django project rescanned successfully!');
            })
        );

        // Show Django project info
        this.disposables.push(
            vscode.commands.registerCommand('django-power-tools.showProjectInfo', async () => {
                const projectRoot = this.projectAnalyzer.getProjectRoot();
                const installedApps = this.projectAnalyzer.getInstalledApps();
                const models = await this.projectAnalyzer.getModelInfo();
                
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

        // Add disposables to extension context
        this.context.subscriptions.push(...this.disposables);
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        this.managePyCommandHandler.dispose();
    }
}