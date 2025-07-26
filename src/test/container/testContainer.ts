import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from '../../container/types';
import { AdvancedModelAnalyzer } from '../../analyzers/advancedModelAnalyzer';
import { DjangoProjectAnalyzer } from '../../analyzers/djangoProjectAnalyzer';
import { PythonExecutor, PythonIntegration } from '../../pythonIntegration';
import { EnhancedCompletionProvider } from '../../providers/enhancedCompletionProvider';
import { InMemoryFileSystem } from '../utils/mockHelpers';
import * as vscode from 'vscode';

export function createTestContainer(): Container {
    const container = new Container();
    
    // Bind analyzers
    container.bind<AdvancedModelAnalyzer>(TYPES.AdvancedModelAnalyzer).to(AdvancedModelAnalyzer).inSingletonScope();
    
    // Create advanced analyzer instance first
    const advancedAnalyzer = new AdvancedModelAnalyzer();
    
    // Bind Django project analyzer with custom factory for testing
    container.bind<DjangoProjectAnalyzer>(TYPES.DjangoProjectAnalyzer).toConstantValue(
        new DjangoProjectAnalyzer(advancedAnalyzer, new InMemoryFileSystem())
    );
    
    // Bind Python related services
    container.bind<PythonIntegration>(TYPES.PythonIntegration).to(PythonIntegration).inSingletonScope();
    container.bind<PythonExecutor>(TYPES.PythonExecutor).to(PythonExecutor).inSingletonScope();
    
    // Bind completion provider
    container.bind<EnhancedCompletionProvider>(TYPES.EnhancedCompletionProvider).to(EnhancedCompletionProvider).inSingletonScope();
    
    return container;
}

// Helper function to create a test Django project analyzer with mock file system
export function createTestDjangoProjectAnalyzer(fileSystem?: InMemoryFileSystem): DjangoProjectAnalyzer {
    const advancedAnalyzer = new AdvancedModelAnalyzer();
    const fs = fileSystem || new InMemoryFileSystem();
    return new DjangoProjectAnalyzer(advancedAnalyzer, fs);
}