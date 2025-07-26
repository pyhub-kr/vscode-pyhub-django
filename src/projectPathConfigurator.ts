import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class ProjectPathConfigurator {
    private readonly configSection = 'python';
    private readonly extraPathsKey = 'analysis.extraPaths';
    private readonly extensionConfig = 'djangoPowerTools';

    /**
     * Find Django project root by locating manage.py file
     */
    async findDjangoProjectRoot(): Promise<string | null> {
        const manageFiles = await vscode.workspace.findFiles('**/manage.py', '**/node_modules/**', 10);
        
        if (manageFiles.length === 0) {
            return null;
        }

        // Return the directory containing the first manage.py found
        return path.dirname(manageFiles[0].fsPath);
    }

    /**
     * Find all Django projects in the workspace
     */
    async findAllDjangoProjects(): Promise<string[]> {
        const manageFiles = await vscode.workspace.findFiles('**/manage.py', '**/node_modules/**');
        
        return manageFiles.map(file => path.dirname(file.fsPath));
    }

    /**
     * Get current Python analysis extra paths
     */
    async getCurrentExtraPaths(): Promise<string[]> {
        const pythonConfig = vscode.workspace.getConfiguration(this.configSection);
        const extraPaths = pythonConfig.get<string[]>(this.extraPathsKey, []);
        return extraPaths;
    }

    /**
     * Add Django project root to Python analysis paths
     */
    async addProjectRootToPythonPath(projectRoot: string): Promise<void> {
        const currentPaths = await this.getCurrentExtraPaths();
        
        // Check if the path is already included
        if (currentPaths.includes(projectRoot)) {
            console.log(`Project root ${projectRoot} is already in Python paths`);
            return;
        }

        // Add the new path
        const updatedPaths = [...currentPaths, projectRoot];
        
        const pythonConfig = vscode.workspace.getConfiguration(this.configSection);
        await pythonConfig.update(
            this.extraPathsKey,
            updatedPaths,
            vscode.ConfigurationTarget.Workspace
        );

        console.log(`Added ${projectRoot} to Python analysis paths`);
    }

    /**
     * Prompt user for permission to modify Python paths
     */
    async promptUserForPathConfiguration(projectRoot: string): Promise<boolean> {
        const message = `Django project detected at ${projectRoot}. Would you like to add it to Python paths for better import resolution?`;
        const choice = await vscode.window.showInformationMessage(
            message,
            'Yes',
            'No',
            'Don\'t ask again'
        );

        if (choice === 'Don\'t ask again') {
            // Save preference to not ask again
            const config = vscode.workspace.getConfiguration(this.extensionConfig);
            await config.update('enableAutoImportConfig', false, vscode.ConfigurationTarget.Global);
            return false;
        }

        return choice === 'Yes';
    }

    /**
     * Restart Python Language Server to apply changes
     */
    async restartPythonLanguageServer(): Promise<void> {
        try {
            await vscode.commands.executeCommand('python.restart');
            console.log('Python Language Server restarted');
        } catch (error) {
            console.error('Failed to restart Python Language Server:', error);
        }
    }

    /**
     * Main configuration method to be called on extension activation
     */
    async configureOnActivation(): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.extensionConfig);
        const autoConfigEnabled = config.get<boolean>('enableAutoImportConfig', true);

        if (!autoConfigEnabled) {
            console.log('Auto import configuration is disabled');
            return;
        }

        const projectRoot = await this.findDjangoProjectRoot();
        
        if (!projectRoot) {
            console.log('No Django project found in workspace');
            return;
        }

        console.log(`Django project found at: ${projectRoot}`);

        const currentPaths = await this.getCurrentExtraPaths();
        
        // Check if already configured
        if (currentPaths.includes(projectRoot)) {
            console.log('Django project already configured');
            return;
        }

        // Prompt user
        const userApproved = await this.promptUserForPathConfiguration(projectRoot);
        
        if (userApproved) {
            await this.addProjectRootToPythonPath(projectRoot);
            await this.restartPythonLanguageServer();
            
            vscode.window.showInformationMessage(
                'Django project path configured successfully. Python Language Server has been restarted.'
            );
        }
    }

    /**
     * Configure paths for a specific Django project
     */
    async configureProject(projectRoot: string): Promise<void> {
        await this.addProjectRootToPythonPath(projectRoot);
        await this.restartPythonLanguageServer();
    }

    /**
     * Handle multiple Django projects in workspace
     */
    async configureMultipleProjects(): Promise<void> {
        const projects = await this.findAllDjangoProjects();
        
        if (projects.length === 0) {
            vscode.window.showInformationMessage('No Django projects found in workspace');
            return;
        }

        if (projects.length === 1) {
            await this.configureProject(projects[0]);
            return;
        }

        // Let user choose which projects to configure
        const items = projects.map(proj => ({
            label: path.basename(proj),
            description: proj,
            picked: true
        }));

        const selected = await vscode.window.showQuickPick(items, {
            canPickMany: true,
            placeHolder: 'Select Django projects to configure'
        });

        if (selected && selected.length > 0) {
            for (const item of selected) {
                await this.addProjectRootToPythonPath(item.description!);
            }
            
            await this.restartPythonLanguageServer();
            
            vscode.window.showInformationMessage(
                `Configured ${selected.length} Django project(s). Python Language Server has been restarted.`
            );
        }
    }

    /**
     * Ensure workspace settings file exists
     */
    async ensureWorkspaceSettingsFile(workspaceFolder: vscode.Uri): Promise<void> {
        const vscodeDir = path.join(workspaceFolder.fsPath, '.vscode');
        const settingsPath = path.join(vscodeDir, 'settings.json');

        try {
            await fs.promises.access(settingsPath);
        } catch {
            // File doesn't exist, create it
            try {
                await fs.promises.mkdir(vscodeDir, { recursive: true });
                await fs.promises.writeFile(settingsPath, '{}', 'utf8');
                console.log('Created workspace settings.json');
            } catch (error) {
                console.error('Failed to create settings.json:', error);
            }
        }
    }

    /**
     * Watch for new Django projects
     */
    setupFileWatcher(context: vscode.ExtensionContext): void {
        const watcher = vscode.workspace.createFileSystemWatcher('**/manage.py');
        
        watcher.onDidCreate(async (uri) => {
            console.log('New manage.py detected:', uri.fsPath);
            
            const projectRoot = path.dirname(uri.fsPath);
            const currentPaths = await this.getCurrentExtraPaths();
            
            if (!currentPaths.includes(projectRoot)) {
                const userApproved = await this.promptUserForPathConfiguration(projectRoot);
                
                if (userApproved) {
                    await this.configureProject(projectRoot);
                }
            }
        });

        context.subscriptions.push(watcher);
    }

    /**
     * Remove project from Python paths (for cleanup)
     */
    async removeProjectFromPythonPath(projectRoot: string): Promise<void> {
        const currentPaths = await this.getCurrentExtraPaths();
        const updatedPaths = currentPaths.filter(p => p !== projectRoot);
        
        if (currentPaths.length !== updatedPaths.length) {
            const pythonConfig = vscode.workspace.getConfiguration(this.configSection);
            await pythonConfig.update(
                this.extraPathsKey,
                updatedPaths,
                vscode.ConfigurationTarget.Workspace
            );
            
            console.log(`Removed ${projectRoot} from Python analysis paths`);
        }
    }
}