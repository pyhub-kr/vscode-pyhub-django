import { Container } from 'inversify';
import * as vscode from 'vscode';
import { TYPES } from './types';

// Core services
import { PythonIntegration, PythonExecutor } from '../pythonIntegration';

// Analyzers
import { DjangoProjectAnalyzer } from '../analyzers/djangoProjectAnalyzer';
import { AdvancedModelAnalyzer } from '../analyzers/advancedModelAnalyzer';
import { UrlPatternAnalyzer } from '../analyzers/urlPatternAnalyzer';

// Configuration
import { ProjectPathConfigurator } from '../projectPathConfigurator';

// Command handlers
import { ManagePyCommandHandler } from '../commands/managePyCommandHandler';

// Completion providers
import { DjangoModelCompletionProvider, DjangoFieldCompletionProvider } from '../providers/djangoModelCompletionProvider';
import { EnhancedCompletionProvider } from '../providers/enhancedCompletionProvider';
import { UrlTagCompletionProvider } from '../providers/urlTagCompletionProvider';

// Services
import { ExtensionService } from '../services/extensionService';
import { CompletionService } from '../services/completionService';
import { CommandService } from '../services/commandService';
import { FileWatcherService } from '../services/fileWatcherService';

export function createContainer(context: vscode.ExtensionContext): Container {
    const container = new Container();
    
    // Bind extension context
    container.bind<vscode.ExtensionContext>(TYPES.ExtensionContext).toConstantValue(context);
    
    // Core services - Singleton
    container.bind<PythonIntegration>(TYPES.PythonIntegration).to(PythonIntegration).inSingletonScope();
    container.bind<PythonExecutor>(TYPES.PythonExecutor).to(PythonExecutor).inSingletonScope();
    
    // Analyzers - Singleton
    container.bind<DjangoProjectAnalyzer>(TYPES.DjangoProjectAnalyzer).to(DjangoProjectAnalyzer).inSingletonScope();
    container.bind<AdvancedModelAnalyzer>(TYPES.AdvancedModelAnalyzer).to(AdvancedModelAnalyzer).inSingletonScope();
    container.bind<UrlPatternAnalyzer>(TYPES.UrlPatternAnalyzer).to(UrlPatternAnalyzer).inSingletonScope();
    
    // Configuration - Singleton
    container.bind<ProjectPathConfigurator>(TYPES.ProjectPathConfigurator).to(ProjectPathConfigurator).inSingletonScope();
    
    // Command handlers - Singleton
    container.bind<ManagePyCommandHandler>(TYPES.ManagePyCommandHandler).to(ManagePyCommandHandler).inSingletonScope();
    
    // Completion providers - Transient (created as needed)
    container.bind<DjangoModelCompletionProvider>(TYPES.DjangoModelCompletionProvider).to(DjangoModelCompletionProvider);
    container.bind<DjangoFieldCompletionProvider>(TYPES.DjangoFieldCompletionProvider).to(DjangoFieldCompletionProvider);
    container.bind<EnhancedCompletionProvider>(TYPES.EnhancedCompletionProvider).to(EnhancedCompletionProvider);
    container.bind<UrlTagCompletionProvider>(TYPES.UrlTagCompletionProvider).to(UrlTagCompletionProvider);
    
    // Services - Singleton
    container.bind<ExtensionService>(TYPES.ExtensionService).to(ExtensionService).inSingletonScope();
    container.bind<CompletionService>(TYPES.CompletionService).to(CompletionService).inSingletonScope();
    container.bind<CommandService>(TYPES.CommandService).to(CommandService).inSingletonScope();
    container.bind<FileWatcherService>(TYPES.FileWatcherService).to(FileWatcherService).inSingletonScope();
    
    return container;
}