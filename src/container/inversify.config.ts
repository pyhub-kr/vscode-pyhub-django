import { Container } from 'inversify';
import * as vscode from 'vscode';
import { TYPES } from './types';

// Core services
import { PythonIntegration, PythonExecutor } from '../pythonIntegration';

// Analyzers
import { DjangoProjectAnalyzer } from '../analyzers/djangoProjectAnalyzer';
import { OptimizedDjangoProjectAnalyzer } from '../analyzers/optimizedDjangoProjectAnalyzer';
import { AdvancedModelAnalyzer } from '../analyzers/advancedModelAnalyzer';
import { UrlPatternAnalyzer } from '../analyzers/urlPatternAnalyzer';
import { EnhancedUrlPatternAnalyzer } from '../analyzers/enhancedUrlPatternAnalyzer';
import { DjangoFormAnalyzer } from '../analyzers/djangoFormAnalyzer';
import { ViewContextAnalyzer } from '../analyzers/viewContextAnalyzer';
import { StaticFileAnalyzer } from '../analyzers/staticFileAnalyzer';
import { DjangoAdminAnalyzer } from '../analyzers/djangoAdminAnalyzer';

// Configuration
import { ProjectPathConfigurator } from '../projectPathConfigurator';

// Command handlers
import { ManagePyCommandHandler } from '../commands/managePyCommandHandler';
import { PerformanceCommands } from '../commands/performanceCommands';

// Completion providers
import { DjangoModelCompletionProvider, DjangoFieldCompletionProvider } from '../providers/djangoModelCompletionProvider';
import { EnhancedCompletionProvider } from '../providers/enhancedCompletionProvider';
import { UrlTagCompletionProvider } from '../providers/urlTagCompletionProvider';
import { DjangoFormsCompletionProvider } from '../providers/djangoFormsCompletionProvider';
import { DjangoModelFormCompletionProvider } from '../providers/djangoModelFormCompletionProvider';
import { TemplateContextCompletionProvider } from '../providers/templateContextCompletionProvider';
import { StaticPathCompletionProvider } from '../providers/staticPathCompletionProvider';
import { DjangoAdminCompletionProvider } from '../completions/djangoAdminCompletionProvider';

// Definition providers
import { DjangoDefinitionProvider } from '../providers/djangoDefinitionProvider';
import { EnhancedDjangoDefinitionProvider } from '../providers/enhancedDjangoDefinitionProvider';

// Services
import { ExtensionService } from '../services/extensionService';
import { CompletionService } from '../services/completionService';
import { CommandService } from '../services/commandService';
import { FileWatcherService } from '../services/fileWatcherService';
import { EnhancedFileWatcherService } from '../services/enhancedFileWatcherService';
import { DefinitionService } from '../services/definitionService';
import { CacheService } from '../services/cacheService';

// Parsers
import { PythonParser } from '../parsers/pythonParser';

export function createContainer(context: vscode.ExtensionContext): Container {
    const container = new Container();
    
    // Bind extension context
    container.bind<vscode.ExtensionContext>(TYPES.ExtensionContext).toConstantValue(context);
    
    // Core services - Singleton
    container.bind<PythonIntegration>(TYPES.PythonIntegration).to(PythonIntegration).inSingletonScope();
    container.bind<PythonExecutor>(TYPES.PythonExecutor).to(PythonExecutor).inSingletonScope();
    
    // Analyzers - Singleton
    // Use OptimizedDjangoProjectAnalyzer if performance mode is enabled
    const performanceMode = vscode.workspace.getConfiguration('djangoPowerTools.performance').get('enableProgressiveAnalysis', true);
    if (performanceMode) {
        container.bind<DjangoProjectAnalyzer>(TYPES.DjangoProjectAnalyzer).to(OptimizedDjangoProjectAnalyzer).inSingletonScope();
    } else {
        container.bind<DjangoProjectAnalyzer>(TYPES.DjangoProjectAnalyzer).to(DjangoProjectAnalyzer).inSingletonScope();
    }
    container.bind<AdvancedModelAnalyzer>(TYPES.AdvancedModelAnalyzer).to(AdvancedModelAnalyzer).inSingletonScope();
    container.bind<UrlPatternAnalyzer>(TYPES.UrlPatternAnalyzer).to(UrlPatternAnalyzer).inSingletonScope();
    container.bind<EnhancedUrlPatternAnalyzer>(TYPES.EnhancedUrlPatternAnalyzer).to(EnhancedUrlPatternAnalyzer).inSingletonScope();
    container.bind<DjangoFormAnalyzer>(TYPES.DjangoFormAnalyzer).to(DjangoFormAnalyzer).inSingletonScope();
    container.bind<ViewContextAnalyzer>(TYPES.ViewContextAnalyzer).to(ViewContextAnalyzer).inSingletonScope();
    container.bind<StaticFileAnalyzer>(TYPES.StaticFileAnalyzer).to(StaticFileAnalyzer).inSingletonScope();
    container.bind<DjangoAdminAnalyzer>(TYPES.DjangoAdminAnalyzer).to(DjangoAdminAnalyzer).inSingletonScope();
    
    // Configuration - Singleton
    container.bind<ProjectPathConfigurator>(TYPES.ProjectPathConfigurator).to(ProjectPathConfigurator).inSingletonScope();
    
    // Command handlers - Singleton
    container.bind<ManagePyCommandHandler>(TYPES.ManagePyCommandHandler).to(ManagePyCommandHandler).inSingletonScope();
    container.bind<PerformanceCommands>(TYPES.PerformanceCommands).to(PerformanceCommands).inSingletonScope();
    
    // Completion providers - Transient (created as needed)
    container.bind<DjangoModelCompletionProvider>(TYPES.DjangoModelCompletionProvider).to(DjangoModelCompletionProvider);
    container.bind<DjangoFieldCompletionProvider>(TYPES.DjangoFieldCompletionProvider).to(DjangoFieldCompletionProvider);
    container.bind<EnhancedCompletionProvider>(TYPES.EnhancedCompletionProvider).to(EnhancedCompletionProvider);
    container.bind<UrlTagCompletionProvider>(TYPES.UrlTagCompletionProvider).to(UrlTagCompletionProvider);
    container.bind<DjangoFormsCompletionProvider>(TYPES.DjangoFormsCompletionProvider).to(DjangoFormsCompletionProvider);
    container.bind<DjangoModelFormCompletionProvider>(TYPES.DjangoModelFormCompletionProvider).to(DjangoModelFormCompletionProvider);
    container.bind<TemplateContextCompletionProvider>(TYPES.TemplateContextCompletionProvider).to(TemplateContextCompletionProvider);
    container.bind<StaticPathCompletionProvider>(TYPES.StaticPathCompletionProvider).to(StaticPathCompletionProvider);
    container.bind<DjangoAdminCompletionProvider>(TYPES.DjangoAdminCompletionProvider).to(DjangoAdminCompletionProvider);
    
    // Definition providers - Transient
    container.bind<DjangoDefinitionProvider>(TYPES.DjangoDefinitionProvider).to(DjangoDefinitionProvider);
    container.bind<EnhancedDjangoDefinitionProvider>(TYPES.EnhancedDjangoDefinitionProvider).to(EnhancedDjangoDefinitionProvider);
    
    // Services - Singleton
    container.bind<ExtensionService>(TYPES.ExtensionService).to(ExtensionService).inSingletonScope();
    container.bind<CompletionService>(TYPES.CompletionService).to(CompletionService).inSingletonScope();
    container.bind<CommandService>(TYPES.CommandService).to(CommandService).inSingletonScope();
    container.bind<FileWatcherService>(TYPES.FileWatcherService).to(FileWatcherService).inSingletonScope();
    container.bind<EnhancedFileWatcherService>(TYPES.EnhancedFileWatcherService).to(EnhancedFileWatcherService).inSingletonScope();
    container.bind<DefinitionService>(TYPES.DefinitionService).to(DefinitionService).inSingletonScope();
    container.bind<CacheService>(TYPES.CacheService).to(CacheService).inSingletonScope();
    
    // Parsers
    container.bind<PythonParser>(TYPES.PythonParser).to(PythonParser).inSingletonScope();
    
    return container;
}