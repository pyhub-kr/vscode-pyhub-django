import { injectable, inject } from 'inversify';
import * as vscode from 'vscode';
import * as path from 'path';
import { PythonExecutor } from '../pythonIntegration';
import { TYPES } from '../container/types';

interface CommandInfo {
    name: string;
    description: string;
    detail?: string;
    options?: string[];
    requiresInput?: boolean;
}

interface CommandHistoryItem {
    command: string;
    args: string[];
    timestamp: Date;
}

@injectable()
export class ManagePyCommandHandler {
    private runserverTerminal: vscode.Terminal | undefined;
    private commandsTerminal: vscode.Terminal | undefined;
    private commandHistory: CommandHistoryItem[] = [];
    private availableCommands: string[] = [];
    
    // Common Django commands with descriptions
    private commonCommands: { [key: string]: CommandInfo } = {
        'runserver': {
            name: 'runserver',
            description: 'Start the development server',
            detail: 'Runs the Django development server on the default port (8000)',
            requiresInput: true
        },
        'makemigrations': {
            name: 'makemigrations',
            description: 'Create new migrations',
            detail: 'Creates new migration files based on model changes',
            requiresInput: true
        },
        'migrate': {
            name: 'migrate',
            description: 'Apply database migrations',
            detail: 'Applies pending migrations to the database',
            options: ['--fake', '--fake-initial', '--run-syncdb']
        },
        'createsuperuser': {
            name: 'createsuperuser',
            description: 'Create a superuser account',
            detail: 'Creates a new superuser for the Django admin'
        },
        'shell': {
            name: 'shell',
            description: 'Open Django shell',
            detail: 'Opens an interactive Python shell with Django environment loaded'
        },
        ['shell_plus']: {
            name: 'shell_plus',
            description: 'Open enhanced Django shell',
            detail: 'Opens an enhanced shell with auto-imported models (requires django-extensions)'
        },
        'test': {
            name: 'test',
            description: 'Run tests',
            detail: 'Runs the test suite',
            requiresInput: true
        },
        'collectstatic': {
            name: 'collectstatic',
            description: 'Collect static files',
            detail: 'Collects static files into STATIC_ROOT',
            options: ['--noinput', '--clear', '--link']
        },
        'showmigrations': {
            name: 'showmigrations',
            description: 'Show migration status',
            detail: 'Shows all migrations and their status',
            options: ['--list', '--plan']
        },
        'dbshell': {
            name: 'dbshell',
            description: 'Open database shell',
            detail: 'Opens a command-line client for the database'
        },
        'check': {
            name: 'check',
            description: 'Check for problems',
            detail: 'Checks the entire Django project for potential problems',
            options: ['--tag', '--list-tags', '--deploy']
        },
        'startapp': {
            name: 'startapp',
            description: 'Create a new Django app',
            detail: 'Creates a new Django application with the given name',
            requiresInput: true
        }
    };

    constructor(
        @inject(TYPES.PythonExecutor) private pythonExecutor: PythonExecutor
    ) {}

    async getAvailableCommands(): Promise<string[]> {
        if (this.availableCommands.length > 0) {
            return this.availableCommands;
        }

        try {
            const helpOutput = await this.pythonExecutor.runDjangoManageCommand('help');
            this.availableCommands = this.parseHelpOutput(helpOutput);
            return this.availableCommands;
        } catch (error) {
            console.error('Failed to get Django commands:', error);
            // Return common commands as fallback
            return Object.keys(this.commonCommands);
        }
    }

    private parseHelpOutput(output: string): string[] {
        const commands: string[] = [];
        if (!output) {
            return commands;
        }
        const lines = output.split('\n');
        let inCommandSection = false;

        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Section headers are in brackets
            if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
                inCommandSection = true;
                continue;
            }
            
            // Command lines are indented
            if (inCommandSection && trimmedLine && !trimmedLine.startsWith('[')) {
                if (line.startsWith('    ')) {
                    commands.push(trimmedLine);
                }
            }
        }

        return commands;
    }

    async getCommandQuickPickItems(): Promise<vscode.QuickPickItem[]> {
        const availableCommands = await this.getAvailableCommands();
        const items: vscode.QuickPickItem[] = [];

        // Add common commands first with descriptions
        for (const cmd of availableCommands) {
            if (this.commonCommands[cmd]) {
                const cmdInfo = this.commonCommands[cmd];
                items.push({
                    label: cmd,
                    description: cmdInfo.description,
                    detail: cmdInfo.detail
                });
            } else {
                // Add other commands without descriptions
                items.push({
                    label: cmd,
                    description: 'Custom command'
                });
            }
        }

        // Sort: common commands first, then alphabetically
        items.sort((a, b) => {
            const aIsCommon = !!this.commonCommands[a.label];
            const bIsCommon = !!this.commonCommands[b.label];
            
            if (aIsCommon && !bIsCommon) {
                return -1;
            }
            if (!aIsCommon && bIsCommon) {
                return 1;
            }
            return a.label.localeCompare(b.label);
        });

        // Add recent commands at the top
        const recentCommands = this.getRecentCommands(5);
        if (recentCommands.length > 0) {
            const recentItems = recentCommands.map(cmd => ({
                label: `$(history) ${cmd.command}`,
                description: 'Recently used',
                detail: cmd.args.length > 0 ? `Arguments: ${cmd.args.join(' ')}` : undefined,
                command: cmd.command,
                args: cmd.args
            }));
            
            items.unshift(...recentItems);
            items.splice(recentItems.length, 0, {
                label: '',
                kind: vscode.QuickPickItemKind.Separator
            } as any);
        }

        return items;
    }

    async runCommand(command: string): Promise<void> {
        const pythonPath = this.pythonExecutor.getCurrentPythonPath();
        if (!pythonPath) {
            vscode.window.showErrorMessage('No Python interpreter selected. Please select a Python interpreter first.');
            return;
        }

        const cmdInfo = this.commonCommands[command];
        let args: string[] = [];

        // Get command-specific arguments
        if (cmdInfo?.requiresInput) {
            args = await this.getCommandArguments(command);
            if (args === undefined) {
                return; // User cancelled
            }
        } else if (cmdInfo?.options) {
            const selectedOptions = await this.selectCommandOptions(cmdInfo.options);
            if (selectedOptions) {
                args = selectedOptions;
            }
        }

        // Execute the command
        await this.executeInTerminal(command, args);
        
        // Add to history
        this.addToHistory(command, args);
    }

    async getCommandArguments(command: string): Promise<string[]> {
        const args: string[] = [];

        switch (command) {
            case 'runserver':
                const port = await vscode.window.showInputBox({
                    prompt: 'Enter port number (default: 8000)',
                    value: '8000',
                    validateInput: (value) => {
                        const portNum = parseInt(value);
                        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
                            return 'Please enter a valid port number (1-65535)';
                        }
                        return null;
                    }
                });
                if (port) {
                    args.push(port);
                }
                break;

            case 'makemigrations':
                const appName = await vscode.window.showInputBox({
                    prompt: 'Enter app name (optional, leave empty for all apps)',
                    placeHolder: 'myapp'
                });
                if (appName) {
                    args.push(appName);
                }
                break;

            case 'test':
                const testPath = await vscode.window.showInputBox({
                    prompt: 'Enter test path (optional)',
                    placeHolder: 'myapp.tests.TestCase'
                });
                if (testPath) {
                    args.push(testPath);
                }
                break;

            case 'startapp':
                const newAppName = await vscode.window.showInputBox({
                    prompt: 'Enter new app name',
                    validateInput: (value) => {
                        if (!value || !/^[a-zA-Z_]\w*$/.test(value)) {
                            return 'App name must be a valid Python identifier';
                        }
                        return null;
                    }
                });
                if (!newAppName) {
                    return undefined as any; // User cancelled
                }
                args.push(newAppName);
                break;
        }

        return args;
    }

    private async selectCommandOptions(options: string[]): Promise<string[] | undefined> {
        const items = options.map(opt => ({
            label: opt,
            picked: false
        }));

        const selected = await vscode.window.showQuickPick(items, {
            canPickMany: true,
            placeHolder: 'Select options (optional)'
        });

        if (selected) {
            return selected.map(item => item.label);
        }

        return undefined;
    }

    async executeInTerminal(command: string, args: string[]): Promise<void> {
        const pythonPath = this.pythonExecutor.getCurrentPythonPath();
        if (!pythonPath) {
            vscode.window.showErrorMessage('No Python interpreter selected.');
            return;
        }

        // Determine which terminal to use
        let terminal: vscode.Terminal;
        
        if (command === 'runserver') {
            terminal = await this.getOrCreateRunserverTerminal();
        } else {
            terminal = await this.getOrCreateCommandTerminal();
        }

        // Build the command
        const managePyPath = await this.findManagePy();
        if (!managePyPath) {
            vscode.window.showErrorMessage('manage.py not found in workspace');
            return;
        }

        const fullCommand = `${pythonPath} ${managePyPath} ${command} ${args.join(' ')}`.trim();
        
        // For runserver, stop any existing server first
        if (command === 'runserver' && this.isTerminalRunning(terminal)) {
            terminal.sendText('\u0003'); // Send Ctrl+C
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait a bit
        }

        terminal.sendText(fullCommand);
        terminal.show();
    }

    private async getOrCreateRunserverTerminal(): Promise<vscode.Terminal> {
        // Check if terminal still exists
        if (this.runserverTerminal) {
            const terminals = vscode.window.terminals;
            const exists = terminals.some(t => t === this.runserverTerminal);
            if (!exists) {
                this.runserverTerminal = undefined;
            }
        }

        if (!this.runserverTerminal) {
            this.runserverTerminal = await this.createTerminal('Django runserver');
        }

        return this.runserverTerminal;
    }

    private async getOrCreateCommandTerminal(): Promise<vscode.Terminal> {
        // Check if terminal still exists
        if (this.commandsTerminal) {
            const terminals = vscode.window.terminals;
            const exists = terminals.some(t => t === this.commandsTerminal);
            if (!exists) {
                this.commandsTerminal = undefined;
            }
        }

        if (!this.commandsTerminal) {
            this.commandsTerminal = await this.createTerminal('Django Commands');
        }

        return this.commandsTerminal;
    }

    private async createTerminal(name: string): Promise<vscode.Terminal> {
        const env: any = {};
        
        // Set up virtual environment if detected
        const pythonPath = this.pythonExecutor.getCurrentPythonPath();
        if (pythonPath) {
            const venvPath = this.getVirtualEnvPath(pythonPath);
            if (venvPath) {
                env.VIRTUAL_ENV = venvPath;
                // Update PATH to include virtual env
                const binDir = process.platform === 'win32' ? 'Scripts' : 'bin';
                const venvBin = path.join(venvPath, binDir);
                env.PATH = `${venvBin}${path.delimiter}${process.env.PATH}`;
            }
        }

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        
        return vscode.window.createTerminal({
            name,
            cwd: workspaceFolder?.uri.fsPath,
            env
        });
    }

    private getVirtualEnvPath(pythonPath: string): string | undefined {
        // Check if Python is in a virtual environment
        const pathParts = pythonPath.split(path.sep);
        const venvIndicators = ['.venv', 'venv', 'env', '.env'];
        
        for (let i = pathParts.length - 1; i >= 0; i--) {
            if (venvIndicators.includes(pathParts[i])) {
                return pathParts.slice(0, i + 1).join(path.sep);
            }
        }
        
        return undefined;
    }

    private isTerminalRunning(terminal: vscode.Terminal): boolean {
        // Check if terminal has a running process
        // This is a simplified check - in reality, we'd need more sophisticated detection
        return vscode.window.terminals.includes(terminal);
    }

    private async findManagePy(): Promise<string | undefined> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return undefined;
        }

        const files = await vscode.workspace.findFiles('**/manage.py', '**/node_modules/**', 1);
        if (files.length > 0) {
            return files[0].fsPath;
        }

        return undefined;
    }

    private addToHistory(command: string, args: string[]): void {
        this.commandHistory.unshift({
            command,
            args,
            timestamp: new Date()
        });

        // Keep only last 50 commands
        if (this.commandHistory.length > 50) {
            this.commandHistory = this.commandHistory.slice(0, 50);
        }
    }

    getCommandHistory(): CommandHistoryItem[] {
        return [...this.commandHistory];
    }

    private getRecentCommands(limit: number): CommandHistoryItem[] {
        // Get unique recent commands
        const seen = new Set<string>();
        const recent: CommandHistoryItem[] = [];
        
        for (const item of this.commandHistory) {
            const key = `${item.command}:${item.args.join(',')}`;
            if (!seen.has(key)) {
                seen.add(key);
                recent.push(item);
                if (recent.length >= limit) {
                    break;
                }
            }
        }
        
        return recent;
    }

    dispose(): void {
        if (this.runserverTerminal) {
            this.runserverTerminal.dispose();
        }
        if (this.commandsTerminal) {
            this.commandsTerminal.dispose();
        }
    }
}