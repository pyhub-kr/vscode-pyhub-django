import 'reflect-metadata';
import * as vscode from 'vscode';
import { Container } from 'inversify';
import { createContainer } from './container/inversify.config';
import { TYPES } from './container/types';
import { ExtensionService } from './services/extensionService';

let container: Container | undefined;
let extensionService: ExtensionService | undefined;

export async function activate(context: vscode.ExtensionContext) {
    try {
        // Create dependency injection container
        container = createContainer(context);
        
        // Get the main extension service
        extensionService = container.get<ExtensionService>(TYPES.ExtensionService);
        
        // Initialize the extension
        await extensionService.initialize();
        
    } catch (error) {
        console.error('Failed to activate Django Power Tools:', error);
        vscode.window.showErrorMessage('Failed to activate Django Power Tools. See console for details.');
    }
}

export function deactivate() {
    console.log('Django Power Tools is deactivated');
    
    if (extensionService) {
        extensionService.dispose();
    }
    
    if (container) {
        // Dispose of container resources
        container.unbindAll();
        container = undefined;
    }
}