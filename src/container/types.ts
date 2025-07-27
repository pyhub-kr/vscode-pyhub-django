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
    EnhancedUrlPatternAnalyzer: Symbol.for('EnhancedUrlPatternAnalyzer'),
    DjangoFormAnalyzer: Symbol.for('DjangoFormAnalyzer'),
    ViewContextAnalyzer: Symbol.for('ViewContextAnalyzer'),
    StaticFileAnalyzer: Symbol.for('StaticFileAnalyzer'),
    DjangoAdminAnalyzer: Symbol.for('DjangoAdminAnalyzer'),
    
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
    DjangoFormsCompletionProvider: Symbol.for('DjangoFormsCompletionProvider'),
    DjangoModelFormCompletionProvider: Symbol.for('DjangoModelFormCompletionProvider'),
    TemplateContextCompletionProvider: Symbol.for('TemplateContextCompletionProvider'),
    StaticPathCompletionProvider: Symbol.for('StaticPathCompletionProvider'),
    DjangoAdminCompletionProvider: Symbol.for('DjangoAdminCompletionProvider'),
    
    // Definition Providers
    DjangoDefinitionProvider: Symbol.for('DjangoDefinitionProvider'),
    EnhancedDjangoDefinitionProvider: Symbol.for('EnhancedDjangoDefinitionProvider'),
    
    // Services
    ExtensionService: Symbol.for('ExtensionService'),
    CompletionService: Symbol.for('CompletionService'),
    CommandService: Symbol.for('CommandService'),
    FileWatcherService: Symbol.for('FileWatcherService'),
    EnhancedFileWatcherService: Symbol.for('EnhancedFileWatcherService'),
    DefinitionService: Symbol.for('DefinitionService'),
    CacheService: Symbol.for('CacheService'),
    
    // Parsers
    PythonParser: Symbol.for('PythonParser')
};