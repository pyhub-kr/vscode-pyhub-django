/**
 * Service identifiers for dependency injection
 */
export const TYPES = {
    // Core Services
    ExtensionContext: Symbol.for('ExtensionContext'),
    PythonIntegration: Symbol.for('PythonIntegration'),
    PythonExecutor: Symbol.for('PythonExecutor'),
    
    // Analyzers
    DjangoProjectAnalyzer: Symbol.for('DjangoProjectAnalyzer'),
    AdvancedModelAnalyzer: Symbol.for('AdvancedModelAnalyzer'),
    UrlPatternAnalyzer: Symbol.for('UrlPatternAnalyzer'),
    
    // Configuration
    ProjectPathConfigurator: Symbol.for('ProjectPathConfigurator'),
    
    // Command Handlers
    ManagePyCommandHandler: Symbol.for('ManagePyCommandHandler'),
    PerformanceCommands: Symbol.for('PerformanceCommands'),
    
    // Completion Providers
    DjangoModelCompletionProvider: Symbol.for('DjangoModelCompletionProvider'),
    DjangoFieldCompletionProvider: Symbol.for('DjangoFieldCompletionProvider'),
    EnhancedCompletionProvider: Symbol.for('EnhancedCompletionProvider'),
    UrlTagCompletionProvider: Symbol.for('UrlTagCompletionProvider'),
    
    // Services
    ExtensionService: Symbol.for('ExtensionService'),
    CompletionService: Symbol.for('CompletionService'),
    CommandService: Symbol.for('CommandService'),
    FileWatcherService: Symbol.for('FileWatcherService')
};