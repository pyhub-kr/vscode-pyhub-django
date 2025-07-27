import { injectable, inject } from 'inversify';
import * as vscode from 'vscode';
import { TYPES } from '../container/types';
import { PythonIntegration, PythonExecutor } from '../pythonIntegration';
import { DjangoProjectAnalyzer } from '../analyzers/djangoProjectAnalyzer';
import { UrlPatternAnalyzer } from '../analyzers/urlPatternAnalyzer';
import { ProjectPathConfigurator } from '../projectPathConfigurator';
import { CompletionService } from './completionService';
import { CommandService } from './commandService';
import { FileWatcherService } from './fileWatcherService';
import { EnhancedFileWatcherService } from './enhancedFileWatcherService';
import { DefinitionService } from './definitionService';
import { DjangoAdminAnalyzer } from '../analyzers/djangoAdminAnalyzer';

@injectable()
export class ExtensionService {
    constructor(
        @inject(TYPES.ExtensionContext) private context: vscode.ExtensionContext,
        @inject(TYPES.PythonIntegration) private pythonIntegration: PythonIntegration,
        @inject(TYPES.DjangoProjectAnalyzer) private projectAnalyzer: DjangoProjectAnalyzer,
        @inject(TYPES.UrlPatternAnalyzer) private urlPatternAnalyzer: UrlPatternAnalyzer,
        @inject(TYPES.ProjectPathConfigurator) private pathConfigurator: ProjectPathConfigurator,
        @inject(TYPES.CompletionService) private completionService: CompletionService,
        @inject(TYPES.CommandService) private commandService: CommandService,
        @inject(TYPES.FileWatcherService) private fileWatcherService: FileWatcherService,
        @inject(TYPES.EnhancedFileWatcherService) private enhancedFileWatcherService: EnhancedFileWatcherService,
        @inject(TYPES.DefinitionService) private definitionService: DefinitionService,
        @inject(TYPES.DjangoAdminAnalyzer) private adminAnalyzer: DjangoAdminAnalyzer
    ) {}

    async initialize(): Promise<void> {
        console.log('Django Power Tools is now active!');

        // Initialize Python Extension integration
        const pythonInitialized = await this.pythonIntegration.initialize();
        
        if (!pythonInitialized) {
            console.warn('Python extension integration failed. Some features may be limited.');
        }

        // Configure Python paths for Django project
        await this.pathConfigurator.configureOnActivation();
        
        // Set up file watcher for new Django projects
        this.pathConfigurator.setupFileWatcher(this.context);

        // Initialize Django project analyzer
        const projectFound = await this.projectAnalyzer.initialize();
        
        // Scan workspace for URL patterns
        if (projectFound) {
            await this.urlPatternAnalyzer.scanWorkspace();
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

        // Register all services
        await this.completionService.register();
        await this.commandService.register();
        await this.fileWatcherService.register();
        await this.definitionService.register();
        
        // Setup enhanced file watching for admin files
        this.setupAdminFileWatching();
        this.enhancedFileWatcherService.register();
    }

    private setupAdminFileWatching(): void {
        // Watch admin.py files
        this.enhancedFileWatcherService.watchPattern('**/admin.py', async (uri, changeType) => {
            if (changeType === vscode.FileChangeType.Deleted) {
                // Clear admin classes from deleted file
                await this.adminAnalyzer.analyzeAdminFile('', uri.fsPath);
            } else {
                // Re-analyze changed or created admin file
                try {
                    const document = await vscode.workspace.openTextDocument(uri);
                    await this.adminAnalyzer.analyzeAdminFile(document.getText(), uri.fsPath);
                } catch (error) {
                    console.error(`Error analyzing admin file ${uri.fsPath}:`, error);
                }
            }
        });
    }

    dispose(): void {
        this.pythonIntegration.dispose();
        this.commandService.dispose();
        this.enhancedFileWatcherService.dispose();
    }
}