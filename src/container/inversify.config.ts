import { Container } from 'inversify';
import * as vscode from 'vscode';
import { TYPES } from './types';

// Core services
import { PythonIntegration, PythonExecutor } from '../pythonIntegration';

// Analyzers
import { DjangoProjectAnalyzer } from '../analyzers/djangoProjectAnalyzer';
import { AdvancedModelAnalyzer } from '../analyzers/advancedModelAnalyzer';
import { UrlPatternAnalyzer } from '../analyzers/urlPatternAnalyzer';
import { TemplatePathResolver } from '../analyzers/templatePathResolver';
import { TemplateContextAnalyzer } from '../analyzers/templateContextAnalyzer';

// Configuration
import { ProjectPathConfigurator } from '../projectPathConfigurator';

// Command handlers
import { ManagePyCommandHandler } from '../commands/managePyCommandHandler';

// Completion providers
import { DjangoModelCompletionProvider, DjangoFieldCompletionProvider } from '../providers/djangoModelCompletionProvider';
import { EnhancedCompletionProvider } from '../providers/enhancedCompletionProvider';
import { UrlTagCompletionProvider } from '../providers/urlTagCompletionProvider';
import { TemplatePathDefinitionProvider } from '../providers/templatePathDefinitionProvider';
import { TemplateVariableCompletionProvider } from '../providers/templateVariableCompletionProvider';

// Services
import { ExtensionService } from '../services/extensionService';
import { CompletionService } from '../services/completionService';
import { CommandService } from '../services/commandService';
import { FileWatcherService } from '../services/fileWatcherService';
import { ViewTemplateMapperService } from '../services/viewTemplateMapperService';

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
    container.bind<TemplatePathResolver>(TYPES.TemplatePathResolver).to(TemplatePathResolver).inSingletonScope();
    container.bind<TemplateContextAnalyzer>(TYPES.TemplateContextAnalyzer).to(TemplateContextAnalyzer).inSingletonScope();
    
    // Configuration - Singleton
    container.bind<ProjectPathConfigurator>(TYPES.ProjectPathConfigurator).to(ProjectPathConfigurator).inSingletonScope();
    
    // Command handlers - Singleton
    container.bind<ManagePyCommandHandler>(TYPES.ManagePyCommandHandler).to(ManagePyCommandHandler).inSingletonScope();
    
    // Completion providers - Transient (created as needed)
    container.bind<DjangoModelCompletionProvider>(TYPES.DjangoModelCompletionProvider).to(DjangoModelCompletionProvider);
    container.bind<DjangoFieldCompletionProvider>(TYPES.DjangoFieldCompletionProvider).to(DjangoFieldCompletionProvider);
    container.bind<EnhancedCompletionProvider>(TYPES.EnhancedCompletionProvider).to(EnhancedCompletionProvider);
    container.bind<UrlTagCompletionProvider>(TYPES.UrlTagCompletionProvider).to(UrlTagCompletionProvider);
    container.bind<TemplatePathDefinitionProvider>(TYPES.TemplatePathDefinitionProvider).to(TemplatePathDefinitionProvider);
    container.bind<TemplateVariableCompletionProvider>(TYPES.TemplateVariableCompletionProvider).to(TemplateVariableCompletionProvider);
    
    // Services - Singleton
    container.bind<ExtensionService>(TYPES.ExtensionService).to(ExtensionService).inSingletonScope();
    container.bind<CompletionService>(TYPES.CompletionService).to(CompletionService).inSingletonScope();
    container.bind<CommandService>(TYPES.CommandService).to(CommandService).inSingletonScope();
    container.bind<FileWatcherService>(TYPES.FileWatcherService).to(FileWatcherService).inSingletonScope();
    container.bind<ViewTemplateMapperService>(TYPES.ViewTemplateMapperService).to(ViewTemplateMapperService).inSingletonScope();
    
    return container;
}