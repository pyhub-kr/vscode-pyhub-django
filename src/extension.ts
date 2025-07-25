import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Django Power Tools is now active!');

    // Register a simple command for testing
    let disposable = vscode.commands.registerCommand('django-power-tools.helloWorld', () => {
        vscode.window.showInformationMessage('Hello from Django Power Tools!');
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {
    console.log('Django Power Tools is deactivated');
}