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
import { DjangoFormAnalyzer } from '../analyzers/djangoFormAnalyzer';
import { ViewContextAnalyzer } from '../analyzers/viewContextAnalyzer';

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

// Definition providers
import { DjangoDefinitionProvider } from '../providers/djangoDefinitionProvider';

// Services
import { ExtensionService } from '../services/extensionService';
import { CompletionService } from '../services/completionService';
import { CommandService } from '../services/commandService';
import { FileWatcherService } from '../services/fileWatcherService';
import { DefinitionService } from '../services/definitionService';

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
    container.bind<DjangoFormAnalyzer>(TYPES.DjangoFormAnalyzer).to(DjangoFormAnalyzer).inSingletonScope();
    container.bind<ViewContextAnalyzer>(TYPES.ViewContextAnalyzer).to(ViewContextAnalyzer).inSingletonScope();
    
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
    
    // Definition providers - Transient
    container.bind<DjangoDefinitionProvider>(TYPES.DjangoDefinitionProvider).to(DjangoDefinitionProvider);
    
    // Services - Singleton
    container.bind<ExtensionService>(TYPES.ExtensionService).to(ExtensionService).inSingletonScope();
    container.bind<CompletionService>(TYPES.CompletionService).to(CompletionService).inSingletonScope();
    container.bind<CommandService>(TYPES.CommandService).to(CommandService).inSingletonScope();
    container.bind<FileWatcherService>(TYPES.FileWatcherService).to(FileWatcherService).inSingletonScope();
    container.bind<DefinitionService>(TYPES.DefinitionService).to(DefinitionService).inSingletonScope();
    
    return container;
}